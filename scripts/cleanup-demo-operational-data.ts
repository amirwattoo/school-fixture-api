import type { Prisma } from "@prisma/client";

import { prisma } from "../src/prisma/client.js";

const PRINCIPAL_EMAIL = "amirwattoo831@gmail.com";
const OPERATIONAL_AUDIT_ENTITY_TYPES = [
  "ProxyFixture",
  "WhatsAppNotification",
  "DailyAttendance",
  "TeacherFixtureSummary",
];

const operationalCounts = async (
  database: Prisma.TransactionClient,
  schoolId: string,
) => {
  const [
    fixtures,
    draftFixtures,
    publishedFixtures,
    cancelledFixtures,
    assignedFixtures,
    overriddenFixtures,
    notifications,
    operationalAuditHistory,
    attendanceExceptions,
    workloadRecords,
  ] = await Promise.all([
    database.proxyFixture.count({ where: { schoolId } }),
    database.proxyFixture.count({ where: { schoolId, status: "DRAFT" } }),
    database.proxyFixture.count({
      where: { schoolId, status: "PUBLISHED" },
    }),
    database.proxyFixture.count({
      where: { schoolId, status: "CANCELLED" },
    }),
    database.proxyFixture.count({
      where: { schoolId, assignedTeacherId: { not: null } },
    }),
    database.proxyFixture.count({
      where: {
        schoolId,
        OR: [
          { isManuallyOverridden: true },
          { overriddenById: { not: null } },
          { overrideReason: { not: null } },
        ],
      },
    }),
    database.whatsAppNotification.count({ where: { schoolId } }),
    database.auditLog.count({
      where: {
        schoolId,
        entityType: { in: OPERATIONAL_AUDIT_ENTITY_TYPES },
      },
    }),
    database.dailyAttendance.count({ where: { schoolId } }),
    database.teacherFixtureSummary.count({ where: { schoolId } }),
  ]);

  return {
    fixtures,
    draftFixtures,
    publishedFixtures,
    cancelledFixtures,
    assignedFixtures,
    overriddenFixtures,
    notifications,
    operationalAuditHistory,
    attendanceExceptions,
    workloadRecords,
  };
};

const preservedCounts = async (
  database: Prisma.TransactionClient,
  schoolId: string,
) => {
  const [schools, users, teachers, classes, subjects, timetableEntries] =
    await Promise.all([
      database.school.count({ where: { id: schoolId } }),
      database.systemUser.count({ where: { schoolId } }),
      database.teacher.count({ where: { schoolId } }),
      database.classSection.count({ where: { schoolId } }),
      database.subject.count({ where: { schoolId } }),
      database.masterTimetable.count({ where: { schoolId } }),
    ]);

  return {
    schools,
    users,
    teachers,
    classes,
    subjects,
    timetableEntries,
  };
};

try {
  const principals = await prisma.systemUser.findMany({
    where: {
      email: { equals: PRINCIPAL_EMAIL, mode: "insensitive" },
      role: "PRINCIPAL",
    },
    select: {
      id: true,
      email: true,
      school: {
        select: {
          id: true,
          name: true,
          shortName: true,
          timezone: true,
        },
      },
    },
  });

  if (principals.length !== 1) {
    throw new Error(
      `Expected exactly one principal account for ${PRINCIPAL_EMAIL}; found ${principals.length}`,
    );
  }

  const principal = principals[0]!;
  const schoolId = principal.school.id;

  const result = await prisma.$transaction(async (database) => {
    const before = await operationalCounts(database, schoolId);
    const preservedBefore = await preservedCounts(database, schoolId);

    const notifications = await database.whatsAppNotification.deleteMany({
      where: { schoolId },
    });
    const operationalAuditHistory = await database.auditLog.deleteMany({
      where: {
        schoolId,
        entityType: { in: OPERATIONAL_AUDIT_ENTITY_TYPES },
      },
    });
    const fixtures = await database.proxyFixture.deleteMany({
      where: { schoolId },
    });
    const attendanceExceptions = await database.dailyAttendance.deleteMany({
      where: { schoolId },
    });
    const workloadRecords = await database.teacherFixtureSummary.deleteMany({
      where: { schoolId },
    });

    const after = await operationalCounts(database, schoolId);
    const preservedAfter = await preservedCounts(database, schoolId);

    if (
      after.fixtures !== 0 ||
      after.notifications !== 0 ||
      after.operationalAuditHistory !== 0 ||
      after.attendanceExceptions !== 0 ||
      after.workloadRecords !== 0
    ) {
      throw new Error("Operational cleanup verification failed");
    }

    if (JSON.stringify(preservedAfter) !== JSON.stringify(preservedBefore)) {
      throw new Error("Preserved school data changed during cleanup");
    }

    return {
      school: principal.school,
      principal: { id: principal.id, email: principal.email },
      before,
      deleted: {
        fixtures: fixtures.count,
        notifications: notifications.count,
        operationalAuditHistory: operationalAuditHistory.count,
        embeddedFixtureOverrides: before.overriddenFixtures,
        fixtureAssignments: before.assignedFixtures,
        attendanceExceptions: attendanceExceptions.count,
        workloadRecords: workloadRecords.count,
      },
      after,
      preservedBefore,
      preservedAfter,
    };
  });

  console.log("School-scoped operational data counts before deletion:");
  console.log(JSON.stringify(result.before, null, 2));
  console.log("School-scoped deletion result:");
  console.log(JSON.stringify(result.deleted, null, 2));
  console.log("School-scoped operational data counts after deletion:");
  console.log(JSON.stringify(result.after, null, 2));
  console.log("Preserved core data counts:");
  console.log(JSON.stringify(result.preservedAfter, null, 2));
  console.log("Cleanup completed:");
  console.log(
    JSON.stringify(
      {
        school: result.school,
        principal: result.principal,
        remainingFixtureCount: result.after.fixtures,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
