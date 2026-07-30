import { z } from "zod";
export declare const notificationListSchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        READY: "READY";
        OPENED: "OPENED";
        MANUALLY_CONFIRMED: "MANUALLY_CONFIRMED";
    }>>;
    teacherId: z.ZodOptional<z.ZodString>;
    fixtureId: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const notificationIdSchema: z.ZodObject<{
    notificationId: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=whatsapp.schemas.d.ts.map