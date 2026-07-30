import type { AttendanceStatus } from "@prisma/client";

export type AttendanceAvailability = {
  status: AttendanceStatus;
  availableFromPeriod: number | null;
  unavailableFromPeriod: number | null;
};

export type AttendanceExclusionReason =
  | "ABSENT"
  | "ON_LEAVE"
  | "NOT_ARRIVED_YET"
  | "LEFT_ON_SHORT_LEAVE"
  | "OUTSIDE_PARTIAL_DAY_RANGE";

export type TeacherPeriodAvailability = {
  available: boolean;
  reason?: AttendanceExclusionReason;
};

export const attendanceExclusionReason = (
  attendance: AttendanceAvailability | null | undefined,
  periodNumber: number,
): AttendanceExclusionReason | undefined => {
  if (!attendance || attendance.status === "PRESENT") return undefined;
  if (attendance.status === "ABSENT") return "ABSENT";
  if (attendance.status === "LEAVE") return "ON_LEAVE";
  if (
    attendance.status === "LATE" &&
    periodNumber < (attendance.availableFromPeriod ?? 1)
  ) {
    return "NOT_ARRIVED_YET";
  }
  if (
    attendance.status === "SHORT_LEAVE" &&
    periodNumber >= (attendance.unavailableFromPeriod ?? 9)
  ) {
    return "LEFT_ON_SHORT_LEAVE";
  }
  if (attendance.status === "PARTIAL_DAY") {
    const beforeAvailableRange =
      attendance.availableFromPeriod !== null &&
      periodNumber < attendance.availableFromPeriod;
    const afterAvailableRange =
      attendance.unavailableFromPeriod !== null &&
      periodNumber >= attendance.unavailableFromPeriod;
    if (beforeAvailableRange || afterAvailableRange) {
      return "OUTSIDE_PARTIAL_DAY_RANGE";
    }
  }
  return undefined;
};

export const teacherAvailabilityAtPeriod = (
  attendance: AttendanceAvailability | null | undefined,
  periodNumber: number,
): TeacherPeriodAvailability => {
  const reason = attendanceExclusionReason(attendance, periodNumber);
  return reason ? { available: false, reason } : { available: true };
};

export const isTeacherAvailableAtPeriod = (
  attendance: AttendanceAvailability | null | undefined,
  periodNumber: number,
) => teacherAvailabilityAtPeriod(attendance, periodNumber).available;

export const attendancePeriodSummary = (
  attendance: AttendanceAvailability,
  periodsPerDay: number,
) => {
  const availablePeriods: number[] = [];
  const unavailablePeriods: number[] = [];
  for (let period = 1; period <= periodsPerDay; period += 1) {
    (isTeacherAvailableAtPeriod(attendance, period)
      ? availablePeriods
      : unavailablePeriods
    ).push(period);
  }
  return { availablePeriods, unavailablePeriods };
};
