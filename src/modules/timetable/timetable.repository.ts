import type { DayOfWeek, Prisma } from "@prisma/client";

import { prisma } from "../../prisma/client.js";

export const timetableInclude = {
  teacher: {
    select: {
      id: true,
      name: true,
      employeeCode: true,
      isActive: true,
      baseWeeklyTeachingPeriods: true,
    },
  },
  classSection: {
    select: {
      id: true,
      name: true,
      gradeNumber: true,
      section: true,
      isActive: true,
    },
  },
  subject: {
    select: { id: true, name: true, code: true, isActive: true },
  },
} satisfies Prisma.MasterTimetableInclude;

type Filters = {
  dayOfWeek?: DayOfWeek;
  teacherId?: string;
  classSectionId?: string;
  subjectId?: string;
};

export const timetableRepository = {
  list(schoolId: string, filters: Filters) {
    return prisma.masterTimetable.findMany({
      where: { schoolId, ...filters },
      include: timetableInclude,
      take: 1000,
    });
  },

  async grid(schoolId: string) {
    const [school, entries, classes, teachers, subjects] = await Promise.all([
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, periodsPerDay: true },
      }),
      prisma.masterTimetable.findMany({
        where: { schoolId },
        select: {
          id: true,
          dayOfWeek: true,
          periodNumber: true,
          classSectionId: true,
          teacherId: true,
          subjectId: true,
        },
        orderBy: [
          { periodNumber: "asc" },
          { classSection: { name: "asc" } },
          { teacher: { name: "asc" } },
        ],
        take: 2001,
      }),
      prisma.classSection.findMany({
        where: { schoolId, isActive: true },
        select: { id: true, name: true, gradeNumber: true, section: true },
        orderBy: [{ gradeNumber: "asc" }, { name: "asc" }],
        take: 201,
      }),
      prisma.teacher.findMany({
        where: { schoolId, isActive: true },
        select: {
          id: true,
          name: true,
          employeeCode: true,
          baseWeeklyTeachingPeriods: true,
        },
        orderBy: { name: "asc" },
        take: 501,
      }),
      prisma.subject.findMany({
        where: { schoolId, isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
        take: 201,
      }),
    ]);
    return { school, entries, classes, teachers, subjects };
  },

  find(schoolId: string, entryId: string) {
    return prisma.masterTimetable.findFirst({
      where: { id: entryId, schoolId },
      include: timetableInclude,
    });
  },

  school(schoolId: string) {
    return prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, periodsPerDay: true },
    });
  },

  teacher(schoolId: string, teacherId: string) {
    return prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
    });
  },

  subject(schoolId: string, subjectId: string) {
    return prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
    });
  },

  classSection(schoolId: string, classSectionId: string) {
    return prisma.classSection.findFirst({
      where: { id: classSectionId, schoolId },
    });
  },

  teacherConflict(
    schoolId: string,
    dayOfWeek: DayOfWeek,
    periodNumber: number,
    teacherId: string,
    classSectionId: string,
    excludeId?: string,
  ) {
    return prisma.masterTimetable.findFirst({
      where: {
        schoolId,
        dayOfWeek,
        periodNumber,
        teacherId,
        classSectionId: { not: classSectionId },
        id: excludeId ? { not: excludeId } : undefined,
      },
      include: timetableInclude,
    });
  },

  exactConflict(
    schoolId: string,
    dayOfWeek: DayOfWeek,
    periodNumber: number,
    classSectionId: string,
    teacherId: string,
    subjectId: string,
    excludeId?: string,
  ) {
    return prisma.masterTimetable.findFirst({
      where: {
        schoolId,
        dayOfWeek,
        periodNumber,
        classSectionId,
        teacherId,
        subjectId,
        id: excludeId ? { not: excludeId } : undefined,
      },
      include: timetableInclude,
    });
  },

  fixtureReference(schoolId: string, entryId: string) {
    return prisma.proxyFixture.findFirst({
      where: { schoolId, masterTimetableId: entryId },
      select: { id: true, date: true },
    });
  },

  create(data: Prisma.MasterTimetableUncheckedCreateInput) {
    return prisma.masterTimetable.create({
      data,
      include: timetableInclude,
    });
  },

  update(entryId: string, data: Prisma.MasterTimetableUpdateInput) {
    return prisma.masterTimetable.update({
      where: { id: entryId },
      data,
      include: timetableInclude,
    });
  },

  delete(entryId: string) {
    return prisma.masterTimetable.delete({
      where: { id: entryId },
      include: timetableInclude,
    });
  },
};
