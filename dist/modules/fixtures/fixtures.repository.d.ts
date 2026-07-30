import type { DayOfWeek, Prisma } from "@prisma/client";
export type FixtureDb = Prisma.TransactionClient;
export declare const fixtureInclude: {
    classSection: {
        select: {
            id: true;
            name: true;
            gradeNumber: true;
            section: true;
            teachingLevel: true;
        };
    };
    subject: {
        select: {
            id: true;
            name: true;
            code: true;
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
    autoAssignedTeacher: {
        select: {
            id: true;
            name: true;
            employeeCode: true;
        };
    };
};
export declare const fixturesRepository: {
    transaction<T>(callback: (transaction: FixtureDb) => Promise<T>): Promise<T>;
    list(schoolId: string, date: Date): Prisma.PrismaPromise<({
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
    find(schoolId: string, fixtureId: string): Prisma.Prisma__ProxyFixtureClient<({
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
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    schoolSettings(database: FixtureDb, schoolId: string): Prisma.Prisma__SchoolClient<{
        timezone: string;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    absentTeachers(database: FixtureDb, schoolId: string, teacherIds: string[]): Prisma.PrismaPromise<{
        name: string;
        id: string;
        schoolId: string;
        isActive: boolean;
    }[]>;
    teacherDiagnostics(database: FixtureDb, teacherIds: string[]): Prisma.PrismaPromise<{
        name: string;
        id: string;
        schoolId: string;
    }[]>;
    attendance(database: FixtureDb, schoolId: string, date: Date, teacherIds: string[]): Prisma.PrismaPromise<{
        teacherId: string;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        availableFromPeriod: number | null;
        unavailableFromPeriod: number | null;
    }[]>;
    absentLectures(database: FixtureDb, schoolId: string, dayOfWeek: DayOfWeek, teacherIds: string[]): Prisma.PrismaPromise<({
        teacher: {
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        dayOfWeek: import("@prisma/client").$Enums.DayOfWeek;
        periodNumber: number;
        classSectionId: string;
        teacherId: string;
        subjectId: string;
    })[]>;
    existingForLecture(database: FixtureDb, schoolId: string, date: Date, lecture: {
        id: string;
        periodNumber: number;
        classSectionId: string;
        teacherId: string;
        subjectId: string;
    }): Prisma.Prisma__ProxyFixtureClient<({
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
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    eligibilityPool(database: FixtureDb, schoolId: string, date: Date): Prisma.PrismaPromise<({
        dailyAttendances: {
            status: import("@prisma/client").$Enums.AttendanceStatus;
            availableFromPeriod: number | null;
            unavailableFromPeriod: number | null;
        }[];
    } & {
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
    })[]>;
    regularBusyTeacherIds(database: FixtureDb, schoolId: string, dayOfWeek: DayOfWeek, periodNumber: number): Prisma.PrismaPromise<{
        teacherId: string;
    }[]>;
    fixtureBusyTeacherIds(database: FixtureDb, schoolId: string, date: Date, periodNumber: number, excludeFixtureId?: string): Prisma.PrismaPromise<{
        assignedTeacherId: string | null;
    }[]>;
    summaries(database: FixtureDb, schoolId: string, teacherIds: string[], year: number, weekNumber: number): Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        teacherId: string;
        year: number;
        weekNumber: number;
        fixtureCount: number;
    }[]>;
    incrementSummary(database: FixtureDb, schoolId: string, teacherId: string, year: number, weekNumber: number): Prisma.Prisma__TeacherFixtureSummaryClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        teacherId: string;
        year: number;
        weekNumber: number;
        fixtureCount: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    decrementSummary(database: FixtureDb, schoolId: string, teacherId: string, year: number, weekNumber: number): Prisma.PrismaPromise<Prisma.BatchPayload>;
    create(database: FixtureDb, data: Prisma.ProxyFixtureUncheckedCreateInput): Prisma.Prisma__ProxyFixtureClient<{
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    findForUpdate(database: FixtureDb, schoolId: string, fixtureId: string): Prisma.Prisma__ProxyFixtureClient<({
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
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    update(database: FixtureDb, fixtureId: string, data: Prisma.ProxyFixtureUpdateInput): Prisma.Prisma__ProxyFixtureClient<{
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
};
//# sourceMappingURL=fixtures.repository.d.ts.map