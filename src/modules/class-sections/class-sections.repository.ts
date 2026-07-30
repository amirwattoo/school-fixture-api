import type { Prisma } from "@prisma/client";

import { prisma } from "../../prisma/client.js";

export const classSectionsRepository = {
  list(
    schoolId: string,
    filters: { gradeNumber?: number; isActive?: boolean },
  ) {
    return prisma.classSection.findMany({
      where: {
        schoolId,
        gradeNumber: filters.gradeNumber,
        isActive: filters.isActive,
      },
      orderBy: [
        { isActive: "desc" },
        { gradeNumber: "asc" },
        { section: "asc" },
      ],
      take: 200,
    });
  },

  find(schoolId: string, classSectionId: string) {
    return prisma.classSection.findFirst({
      where: { id: classSectionId, schoolId },
    });
  },

  create(data: Prisma.ClassSectionUncheckedCreateInput) {
    return prisma.classSection.create({ data });
  },

  update(classSectionId: string, data: Prisma.ClassSectionUpdateInput) {
    return prisma.classSection.update({
      where: { id: classSectionId },
      data,
    });
  },
};
