import { Prisma } from "@prisma/client";
import { type AuditActor } from "../../common/audit.js";
export declare const classSectionsService: {
    list(schoolId: string, filters: {
        gradeNumber?: number;
        isActive?: boolean;
    }): Prisma.PrismaPromise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        gradeNumber: number | null;
        section: string;
    }[]>;
    get(schoolId: string, classSectionId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        gradeNumber: number | null;
        section: string;
    }>;
    create(actor: AuditActor, input: {
        gradeNumber: number;
        section: string;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        gradeNumber: number | null;
        section: string;
    } | undefined>;
    update(actor: AuditActor, classSectionId: string, input: {
        gradeNumber?: number;
        section?: string;
        isActive?: boolean;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        gradeNumber: number | null;
        section: string;
    } | undefined>;
    disable(actor: AuditActor, classSectionId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        gradeNumber: number | null;
        section: string;
    }>;
};
//# sourceMappingURL=class-sections.service.d.ts.map