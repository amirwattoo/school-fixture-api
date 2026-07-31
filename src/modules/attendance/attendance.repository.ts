import { randomUUID } from "node:crypto";

import { Prisma, type AttendanceStatus, type DailyAttendance } from "@prisma/client";

import { ApiError } from "../../common/api-error.js";
import { prisma } from "../../prisma/client.js";
import { attendanceExclusionReason } from "./attendance-availability.js";

export type AttendanceRecordInput = {
  teacherId: string;
  status: AttendanceStatus;
  availableFromPeriod?: number | null;
  unavailableFromPeriod?: number | null;
  reason?: string | null;
  notes?: string | null;
  remarks?: string | null;
};

export const attendanceRepository = {
  list(schoolId: string, date: Date) {
    return prisma.dailyAttendance.findMany({
      where: { schoolId, date },
      include: {
        teacher: {
          select: { id: true, name: true, employeeCode: true, isActive: true },
        },
      },
      orderBy: { teacher: { name: "asc" } },
    });
  },

  activeTeachers(schoolId: string, teacherIds: string[]) {
    return prisma.teacher.findMany({
      where: { schoolId, id: { in: teacherIds }, isActive: true },
      select: { id: true },
    });
  },

  activeTeacherCount(schoolId: string) {
    return prisma.teacher.count({ where: { schoolId, isActive: true } });
  },

  schoolSettings(schoolId: string) {
    return prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        timezone: true,
        periodsPerDay: true,
        halfDayBoundaryPeriod: true,
      },
    });
  },

  fixtureCount(schoolId: string, date: Date) {
    return prisma.proxyFixture.count({ where: { schoolId, date } });
  },

  async saveBulk(
    schoolId: string,
    markedById: string,
    date: Date,
    records: AttendanceRecordInput[],
    confirmPublishedFixtureImpact = false,
  ) {
    const recordByTeacher = new Map(
      records.map((record) => [record.teacherId, record]),
    );
    const assignedFixtures = await prisma.proxyFixture.findMany({
      where: {
        schoolId,
        date,
        assignedTeacherId: { in: records.map((record) => record.teacherId) },
        status: { in: ["DRAFT", "PUBLISHED"] },
      },
      select: {
        id: true,
        assignedTeacherId: true,
        periodNumber: true,
        status: true,
        classSection: { select: { name: true } },
      },
    });
    const publishedAssignments = assignedFixtures.filter(
      (fixture) => fixture.status === "PUBLISHED",
    );
      const affectedPublishedBeforeSave = publishedAssignments.filter(
        (fixture) => {
          const record = fixture.assignedTeacherId
            ? recordByTeacher.get(fixture.assignedTeacherId)
            : undefined;
          return Boolean(
            record &&
            attendanceExclusionReason(
              {
                status: record.status,
                availableFromPeriod: record.availableFromPeriod ?? null,
                unavailableFromPeriod: record.unavailableFromPeriod ?? null,
              },
              fixture.periodNumber,
            ),
          );
        },
      );
      if (
        affectedPublishedBeforeSave.length > 0 &&
        !confirmPublishedFixtureImpact
      ) {
        throw new ApiError(
          409,
          "PUBLISHED_FIXTURE_CONFIRMATION_REQUIRED",
          "This attendance change affects published fixture assignments and requires explicit confirmation",
          {
            fixtures: affectedPublishedBeforeSave.map((fixture) => ({
              fixtureId: fixture.id,
              periodNumber: fixture.periodNumber,
              className: fixture.classSection.name,
            })),
          },
        );
      }
    const draftUpdates = assignedFixtures
      .filter((fixture) => fixture.status === "DRAFT")
      .map((fixture) => ({
        id: fixture.id,
        reason: attendanceExclusionReason(
          {
            status: recordByTeacher.get(fixture.assignedTeacherId!)!.status,
            availableFromPeriod:
              recordByTeacher.get(fixture.assignedTeacherId!)!
                .availableFromPeriod ?? null,
            unavailableFromPeriod:
              recordByTeacher.get(fixture.assignedTeacherId!)!
                .unavailableFromPeriod ?? null,
          },
          fixture.periodNumber,
        ),
      }));
    const affectedDraftFixtureIds = draftUpdates
      .filter((fixture) => fixture.reason)
      .map((fixture) => fixture.id);
    const unaffectedDraftFixtureIds = draftUpdates
      .filter((fixture) => !fixture.reason)
      .map((fixture) => fixture.id);
    const affectedPublishedFixtureIds = affectedPublishedBeforeSave.map(
      (fixture) => fixture.id,
    );
    const values = Prisma.join(
      records.map((record) => {
        const reason =
          record.reason?.trim() || record.remarks?.trim() || null;
        return Prisma.sql`(
          ${randomUUID()}, ${schoolId}, ${date}, ${record.teacherId},
          CAST(${record.status} AS "AttendanceStatus"),
          ${record.availableFromPeriod ?? null},
          ${record.unavailableFromPeriod ?? null},
          ${reason}, ${record.notes?.trim() || null},
          ${record.remarks?.trim() || null}, ${markedById},
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )`;
      }),
    );

    return prisma.$transaction(async (transaction) => {
      const saved = await transaction.$queryRaw<DailyAttendance[]>(Prisma.sql`
        INSERT INTO "daily_attendance" (
          "id", "schoolId", "date", "teacherId", "status",
          "availableFromPeriod", "unavailableFromPeriod", "reason", "notes",
          "remarks", "markedById", "createdAt", "updatedAt"
        )
        VALUES ${values}
        ON CONFLICT ("schoolId", "date", "teacherId") DO UPDATE SET
          "status" = EXCLUDED."status",
          "availableFromPeriod" = EXCLUDED."availableFromPeriod",
          "unavailableFromPeriod" = EXCLUDED."unavailableFromPeriod",
          "reason" = EXCLUDED."reason",
          "notes" = EXCLUDED."notes",
          "remarks" = EXCLUDED."remarks",
          "markedById" = EXCLUDED."markedById",
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING *
      `);
      if (affectedDraftFixtureIds.length) {
        const affectedUpdates = draftUpdates.filter((fixture) => fixture.reason);
        const reasonCases = Prisma.join(
          affectedUpdates.map(
            (fixture) =>
              Prisma.sql`WHEN ${fixture.id} THEN ${fixture.reason ?? ""}`,
          ),
          " ",
        );
        const affectedIds = Prisma.join(
          affectedUpdates.map((fixture) => fixture.id),
        );
        await transaction.$executeRaw(Prisma.sql`
          UPDATE "proxy_fixtures"
          SET
            "requiresReassignment" = true,
            "reassignmentReason" = CASE "id" ${reasonCases} END,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" IN (${affectedIds}) AND "status" = 'DRAFT'
        `);
      }
      if (unaffectedDraftFixtureIds.length) {
        await transaction.proxyFixture.updateMany({
          where: { id: { in: unaffectedDraftFixtureIds }, status: "DRAFT" },
          data: { requiresReassignment: false, reassignmentReason: null },
        });
      }
      await transaction.auditLog.create({
        data: {
          schoolId,
          userId: markedById,
          action: "ATTENDANCE_SAVED",
          entityType: "DailyAttendance",
          details: {
            date: date.toISOString().slice(0, 10),
            records: records as unknown as Prisma.InputJsonValue,
            affectedDraftFixtureIds,
            affectedPublishedFixtureIds,
            publishedFixtureImpactConfirmed:
              confirmPublishedFixtureImpact &&
              affectedPublishedFixtureIds.length > 0,
          },
        },
      });
      const savedByTeacher = new Map(
        saved.map((record) => [record.teacherId, record]),
      );
      return {
        records: records.map((record) => savedByTeacher.get(record.teacherId)!),
        affectedDraftFixtureIds,
        affectedPublishedFixtureIds,
      };
    }, {
      isolationLevel: "ReadCommitted",
      maxWait: 5000,
      timeout: 5000,
    });
  },

  delete(schoolId: string, teacherId: string, date: Date, userId: string) {
    return prisma.$transaction(async (transaction) => {
      const deleted = await transaction.dailyAttendance.deleteMany({
        where: { schoolId, teacherId, date },
      });
      await transaction.proxyFixture.updateMany({
        where: {
          schoolId,
          date,
          assignedTeacherId: teacherId,
          status: "DRAFT",
          requiresReassignment: true,
        },
        data: { requiresReassignment: false, reassignmentReason: null },
      });
      await transaction.auditLog.create({
        data: {
          schoolId,
          userId,
          action: "ATTENDANCE_EXCEPTION_REMOVED",
          entityType: "DailyAttendance",
          details: { teacherId, date: date.toISOString().slice(0, 10) },
        },
      });
      return deleted.count;
    });
  },
};
