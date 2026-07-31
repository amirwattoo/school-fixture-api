import type { DayOfWeek, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../prisma/client.js";

export type FixtureDb = Pick<
  PrismaClient,
  | "auditLog"
  | "dailyAttendance"
  | "masterTimetable"
  | "proxyFixture"
  | "school"
  | "teacher"
  | "teacherFixtureSummary"
  | "whatsAppNotification"
>;

export const fixtureInclude = {
  classSection: {
    select: {
      id: true,
      name: true,
      gradeNumber: true,
      section: true,
      teachingLevel: true,
    },
  },
  subject: { select: { id: true, name: true, code: true } },
  absentTeacher: {
    select: { id: true, name: true, employeeCode: true },
  },
  assignedTeacher: {
    select: {
      id: true,
      name: true,
      employeeCode: true,
      whatsappNumber: true,
    },
  },
  autoAssignedTeacher: {
    select: { id: true, name: true, employeeCode: true },
  },
} satisfies Prisma.ProxyFixtureInclude;

export const fixturesRepository = {
  database: prisma as FixtureDb,

  transaction<T>(callback: (transaction: FixtureDb) => Promise<T>) {
    return prisma.$transaction(callback, {
      isolationLevel: "Serializable",
      maxWait: 15000,
      timeout: 60000,
    });
  },

  list(schoolId: string, date: Date) {
    return prisma.proxyFixture.findMany({
      where: { schoolId, date },
      include: fixtureInclude,
      orderBy: [{ periodNumber: "asc" }, { classSection: { name: "asc" } }],
    });
  },

  find(schoolId: string, fixtureId: string) {
    return prisma.proxyFixture.findFirst({
      where: { id: fixtureId, schoolId },
      include: fixtureInclude,
    });
  },

  schoolSettings(database: FixtureDb, schoolId: string) {
    return database.school.findUnique({
      where: { id: schoolId },
      select: { timezone: true },
    });
  },

  absentTeachers(database: FixtureDb, schoolId: string, teacherIds: string[]) {
    return database.teacher.findMany({
      where: { schoolId, id: { in: teacherIds } },
      select: { id: true, name: true, schoolId: true, isActive: true },
    });
  },

  teacherDiagnostics(database: FixtureDb, teacherIds: string[]) {
    return database.teacher.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, name: true, schoolId: true },
    });
  },

  attendance(
    database: FixtureDb,
    schoolId: string,
    date: Date,
    teacherIds: string[],
  ) {
    return database.dailyAttendance.findMany({
      where: { schoolId, date, teacherId: { in: teacherIds } },
      select: {
        teacherId: true,
        status: true,
        availableFromPeriod: true,
        unavailableFromPeriod: true,
      },
    });
  },

  absentLectures(
    database: FixtureDb,
    schoolId: string,
    dayOfWeek: DayOfWeek,
    teacherIds: string[],
  ) {
    return database.masterTimetable.findMany({
      where: { schoolId, dayOfWeek, teacherId: { in: teacherIds } },
      include: {
        teacher: true,
        subject: true,
        classSection: true,
      },
      orderBy: [{ periodNumber: "asc" }, { classSection: { name: "asc" } }],
    });
  },

  existingForLecture(
    database: FixtureDb,
    schoolId: string,
    date: Date,
    lecture: {
      id: string;
      periodNumber: number;
      classSectionId: string;
      teacherId: string;
      subjectId: string;
    },
  ) {
    return database.proxyFixture.findFirst({
      where: {
        schoolId,
        date,
        periodNumber: lecture.periodNumber,
        classSectionId: lecture.classSectionId,
        absentTeacherId: lecture.teacherId,
      },
      include: fixtureInclude,
    });
  },

  existingForLectures(
    database: FixtureDb,
    schoolId: string,
    date: Date,
    lectures: Array<{
      id: string;
      periodNumber: number;
      classSectionId: string;
      teacherId: string;
    }>,
  ) {
    if (!lectures.length) return Promise.resolve([]);
    return database.proxyFixture.findMany({
      where: {
        schoolId,
        date,
        OR: [
          { masterTimetableId: { in: lectures.map((lecture) => lecture.id) } },
          ...lectures.map((lecture) => ({
            periodNumber: lecture.periodNumber,
            classSectionId: lecture.classSectionId,
            absentTeacherId: lecture.teacherId,
          })),
        ],
      },
      include: fixtureInclude,
    });
  },

  eligibilityPool(database: FixtureDb, schoolId: string, date: Date) {
    return database.teacher.findMany({
      where: {
        schoolId,
      },
      include: {
        dailyAttendances: {
          where: { schoolId, date },
          select: {
            status: true,
            availableFromPeriod: true,
            unavailableFromPeriod: true,
          },
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
  },

  regularBusyTeacherIds(
    database: FixtureDb,
    schoolId: string,
    dayOfWeek: DayOfWeek,
    periodNumber: number,
  ) {
    return database.masterTimetable.findMany({
      where: { schoolId, dayOfWeek, periodNumber },
      select: { teacherId: true },
    });
  },

  regularBusyPeriods(
    database: FixtureDb,
    schoolId: string,
    dayOfWeek: DayOfWeek,
  ) {
    return database.masterTimetable.findMany({
      where: { schoolId, dayOfWeek },
      select: { periodNumber: true, teacherId: true },
    });
  },

  fixtureBusyTeacherIds(
    database: FixtureDb,
    schoolId: string,
    date: Date,
    periodNumber: number,
    excludeFixtureId?: string,
  ) {
    return database.proxyFixture.findMany({
      where: {
        schoolId,
        date,
        periodNumber,
        status: { not: "CANCELLED" },
        assignedTeacherId: { not: null },
        id: excludeFixtureId ? { not: excludeFixtureId } : undefined,
      },
      select: { assignedTeacherId: true },
    });
  },

  fixtureBusyPeriods(database: FixtureDb, schoolId: string, date: Date) {
    return database.proxyFixture.findMany({
      where: {
        schoolId,
        date,
        status: { not: "CANCELLED" },
        assignedTeacherId: { not: null },
      },
      select: { id: true, periodNumber: true, assignedTeacherId: true },
    });
  },

  summaries(
    database: FixtureDb,
    schoolId: string,
    teacherIds: string[],
    year: number,
    weekNumber: number,
  ) {
    return database.teacherFixtureSummary.findMany({
      where: { schoolId, teacherId: { in: teacherIds }, year, weekNumber },
    });
  },

  summariesForWeek(
    database: FixtureDb,
    schoolId: string,
    year: number,
    weekNumber: number,
  ) {
    return database.teacherFixtureSummary.findMany({
      where: { schoolId, year, weekNumber },
      select: { teacherId: true, fixtureCount: true },
    });
  },

  incrementSummary(
    database: FixtureDb,
    schoolId: string,
    teacherId: string,
    year: number,
    weekNumber: number,
  ) {
    return database.teacherFixtureSummary.upsert({
      where: {
        schoolId_teacherId_year_weekNumber: {
          schoolId,
          teacherId,
          year,
          weekNumber,
        },
      },
      update: { fixtureCount: { increment: 1 } },
      create: { schoolId, teacherId, year, weekNumber, fixtureCount: 1 },
    });
  },

  decrementSummary(
    database: FixtureDb,
    schoolId: string,
    teacherId: string,
    year: number,
    weekNumber: number,
  ) {
    return database.teacherFixtureSummary.updateMany({
      where: {
        schoolId,
        teacherId,
        year,
        weekNumber,
        fixtureCount: { gt: 0 },
      },
      data: { fixtureCount: { decrement: 1 } },
    });
  },

  create(database: FixtureDb, data: Prisma.ProxyFixtureUncheckedCreateInput) {
    return database.proxyFixture.create({
      data,
      include: fixtureInclude,
    });
  },

  findForUpdate(database: FixtureDb, schoolId: string, fixtureId: string) {
    return database.proxyFixture.findFirst({
      where: { id: fixtureId, schoolId },
      include: fixtureInclude,
    });
  },

  update(
    database: FixtureDb,
    fixtureId: string,
    data: Prisma.ProxyFixtureUpdateInput,
  ) {
    return database.proxyFixture.update({
      where: { id: fixtureId },
      data,
      include: fixtureInclude,
    });
  },
};
