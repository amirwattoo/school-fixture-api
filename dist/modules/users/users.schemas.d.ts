import { z } from "zod";
export declare const createUserSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    temporaryPassword: z.ZodString;
}, z.core.$strip>;
export declare const updateUserSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    temporaryPassword: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const userIdParamsSchema: z.ZodObject<{
    userId: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=users.schemas.d.ts.map