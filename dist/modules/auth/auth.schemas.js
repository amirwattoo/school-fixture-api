import { z } from "zod";
export const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
});
export const changePasswordSchema = z
    .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(10).max(128),
})
    .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
});
//# sourceMappingURL=auth.schemas.js.map