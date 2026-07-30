import { z } from "zod";
export declare const dayOfWeekSchema: z.ZodEnum<{
    MONDAY: "MONDAY";
    TUESDAY: "TUESDAY";
    WEDNESDAY: "WEDNESDAY";
    THURSDAY: "THURSDAY";
    FRIDAY: "FRIDAY";
    SATURDAY: "SATURDAY";
    SUNDAY: "SUNDAY";
}>;
export declare const createTimetableEntrySchema: z.ZodObject<{
    dayOfWeek: z.ZodEnum<{
        MONDAY: "MONDAY";
        TUESDAY: "TUESDAY";
        WEDNESDAY: "WEDNESDAY";
        THURSDAY: "THURSDAY";
        FRIDAY: "FRIDAY";
        SATURDAY: "SATURDAY";
        SUNDAY: "SUNDAY";
    }>;
    periodNumber: z.ZodNumber;
    classSectionId: z.ZodString;
    teacherId: z.ZodString;
    subjectId: z.ZodString;
}, z.core.$strip>;
export declare const updateTimetableEntrySchema: z.ZodObject<{
    dayOfWeek: z.ZodOptional<z.ZodEnum<{
        MONDAY: "MONDAY";
        TUESDAY: "TUESDAY";
        WEDNESDAY: "WEDNESDAY";
        THURSDAY: "THURSDAY";
        FRIDAY: "FRIDAY";
        SATURDAY: "SATURDAY";
        SUNDAY: "SUNDAY";
    }>>;
    periodNumber: z.ZodOptional<z.ZodNumber>;
    classSectionId: z.ZodOptional<z.ZodString>;
    teacherId: z.ZodOptional<z.ZodString>;
    subjectId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const timetableEntryIdSchema: z.ZodObject<{
    entryId: z.ZodString;
}, z.core.$strip>;
export declare const timetableQuerySchema: z.ZodObject<{
    dayOfWeek: z.ZodOptional<z.ZodEnum<{
        MONDAY: "MONDAY";
        TUESDAY: "TUESDAY";
        WEDNESDAY: "WEDNESDAY";
        THURSDAY: "THURSDAY";
        FRIDAY: "FRIDAY";
        SATURDAY: "SATURDAY";
        SUNDAY: "SUNDAY";
    }>>;
    teacherId: z.ZodOptional<z.ZodString>;
    classSectionId: z.ZodOptional<z.ZodString>;
    subjectId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=timetable.schemas.d.ts.map