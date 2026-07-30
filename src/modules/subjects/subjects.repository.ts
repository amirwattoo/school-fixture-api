import type { Prisma } from "@prisma/client";

import { prisma } from "../../prisma/client.js";

export const subjectsRepository = {
  list(schoolId: string, filters: { search?: string; isActive?: boolean }) {
    return prisma.subject.findMany({
      where: {
        schoolId,
        isActive: filters.isActive,
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                { code: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 200,
    });
  },

  find(schoolId: string, subjectId: string) {
    return prisma.subject.findFirst({ where: { id: subjectId, schoolId } });
  },

  create(data: Prisma.SubjectUncheckedCreateInput) {
    return prisma.subject.create({ data });
  },

  update(subjectId: string, data: Prisma.SubjectUpdateInput) {
    return prisma.subject.update({ where: { id: subjectId }, data });
  },

  timetableCount(subjectId: string) {
    return prisma.masterTimetable.count({ where: { subjectId } });
  },
};
