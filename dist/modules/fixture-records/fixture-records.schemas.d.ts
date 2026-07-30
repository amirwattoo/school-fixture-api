import { z } from "zod";
export declare const weeklyRecordsSchema: z.ZodObject<{
    year: z.ZodCoercedNumber<unknown>;
    week: z.ZodCoercedNumber<unknown>;
    sort: z.ZodDefault<z.ZodEnum<{
        name: "name";
        highest: "highest";
        lowest: "lowest";
    }>>;
}, z.core.$strip>;
export declare const yearlyRecordsSchema: z.ZodObject<{
    year: z.ZodCoercedNumber<unknown>;
    sort: z.ZodDefault<z.ZodEnum<{
        name: "name";
        highest: "highest";
        lowest: "lowest";
    }>>;
}, z.core.$strip>;
export declare const teacherHistoryParamsSchema: z.ZodObject<{
    teacherId: z.ZodString;
}, z.core.$strip>;
export declare const teacherHistoryQuerySchema: z.ZodObject<{
    year: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        DRAFT: "DRAFT";
        PUBLISHED: "PUBLISHED";
        CANCELLED: "CANCELLED";
    }>>;
}, z.core.$strip>;
export declare const attendanceReportSchema: z.ZodObject<{
    year: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=fixture-records.schemas.d.ts.map