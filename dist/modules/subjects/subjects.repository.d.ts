import type { Prisma } from "@prisma/client";
export declare const subjectsRepository: {
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
    find(schoolId: string, subjectId: string): Prisma.Prisma__SubjectClient<{
        code: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    create(data: Prisma.SubjectUncheckedCreateInput): Prisma.Prisma__SubjectClient<{
        code: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    update(subjectId: string, data: Prisma.SubjectUpdateInput): Prisma.Prisma__SubjectClient<{
        code: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    timetableCount(subjectId: string): Prisma.PrismaPromise<number>;
};
//# sourceMappingURL=subjects.repository.d.ts.map