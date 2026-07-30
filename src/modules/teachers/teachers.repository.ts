import type { Prisma } from "@prisma/client";

import { prisma } from "../../prisma/client.js";

export type TeacherFilters = {
  search?: string;
  isActive?: boolean;
  teachingLevel?: "LOWER" | "HIGHER" | "BOTH";
  subject?: string;
};

export const teachersRepository = {
  list(schoolId: string, filters: TeacherFilters) {
    const where: Prisma.TeacherWhereInput = {
      schoolId,
      isActive: filters.isActive,
      teachingLevel: filters.teachingLevel,
      subjectSpecializations: filters.subject
        ? { has: filters.subject }
        : undefined,
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              {
                employeeCode: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };
    return prisma.teacher.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 200,
    });
  },

  find(schoolId: string, teacherId: string) {
    return prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
  },

  create(data: Prisma.TeacherUncheckedCreateInput) {
    return prisma.teacher.create({ data });
  },

  update(teacherId: string, data: Prisma.TeacherUpdateInput) {
    return prisma.teacher.update({ where: { id: teacherId }, data });
  },
};
