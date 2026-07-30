import { z } from "zod";
export declare const createTeacherSchema: z.ZodObject<{
    name: z.ZodString;
    employeeCode: z.ZodString;
    whatsappNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    subjectSpecializations: z.ZodDefault<z.ZodArray<z.ZodString>>;
    teachingLevel: z.ZodEnum<{
        LOWER: "LOWER";
        HIGHER: "HIGHER";
        BOTH: "BOTH";
    }>;
}, z.core.$strip>;
export declare const updateTeacherSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    employeeCode: z.ZodOptional<z.ZodString>;
    whatsappNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    subjectSpecializations: z.ZodOptional<z.ZodArray<z.ZodString>>;
    teachingLevel: z.ZodOptional<z.ZodEnum<{
        LOWER: "LOWER";
        HIGHER: "HIGHER";
        BOTH: "BOTH";
    }>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const teacherIdSchema: z.ZodObject<{
    teacherId: z.ZodString;
}, z.core.$strip>;
export declare const teacherQuerySchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodEnum<{
        true: "true";
        false: "false";
    }>>;
    teachingLevel: z.ZodOptional<z.ZodEnum<{
        LOWER: "LOWER";
        HIGHER: "HIGHER";
        BOTH: "BOTH";
    }>>;
    subject: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=teachers.schemas.d.ts.map