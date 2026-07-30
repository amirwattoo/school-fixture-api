import type { Prisma, WhatsAppStatus } from "@prisma/client";
export type NotificationFilters = {
    date?: string;
    status?: WhatsAppStatus;
    teacherId?: string;
    fixtureId?: string;
    page: number;
    pageSize: number;
};
export declare const notificationInclude: {
    school: {
        select: {
            id: true;
            name: true;
            timezone: true;
        };
    };
    teacher: {
        select: {
            id: true;
            name: true;
            employeeCode: true;
            whatsappNumber: true;
        };
    };
    fixture: {
        include: {
            classSection: {
                select: {
                    id: true;
                    name: true;
                };
            };
            subject: {
                select: {
                    id: true;
                    name: true;
                };
            };
            absentTeacher: {
                select: {
                    id: true;
                    name: true;
                    employeeCode: true;
                };
            };
            assignedTeacher: {
                select: {
                    id: true;
                    name: true;
                    employeeCode: true;
                    whatsappNumber: true;
                };
            };
        };
    };
};
export declare const whatsappRepository: {
    list(schoolId: string, filters: NotificationFilters): Promise<{
        notifications: ({
            school: {
                name: string;
                id: string;
                timezone: string;
            };
            teacher: {
                name: string;
                id: string;
                employeeCode: string;
                whatsappNumber: string | null;
            };
            fixture: {
                subject: {
                    name: string;
                    id: string;
                };
                classSection: {
                    name: string;
                    id: string;
                };
                absentTeacher: {
                    name: string;
                    id: string;
                    employeeCode: string;
                };
                assignedTeacher: {
                    name: string;
                    id: string;
                    employeeCode: string;
                    whatsappNumber: string | null;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                schoolId: string;
                periodNumber: number;
                classSectionId: string;
                subjectId: string;
                date: Date;
                status: import("@prisma/client").$Enums.FixtureStatus;
                masterTimetableId: string | null;
                absentTeacherId: string;
                assignedTeacherId: string | null;
                assignmentVersion: number;
                autoAssignedTeacherId: string | null;
                autoScore: number | null;
                scoringDetails: Prisma.JsonValue | null;
                isManuallyOverridden: boolean;
                overrideReason: string | null;
                overriddenById: string | null;
                overriddenAt: Date | null;
                workloadCounted: boolean;
                requiresReassignment: boolean;
                reassignmentReason: string | null;
                publishedById: string | null;
                publishedAt: Date | null;
            };
        } & {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            schoolId: string;
            teacherId: string;
            status: import("@prisma/client").$Enums.WhatsAppStatus;
            fixtureId: string;
            destination: string;
            provider: string;
            providerMessageId: string | null;
            idempotencyKey: string;
            attemptCount: number;
            lastAttemptAt: Date | null;
            sentAt: Date | null;
            openedAt: Date | null;
            manuallyConfirmedAt: Date | null;
            failureReason: string | null;
            providerResponse: Prisma.JsonValue | null;
        })[];
        total: number;
    }>;
    find(schoolId: string, notificationId: string): Prisma.Prisma__WhatsAppNotificationClient<({
        school: {
            name: string;
            id: string;
            timezone: string;
        };
        teacher: {
            name: string;
            id: string;
            employeeCode: string;
            whatsappNumber: string | null;
        };
        fixture: {
            subject: {
                name: string;
                id: string;
            };
            classSection: {
                name: string;
                id: string;
            };
            absentTeacher: {
                name: string;
                id: string;
                employeeCode: string;
            };
            assignedTeacher: {
                name: string;
                id: string;
                employeeCode: string;
                whatsappNumber: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            schoolId: string;
            periodNumber: number;
            classSectionId: string;
            subjectId: string;
            date: Date;
            status: import("@prisma/client").$Enums.FixtureStatus;
            masterTimetableId: string | null;
            absentTeacherId: string;
            assignedTeacherId: string | null;
            assignmentVersion: number;
            autoAssignedTeacherId: string | null;
            autoScore: number | null;
            scoringDetails: Prisma.JsonValue | null;
            isManuallyOverridden: boolean;
            overrideReason: string | null;
            overriddenById: string | null;
            overriddenAt: Date | null;
            workloadCounted: boolean;
            requiresReassignment: boolean;
            reassignmentReason: string | null;
            publishedById: string | null;
            publishedAt: Date | null;
        };
    } & {
        message: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        teacherId: string;
        status: import("@prisma/client").$Enums.WhatsAppStatus;
        fixtureId: string;
        destination: string;
        provider: string;
        providerMessageId: string | null;
        idempotencyKey: string;
        attemptCount: number;
        lastAttemptAt: Date | null;
        sentAt: Date | null;
        openedAt: Date | null;
        manuallyConfirmedAt: Date | null;
        failureReason: string | null;
        providerResponse: Prisma.JsonValue | null;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    markOpened(notificationId: string, destination: string): Prisma.Prisma__WhatsAppNotificationClient<{
        school: {
            name: string;
            id: string;
            timezone: string;
        };
        teacher: {
            name: string;
            id: string;
            employeeCode: string;
            whatsappNumber: string | null;
        };
        fixture: {
            subject: {
                name: string;
                id: string;
            };
            classSection: {
                name: string;
                id: string;
            };
            absentTeacher: {
                name: string;
                id: string;
                employeeCode: string;
            };
            assignedTeacher: {
                name: string;
                id: string;
                employeeCode: string;
                whatsappNumber: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            schoolId: string;
            periodNumber: number;
            classSectionId: string;
            subjectId: string;
            date: Date;
            status: import("@prisma/client").$Enums.FixtureStatus;
            masterTimetableId: string | null;
            absentTeacherId: string;
            assignedTeacherId: string | null;
            assignmentVersion: number;
            autoAssignedTeacherId: string | null;
            autoScore: number | null;
            scoringDetails: Prisma.JsonValue | null;
            isManuallyOverridden: boolean;
            overrideReason: string | null;
            overriddenById: string | null;
            overriddenAt: Date | null;
            workloadCounted: boolean;
            requiresReassignment: boolean;
            reassignmentReason: string | null;
            publishedById: string | null;
            publishedAt: Date | null;
        };
    } & {
        message: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        teacherId: string;
        status: import("@prisma/client").$Enums.WhatsAppStatus;
        fixtureId: string;
        destination: string;
        provider: string;
        providerMessageId: string | null;
        idempotencyKey: string;
        attemptCount: number;
        lastAttemptAt: Date | null;
        sentAt: Date | null;
        openedAt: Date | null;
        manuallyConfirmedAt: Date | null;
        failureReason: string | null;
        providerResponse: Prisma.JsonValue | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    markManuallyConfirmed(notificationId: string): Prisma.Prisma__WhatsAppNotificationClient<{
        school: {
            name: string;
            id: string;
            timezone: string;
        };
        teacher: {
            name: string;
            id: string;
            employeeCode: string;
            whatsappNumber: string | null;
        };
        fixture: {
            subject: {
                name: string;
                id: string;
            };
            classSection: {
                name: string;
                id: string;
            };
            absentTeacher: {
                name: string;
                id: string;
                employeeCode: string;
            };
            assignedTeacher: {
                name: string;
                id: string;
                employeeCode: string;
                whatsappNumber: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            schoolId: string;
            periodNumber: number;
            classSectionId: string;
            subjectId: string;
            date: Date;
            status: import("@prisma/client").$Enums.FixtureStatus;
            masterTimetableId: string | null;
            absentTeacherId: string;
            assignedTeacherId: string | null;
            assignmentVersion: number;
            autoAssignedTeacherId: string | null;
            autoScore: number | null;
            scoringDetails: Prisma.JsonValue | null;
            isManuallyOverridden: boolean;
            overrideReason: string | null;
            overriddenById: string | null;
            overriddenAt: Date | null;
            workloadCounted: boolean;
            requiresReassignment: boolean;
            reassignmentReason: string | null;
            publishedById: string | null;
            publishedAt: Date | null;
        };
    } & {
        message: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        teacherId: string;
        status: import("@prisma/client").$Enums.WhatsAppStatus;
        fixtureId: string;
        destination: string;
        provider: string;
        providerMessageId: string | null;
        idempotencyKey: string;
        attemptCount: number;
        lastAttemptAt: Date | null;
        sentAt: Date | null;
        openedAt: Date | null;
        manuallyConfirmedAt: Date | null;
        failureReason: string | null;
        providerResponse: Prisma.JsonValue | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
};
//# sourceMappingURL=whatsapp.repository.d.ts.map