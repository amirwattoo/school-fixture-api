import type { FixtureStatus, Prisma } from "@prisma/client";
export declare const fixtureRecordsRepository: {
    teachers(schoolId: string): Prisma.PrismaPromise<{
        name: string;
        id: string;
        isActive: boolean;
        employeeCode: string;
    }[]>;
    weekly(schoolId: string, year: number, weekNumber: number): Prisma.PrismaPromise<{
        teacherId: string;
        fixtureCount: number;
    }[]>;
    yearly(schoolId: string, year: number): Prisma.GetTeacherFixtureSummaryGroupByPayload<{
        by: "teacherId"[];
        where: {
            schoolId: string;
            year: number;
        };
        _sum: {
            fixtureCount: true;
        };
    }>;
    teacher(schoolId: string, teacherId: string): Prisma.Prisma__TeacherClient<{
        name: string;
        id: string;
        isActive: boolean;
        employeeCode: string;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    history(schoolId: string, teacherId: string, filters: {
        from?: Date;
        to?: Date;
        status?: FixtureStatus;
    }): Prisma.PrismaPromise<({
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
    attendance(schoolId: string, filters: {
        from?: Date;
        to?: Date;
    }): Prisma.PrismaPromise<({
        teacher: {
            name: string;
            id: string;
            employeeCode: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        teacherId: string;
        date: Date;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        availableFromPeriod: number | null;
        unavailableFromPeriod: number | null;
        reason: string | null;
        notes: string | null;
        remarks: string | null;
        markedById: string;
    })[]>;
    attendanceFixtureCounts(schoolId: string, filters: {
        from?: Date;
        to?: Date;
    }): Prisma.PrismaPromise<{
        date: Date;
        absentTeacherId: string;
    }[]>;
    schoolSettings(schoolId: string): Prisma.Prisma__SchoolClient<{
        periodsPerDay: number;
        halfDayBoundaryPeriod: number;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
};
//# sourceMappingURL=fixture-records.repository.d.ts.map