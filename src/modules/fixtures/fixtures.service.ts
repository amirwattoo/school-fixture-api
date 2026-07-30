import { Prisma } from "@prisma/client";

import { ApiError } from "../../common/api-error.js";
import type { AuditActor } from "../../common/audit.js";
import {
  isoWeek,
  parseDateOnly,
  resolveSchoolDate,
  weekdayForDate,
} from "../../common/date-only.js";
import { env } from "../../config/env.js";
import { isTeacherAvailableAtPeriod } from "../attendance/attendance-availability.js";
import {
  fixtureNotificationIdempotencyKey,
  renderFixtureWhatsAppMessage,
} from "../whatsapp/whatsapp-message.service.js";
import { normalizePakistaniWhatsAppNumber } from "../whatsapp/whatsapp-number.util.js";
import { getEligibleTeachersForFixture } from "./fixture-eligibility.service.js";
import { fixturesRepository, type FixtureDb } from "./fixtures.repository.js";

const jsonValue = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const audit = (
  database: FixtureDb,
  actor: AuditActor,
  action: string,
  entityType: string,
  entityId: string | undefined,
  details?: unknown,
) =>
  database.auditLog.create({
    data: {
      schoolId: actor.schoolId,
      userId: actor.userId,
      action,
      entityType,
      entityId,
      details: details === undefined ? undefined : jsonValue(details),
    },
  });

const runSerializable = async <T>(
  callback: (database: FixtureDb) => Promise<T>,
): Promise<T> => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fixturesRepository.transaction(callback);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 3
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new ApiError(409, "FIXTURE_TRANSACTION_CONFLICT", "Please try again");
};

export type FixtureGenerationDiagnostics = {
  selectedDate: string;
  resolvedWeekday: string;
  unavailableTeacherCount: number;
  matchingTimetablePeriodCount: number;
  affectedLessonCount: number;
  createdFixtureCount: number;
  existingFixtureCount: number;
  fixturesWithoutEligibleReplacementCount: number;
  skippedReasons: string[];
};

export const fixturesService = {
  list(schoolId: string, dateValue: string) {
    return fixturesRepository.list(schoolId, parseDateOnly(dateValue));
  },

  async get(schoolId: string, fixtureId: string) {
    const fixture = await fixturesRepository.find(schoolId, fixtureId);
    if (!fixture)
      throw new ApiError(404, "FIXTURE_NOT_FOUND", "Fixture was not found");
    return fixture;
  },

  async generate(
    actor: AuditActor,
    dateValue: string,
    absentTeacherIds: string[],
  ) {
    return runSerializable(async (database) => {
      const school = await fixturesRepository.schoolSettings(
        database,
        actor.schoolId,
      );
      if (!school) {
        throw new ApiError(404, "SCHOOL_NOT_FOUND", "School was not found");
      }
      const resolvedDate = resolveSchoolDate(dateValue, school.timezone);
      const date = resolvedDate.storageDate;
      const dayOfWeek = resolvedDate.weekday;
      if (dayOfWeek === "SATURDAY" || dayOfWeek === "SUNDAY") {
        throw new ApiError(
          400,
          "NON_WORKING_DAY",
          `Fixtures cannot be generated for ${dayOfWeek.toLocaleLowerCase("en")}; select a Monday-to-Friday working date`,
          {
            selectedDate: resolvedDate.selectedDate,
            resolvedWeekday: dayOfWeek,
            timezone: resolvedDate.timezone,
          },
        );
      }

      const [teachers, attendance, diagnosticTeachers] = await Promise.all([
        fixturesRepository.absentTeachers(
          database,
          actor.schoolId,
          absentTeacherIds,
        ),
        fixturesRepository.attendance(
          database,
          actor.schoolId,
          date,
          absentTeacherIds,
        ),
        env.NODE_ENV === "development"
          ? fixturesRepository.teacherDiagnostics(database, absentTeacherIds)
          : Promise.resolve([]),
      ]);
      if (env.NODE_ENV === "development") {
        const diagnosticById = new Map(
          diagnosticTeachers.map((teacher) => [teacher.id, teacher]),
        );
        for (const absentTeacherId of absentTeacherIds) {
          const teacher = diagnosticById.get(absentTeacherId);
          console.info("[fixture-generation-diagnostic]", {
            authenticatedUserId: actor.userId,
            authenticatedSchoolId: actor.schoolId,
            absentTeacherId,
            absentTeacherName: teacher?.name ?? null,
            absentTeacherSchoolId: teacher?.schoolId ?? null,
          });
        }
      }
      if (
        teachers.length !== absentTeacherIds.length ||
        teachers.some((teacher) => !teacher.isActive)
      ) {
        throw new ApiError(
          400,
          "INVALID_ABSENT_TEACHER",
          "Every absent teacher must belong to your school",
        );
      }
      const attendanceByTeacher = new Map(
        attendance.map((record) => [record.teacherId, record]),
      );
      const unavailableTeacherCount = attendance.filter(
        (record) => record.status !== "PRESENT",
      ).length;
      if (
        absentTeacherIds.some((teacherId) => {
          const exception = attendanceByTeacher.get(teacherId);
          return !exception || exception.status === "PRESENT";
        })
      ) {
        throw new ApiError(
          400,
          "TEACHER_HAS_NO_ATTENDANCE_EXCEPTION",
          "Every selected teacher must have an attendance exception",
        );
      }

      const matchingLectures = await fixturesRepository.absentLectures(
        database,
        actor.schoolId,
        dayOfWeek,
        absentTeacherIds,
      );
      const lectures = matchingLectures.filter(
        (lecture) =>
          !isTeacherAvailableAtPeriod(
            attendanceByTeacher.get(lecture.teacherId),
            lecture.periodNumber,
          ),
      );
      const skippedReasons: string[] = [];
      if (matchingLectures.length === 0) {
        skippedReasons.push(
          `No ${dayOfWeek} timetable periods matched the selected unavailable teachers`,
        );
      }
      const availablePeriodCount = matchingLectures.length - lectures.length;
      if (availablePeriodCount > 0) {
        skippedReasons.push(
          `${availablePeriodCount} timetable period(s) were skipped because the teacher was available during those periods`,
        );
      }

      const fixtures = [];
      let existingFixtureCount = 0;
      let createdFixtureCount = 0;
      let fixturesWithoutEligibleReplacementCount = 0;
      for (const lecture of lectures) {
        const existing = await fixturesRepository.existingForLecture(
          database,
          actor.schoolId,
          date,
          lecture,
        );
        if (existing) {
          existingFixtureCount += 1;
          fixtures.push(existing);
          continue;
        }

        const eligibility = await getEligibleTeachersForFixture(database, {
          schoolId: actor.schoolId,
          date,
          dayOfWeek,
          periodNumber: lecture.periodNumber,
          absentTeacherId: lecture.teacherId,
          subjectName: lecture.subject.name,
          subjectCode: lecture.subject.code,
          classLevel: lecture.classSection.teachingLevel,
        });
        const candidates = eligibility.candidates;
        const selected = candidates[0];
        const scoringDetails = {
          requiredSubject: lecture.subject.name,
          requiredTeachingLevel: lecture.classSection.teachingLevel,
          selectedTeacherId: selected?.teacherId ?? null,
          candidates,
          excluded: eligibility.excluded,
        };
        const fixture = await fixturesRepository.create(database, {
          schoolId: actor.schoolId,
          date,
          periodNumber: lecture.periodNumber,
          masterTimetableId: lecture.id,
          classSectionId: lecture.classSectionId,
          subjectId: lecture.subjectId,
          absentTeacherId: lecture.teacherId,
          assignedTeacherId: selected?.teacherId,
          autoAssignedTeacherId: selected?.teacherId,
          autoScore: selected?.totalScore,
          scoringDetails: jsonValue(scoringDetails),
          workloadCounted: Boolean(selected),
        });
        createdFixtureCount += 1;
        if (!selected) fixturesWithoutEligibleReplacementCount += 1;
        if (selected) {
          const { year, weekNumber } = isoWeek(date);
          await fixturesRepository.incrementSummary(
            database,
            actor.schoolId,
            selected.teacherId,
            year,
            weekNumber,
          );
          await audit(
            database,
            actor,
            "FIXTURE_AUTO_ASSIGNED",
            "ProxyFixture",
            fixture.id,
            {
              assignedTeacherId: selected.teacherId,
              score: selected.totalScore,
            },
          );
        } else {
          await audit(
            database,
            actor,
            "FIXTURE_UNASSIGNED",
            "ProxyFixture",
            fixture.id,
            { periodNumber: lecture.periodNumber },
          );
        }
        fixtures.push(fixture);
      }
      if (existingFixtureCount > 0) {
        skippedReasons.push(
          `${existingFixtureCount} existing fixture(s), including published fixtures, were returned without creating duplicates`,
        );
      }
      if (fixtures.length === 0 && skippedReasons.length === 0) {
        skippedReasons.push("No affected timetable periods were found");
      }
      const diagnostics: FixtureGenerationDiagnostics = {
        selectedDate: resolvedDate.selectedDate,
        resolvedWeekday: dayOfWeek,
        unavailableTeacherCount,
        matchingTimetablePeriodCount: matchingLectures.length,
        affectedLessonCount: lectures.length,
        createdFixtureCount,
        existingFixtureCount,
        fixturesWithoutEligibleReplacementCount,
        skippedReasons,
      };
      await audit(
        database,
        actor,
        "FIXTURES_GENERATED",
        "ProxyFixture",
        undefined,
        {
          date: dateValue,
          absentTeacherIds,
          fixtureIds: fixtures.map((fixture) => fixture.id),
          diagnostics,
        },
      );
      return {
        fixtures,
        diagnostics,
      };
    });
  },

  async override(
    actor: AuditActor,
    fixtureId: string,
    assignedTeacherId: string,
    reason: string,
  ) {
    return runSerializable(async (database) => {
      const fixture = await fixturesRepository.findForUpdate(
        database,
        actor.schoolId,
        fixtureId,
      );
      if (!fixture)
        throw new ApiError(404, "FIXTURE_NOT_FOUND", "Fixture was not found");
      if (fixture.status !== "DRAFT")
        throw new ApiError(
          409,
          "FIXTURE_NOT_DRAFT",
          "Only draft fixtures can be overridden",
        );
      const eligibility = await getEligibleTeachersForFixture(database, {
        schoolId: actor.schoolId,
        date: fixture.date,
        dayOfWeek: weekdayForDate(fixture.date),
        periodNumber: fixture.periodNumber,
        absentTeacherId: fixture.absentTeacherId,
        subjectName: fixture.subject.name,
        subjectCode: fixture.subject.code,
        classLevel: fixture.classSection.teachingLevel,
        excludeFixtureId: fixture.id,
        currentAssignedTeacherId: fixture.assignedTeacherId,
      });
      const candidate = eligibility.candidates.find(
        (item) => item.teacherId === assignedTeacherId,
      );
      if (!candidate)
        throw new ApiError(
          400,
          "INELIGIBLE_OVERRIDE_TEACHER",
          "The selected teacher is not eligible and free for this period",
        );

      const { year, weekNumber } = isoWeek(fixture.date);
      const sameTeacher = fixture.assignedTeacherId === assignedTeacherId;
      if (
        fixture.assignedTeacherId &&
        fixture.workloadCounted &&
        !sameTeacher
      ) {
        await fixturesRepository.decrementSummary(
          database,
          actor.schoolId,
          fixture.assignedTeacherId,
          year,
          weekNumber,
        );
      }
      if (!sameTeacher || !fixture.workloadCounted) {
        await fixturesRepository.incrementSummary(
          database,
          actor.schoolId,
          assignedTeacherId,
          year,
          weekNumber,
        );
      }
      const updated = await fixturesRepository.update(database, fixture.id, {
        assignedTeacher: { connect: { id: assignedTeacherId } },
        assignmentVersion: sameTeacher ? undefined : { increment: 1 },
        isManuallyOverridden: true,
        overrideReason: reason.trim(),
        overriddenBy: { connect: { id: actor.userId } },
        overriddenAt: new Date(),
        workloadCounted: true,
        requiresReassignment: false,
        reassignmentReason: null,
        autoScore: candidate.totalScore,
        scoringDetails: jsonValue({
          requiredSubject: fixture.subject.name,
          requiredTeachingLevel: fixture.classSection.teachingLevel,
          selectedTeacherId: candidate.teacherId,
          candidates: eligibility.candidates,
          excluded: eligibility.excluded,
        }),
      });
      await audit(
        database,
        actor,
        "FIXTURE_OVERRIDDEN",
        "ProxyFixture",
        fixture.id,
        {
          oldTeacherId: fixture.assignedTeacherId,
          newTeacherId: assignedTeacherId,
          reason,
        },
      );
      return updated;
    });
  },

  async candidates(schoolId: string, fixtureId: string) {
    return fixturesRepository.transaction(async (database) => {
      const fixture = await fixturesRepository.findForUpdate(
        database,
        schoolId,
        fixtureId,
      );
      if (!fixture)
        throw new ApiError(404, "FIXTURE_NOT_FOUND", "Fixture was not found");
      return getEligibleTeachersForFixture(database, {
        schoolId,
        date: fixture.date,
        dayOfWeek: weekdayForDate(fixture.date),
        periodNumber: fixture.periodNumber,
        absentTeacherId: fixture.absentTeacherId,
        subjectName: fixture.subject.name,
        subjectCode: fixture.subject.code,
        classLevel: fixture.classSection.teachingLevel,
        excludeFixtureId: fixture.id,
        currentAssignedTeacherId: fixture.assignedTeacherId,
      });
    });
  },

  async scoring(schoolId: string, fixtureId: string) {
    return fixturesRepository.transaction(async (database) => {
      const fixture = await fixturesRepository.findForUpdate(
        database,
        schoolId,
        fixtureId,
      );
      if (!fixture)
        throw new ApiError(404, "FIXTURE_NOT_FOUND", "Fixture was not found");
      const eligibility = await getEligibleTeachersForFixture(database, {
        schoolId,
        date: fixture.date,
        dayOfWeek: weekdayForDate(fixture.date),
        periodNumber: fixture.periodNumber,
        absentTeacherId: fixture.absentTeacherId,
        subjectName: fixture.subject.name,
        subjectCode: fixture.subject.code,
        classLevel: fixture.classSection.teachingLevel,
        excludeFixtureId: fixture.id,
      });
      return {
        requiredSubject: fixture.subject.name,
        requiredTeachingLevel: fixture.classSection.teachingLevel,
        selectedTeacherId: fixture.assignedTeacherId,
        candidates: eligibility.candidates,
        excluded: eligibility.excluded,
      };
    });
  },

  async cancel(actor: AuditActor, fixtureId: string) {
    return runSerializable(async (database) => {
      const fixture = await fixturesRepository.findForUpdate(
        database,
        actor.schoolId,
        fixtureId,
      );
      if (!fixture)
        throw new ApiError(404, "FIXTURE_NOT_FOUND", "Fixture was not found");
      if (fixture.status !== "DRAFT")
        throw new ApiError(
          409,
          "FIXTURE_NOT_DRAFT",
          "Only draft fixtures can be cancelled",
        );
      if (fixture.assignedTeacherId && fixture.workloadCounted) {
        const { year, weekNumber } = isoWeek(fixture.date);
        await fixturesRepository.decrementSummary(
          database,
          actor.schoolId,
          fixture.assignedTeacherId,
          year,
          weekNumber,
        );
      }
      const updated = await fixturesRepository.update(database, fixture.id, {
        status: "CANCELLED",
        workloadCounted: false,
      });
      await audit(
        database,
        actor,
        "FIXTURE_CANCELLED",
        "ProxyFixture",
        fixture.id,
      );
      return updated;
    });
  },

  async publish(actor: AuditActor, dateValue: string) {
    const date = parseDateOnly(dateValue);
    const publication = await runSerializable(async (database) => {
      const drafts = await database.proxyFixture.findMany({
        where: { schoolId: actor.schoolId, date, status: "DRAFT" },
        include: {
          school: { select: { name: true } },
          classSection: { select: { name: true } },
          subject: { select: { name: true } },
          absentTeacher: { select: { name: true } },
          assignedTeacher: {
            select: { id: true, name: true, whatsappNumber: true },
          },
        },
      });
      if (drafts.some((fixture) => !fixture.assignedTeacherId)) {
        throw new ApiError(
          409,
          "UNASSIGNED_FIXTURES",
          "Assign every draft fixture before publishing",
        );
      }
      if (drafts.some((fixture) => fixture.requiresReassignment)) {
        throw new ApiError(
          409,
          "FIXTURES_REQUIRE_REASSIGNMENT",
          "Reassign fixtures affected by attendance changes before publishing",
        );
      }
      const publishedAt = new Date();
      await database.proxyFixture.updateMany({
        where: { schoolId: actor.schoolId, date, status: "DRAFT" },
        data: {
          status: "PUBLISHED",
          publishedById: actor.userId,
          publishedAt,
        },
      });
      await audit(
        database,
        actor,
        "FIXTURES_PUBLISHED",
        "ProxyFixture",
        undefined,
        { date: dateValue, fixtureIds: drafts.map((fixture) => fixture.id) },
      );
      const notificationIds: string[] = [];
      let notificationsCreated = 0;
      let existingNotifications = 0;
      for (const fixture of drafts) {
        const assignedTeacher = fixture.assignedTeacher!;
        const idempotencyKey = fixtureNotificationIdempotencyKey(
          fixture.id,
          assignedTeacher.id,
          fixture.assignmentVersion,
        );
        const existing = await database.whatsAppNotification.findUnique({
          where: { idempotencyKey },
          select: { id: true },
        });
        if (existing) {
          existingNotifications += 1;
          continue;
        }
        const rendered = renderFixtureWhatsAppMessage({
          schoolName: fixture.school.name,
          teacherName: assignedTeacher.name,
          fixtureDate: fixture.date,
          periodNumber: fixture.periodNumber,
          className: fixture.classSection.name,
          subjectName: fixture.subject.name,
          absentTeacherName: fixture.absentTeacher.name,
        });
        let destination = assignedTeacher.whatsappNumber?.trim() ?? "";
        try {
          destination =
            normalizePakistaniWhatsAppNumber(assignedTeacher.whatsappNumber) ??
            "";
        } catch {
          // Keep the entered value so the Click-to-Chat UI can show a
          // teacher-specific invalid-number error without blocking publication.
        }
        const notification = await database.whatsAppNotification.create({
          data: {
            schoolId: actor.schoolId,
            fixtureId: fixture.id,
            teacherId: assignedTeacher.id,
            destination,
            message: rendered.message,
            provider: "click_to_chat",
            idempotencyKey,
          },
        });
        notificationIds.push(notification.id);
        notificationsCreated += 1;
        await audit(
          database,
          actor,
          "WHATSAPP_NOTIFICATION_CREATED",
          "WhatsAppNotification",
          notification.id,
          {
            notificationId: notification.id,
            fixtureId: fixture.id,
            teacherId: assignedTeacher.id,
            provider: "click_to_chat",
            attemptCount: 0,
          },
        );
      }
      const fixtures = await database.proxyFixture.findMany({
        where: { id: { in: drafts.map((fixture) => fixture.id) } },
        include: {
          classSection: true,
          subject: true,
          absentTeacher: true,
          assignedTeacher: true,
          autoAssignedTeacher: true,
        },
        orderBy: [{ periodNumber: "asc" }, { classSection: { name: "asc" } }],
      });
      return {
        fixtures,
        notificationIds,
        publishedCount: drafts.length,
        notificationsCreated,
        existingNotifications,
      };
    });
    return {
      fixtures: publication.fixtures,
      publishedCount: publication.publishedCount,
      notificationsCreated: publication.notificationsCreated,
      messagesReady: publication.notificationIds.length,
      messagesSent: 0,
      messagesFailed: 0,
      existingNotifications: publication.existingNotifications,
    };
  },
};
