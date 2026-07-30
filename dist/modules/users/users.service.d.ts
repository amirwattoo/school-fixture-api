import { Prisma } from "@prisma/client";
type Actor = {
    userId: string;
    schoolId: string;
};
export declare const usersService: {
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
    create(actor: Actor, input: {
        name: string;
        email: string;
        temporaryPassword: string;
    }): Promise<{
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
    } | undefined>;
    update(actor: Actor, userId: string, input: {
        name?: string;
        email?: string;
        isActive?: boolean;
        temporaryPassword?: string;
    }): Promise<{
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
    } | null>;
};
export {};
//# sourceMappingURL=users.service.d.ts.map