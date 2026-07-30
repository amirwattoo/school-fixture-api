import { z } from "zod";

import { normalizePakistaniWhatsAppNumber } from "../whatsapp/whatsapp-number.util.js";

const teachingLevelSchema = z.enum(["LOWER", "HIGHER", "BOTH"]);

const whatsappSchema = z
  .string()
  .trim()
  .max(30)
  .nullable()
  .optional()
  .refine(
    (value) => {
      try {
        normalizePakistaniWhatsAppNumber(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Enter a valid Pakistani WhatsApp number" },
  );

export const createTeacherSchema = z.object({
  name: z.string().trim().min(2).max(120),
  employeeCode: z.string().trim().min(1).max(30),
  whatsappNumber: whatsappSchema,
  subjectSpecializations: z
    .array(z.string().trim().max(100))
    .max(30)
    .default([]),
  teachingLevel: teachingLevelSchema,
});

export const updateTeacherSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    employeeCode: z.string().trim().min(1).max(30).optional(),
    whatsappNumber: whatsappSchema,
    subjectSpecializations: z
      .array(z.string().trim().max(100))
      .max(30)
      .optional(),
    teachingLevel: teachingLevelSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const teacherIdSchema = z.object({
  teacherId: z.string().cuid(),
});

export const teacherQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  teachingLevel: teachingLevelSchema.optional(),
  subject: z.string().trim().max(100).optional(),
});
