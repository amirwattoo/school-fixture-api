import { prisma } from "../../prisma/client.js";
export const classSectionsRepository = {
    list(schoolId, filters) {
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
    find(schoolId, classSectionId) {
        return prisma.classSection.findFirst({
            where: { id: classSectionId, schoolId },
        });
    },
    create(data) {
        return prisma.classSection.create({ data });
    },
    update(classSectionId, data) {
        return prisma.classSection.update({
            where: { id: classSectionId },
            data,
        });
    },
};
//# sourceMappingURL=class-sections.repository.js.map