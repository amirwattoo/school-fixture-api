import type { AttendanceStatus } from "@prisma/client";
export type AttendanceAvailability = {
    status: AttendanceStatus;
    availableFromPeriod: number | null;
    unavailableFromPeriod: number | null;
};
export type AttendanceExclusionReason = "ABSENT" | "ON_LEAVE" | "NOT_ARRIVED_YET" | "LEFT_ON_SHORT_LEAVE" | "OUTSIDE_PARTIAL_DAY_RANGE";
export type TeacherPeriodAvailability = {
    available: boolean;
    reason?: AttendanceExclusionReason;
};
export declare const attendanceExclusionReason: (attendance: AttendanceAvailability | null | undefined, periodNumber: number) => AttendanceExclusionReason | undefined;
export declare const teacherAvailabilityAtPeriod: (attendance: AttendanceAvailability | null | undefined, periodNumber: number) => TeacherPeriodAvailability;
export declare const isTeacherAvailableAtPeriod: (attendance: AttendanceAvailability | null | undefined, periodNumber: number) => boolean;
export declare const attendancePeriodSummary: (attendance: AttendanceAvailability, periodsPerDay: number) => {
    availablePeriods: number[];
    unavailablePeriods: number[];
};
//# sourceMappingURL=attendance-availability.d.ts.map