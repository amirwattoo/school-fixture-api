import { z } from "zod";
export const dayOfWeekSchema = z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
]);
export const createTimetableEntrySchema = z.object({
    dayOfWeek: dayOfWeekSchema,
    periodNumber: z.number().int().positive(),
    classSectionId: z.string().cuid(),
    teacherId: z.string().cuid(),
    subjectId: z.string().cuid(),
});
export const updateTimetableEntrySchema = createTimetableEntrySchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
});
export const timetableEntryIdSchema = z.object({
    entryId: z.string().cuid(),
});
export const timetableQuerySchema = z.object({
    dayOfWeek: dayOfWeekSchema.optional(),
    teacherId: z.string().cuid().optional(),
    classSectionId: z.string().cuid().optional(),
    subjectId: z.string().cuid().optional(),
});
//# sourceMappingURL=timetable.schemas.js.map