import { Prisma } from "@prisma/client";
import type { AuditActor } from "../../common/audit.js";
export type FixtureGenerationDiagnostics = {
    selectedDate: string;
    resolvedWeekday: string;
    unavailableTeacherCount: number;
    matchingTimetablePeriodCount: number;
    affectedLessonCount: number;
    createdFixtureCount: number;
    existingFixtureCount: number;
    fixturesWithoutEligibleReplacementCount: number;
    skippedReasons: string[];
};
export declare const fixturesService: {
    list(schoolId: string, dateValue: string): Prisma.PrismaPromise<({
        subject: {
            code: string;
            name: string;
            id: string;
        };
        classSection: {
            name: string;
            id: string;
            teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
            gradeNumber: number | null;
            section: string;
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
        autoAssignedTeacher: {
            name: string;
            id: string;
            employeeCode: string;
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
    })[]>;
    get(schoolId: string, fixtureId: string): Promise<{
        subject: {
            code: string;
            name: string;
            id: string;
        };
        classSection: {
            name: string;
            id: string;
            teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
            gradeNumber: number | null;
            section: string;
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
        autoAssignedTeacher: {
            name: string;
            id: string;
            employeeCode: string;
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
    }>;
    generate(actor: AuditActor, dateValue: string, absentTeacherIds: string[]): Promise<{
        fixtures: ({
            subject: {
                code: string;
                name: string;
                id: string;
            };
            classSection: {
                name: string;
                id: string;
                teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
                gradeNumber: number | null;
                section: string;
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
            autoAssignedTeacher: {
                name: string;
                id: string;
                employeeCode: string;
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
        })[];
        diagnostics: FixtureGenerationDiagnostics;
    }>;
    override(actor: AuditActor, fixtureId: string, assignedTeacherId: string, reason: string): Promise<{
        subject: {
            code: string;
            name: string;
            id: string;
        };
        classSection: {
            name: string;
            id: string;
            teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
            gradeNumber: number | null;
            section: string;
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
        autoAssignedTeacher: {
            name: string;
            id: string;
            employeeCode: string;
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
    }>;
    candidates(schoolId: string, fixtureId: string): Promise<{
        candidates: import("./fixtures.utils.js").ScoredCandidate[];
        excluded: import("./fixture-eligibility.service.js").ExcludedFixtureTeacher[];
    }>;
    scoring(schoolId: string, fixtureId: string): Promise<{
        requiredSubject: string;
        requiredTeachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        selectedTeacherId: string | null;
        candidates: import("./fixtures.utils.js").ScoredCandidate[];
        excluded: import("./fixture-eligibility.service.js").ExcludedFixtureTeacher[];
    }>;
    cancel(actor: AuditActor, fixtureId: string): Promise<{
        subject: {
            code: string;
            name: string;
            id: string;
        };
        classSection: {
            name: string;
            id: string;
            teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
            gradeNumber: number | null;
            section: string;
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
        autoAssignedTeacher: {
            name: string;
            id: string;
            employeeCode: string;
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
    }>;
    publish(actor: AuditActor, dateValue: string): Promise<{
        fixtures: ({
            subject: {
                code: string;
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                schoolId: string;
                isActive: boolean;
            };
            classSection: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                schoolId: string;
                isActive: boolean;
                teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
                gradeNumber: number | null;
                section: string;
            };
            absentTeacher: {
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
            };
            assignedTeacher: {
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
            } | null;
            autoAssignedTeacher: {
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
        })[];
        publishedCount: number;
        notificationsCreated: number;
        messagesReady: number;
        messagesSent: number;
        messagesFailed: number;
        existingNotifications: number;
    }>;
};
//# sourceMappingURL=fixtures.service.d.ts.map