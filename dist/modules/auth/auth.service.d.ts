export declare const authService: {
    login(email: string, password: string): Promise<{
        user: {
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
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(rawToken: string): Promise<{
        user: {
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
        } | null;
        accessToken: string;
        refreshToken: string;
    }>;
    logout(rawToken?: string): Promise<void>;
    me(userId: string, schoolId: string): Promise<{
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
    }>;
    changePassword(userId: string, schoolId: string, currentPassword: string, newPassword: string): Promise<void>;
};
//# sourceMappingURL=auth.service.d.ts.map