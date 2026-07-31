import type { Prisma } from "@prisma/client";

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
} satisfies Prisma.SystemUserSelect;

export const authRepository = {
  findUserForLogin(email: string) {
    return prisma.systemUser.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, schoolId: true, role: true, isActive: true, passwordHash: true },
    });
  },

  findActiveUser(userId: string, schoolId: string) {
    return prisma.systemUser.findFirst({
      where: {
        id: userId,
        schoolId,
        isActive: true,
      },
      select: safeUserSelect,
    });
  },

  findUserWithPassword(userId: string, schoolId: string) {
    return prisma.systemUser.findFirst({
      where: { id: userId, schoolId, isActive: true },
      select: { id: true, passwordHash: true },
    });
  },

  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  },

  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: { select: safeUserSelect },
      },
    });
  },
};
