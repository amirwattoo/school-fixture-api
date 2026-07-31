import { z } from "zod";

const yearSchema = z.coerce.number().int().min(2000).max(2200);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
};

export const weeklyRecordsSchema = z.object({
  year: yearSchema,
  week: z.coerce.number().int().min(1).max(53),
  sort: z.enum(["highest", "lowest", "name"]).default("name"),
});

export const yearlyRecordsSchema = z.object({
  year: yearSchema,
  sort: z.enum(["highest", "lowest", "name"]).default("name"),
});

export const teacherHistoryParamsSchema = z.object({
  teacherId: z.string().cuid(),
});

export const teacherHistoryQuerySchema = z
  .object({
    year: yearSchema.optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
    ...paginationFields,
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "From date must not be after to date",
    path: ["from"],
  });

export const attendanceReportSchema = z
  .object({
    year: yearSchema.optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    ...paginationFields,
  })
  .refine((value) => value.year || value.from || value.to, {
    message: "Provide a year or date range",
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "From date must not be after to date",
    path: ["from"],
  });
