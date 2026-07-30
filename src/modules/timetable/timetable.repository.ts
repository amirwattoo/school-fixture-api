import type { DayOfWeek, Prisma } from "@prisma/client";

import { prisma } from "../../prisma/client.js";

export const timetableInclude = {
  teacher: {
    select: {
      id: true,
      name: true,
      employeeCode: true,
      isActive: true,
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
    excludeId?: string,
  ) {
    return prisma.masterTimetable.findFirst({
      where: {
        schoolId,
        dayOfWeek,
        periodNumber,
        teacherId,
        id: excludeId ? { not: excludeId } : undefined,
      },
      include: timetableInclude,
    });
  },

  classConflict(
    schoolId: string,
    dayOfWeek: DayOfWeek,
    periodNumber: number,
    classSectionId: string,
    excludeId?: string,
  ) {
    return prisma.masterTimetable.findFirst({
      where: {
        schoolId,
        dayOfWeek,
        periodNumber,
        classSectionId,
        id: excludeId ? { not: excludeId } : undefined,
      },
      include: timetableInclude,
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
