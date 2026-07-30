import { Router } from "express";
import { asyncHandler } from "../../common/async-handler.js";
import { authenticate } from "../auth/auth.middleware.js";
import { authorizeRoles } from "../auth/authorize-roles.middleware.js";
import { createTeacher, disableTeacher, getTeacher, listTeachers, updateTeacher, } from "./teachers.controller.js";
export const teachersRouter = Router();
teachersRouter.use(authenticate, authorizeRoles("PRINCIPAL", "TIMETABLE_INCHARGE"));
teachersRouter.get("/", asyncHandler(listTeachers));
teachersRouter.post("/", asyncHandler(createTeacher));
teachersRouter.get("/:teacherId", asyncHandler(getTeacher));
teachersRouter.patch("/:teacherId", asyncHandler(updateTeacher));
teachersRouter.delete("/:teacherId", asyncHandler(disableTeacher));
//# sourceMappingURL=teachers.routes.js.map