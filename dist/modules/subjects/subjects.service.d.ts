import { Prisma } from "@prisma/client";
import { type AuditActor } from "../../common/audit.js";
export declare const subjectsService: {
    list(schoolId: string, filters: {
        search?: string;
        isActive?: boolean;
    }): Prisma.PrismaPromise<{
        code: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
    }[]>;
    get(schoolId: string, subjectId: string): Promise<{
        code: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
    }>;
    create(actor: AuditActor, input: {
        name: string;
        code: string;
    }): Promise<{
        code: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
    } | undefined>;
    update(actor: AuditActor, subjectId: string, input: {
        name?: string;
        code?: string;
        isActive?: boolean;
    }): Promise<{
        code: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
    } | undefined>;
    disable(actor: AuditActor, subjectId: string): Promise<{
        code: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
    }>;
};
//# sourceMappingURL=subjects.service.d.ts.map