import { Router } from "express";
import { asyncHandler } from "../../common/async-handler.js";
import { authenticate } from "../auth/auth.middleware.js";
import { authorizeRoles } from "../auth/authorize-roles.middleware.js";
import { createTimetableEntry, deleteTimetableEntry, getTimetableEntry, listTimetableEntries, updateTimetableEntry, } from "./timetable.controller.js";
export const timetableRouter = Router();
timetableRouter.use(authenticate, authorizeRoles("PRINCIPAL", "TIMETABLE_INCHARGE"));
timetableRouter.get("/", asyncHandler(listTimetableEntries));
timetableRouter.post("/", asyncHandler(createTimetableEntry));
timetableRouter.get("/:entryId", asyncHandler(getTimetableEntry));
timetableRouter.patch("/:entryId", asyncHandler(updateTimetableEntry));
timetableRouter.delete("/:entryId", asyncHandler(deleteTimetableEntry));
//# sourceMappingURL=timetable.routes.js.map