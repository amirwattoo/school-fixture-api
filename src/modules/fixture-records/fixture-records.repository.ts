import type { FixtureStatus, Prisma } from "@prisma/client";

import { prisma } from "../../prisma/client.js";

export const fixtureRecordsRepository = {
  teachers(schoolId: string) {
    return prisma.teacher.findMany({
      where: { schoolId },
      select: { id: true, name: true, employeeCode: true, isActive: true },
    });
  },

  weekly(schoolId: string, year: number, weekNumber: number) {
    return prisma.teacherFixtureSummary.findMany({
      where: { schoolId, year, weekNumber },
      select: { teacherId: true, fixtureCount: true },
    });
  },

  yearly(schoolId: string, year: number) {
    return prisma.teacherFixtureSummary.groupBy({
      by: ["teacherId"],
      where: { schoolId, year },
      _sum: { fixtureCount: true },
    });
  },

  teacher(schoolId: string, teacherId: string) {
    return prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      select: { id: true, name: true, employeeCode: true, isActive: true },
    });
  },

  history(
    schoolId: string,
    teacherId: string,
    filters: {
      from?: Date;
      to?: Date;
      status?: FixtureStatus;
      page: number;
      pageSize: number;
    },
  ) {
    const dateFilter: Prisma.DateTimeFilter | undefined =
      filters.from || filters.to
        ? { gte: filters.from, lte: filters.to }
        : undefined;
    const where = {
      schoolId,
      assignedTeacherId: teacherId,
      date: dateFilter,
      status: filters.status,
    } satisfies Prisma.ProxyFixtureWhereInput;
    return prisma.$transaction([
      prisma.proxyFixture.findMany({
        where,
        include: {
          classSection: {
            select: { id: true, name: true, gradeNumber: true, section: true },
          },
          subject: { select: { id: true, name: true, code: true } },
          absentTeacher: {
            select: { id: true, name: true, employeeCode: true },
          },
        },
        orderBy: [{ date: "desc" }, { periodNumber: "asc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.proxyFixture.count({ where }),
    ]);
  },

  attendance(
    schoolId: string,
    filters: {
      from?: Date;
      to?: Date;
      page: number;
      pageSize: number;
    },
  ) {
    const date =
      filters.from || filters.to
        ? { gte: filters.from, lte: filters.to }
        : undefined;
    const where = {
      schoolId,
      date,
      status: { not: "PRESENT" as const },
    } satisfies Prisma.DailyAttendanceWhereInput;
    return prisma.$transaction([
      prisma.dailyAttendance.findMany({
        where,
        include: {
          teacher: {
            select: { id: true, name: true, employeeCode: true },
          },
        },
        orderBy: [{ date: "desc" }, { teacher: { name: "asc" } }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.dailyAttendance.count({ where }),
    ]);
  },

  attendanceFixtureCounts(
    schoolId: string,
    filters: {
      from?: Date;
      to?: Date;
    },
  ) {
    const date =
      filters.from || filters.to
        ? { gte: filters.from, lte: filters.to }
        : undefined;
    return prisma.proxyFixture.groupBy({
      by: ["date", "absentTeacherId"],
      where: { schoolId, date },
      _count: true,
    });
  },

  schoolSettings(schoolId: string) {
    return prisma.school.findUnique({
      where: { id: schoolId },
      select: { periodsPerDay: true, halfDayBoundaryPeriod: true },
    });
  },
};
