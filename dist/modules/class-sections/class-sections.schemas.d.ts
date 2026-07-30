import { z } from "zod";
export declare const createClassSectionSchema: z.ZodObject<{
    gradeNumber: z.ZodNumber;
    section: z.ZodString;
}, z.core.$strip>;
export declare const updateClassSectionSchema: z.ZodObject<{
    gradeNumber: z.ZodOptional<z.ZodNumber>;
    section: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const classSectionIdSchema: z.ZodObject<{
    classSectionId: z.ZodString;
}, z.core.$strip>;
export declare const classSectionQuerySchema: z.ZodObject<{
    gradeNumber: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    isActive: z.ZodOptional<z.ZodEnum<{
        true: "true";
        false: "false";
    }>>;
}, z.core.$strip>;
//# sourceMappingURL=class-sections.schemas.d.ts.map