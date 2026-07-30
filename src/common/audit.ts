import type { Prisma } from "@prisma/client";

import { prisma } from "../prisma/client.js";

export type AuditActor = {
  userId: string;
  schoolId: string;
};

export const createAuditLog = (
  actor: AuditActor,
  action: string,
  entityType: string,
  entityId: string,
  details?: unknown,
) =>
  prisma.auditLog.create({
    data: {
      schoolId: actor.schoolId,
      userId: actor.userId,
      action,
      entityType,
      entityId,
      details:
        details === undefined
          ? undefined
          : (JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue),
    },
  });
