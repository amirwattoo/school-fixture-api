import { z } from "zod";
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const periodSchema = z.number().int().min(1).max(8);
const detailsFields = {
    reason: z.string().trim().max(500).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    // Kept for API compatibility with historical clients. New clients use
    // reason and notes.
    remarks: z.string().trim().max(500).nullable().optional(),
};
const validatePartialDay = (record, context) => {
    if (record.status !== "PARTIAL_DAY")
        return;
    const availableFrom = record.availableFromPeriod ?? null;
    const unavailableFrom = record.unavailableFromPeriod ?? null;
    if (availableFrom === null && unavailableFrom === null) {
        context.addIssue({
            code: "custom",
            message: "Partial day requires at least one period boundary",
            path: ["availableFromPeriod"],
        });
    }
    if (availableFrom !== null &&
        unavailableFrom !== null &&
        availableFrom >= unavailableFrom) {
        context.addIssue({
            code: "custom",
            message: "Available from lesson must be before unavailable from lesson",
            path: ["unavailableFromPeriod"],
        });
    }
};
const attendanceExceptionUnion = (commonFields) => z.discriminatedUnion("status", [
    z
        .object({
        ...commonFields,
        ...detailsFields,
        status: z.literal("ABSENT"),
        availableFromPeriod: z.never().optional(),
        unavailableFromPeriod: z.never().optional(),
    })
        .strict(),
    z
        .object({
        ...commonFields,
        ...detailsFields,
        status: z.literal("LEAVE"),
        availableFromPeriod: z.never().optional(),
        unavailableFromPeriod: z.never().optional(),
    })
        .strict(),
    z
        .object({
        ...commonFields,
        ...detailsFields,
        status: z.literal("LATE"),
        availableFromPeriod: periodSchema,
        unavailableFromPeriod: z.never().optional(),
    })
        .strict(),
    z
        .object({
        ...commonFields,
        ...detailsFields,
        status: z.literal("SHORT_LEAVE"),
        availableFromPeriod: z.never().optional(),
        unavailableFromPeriod: periodSchema,
    })
        .strict(),
    z
        .object({
        ...commonFields,
        ...detailsFields,
        status: z.literal("PARTIAL_DAY"),
        availableFromPeriod: periodSchema.nullable().optional(),
        unavailableFromPeriod: periodSchema.nullable().optional(),
    })
        .strict(),
]);
const recordSchema = attendanceExceptionUnion({
    teacherId: z.string().cuid(),
}).superRefine(validatePartialDay);
export const attendanceQuerySchema = z.object({ date: dateSchema });
export const bulkAttendanceSchema = z
    .object({
    date: dateSchema,
    records: z.array(recordSchema).min(1).max(500),
    confirmPublishedFixtureImpact: z.boolean().optional().default(false),
})
    .superRefine((value, context) => {
    const ids = new Set();
    value.records.forEach((record, index) => {
        if (ids.has(record.teacherId)) {
            context.addIssue({
                code: "custom",
                message: "A teacher may appear only once",
                path: ["records", index, "teacherId"],
            });
        }
        ids.add(record.teacherId);
    });
});
export const updateAttendanceSchema = z
    .intersection(z.object({
    date: dateSchema,
    confirmPublishedFixtureImpact: z.boolean().optional().default(false),
}), attendanceExceptionUnion({}))
    .superRefine(validatePartialDay);
export const attendanceTeacherParamsSchema = z.object({
    teacherId: z.string().cuid(),
});
//# sourceMappingURL=attendance.schemas.js.map