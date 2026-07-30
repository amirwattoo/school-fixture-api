import { z } from "zod";
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const generateFixturesSchema = z
    .object({
    date: dateSchema,
    absentTeacherIds: z.array(z.string().cuid()).min(1).max(200),
})
    .refine((value) => new Set(value.absentTeacherIds).size === value.absentTeacherIds.length, {
    message: "Absent teacher IDs must be unique",
    path: ["absentTeacherIds"],
});
export const fixtureQuerySchema = z.object({ date: dateSchema });
export const fixtureIdSchema = z.object({ fixtureId: z.string().cuid() });
export const overrideFixtureSchema = z.object({
    assignedTeacherId: z.string().cuid(),
    reason: z.string().trim().min(3).max(500),
});
export const publishFixturesSchema = z.object({ date: dateSchema });
//# sourceMappingURL=fixtures.schemas.js.map