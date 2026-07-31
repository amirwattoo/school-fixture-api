import { Prisma } from "@prisma/client";

import { ApiError } from "../../common/api-error.js";
import type { AuditActor } from "../../common/audit.js";
import { databasePhase } from "../../common/request-timing.js";
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
import {
  getEligibleTeachersForFixture,
  getEligibleTeachersFromSnapshot,
  loadFixtureEligibilitySnapshot,
} from "./fixture-eligibility.service.js";
import { fixturesRepository, type FixtureDb } from "./fixtures.repository.js";

const jsonValue = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

type PublicationPhase =
  | "load-draft-fixtures"
  | "prepare-publication"
  | "publish-write-transaction"
  | "audit-write"
  | "notification-preparation"
  | "notification-dispatch"
  | "final-fetch";

const prismaErrorCode = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;

const publicationTiming = (requestId: string) => {
  const requestStartedAt = Date.now();
  const run = async <T>(
    phase: PublicationPhase,
    callback: () => Promise<T> | T,
    counts?: (result: T) => Record<string, number>,
  ): Promise<T> => {
    const phaseStartedAt = Date.now();
    try {
      const result = await callback();
      console.info("[fixture-publication-timing]", {
        requestId,
        phase,
        elapsedMs: Date.now() - phaseStartedAt,
        totalElapsedMs: Date.now() - requestStartedAt,
        prismaErrorCode: null,
        ...(counts?.(result) ?? {}),
      });
      return result;
    } catch (error) {
      console.error("[fixture-publication-timing]", {
        requestId,
        phase,
        elapsedMs: Date.now() - phaseStartedAt,
        totalElapsedMs: Date.now() - requestStartedAt,
        prismaErrorCode: prismaErrorCode(error),
      });
      throw error;
    }
  };
  return { run };
};

const fixtureLectureKey = (fixture: {
  periodNumber: number;
  classSectionId: string;
  absentTeacherId?: string;
  teacherId?: string;
}) =>
  `${fixture.periodNumber}:${fixture.classSectionId}:${fixture.absentTeacherId ?? fixture.teacherId}`;

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
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const retryable = error.code === "P2034" || error.code === "P2002";
        if (retryable && attempt < 3) continue;
        if (retryable) {
          throw new ApiError(
            409,
            "FIXTURE_TRANSACTION_CONFLICT",
            "Fixture data changed while the request was being saved; please try again",
          );
        }
      }
      throw error;
    }
  }
  throw new ApiError(409, "FIXTURE_TRANSACTION_CONFLICT", "Please try again");
};

const runFixtureWrite = async <T>(
  callback: (database: FixtureDb) => Promise<T>,
): Promise<T> => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fixturesRepository.writeTransaction(callback);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002")
      ) {
        if (attempt < 3) continue;
        throw new ApiError(
          409,
          "FIXTURE_WRITE_CONFLICT",
          "Another fixture generation request changed the same lessons; please retry",
        );
      }
      throw error;
    }
  }
  throw new ApiError(409, "FIXTURE_WRITE_CONFLICT", "Please retry");
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
    return databasePhase("fixtures-list", () =>
      fixturesRepository.list(schoolId, parseDateOnly(dateValue)),
    );
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
    const database = fixturesRepository.database;
    const startedAt = Date.now();
    let previousTimingAt = startedAt;
    const logTiming = (stage: string, counts?: Record<string, number>) => {
      if (env.PERF_LOGGING || env.FIXTURE_DEBUG_TIMING) {
        const now = Date.now();
        console.info("[fixture-generation-timing]", {
          stage,
          stageMs: now - previousTimingAt,
          elapsedMs: now - startedAt,
          schoolId: actor.schoolId,
          selectedDate: dateValue,
          ...counts,
        });
        previousTimingAt = now;
      }
    };
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

    const [teachers, attendance, matchingLectures, diagnosticTeachers, snapshot] =
      await Promise.all([
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
        fixturesRepository.absentLectures(
          database,
          actor.schoolId,
          dayOfWeek,
          absentTeacherIds,
        ),
        env.NODE_ENV === "development"
          ? fixturesRepository.teacherDiagnostics(database, absentTeacherIds)
          : Promise.resolve([]),
        loadFixtureEligibilitySnapshot(database, {
          schoolId: actor.schoolId,
          date,
          dayOfWeek,
        }),
      ]);
    logTiming("bulk-reads-complete", {
      absentTeachers: teachers.length,
      attendanceRecords: attendance.length,
      matchingLectures: matchingLectures.length,
      eligibleTeacherPool: snapshot.pool.length,
    });
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

    const existingFixtures = await fixturesRepository.existingForLectures(
      database,
      actor.schoolId,
      date,
      lectures,
    );
    const existingByLectureId = new Map(
      existingFixtures.map((fixture) => [fixtureLectureKey(fixture), fixture]),
    );
    const plannedBusyByPeriod = new Map<number, Set<string>>();
    const prepared = lectures.flatMap((lecture) => {
      if (existingByLectureId.has(fixtureLectureKey(lecture))) return [];
      const plannedBusy =
        plannedBusyByPeriod.get(lecture.periodNumber) ?? new Set<string>();
      const eligibility = getEligibleTeachersFromSnapshot(snapshot, {
          schoolId: actor.schoolId,
          date,
          dayOfWeek,
          periodNumber: lecture.periodNumber,
          absentTeacherId: lecture.teacherId,
          subjectName: lecture.subject.name,
          subjectCode: lecture.subject.code,
          classLevel: lecture.classSection.teachingLevel,
        }, plannedBusy);
      const selected = eligibility.candidates[0];
      if (selected) {
        plannedBusy.add(selected.teacherId);
        plannedBusyByPeriod.set(lecture.periodNumber, plannedBusy);
        snapshot.weeklyCounts.set(
          selected.teacherId,
          (snapshot.weeklyCounts.get(selected.teacherId) ?? 0) + 1,
        );
      }
      return [{
        lecture,
        selected,
        scoringDetails: {
          requiredSubject: lecture.subject.name,
          requiredTeachingLevel: lecture.classSection.teachingLevel,
          selectedTeacherId: selected?.teacherId ?? null,
          candidates: eligibility.candidates,
          excluded: eligibility.excluded,
        },
      }];
    });
    logTiming("scoring-complete", { plannedFixtures: prepared.length });

    const { year, weekNumber } = isoWeek(date);
    const writeResult = await runFixtureWrite(async (transaction) => {
      const createdFixtures = await fixturesRepository.createManyForGeneration(
        transaction,
        prepared.map((plan) => ({
          schoolId: actor.schoolId,
          date,
          periodNumber: plan.lecture.periodNumber,
          masterTimetableId: plan.lecture.id,
          classSectionId: plan.lecture.classSectionId,
          subjectId: plan.lecture.subjectId,
          absentTeacherId: plan.lecture.teacherId,
          assignedTeacherId: plan.selected?.teacherId,
          autoAssignedTeacherId: plan.selected?.teacherId,
          autoScore: plan.selected?.totalScore,
          scoringDetails: jsonValue(plan.scoringDetails),
          workloadCounted: Boolean(plan.selected),
        })),
      );
      const planByTimetableId = new Map(
        prepared.map((plan) => [plan.lecture.id, plan]),
      );
      const summaryCounts = new Map<string, number>();
      for (const fixture of createdFixtures) {
        if (!fixture.assignedTeacherId) continue;
        summaryCounts.set(
          fixture.assignedTeacherId,
          (summaryCounts.get(fixture.assignedTeacherId) ?? 0) + 1,
        );
      }
      await fixturesRepository.incrementSummariesBulk(
        transaction,
        actor.schoolId,
        year,
        weekNumber,
        [...summaryCounts].map(([teacherId, count]) => ({ teacherId, count })),
      );

      const createdFixtureCount = createdFixtures.length;
      const existingFixtureCount = lectures.length - createdFixtureCount;
      const fixturesWithoutEligibleReplacementCount = createdFixtures.filter(
        (fixture) => !fixture.assignedTeacherId,
      ).length;
      const writeSkippedReasons = [...skippedReasons];
      if (existingFixtureCount > 0) {
        writeSkippedReasons.push(
          `${existingFixtureCount} existing fixture(s), including published fixtures, were returned without creating duplicates`,
        );
      }
      if (lectures.length === 0 && writeSkippedReasons.length === 0) {
        writeSkippedReasons.push("No affected timetable periods were found");
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
        skippedReasons: writeSkippedReasons,
      };
      const assignmentAudits: Prisma.AuditLogCreateManyInput[] =
        createdFixtures.map((fixture) => {
          const plan = fixture.masterTimetableId
            ? planByTimetableId.get(fixture.masterTimetableId)
            : undefined;
          return {
            schoolId: actor.schoolId,
            userId: actor.userId,
            action: fixture.assignedTeacherId
              ? "FIXTURE_AUTO_ASSIGNED"
              : "FIXTURE_UNASSIGNED",
            entityType: "ProxyFixture",
            entityId: fixture.id,
            details: fixture.assignedTeacherId
              ? jsonValue({
                  assignedTeacherId: fixture.assignedTeacherId,
                  score: plan?.selected?.totalScore ?? null,
                })
              : jsonValue({ periodNumber: fixture.periodNumber }),
          };
        });
      await fixturesRepository.createAuditRecords(transaction, [
        ...assignmentAudits,
        {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: "FIXTURES_GENERATED",
          entityType: "ProxyFixture",
          details: jsonValue({
            date: dateValue,
            absentTeacherIds,
            fixtureIds: [
              ...existingFixtures.map((fixture) => fixture.id),
              ...createdFixtures.map((fixture) => fixture.id),
            ],
            affectedMasterTimetableIds: lectures.map((lecture) => lecture.id),
            diagnostics,
          }),
        },
      ]);
      return {
        createdFixtureIds: createdFixtures.map((fixture) => fixture.id),
        diagnostics,
      };
    });
    logTiming("write-transaction-complete", {
      createdFixtures: writeResult.createdFixtureIds.length,
    });

    const fixtures = await fixturesRepository.existingForLectures(
      database,
      actor.schoolId,
      date,
      lectures,
    );
    const fixturesByLectureId = new Map(
      fixtures.map((fixture) => [fixtureLectureKey(fixture), fixture]),
    );
    const orderedFixtures = lectures.flatMap((lecture) => {
      const fixture = fixturesByLectureId.get(fixtureLectureKey(lecture));
      return fixture ? [fixture] : [];
    });
    if (orderedFixtures.length !== lectures.length) {
      throw new ApiError(
        409,
        "FIXTURE_WRITE_CONFLICT",
        "Not every affected lesson could be saved; please retry",
      );
    }
    logTiming("result-hydration-complete", { fixtures: orderedFixtures.length });
    logTiming("complete");
    return {
      fixtures: orderedFixtures,
      diagnostics: writeResult.diagnostics,
    };
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
    const fixture = await fixturesRepository.find(schoolId, fixtureId);
    if (!fixture)
      throw new ApiError(404, "FIXTURE_NOT_FOUND", "Fixture was not found");
    return getEligibleTeachersForFixture(fixturesRepository.database, {
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
  },

  async scoring(schoolId: string, fixtureId: string) {
    const fixture = await fixturesRepository.find(schoolId, fixtureId);
    if (!fixture)
      throw new ApiError(404, "FIXTURE_NOT_FOUND", "Fixture was not found");
    const eligibility = await getEligibleTeachersForFixture(
      fixturesRepository.database,
      {
        schoolId,
        date: fixture.date,
        dayOfWeek: weekdayForDate(fixture.date),
        periodNumber: fixture.periodNumber,
        absentTeacherId: fixture.absentTeacherId,
        subjectName: fixture.subject.name,
        subjectCode: fixture.subject.code,
        classLevel: fixture.classSection.teachingLevel,
        excludeFixtureId: fixture.id,
      },
    );
    return {
      requiredSubject: fixture.subject.name,
      requiredTeachingLevel: fixture.classSection.teachingLevel,
      selectedTeacherId: fixture.assignedTeacherId,
      candidates: eligibility.candidates,
      excluded: eligibility.excluded,
    };
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

  async publish(actor: AuditActor, dateValue: string, requestId: string) {
    const date = parseDateOnly(dateValue);
    const timing = publicationTiming(requestId);
    const drafts = await timing.run(
      "load-draft-fixtures",
      () => fixturesRepository.publicationDrafts(actor.schoolId, date),
      (result) => ({ draftCount: result.length }),
    );
    const fixtureIds = await timing.run(
      "prepare-publication",
      () => {
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
        return drafts.map((fixture) => fixture.id);
      },
      (result) => ({ fixtureCount: result.length }),
    );
    const notificationData = await timing.run(
      "notification-preparation",
      () =>
        drafts.map((fixture) => {
          const assignedTeacher = fixture.assignedTeacher!;
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
              normalizePakistaniWhatsAppNumber(
                assignedTeacher.whatsappNumber,
              ) ?? "";
          } catch {
            // Preserve the entered value so Click-to-Chat can report an
            // invalid number without blocking publication.
          }
          return {
            schoolId: actor.schoolId,
            fixtureId: fixture.id,
            teacherId: assignedTeacher.id,
            destination,
            message: rendered.message,
            provider: "click_to_chat",
            idempotencyKey: fixtureNotificationIdempotencyKey(
              fixture.id,
              assignedTeacher.id,
              fixture.assignmentVersion,
            ),
          } satisfies Prisma.WhatsAppNotificationCreateManyInput;
        }),
      (result) => ({ notificationCount: result.length }),
    );
    const publishedIds = await timing.run(
      "publish-write-transaction",
      () =>
        fixturesRepository.writeTransaction(async (database) => {
          const published = await fixturesRepository.publishDrafts(
            database,
            actor.schoolId,
            date,
            fixtureIds,
            actor.userId,
            new Date(),
          );
          const ids = published.map((fixture) => fixture.id);
          await timing.run("audit-write", () =>
            fixturesRepository.createAuditRecords(
              database,
              ids.length
                ? [
                    {
                      schoolId: actor.schoolId,
                      userId: actor.userId,
                      action: "FIXTURES_PUBLISHED",
                      entityType: "ProxyFixture",
                      details: jsonValue({ date: dateValue, fixtureIds: ids }),
                    },
                  ]
                : [],
            ),
          );
          return ids;
        }),
      (result) => ({ publishedCount: result.length }),
    );
    const publishedIdSet = new Set(publishedIds);
    const notificationsForPublishedFixtures = notificationData.filter(
      (notification) => publishedIdSet.has(notification.fixtureId),
    );
    // READY records are persisted only after fixture publication commits.
    // Click-to-Chat does not automatically invoke a provider; any future
    // network dispatch must also remain outside these database transactions.
    const notificationResult = await timing
      .run(
        "notification-dispatch",
        () =>
          fixturesRepository.writeTransaction(async (database) => {
            const created = await fixturesRepository.createNotificationRecords(
              database,
              notificationsForPublishedFixtures,
            );
            await fixturesRepository.createAuditRecords(
              database,
              created.map((notification) => ({
                schoolId: actor.schoolId,
                userId: actor.userId,
                action: "WHATSAPP_NOTIFICATION_CREATED",
                entityType: "WhatsAppNotification",
                entityId: notification.id,
                details: jsonValue({
                  notificationId: notification.id,
                  fixtureId: notification.fixtureId,
                  teacherId: notification.teacherId,
                  provider: "click_to_chat",
                  attemptCount: 0,
                }),
              })),
            );
            return { completed: true, createdCount: created.length };
          }),
        (result) => ({ notificationsCreated: result.createdCount }),
      )
      .catch((error: unknown) => {
        console.error("[fixture-publication-notification-failure]", {
          requestId,
          prismaErrorCode: prismaErrorCode(error),
        });
        return { completed: false, createdCount: 0 };
      });
    const fixtures = await timing.run(
      "final-fetch",
      () => fixturesRepository.publishedFixtures(publishedIds),
      (result) => ({ fixtureCount: result.length }),
    );
    return {
      fixtures,
      publishedCount: publishedIds.length,
      notificationsCreated: notificationResult.createdCount,
      messagesReady: notificationResult.createdCount,
      messagesSent: 0,
      messagesFailed: 0,
      existingNotifications: notificationResult.completed
        ? notificationsForPublishedFixtures.length -
          notificationResult.createdCount
        : 0,
    };
  },
};
