import { prisma } from "../prisma/client.js";
export const createAuditLog = (actor, action, entityType, entityId, details) => prisma.auditLog.create({
    data: {
        schoolId: actor.schoolId,
        userId: actor.userId,
        action,
        entityType,
        entityId,
        details: details === undefined
            ? undefined
            : JSON.parse(JSON.stringify(details)),
    },
});
//# sourceMappingURL=audit.js.map