import { z } from "zod";
export const createSubjectSchema = z.object({
    name: z.string().trim().min(2).max(100),
    code: z.string().trim().min(1).max(20),
});
export const updateSubjectSchema = z
    .object({
    name: z.string().trim().min(2).max(100).optional(),
    code: z.string().trim().min(1).max(20).optional(),
    isActive: z.boolean().optional(),
})
    .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
});
export const subjectIdSchema = z.object({
    subjectId: z.string().cuid(),
});
export const subjectQuerySchema = z.object({
    search: z.string().trim().max(100).optional(),
    isActive: z.enum(["true", "false"]).optional(),
});
//# sourceMappingURL=subjects.schemas.js.map