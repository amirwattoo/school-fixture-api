import bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";

import { ApiError } from "../../common/api-error.js";
import { databasePhase } from "../../common/request-timing.js";
import { prisma } from "../../prisma/client.js";
import { authRepository, safeUserSelect } from "./auth.repository.js";
import { emailProvider } from "./email-provider.js";
import { env } from "../../config/env.js";
import {
  hashToken,
  refreshLifetimeSeconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./token.service.js";

const DUMMY_PASSWORD_HASH =
  "$2b$12$YkbA4A76WcSD4H1z9Kovpe8.pzsWqBjmofNgElBQHu8Ayt0hJz8EO";

const tokenPayloadFor = (user: {
  id: string;
  schoolId: string;
  role: "PRINCIPAL" | "TIMETABLE_INCHARGE";
}) => ({
  sub: user.id,
  schoolId: user.schoolId,
  role: user.role,
});

const issueSession = async (user: {
  id: string;
  schoolId: string;
  role: "PRINCIPAL" | "TIMETABLE_INCHARGE";
}) => {
  const payload = tokenPayloadFor(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const expiresAt = new Date(Date.now() + refreshLifetimeSeconds * 1000);

  await authRepository.createRefreshToken(
    user.id,
    hashToken(refreshToken),
    expiresAt,
  );

  return { accessToken, refreshToken };
};

export const authService = {
  async login(email: string, password: string) {
    const user = await databasePhase("auth-load-login-user", () =>
      authRepository.findUserForLogin(email),
    );
    const passwordMatches = await bcrypt.compare(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches || !user.isActive) {
      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "Email or password is incorrect",
      );
    }

    const [session, safeUser] = await Promise.all([
      databasePhase("auth-create-session", () => issueSession(user)),
      databasePhase("auth-login-profile-write", async () => {
        const updated = await prisma.systemUser.update({
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
        return updated;
      }),
    ]);

    return { ...session, user: safeUser };
  },

  async refresh(rawToken: string) {
    const payload = verifyRefreshToken(rawToken);
    const stored = await databasePhase("auth-load-refresh-token", () =>
      authRepository.findRefreshToken(hashToken(rawToken)),
    );

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt <= new Date() ||
      stored.userId !== payload.sub ||
      stored.user.schoolId !== payload.schoolId ||
      stored.user.role !== payload.role ||
      !stored.user.isActive
    ) {
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Please sign in again");
    }

    const replacement = {
      accessToken: signAccessToken(tokenPayloadFor(stored.user)),
      refreshToken: signRefreshToken(tokenPayloadFor(stored.user)),
    };
    const replacementExpiry = new Date(
      Date.now() + refreshLifetimeSeconds * 1000,
    );

    await databasePhase("auth-rotate-refresh-token", () =>
      prisma.$transaction([
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
      ]),
    );

    return {
      ...replacement,
      user: stored.user,
    };
  },

  async logout(rawToken?: string) {
    if (!rawToken) return;
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async me(userId: string, schoolId: string) {
    const user = await databasePhase("auth-current-user", () =>
      authRepository.findActiveUser(userId, schoolId),
    );
    if (!user) {
      throw new ApiError(401, "UNAUTHORIZED", "User account is unavailable");
    }
    return user;
  },

  async changePassword(
    userId: string,
    schoolId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await authRepository.findUserWithPassword(userId, schoolId);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new ApiError(
        400,
        "INVALID_CURRENT_PASSWORD",
        "Current password is incorrect",
      );
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

  async requestPasswordReset(email: string, metadata: { ip?: string; userAgent?: string }) {
    const matches = await prisma.systemUser.findMany({
      where: { email: { equals: email, mode: "insensitive" }, isActive: true },
      take: 2,
      select: { id: true, schoolId: true, email: true, name: true },
    });
    // Duplicate cross-school addresses are deliberately not guessed; the generic response remains identical.
    if (matches.length !== 1) return;
    const user = matches[0]!;
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000);
    const metadataHash = (value?: string) => value ? createHash("sha256").update(value).digest("hex") : undefined;
    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          schoolId: user.schoolId,
          tokenHash,
          expiresAt,
          requestedIpHash: metadataHash(metadata.ip),
          userAgentHash: metadataHash(metadata.userAgent),
        },
      }),
      prisma.auditLog.create({
        data: { schoolId: user.schoolId, userId: user.id, action: "PASSWORD_RESET_REQUESTED", entityType: "SystemUser", entityId: user.id },
      }),
    ]);
    void emailProvider.sendPasswordReset({
        to: user.email,
        recipientName: user.name,
        resetUrl: `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(rawToken)}`,
      }).catch(() => {
      console.error("[email-provider]", { event: "password-reset-delivery-failed", provider: env.EMAIL_PROVIDER });
      });
  },

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = hashToken(rawToken);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, schoolId: true, expiresAt: true, usedAt: true, user: { select: { isActive: true } } },
      });
      if (!token || token.usedAt || token.expiresAt <= new Date() || !token.user.isActive) {
        throw new ApiError(400, "INVALID_RESET_TOKEN", "This password reset link is invalid or has expired");
      }
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) throw new ApiError(400, "INVALID_RESET_TOKEN", "This password reset link is invalid or has expired");
      await tx.systemUser.update({ where: { id: token.userId }, data: { passwordHash, mustChangePassword: false } });
      await tx.refreshToken.updateMany({ where: { userId: token.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.passwordResetToken.updateMany({ where: { userId: token.userId, usedAt: null }, data: { usedAt: new Date() } });
      await tx.auditLog.create({ data: { schoolId: token.schoolId, userId: token.userId, action: "PASSWORD_RESET_COMPLETED", entityType: "SystemUser", entityId: token.userId } });
    });
  },

  async updateProfile(userId: string, schoolId: string, input: { name?: string; email?: string }) {
    try {
      const result = await prisma.systemUser.updateMany({
        where: { id: userId, schoolId, isActive: true },
        data: { name: input.name?.trim(), email: input.email?.trim().toLowerCase() },
      });
      if (result.count !== 1) throw new ApiError(404, "USER_NOT_FOUND", "User was not found");
      const user = await authRepository.findActiveUser(userId, schoolId);
      await prisma.auditLog.create({ data: { schoolId, userId, action: "PROFILE_UPDATED", entityType: "SystemUser", entityId: userId, details: { fields: Object.keys(input) } } });
      return user;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(409, "EMAIL_IN_USE", "That email address is already in use for this school");
    }
  },
};
