import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

import { ApiError } from "../../common/api-error.js";
import { prisma } from "../../prisma/client.js";
import { usersRepository } from "./users.repository.js";

type Actor = { userId: string; schoolId: string };

const duplicateEmailError = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new ApiError(
      409,
      "EMAIL_IN_USE",
      "That email address is already in use",
    );
  }
  throw error;
};

export const usersService = {
  list(schoolId: string) {
    return usersRepository.list(schoolId);
  },

  async create(
    actor: Actor,
    input: { name: string; email: string; temporaryPassword: string },
  ) {
    try {
      const user = await usersRepository.create({
        school: { connect: { id: actor.schoolId } },
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: await bcrypt.hash(input.temporaryPassword, 12),
        role: "TIMETABLE_INCHARGE",
        mustChangePassword: true,
      });

      await prisma.auditLog.create({
        data: {
          schoolId: actor.schoolId,
          userId: actor.userId,
          action: "USER_CREATED",
          entityType: "SystemUser",
          entityId: user.id,
        },
      });
      return user;
    } catch (error) {
      duplicateEmailError(error);
    }
  },

  async update(
    actor: Actor,
    userId: string,
    input: {
      name?: string;
      email?: string;
      isActive?: boolean;
      temporaryPassword?: string;
    },
  ) {
    const existing = await usersRepository.find(actor.schoolId, userId);
    if (!existing) {
      throw new ApiError(404, "USER_NOT_FOUND", "User was not found");
    }

    const passwordHash = input.temporaryPassword
      ? await bcrypt.hash(input.temporaryPassword, 12)
      : undefined;
    try {
      await prisma.$transaction(async (transaction) => {
        const result = await transaction.systemUser.updateMany({
          where: {
            id: userId,
            schoolId: actor.schoolId,
            role: "TIMETABLE_INCHARGE",
          },
          data: {
            name: input.name,
            email: input.email?.toLowerCase(),
            isActive: input.isActive,
            passwordHash,
            ...(passwordHash ? { mustChangePassword: true } : {}),
          },
        });
        if (result.count !== 1) {
          throw new ApiError(404, "USER_NOT_FOUND", "User was not found");
        }

        if (passwordHash || input.isActive === false) {
          await transaction.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }

        await transaction.auditLog.create({
          data: {
            schoolId: actor.schoolId,
            userId: actor.userId,
            action: passwordHash ? "USER_PASSWORD_RESET" : "USER_UPDATED",
            entityType: "SystemUser",
            entityId: userId,
            details: {
              changedFields: Object.keys(input),
            },
          },
        });
      });
    } catch (error) {
      duplicateEmailError(error);
    }

    return usersRepository.find(actor.schoolId, userId);
  },
};
