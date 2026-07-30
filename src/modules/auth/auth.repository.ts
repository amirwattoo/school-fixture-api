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
      include: { school: true },
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
      include: { school: true },
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
      include: { user: { include: { school: true } } },
    });
  },
};
