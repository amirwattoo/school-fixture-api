import type { Prisma } from "@prisma/client";
export declare const safeUserSelect: {
    id: true;
    schoolId: true;
    name: true;
    email: true;
    role: true;
    isActive: true;
    mustChangePassword: true;
    lastLoginAt: true;
    createdAt: true;
    updatedAt: true;
    school: {
        select: {
            id: true;
            name: true;
            shortName: true;
            timezone: true;
            academicYear: true;
            periodsPerDay: true;
        };
    };
};
export declare const authRepository: {
    findUserForLogin(email: string): Prisma.Prisma__SystemUserClient<({
        school: {
            name: string;
            id: string;
            shortName: string | null;
            timezone: string;
            academicYear: string;
            periodsPerDay: number;
            halfDayBoundaryPeriod: number;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        email: string;
        passwordHash: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        mustChangePassword: boolean;
        lastLoginAt: Date | null;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    findActiveUser(userId: string, schoolId: string): Prisma.Prisma__SystemUserClient<{
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
    findUserWithPassword(userId: string, schoolId: string): Prisma.Prisma__SystemUserClient<({
        school: {
            name: string;
            id: string;
            shortName: string | null;
            timezone: string;
            academicYear: string;
            periodsPerDay: number;
            halfDayBoundaryPeriod: number;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        email: string;
        passwordHash: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        mustChangePassword: boolean;
        lastLoginAt: Date | null;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Prisma.Prisma__RefreshTokenClient<{
        id: string;
        createdAt: Date;
        userId: string;
        tokenHash: string;
        expiresAt: Date;
        revokedAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    findRefreshToken(tokenHash: string): Prisma.Prisma__RefreshTokenClient<({
        user: {
            school: {
                name: string;
                id: string;
                shortName: string | null;
                timezone: string;
                academicYear: string;
                periodsPerDay: number;
                halfDayBoundaryPeriod: number;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            schoolId: string;
            email: string;
            passwordHash: string;
            role: import("@prisma/client").$Enums.UserRole;
            isActive: boolean;
            mustChangePassword: boolean;
            lastLoginAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        tokenHash: string;
        expiresAt: Date;
        revokedAt: Date | null;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
};
//# sourceMappingURL=auth.repository.d.ts.map