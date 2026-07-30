import { z } from "zod";
export declare const generateFixturesSchema: z.ZodObject<{
    date: z.ZodString;
    absentTeacherIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const fixtureQuerySchema: z.ZodObject<{
    date: z.ZodString;
}, z.core.$strip>;
export declare const fixtureIdSchema: z.ZodObject<{
    fixtureId: z.ZodString;
}, z.core.$strip>;
export declare const overrideFixtureSchema: z.ZodObject<{
    assignedTeacherId: z.ZodString;
    reason: z.ZodString;
}, z.core.$strip>;
export declare const publishFixturesSchema: z.ZodObject<{
    date: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=fixtures.schemas.d.ts.map