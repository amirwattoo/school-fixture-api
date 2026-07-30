import { z } from "zod";
export declare const createSubjectSchema: z.ZodObject<{
    name: z.ZodString;
    code: z.ZodString;
}, z.core.$strip>;
export declare const updateSubjectSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const subjectIdSchema: z.ZodObject<{
    subjectId: z.ZodString;
}, z.core.$strip>;
export declare const subjectQuerySchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodEnum<{
        true: "true";
        false: "false";
    }>>;
}, z.core.$strip>;
//# sourceMappingURL=subjects.schemas.d.ts.map