import type { Prisma } from "@prisma/client";
export type AuditActor = {
    userId: string;
    schoolId: string;
};
export declare const createAuditLog: (actor: AuditActor, action: string, entityType: string, entityId: string, details?: unknown) => Prisma.Prisma__AuditLogClient<{
    details: Prisma.JsonValue | null;
    id: string;
    createdAt: Date;
    schoolId: string;
    userId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
//# sourceMappingURL=audit.d.ts.map