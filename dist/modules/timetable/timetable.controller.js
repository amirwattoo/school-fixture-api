import { sendSuccess } from "../../common/response.js";
import { createTimetableEntrySchema, timetableEntryIdSchema, timetableQuerySchema, updateTimetableEntrySchema, } from "./timetable.schemas.js";
import { timetableService } from "./timetable.service.js";
export const listTimetableEntries = async (request, response) => {
    const entries = await timetableService.list(request.auth.schoolId, timetableQuerySchema.parse(request.query));
    sendSuccess(response, { entries }, "Timetable entries retrieved");
};
export const getTimetableEntry = async (request, response) => {
    const { entryId } = timetableEntryIdSchema.parse(request.params);
    sendSuccess(response, {
        entry: await timetableService.get(request.auth.schoolId, entryId),
    }, "Timetable entry retrieved");
};
export const createTimetableEntry = async (request, response) => {
    const entry = await timetableService.create(request.auth, createTimetableEntrySchema.parse(request.body));
    sendSuccess(response, { entry }, "Timetable entry created", 201);
};
export const updateTimetableEntry = async (request, response) => {
    const { entryId } = timetableEntryIdSchema.parse(request.params);
    const entry = await timetableService.update(request.auth, entryId, updateTimetableEntrySchema.parse(request.body));
    sendSuccess(response, { entry }, "Timetable entry updated");
};
export const deleteTimetableEntry = async (request, response) => {
    const { entryId } = timetableEntryIdSchema.parse(request.params);
    const entry = await timetableService.delete(request.auth, entryId);
    sendSuccess(response, { entry }, "Timetable entry deleted");
};
//# sourceMappingURL=timetable.controller.js.map