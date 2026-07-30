import { z } from "zod";
export declare const attendanceQuerySchema: z.ZodObject<{
    date: z.ZodString;
}, z.core.$strip>;
export declare const bulkAttendanceSchema: z.ZodObject<{
    date: z.ZodString;
    records: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        teacherId: z.ZodString;
        status: z.ZodLiteral<"ABSENT">;
        availableFromPeriod: z.ZodOptional<z.ZodNever>;
        unavailableFromPeriod: z.ZodOptional<z.ZodNever>;
        reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        remarks: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>, z.ZodObject<{
        teacherId: z.ZodString;
        status: z.ZodLiteral<"LEAVE">;
        availableFromPeriod: z.ZodOptional<z.ZodNever>;
        unavailableFromPeriod: z.ZodOptional<z.ZodNever>;
        reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        remarks: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>, z.ZodObject<{
        teacherId: z.ZodString;
        status: z.ZodLiteral<"LATE">;
        availableFromPeriod: z.ZodNumber;
        unavailableFromPeriod: z.ZodOptional<z.ZodNever>;
        reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        remarks: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>, z.ZodObject<{
        teacherId: z.ZodString;
        status: z.ZodLiteral<"SHORT_LEAVE">;
        availableFromPeriod: z.ZodOptional<z.ZodNever>;
        unavailableFromPeriod: z.ZodNumber;
        reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        remarks: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>, z.ZodObject<{
        teacherId: z.ZodString;
        status: z.ZodLiteral<"PARTIAL_DAY">;
        availableFromPeriod: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        unavailableFromPeriod: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        remarks: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strict>], "status">>;
    confirmPublishedFixtureImpact: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const updateAttendanceSchema: z.ZodIntersection<z.ZodObject<{
    date: z.ZodString;
    confirmPublishedFixtureImpact: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>, z.ZodDiscriminatedUnion<[z.ZodObject<{
    status: z.ZodLiteral<"ABSENT">;
    availableFromPeriod: z.ZodOptional<z.ZodNever>;
    unavailableFromPeriod: z.ZodOptional<z.ZodNever>;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    remarks: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strict>, z.ZodObject<{
    status: z.ZodLiteral<"LEAVE">;
    availableFromPeriod: z.ZodOptional<z.ZodNever>;
    unavailableFromPeriod: z.ZodOptional<z.ZodNever>;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    remarks: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strict>, z.ZodObject<{
    status: z.ZodLiteral<"LATE">;
    availableFromPeriod: z.ZodNumber;
    unavailableFromPeriod: z.ZodOptional<z.ZodNever>;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    remarks: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strict>, z.ZodObject<{
    status: z.ZodLiteral<"SHORT_LEAVE">;
    availableFromPeriod: z.ZodOptional<z.ZodNever>;
    unavailableFromPeriod: z.ZodNumber;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    remarks: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strict>, z.ZodObject<{
    status: z.ZodLiteral<"PARTIAL_DAY">;
    availableFromPeriod: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    unavailableFromPeriod: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    remarks: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strict>], "status">>;
export declare const attendanceTeacherParamsSchema: z.ZodObject<{
    teacherId: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=attendance.schemas.d.ts.map