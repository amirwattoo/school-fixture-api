import bcrypt from "bcrypt";
import { ApiError } from "../../common/api-error.js";
import { prisma } from "../../prisma/client.js";
import { authRepository, safeUserSelect } from "./auth.repository.js";
import { hashToken, refreshLifetimeSeconds, signAccessToken, signRefreshToken, verifyRefreshToken, } from "./token.service.js";
const DUMMY_PASSWORD_HASH = "$2b$12$YkbA4A76WcSD4H1z9Kovpe8.pzsWqBjmofNgElBQHu8Ayt0hJz8EO";
const tokenPayloadFor = (user) => ({
    sub: user.id,
    schoolId: user.schoolId,
    role: user.role,
});
const issueSession = async (user) => {
    const payload = tokenPayloadFor(user);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const expiresAt = new Date(Date.now() + refreshLifetimeSeconds * 1000);
    await authRepository.createRefreshToken(user.id, hashToken(refreshToken), expiresAt);
    return { accessToken, refreshToken };
};
export const authService = {
    async login(email, password) {
        const user = await authRepository.findUserForLogin(email);
        const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
        if (!user || !passwordMatches || !user.isActive) {
            throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
        }
        const session = await issueSession(user);
        const safeUser = await prisma.systemUser.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
            select: safeUserSelect,
        });
        await prisma.auditLog.create({
            data: {
                schoolId: user.schoolId,
                userId: user.id,
                action: "LOGIN",
                entityType: "SystemUser",
                entityId: user.id,
            },
        });
        return { ...session, user: safeUser };
    },
    async refresh(rawToken) {
        const payload = verifyRefreshToken(rawToken);
        const stored = await authRepository.findRefreshToken(hashToken(rawToken));
        if (!stored ||
            stored.revokedAt ||
            stored.expiresAt <= new Date() ||
            stored.userId !== payload.sub ||
            stored.user.schoolId !== payload.schoolId ||
            stored.user.role !== payload.role ||
            !stored.user.isActive) {
            throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Please sign in again");
        }
        const replacement = {
            accessToken: signAccessToken(tokenPayloadFor(stored.user)),
            refreshToken: signRefreshToken(tokenPayloadFor(stored.user)),
        };
        const replacementExpiry = new Date(Date.now() + refreshLifetimeSeconds * 1000);
        await prisma.$transaction([
            prisma.refreshToken.update({
                where: { id: stored.id },
                data: { revokedAt: new Date() },
            }),
            prisma.refreshToken.create({
                data: {
                    userId: stored.userId,
                    tokenHash: hashToken(replacement.refreshToken),
                    expiresAt: replacementExpiry,
                },
            }),
        ]);
        return {
            ...replacement,
            user: await authRepository.findActiveUser(stored.userId, stored.user.schoolId),
        };
    },
    async logout(rawToken) {
        if (!rawToken)
            return;
        await prisma.refreshToken.updateMany({
            where: { tokenHash: hashToken(rawToken), revokedAt: null },
            data: { revokedAt: new Date() },
        });
    },
    async me(userId, schoolId) {
        const user = await authRepository.findActiveUser(userId, schoolId);
        if (!user) {
            throw new ApiError(401, "UNAUTHORIZED", "User account is unavailable");
        }
        return user;
    },
    async changePassword(userId, schoolId, currentPassword, newPassword) {
        const user = await authRepository.findUserWithPassword(userId, schoolId);
        if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
            throw new ApiError(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect");
        }
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await prisma.$transaction([
            prisma.systemUser.update({
                where: { id: user.id },
                data: { passwordHash, mustChangePassword: false },
            }),
            prisma.refreshToken.updateMany({
                where: { userId: user.id, revokedAt: null },
                data: { revokedAt: new Date() },
            }),
            prisma.auditLog.create({
                data: {
                    schoolId,
                    userId,
                    action: "PASSWORD_CHANGED",
                    entityType: "SystemUser",
                    entityId: userId,
                },
            }),
        ]);
    },
};
//# sourceMappingURL=auth.service.js.map