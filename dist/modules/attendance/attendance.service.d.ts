import type { AuditActor } from "../../common/audit.js";
import { type AttendanceRecordInput } from "./attendance.repository.js";
export declare const attendanceService: {
    list(schoolId: string, dateValue: string): Promise<{
        records: ({
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
        })[];
        settings: {
            periodsPerDay: number;
            halfDayBoundaryPeriod: number;
        };
        summary: {
            absent: number;
            onLeave: number;
            late: number;
            shortLeave: number;
            firstHalfLeave: number;
            secondHalfLeave: number;
            partialDay: number;
            presentByDefault: number;
        };
    }>;
    save(actor: AuditActor, dateValue: string, records: AttendanceRecordInput[], confirmPublishedFixtureImpact?: boolean): Promise<{
        fixtureGeneration: {
            affectedLessons: number;
            fixturesCreated: number;
            fixturesAlreadyExisting: number;
            fixturesWithoutEligibleReplacement: number;
        };
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
    remove(actor: AuditActor, dateValue: string, teacherId: string): Promise<number>;
};
//# sourceMappingURL=attendance.service.d.ts.map