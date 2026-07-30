import { ApiError } from "./api-error.js";
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
export const parseDateOnly = (value) => {
    const match = DATE_PATTERN.exec(value);
    if (!match) {
        throw new ApiError(400, "INVALID_DATE", "Date must use YYYY-MM-DD format");
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day) {
        throw new ApiError(400, "INVALID_DATE", "The date is not valid");
    }
    return date;
};
export const formatDateOnly = (date) => `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
export const todayInTimezone = (timezone, now = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now);
    const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
};
const DAYS_BY_UTC_INDEX = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
];
export const weekdayForDate = (date) => DAYS_BY_UTC_INDEX[date.getUTCDay()];
/**
 * Resolves a date-only school calendar value without interpreting it as an
 * instant. The UTC Date is only the canonical representation used by Prisma
 * for PostgreSQL DATE columns; no timezone conversion is used for the weekday.
 */
export const resolveSchoolDate = (value, timezone) => {
    try {
        new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
    }
    catch {
        throw new ApiError(500, "INVALID_SCHOOL_TIMEZONE", `The configured school timezone "${timezone}" is invalid`);
    }
    const storageDate = parseDateOnly(value);
    return {
        selectedDate: formatDateOnly(storageDate),
        storageDate,
        timezone,
        // Use the validated civil-date components, not new Date(value).getDay().
        weekday: weekdayForDate(storageDate),
    };
};
export const isoWeek = (date) => {
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNumber = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
    const year = target.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const weekNumber = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { year, weekNumber };
};
//# sourceMappingURL=date-only.js.map