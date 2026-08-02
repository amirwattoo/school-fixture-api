import type { RequestHandler } from "express";

import { sendSuccess } from "../../common/response.js";
import {
  createTimetableEntrySchema,
  timetableEntryIdSchema,
  timetableGridQuerySchema,
  timetableQuerySchema,
  updateTimetableEntrySchema,
} from "./timetable.schemas.js";
import { timetableService } from "./timetable.service.js";

export const listTimetableEntries: RequestHandler = async (
  request,
  response,
) => {
  const entries = await timetableService.list(
    request.auth!.schoolId,
    timetableQuerySchema.parse(request.query),
  );
  sendSuccess(response, { entries }, "Timetable entries retrieved");
};

export const getTimetableGrid: RequestHandler = async (request, response) => {
  const { view } = timetableGridQuerySchema.parse(request.query);
  sendSuccess(
    response,
    { grid: await timetableService.grid(request.auth!.schoolId, view) },
    "Timetable grid retrieved",
  );
};

export const getTimetableEntry: RequestHandler = async (request, response) => {
  const { entryId } = timetableEntryIdSchema.parse(request.params);
  sendSuccess(
    response,
    {
      entry: await timetableService.get(request.auth!.schoolId, entryId),
    },
    "Timetable entry retrieved",
  );
};

export const createTimetableEntry: RequestHandler = async (
  request,
  response,
) => {
  const entry = await timetableService.create(
    request.auth!,
    createTimetableEntrySchema.parse(request.body),
  );
  sendSuccess(response, { entry }, "Timetable entry created", 201);
};

export const updateTimetableEntry: RequestHandler = async (
  request,
  response,
) => {
  const { entryId } = timetableEntryIdSchema.parse(request.params);
  const { confirmChange: _confirmChange, ...input } =
    updateTimetableEntrySchema.parse(request.body);
  const entry = await timetableService.update(
    request.auth!,
    entryId,
    input,
  );
  sendSuccess(response, { entry }, "Timetable entry updated");
};

export const deleteTimetableEntry: RequestHandler = async (
  request,
  response,
) => {
  const { entryId } = timetableEntryIdSchema.parse(request.params);
  const entry = await timetableService.delete(request.auth!, entryId);
  sendSuccess(response, { entry }, "Timetable entry deleted");
};
