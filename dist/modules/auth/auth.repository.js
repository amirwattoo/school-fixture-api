import { prisma } from "../../prisma/client.js";
export const safeUserSelect = {
    id: true,
    schoolId: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    mustChangePassword: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
    school: {
        select: {
            id: true,
            name: true,
            shortName: true,
            timezone: true,
            academicYear: true,
            periodsPerDay: true,
        },
    },
};
export const authRepository = {
    findUserForLogin(email) {
        return prisma.systemUser.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            include: { school: true },
        });
    },
    findActiveUser(userId, schoolId) {
        return prisma.systemUser.findFirst({
            where: {
                id: userId,
                schoolId,
                isActive: true,
            },
            select: safeUserSelect,
        });
    },
    findUserWithPassword(userId, schoolId) {
        return prisma.systemUser.findFirst({
            where: { id: userId, schoolId, isActive: true },
            include: { school: true },
        });
    },
    createRefreshToken(userId, tokenHash, expiresAt) {
        return prisma.refreshToken.create({
            data: { userId, tokenHash, expiresAt },
        });
    },
    findRefreshToken(tokenHash) {
        return prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: { user: { include: { school: true } } },
        });
    },
};
//# sourceMappingURL=auth.repository.js.map