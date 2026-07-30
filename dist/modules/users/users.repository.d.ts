import type { Prisma } from "@prisma/client";
export declare const usersRepository: {
    list(schoolId: string): Prisma.PrismaPromise<{
        name: string;
        school: {
            name: string;
            id: string;
            shortName: string | null;
            timezone: string;
            academicYear: string;
            periodsPerDay: number;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        email: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        mustChangePassword: boolean;
        lastLoginAt: Date | null;
    }[]>;
    find(schoolId: string, userId: string): Prisma.Prisma__SystemUserClient<{
        name: string;
        school: {
            name: string;
            id: string;
            shortName: string | null;
            timezone: string;
            academicYear: string;
            periodsPerDay: number;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        email: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        mustChangePassword: boolean;
        lastLoginAt: Date | null;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    create(data: Prisma.SystemUserCreateInput): Prisma.Prisma__SystemUserClient<{
        name: string;
        school: {
            name: string;
            id: string;
            shortName: string | null;
            timezone: string;
            academicYear: string;
            periodsPerDay: number;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        email: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        mustChangePassword: boolean;
        lastLoginAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    update(schoolId: string, userId: string, data: Prisma.SystemUserUpdateManyMutationInput): Prisma.PrismaPromise<Prisma.BatchPayload>;
};
//# sourceMappingURL=users.repository.d.ts.map