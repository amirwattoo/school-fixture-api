import { prisma } from "../../prisma/client.js";
export const teachersRepository = {
    list(schoolId, filters) {
        const where = {
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
    find(schoolId, teacherId) {
        return prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    },
    create(data) {
        return prisma.teacher.create({ data });
    },
    update(teacherId, data) {
        return prisma.teacher.update({ where: { id: teacherId }, data });
    },
};
//# sourceMappingURL=teachers.repository.js.map