import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const notificationListSchema = z.object({
  date: dateSchema.optional(),
  status: z.enum(["READY", "OPENED", "MANUALLY_CONFIRMED"]).optional(),
  teacherId: z.string().cuid().optional(),
  fixtureId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const notificationIdSchema = z.object({
  notificationId: z.string().cuid(),
});
