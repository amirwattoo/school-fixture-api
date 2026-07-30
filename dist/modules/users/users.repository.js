import { prisma } from "../../prisma/client.js";
import { safeUserSelect } from "../auth/auth.repository.js";
const managedUserWhere = (schoolId, userId) => ({
    schoolId,
    role: "TIMETABLE_INCHARGE",
    ...(userId ? { id: userId } : {}),
});
export const usersRepository = {
    list(schoolId) {
        return prisma.systemUser.findMany({
            where: managedUserWhere(schoolId),
            select: safeUserSelect,
            orderBy: { name: "asc" },
        });
    },
    find(schoolId, userId) {
        return prisma.systemUser.findFirst({
            where: managedUserWhere(schoolId, userId),
            select: safeUserSelect,
        });
    },
    create(data) {
        return prisma.systemUser.create({ data, select: safeUserSelect });
    },
    update(schoolId, userId, data) {
        return prisma.systemUser.updateMany({
            where: managedUserWhere(schoolId, userId),
            data,
        });
    },
};
//# sourceMappingURL=users.repository.js.map