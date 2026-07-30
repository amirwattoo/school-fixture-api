import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  temporaryPassword: z.string().min(10).max(128),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().optional(),
    isActive: z.boolean().optional(),
    temporaryPassword: z.string().min(10).max(128).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const userIdParamsSchema = z.object({
  userId: z.string().cuid(),
});
