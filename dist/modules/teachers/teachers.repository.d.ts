import type { Prisma } from "@prisma/client";
export type TeacherFilters = {
    search?: string;
    isActive?: boolean;
    teachingLevel?: "LOWER" | "HIGHER" | "BOTH";
    subject?: string;
};
export declare const teachersRepository: {
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
    find(schoolId: string, teacherId: string): Prisma.Prisma__TeacherClient<{
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
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    create(data: Prisma.TeacherUncheckedCreateInput): Prisma.Prisma__TeacherClient<{
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    update(teacherId: string, data: Prisma.TeacherUpdateInput): Prisma.Prisma__TeacherClient<{
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
};
//# sourceMappingURL=teachers.repository.d.ts.map