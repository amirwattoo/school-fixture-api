import { Router } from "express";
import { asyncHandler } from "../../common/async-handler.js";
import { authenticate } from "../auth/auth.middleware.js";
import { authorizeRoles } from "../auth/authorize-roles.middleware.js";
import { deleteAttendance, listAttendance, saveBulkAttendance, updateAttendance, } from "./attendance.controller.js";
export const attendanceRouter = Router();
attendanceRouter.use(authenticate, authorizeRoles("PRINCIPAL", "TIMETABLE_INCHARGE"));
attendanceRouter.get("/", asyncHandler(listAttendance));
attendanceRouter.post("/bulk", asyncHandler(saveBulkAttendance));
attendanceRouter.put("/:teacherId", asyncHandler(updateAttendance));
attendanceRouter.delete("/:teacherId", asyncHandler(deleteAttendance));
//# sourceMappingURL=attendance.routes.js.map