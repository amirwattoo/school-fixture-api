import type { AttendanceStatus, Prisma } from "@prisma/client";
export type AttendanceRecordInput = {
    teacherId: string;
    status: AttendanceStatus;
    availableFromPeriod?: number | null;
    unavailableFromPeriod?: number | null;
    reason?: string | null;
    notes?: string | null;
    remarks?: string | null;
};
export declare const attendanceRepository: {
    list(schoolId: string, date: Date): Prisma.PrismaPromise<({
        teacher: {
            name: string;
            id: string;
            isActive: boolean;
            employeeCode: string;
        };
        markedBy: {
            name: string;
            id: string;
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
    activeTeachers(schoolId: string, teacherIds: string[]): Prisma.PrismaPromise<{
        id: string;
    }[]>;
    activeTeacherCount(schoolId: string): Prisma.PrismaPromise<number>;
    schoolSettings(schoolId: string): Prisma.Prisma__SchoolClient<{
        timezone: string;
        periodsPerDay: number;
        halfDayBoundaryPeriod: number;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    fixtureCount(schoolId: string, date: Date): Prisma.PrismaPromise<number>;
    saveBulk(schoolId: string, markedById: string, date: Date, records: AttendanceRecordInput[], confirmPublishedFixtureImpact?: boolean): Promise<{
        records: {
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
        }[];
        affectedDraftFixtureIds: string[];
        affectedPublishedFixtureIds: string[];
    }>;
    delete(schoolId: string, teacherId: string, date: Date, userId: string): Promise<number>;
};
//# sourceMappingURL=attendance.repository.d.ts.map