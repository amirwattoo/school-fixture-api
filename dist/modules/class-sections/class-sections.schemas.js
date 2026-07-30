import { z } from "zod";
export const createClassSectionSchema = z.object({
    gradeNumber: z.number().int().positive().max(20),
    section: z.string().trim().min(1).max(10),
});
export const updateClassSectionSchema = z
    .object({
    gradeNumber: z.number().int().positive().max(20).optional(),
    section: z.string().trim().min(1).max(10).optional(),
    isActive: z.boolean().optional(),
})
    .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
});
export const classSectionIdSchema = z.object({
    classSectionId: z.string().cuid(),
});
export const classSectionQuerySchema = z.object({
    gradeNumber: z.coerce.number().int().positive().max(20).optional(),
    isActive: z.enum(["true", "false"]).optional(),
});
//# sourceMappingURL=class-sections.schemas.js.map