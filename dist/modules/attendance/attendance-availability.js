export const attendanceExclusionReason = (attendance, periodNumber) => {
    if (!attendance || attendance.status === "PRESENT")
        return undefined;
    if (attendance.status === "ABSENT")
        return "ABSENT";
    if (attendance.status === "LEAVE")
        return "ON_LEAVE";
    if (attendance.status === "LATE" &&
        periodNumber < (attendance.availableFromPeriod ?? 1)) {
        return "NOT_ARRIVED_YET";
    }
    if (attendance.status === "SHORT_LEAVE" &&
        periodNumber >= (attendance.unavailableFromPeriod ?? 9)) {
        return "LEFT_ON_SHORT_LEAVE";
    }
    if (attendance.status === "PARTIAL_DAY") {
        const beforeAvailableRange = attendance.availableFromPeriod !== null &&
            periodNumber < attendance.availableFromPeriod;
        const afterAvailableRange = attendance.unavailableFromPeriod !== null &&
            periodNumber >= attendance.unavailableFromPeriod;
        if (beforeAvailableRange || afterAvailableRange) {
            return "OUTSIDE_PARTIAL_DAY_RANGE";
        }
    }
    return undefined;
};
export const teacherAvailabilityAtPeriod = (attendance, periodNumber) => {
    const reason = attendanceExclusionReason(attendance, periodNumber);
    return reason ? { available: false, reason } : { available: true };
};
export const isTeacherAvailableAtPeriod = (attendance, periodNumber) => teacherAvailabilityAtPeriod(attendance, periodNumber).available;
export const attendancePeriodSummary = (attendance, periodsPerDay) => {
    const availablePeriods = [];
    const unavailablePeriods = [];
    for (let period = 1; period <= periodsPerDay; period += 1) {
        (isTeacherAvailableAtPeriod(attendance, period)
            ? availablePeriods
            : unavailablePeriods).push(period);
    }
    return { availablePeriods, unavailablePeriods };
};
//# sourceMappingURL=attendance-availability.js.map