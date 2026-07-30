import type { Prisma } from "@prisma/client";

import { prisma } from "../../prisma/client.js";
import { safeUserSelect } from "../auth/auth.repository.js";

const managedUserWhere = (schoolId: string, userId?: string) =>
  ({
    schoolId,
    role: "TIMETABLE_INCHARGE",
    ...(userId ? { id: userId } : {}),
  }) satisfies Prisma.SystemUserWhereInput;

export const usersRepository = {
  list(schoolId: string) {
    return prisma.systemUser.findMany({
      where: managedUserWhere(schoolId),
      select: safeUserSelect,
      orderBy: { name: "asc" },
    });
  },

  find(schoolId: string, userId: string) {
    return prisma.systemUser.findFirst({
      where: managedUserWhere(schoolId, userId),
      select: safeUserSelect,
    });
  },

  create(data: Prisma.SystemUserCreateInput) {
    return prisma.systemUser.create({ data, select: safeUserSelect });
  },

  update(
    schoolId: string,
    userId: string,
    data: Prisma.SystemUserUpdateManyMutationInput,
  ) {
    return prisma.systemUser.updateMany({
      where: managedUserWhere(schoolId, userId),
      data,
    });
  },
};
