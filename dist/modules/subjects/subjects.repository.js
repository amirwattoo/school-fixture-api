import { prisma } from "../../prisma/client.js";
export const subjectsRepository = {
    list(schoolId, filters) {
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
    find(schoolId, subjectId) {
        return prisma.subject.findFirst({ where: { id: subjectId, schoolId } });
    },
    create(data) {
        return prisma.subject.create({ data });
    },
    update(subjectId, data) {
        return prisma.subject.update({ where: { id: subjectId }, data });
    },
    timetableCount(subjectId) {
        return prisma.masterTimetable.count({ where: { subjectId } });
    },
};
//# sourceMappingURL=subjects.repository.js.map