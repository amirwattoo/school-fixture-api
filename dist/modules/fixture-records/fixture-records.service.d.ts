import type { FixtureStatus } from "@prisma/client";
type RecordRow = {
    teacherId: string;
    teacherName: string;
    employeeCode: string;
    fixtureCount: number;
    isActive: boolean;
};
export declare const fixtureRecordsService: {
    weekly(schoolId: string, year: number, weekNumber: number, sort: "highest" | "lowest" | "name"): Promise<RecordRow[]>;
    yearly(schoolId: string, year: number, sort: "highest" | "lowest" | "name"): Promise<RecordRow[]>;
    history(schoolId: string, teacherId: string, filters: {
        year?: number;
        from?: string;
        to?: string;
        status?: FixtureStatus;
    }): Promise<{
        teacher: {
            name: string;
            id: string;
            isActive: boolean;
            employeeCode: string;
        };
        fixtures: ({
            subject: {
                code: string;
                name: string;
                id: string;
            };
            classSection: {
                name: string;
                id: string;
                gradeNumber: number | null;
                section: string;
            };
            absentTeacher: {
                name: string;
                id: string;
                employeeCode: string;
            };
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
        })[];
    }>;
    attendance(schoolId: string, filters: {
        year?: number;
        from?: string;
        to?: string;
    }): Promise<{
        id: string;
        teacher: {
            name: string;
            id: string;
            employeeCode: string;
        };
        date: Date;
        exceptionType: import("@prisma/client").$Enums.AttendanceStatus;
        availablePeriods: number[];
        unavailablePeriods: number[];
        reason: string | null;
        notes: string | null;
        fixturesGenerated: number;
    }[]>;
};
export {};
//# sourceMappingURL=fixture-records.service.d.ts.map