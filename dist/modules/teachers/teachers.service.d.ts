import { Prisma } from "@prisma/client";
import { type AuditActor } from "../../common/audit.js";
import { type TeacherFilters } from "./teachers.repository.js";
type TeacherInput = {
    name: string;
    employeeCode: string;
    whatsappNumber?: string | null;
    subjectSpecializations: string[];
    teachingLevel: "LOWER" | "HIGHER" | "BOTH";
};
export declare const teachersService: {
    list(schoolId: string, filters: TeacherFilters): Prisma.PrismaPromise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        employeeCode: string;
        whatsappNumber: string | null;
        subjectSpecializations: string[];
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        baseWeeklyTeachingPeriods: number;
    }[]>;
    get(schoolId: string, teacherId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        employeeCode: string;
        whatsappNumber: string | null;
        subjectSpecializations: string[];
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        baseWeeklyTeachingPeriods: number;
    }>;
    create(actor: AuditActor, input: TeacherInput): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        employeeCode: string;
        whatsappNumber: string | null;
        subjectSpecializations: string[];
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        baseWeeklyTeachingPeriods: number;
    } | undefined>;
    update(actor: AuditActor, teacherId: string, input: Partial<TeacherInput> & {
        isActive?: boolean;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        employeeCode: string;
        whatsappNumber: string | null;
        subjectSpecializations: string[];
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        baseWeeklyTeachingPeriods: number;
    } | undefined>;
    disable(actor: AuditActor, teacherId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        employeeCode: string;
        whatsappNumber: string | null;
        subjectSpecializations: string[];
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        baseWeeklyTeachingPeriods: number;
    }>;
};
export {};
//# sourceMappingURL=teachers.service.d.ts.map