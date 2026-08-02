import { Router } from "express";
import multer from "multer";
import { z } from "zod";

import { asyncHandler } from "../../common/async-handler.js";
import { ApiError } from "../../common/api-error.js";
import { sendSuccess } from "../../common/response.js";
import { authenticate } from "../auth/auth.middleware.js";
import { authorizeRoles } from "../auth/authorize-roles.middleware.js";
import { timetableUploadService } from "./timetable-upload.service.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 } });
const uploadAttempts = new Map<string, number[]>();
const uploadRateLimit: import("express").RequestHandler = (request, _response, next) => {
  const key = `${request.auth!.schoolId}:${request.auth!.userId}`;
  const now = Date.now();
  const recent = (uploadAttempts.get(key) ?? []).filter((time) => time > now - 15 * 60_000);
  if (recent.length >= 10) { next(new ApiError(429, "UPLOAD_RATE_LIMITED", "Too many timetable uploads. Please try again later.")); return; }
  recent.push(now); uploadAttempts.set(key, recent); next();
};
const confirmSchema = z.object({ confirmReplace: z.literal(true), confirmTeacherUpdates: z.boolean().default(false), teacherMappings: z.record(z.string(), z.string().cuid()).optional() });
const paramsSchema = z.object({ batchId: z.string().cuid() });

export const timetableUploadRouter = Router();
timetableUploadRouter.use(authenticate, authorizeRoles("PRINCIPAL", "TIMETABLE_INCHARGE"));
timetableUploadRouter.get("/", asyncHandler(async (request, response) => sendSuccess(response, { batches: await timetableUploadService.list(request.auth!.schoolId) }, "Import history retrieved")));
timetableUploadRouter.post("/preview", uploadRateLimit, upload.single("file"), asyncHandler(async (request, response) => {
  if (!request.file) throw new ApiError(400, "TIMETABLE_FILE_REQUIRED", "Choose a timetable file");
  sendSuccess(response, await timetableUploadService.preview(request.auth!, request.file), "Timetable preview created", 201);
}));
timetableUploadRouter.post("/:batchId/confirm", asyncHandler(async (request, response) => {
  const { batchId } = paramsSchema.parse(request.params);
  sendSuccess(response, { summary: await timetableUploadService.confirm(request.auth!, batchId, confirmSchema.parse(request.body)) }, "Timetable imported");
}));
