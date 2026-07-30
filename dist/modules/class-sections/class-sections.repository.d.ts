import type { Prisma } from "@prisma/client";
export declare const classSectionsRepository: {
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
    find(schoolId: string, classSectionId: string): Prisma.Prisma__ClassSectionClient<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        gradeNumber: number | null;
        section: string;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    create(data: Prisma.ClassSectionUncheckedCreateInput): Prisma.Prisma__ClassSectionClient<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        gradeNumber: number | null;
        section: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    update(classSectionId: string, data: Prisma.ClassSectionUpdateInput): Prisma.Prisma__ClassSectionClient<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        gradeNumber: number | null;
        section: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
};
//# sourceMappingURL=class-sections.repository.d.ts.map