import type { DayOfWeek } from "@prisma/client";
export declare const parseDateOnly: (value: string) => Date;
export declare const formatDateOnly: (date: Date) => string;
export declare const todayInTimezone: (timezone: string, now?: Date) => string;
export declare const weekdayForDate: (date: Date) => DayOfWeek;
export type ResolvedSchoolDate = {
    selectedDate: string;
    storageDate: Date;
    timezone: string;
    weekday: DayOfWeek;
};
/**
 * Resolves a date-only school calendar value without interpreting it as an
 * instant. The UTC Date is only the canonical representation used by Prisma
 * for PostgreSQL DATE columns; no timezone conversion is used for the weekday.
 */
export declare const resolveSchoolDate: (value: string, timezone: string) => ResolvedSchoolDate;
export declare const isoWeek: (date: Date) => {
    year: number;
    weekNumber: number;
};
//# sourceMappingURL=date-only.d.ts.map