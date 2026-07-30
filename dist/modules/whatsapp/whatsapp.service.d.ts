import { type AuditActor } from "../../common/audit.js";
import { type NotificationFilters } from "./whatsapp.repository.js";
export declare const whatsappService: {
    list(schoolId: string, filters: NotificationFilters): Promise<{
        notifications: ({
            clickToChatUrl: string;
            clickToChatError: null;
            normalizedDestination: string;
            id: string;
            fixtureId: string;
            teacherId: string;
            destination: string;
            message: string;
            status: import("@prisma/client").$Enums.WhatsAppStatus;
            idempotencyKey: string;
            attemptCount: number;
            lastAttemptAt: Date | null;
            openedAt: Date | null;
            manuallyConfirmedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
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
                scoringDetails: import("@prisma/client/runtime/library").JsonValue | null;
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
        } | {
            clickToChatUrl: null;
            clickToChatError: {
                code: string;
                message: string;
            };
            normalizedDestination: string;
            id: string;
            fixtureId: string;
            teacherId: string;
            destination: string;
            message: string;
            status: import("@prisma/client").$Enums.WhatsAppStatus;
            idempotencyKey: string;
            attemptCount: number;
            lastAttemptAt: Date | null;
            openedAt: Date | null;
            manuallyConfirmedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
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
                scoringDetails: import("@prisma/client/runtime/library").JsonValue | null;
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
        })[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
        };
    }>;
    get(schoolId: string, notificationId: string): Promise<{
        clickToChatUrl: string;
        clickToChatError: null;
        normalizedDestination: string;
        id: string;
        fixtureId: string;
        teacherId: string;
        destination: string;
        message: string;
        status: import("@prisma/client").$Enums.WhatsAppStatus;
        idempotencyKey: string;
        attemptCount: number;
        lastAttemptAt: Date | null;
        openedAt: Date | null;
        manuallyConfirmedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
            scoringDetails: import("@prisma/client/runtime/library").JsonValue | null;
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
    } | {
        clickToChatUrl: null;
        clickToChatError: {
            code: string;
            message: string;
        };
        normalizedDestination: string;
        id: string;
        fixtureId: string;
        teacherId: string;
        destination: string;
        message: string;
        status: import("@prisma/client").$Enums.WhatsAppStatus;
        idempotencyKey: string;
        attemptCount: number;
        lastAttemptAt: Date | null;
        openedAt: Date | null;
        manuallyConfirmedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
            scoringDetails: import("@prisma/client/runtime/library").JsonValue | null;
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
    }>;
    providerStatus(): {
        provider: string;
        mode: string;
        configured: boolean;
        automaticDelivery: boolean;
        deliveryConfirmation: string;
    };
    markOpened(notificationId: string, actor: AuditActor): Promise<{
        clickToChatUrl: string;
        clickToChatError: null;
        normalizedDestination: string;
        id: string;
        fixtureId: string;
        teacherId: string;
        destination: string;
        message: string;
        status: import("@prisma/client").$Enums.WhatsAppStatus;
        idempotencyKey: string;
        attemptCount: number;
        lastAttemptAt: Date | null;
        openedAt: Date | null;
        manuallyConfirmedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
            scoringDetails: import("@prisma/client/runtime/library").JsonValue | null;
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
    } | {
        clickToChatUrl: null;
        clickToChatError: {
            code: string;
            message: string;
        };
        normalizedDestination: string;
        id: string;
        fixtureId: string;
        teacherId: string;
        destination: string;
        message: string;
        status: import("@prisma/client").$Enums.WhatsAppStatus;
        idempotencyKey: string;
        attemptCount: number;
        lastAttemptAt: Date | null;
        openedAt: Date | null;
        manuallyConfirmedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
            scoringDetails: import("@prisma/client/runtime/library").JsonValue | null;
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
    }>;
    markManuallyConfirmed(notificationId: string, actor: AuditActor): Promise<{
        clickToChatUrl: string;
        clickToChatError: null;
        normalizedDestination: string;
        id: string;
        fixtureId: string;
        teacherId: string;
        destination: string;
        message: string;
        status: import("@prisma/client").$Enums.WhatsAppStatus;
        idempotencyKey: string;
        attemptCount: number;
        lastAttemptAt: Date | null;
        openedAt: Date | null;
        manuallyConfirmedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
            scoringDetails: import("@prisma/client/runtime/library").JsonValue | null;
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
    } | {
        clickToChatUrl: null;
        clickToChatError: {
            code: string;
            message: string;
        };
        normalizedDestination: string;
        id: string;
        fixtureId: string;
        teacherId: string;
        destination: string;
        message: string;
        status: import("@prisma/client").$Enums.WhatsAppStatus;
        idempotencyKey: string;
        attemptCount: number;
        lastAttemptAt: Date | null;
        openedAt: Date | null;
        manuallyConfirmedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
            scoringDetails: import("@prisma/client/runtime/library").JsonValue | null;
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
    }>;
};
//# sourceMappingURL=whatsapp.service.d.ts.map