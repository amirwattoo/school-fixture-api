import { Router } from "express";

import { asyncHandler } from "../../common/async-handler.js";
import { authenticate } from "../auth/auth.middleware.js";
import { authorizeRoles } from "../auth/authorize-roles.middleware.js";
import {
  createSubject,
  disableSubject,
  getSubject,
  listSubjects,
  updateSubject,
} from "./subjects.controller.js";

export const subjectsRouter = Router();

subjectsRouter.use(
  authenticate,
  authorizeRoles("PRINCIPAL", "TIMETABLE_INCHARGE"),
);
subjectsRouter.get("/", asyncHandler(listSubjects));
subjectsRouter.post("/", asyncHandler(createSubject));
subjectsRouter.get("/:subjectId", asyncHandler(getSubject));
subjectsRouter.patch("/:subjectId", asyncHandler(updateSubject));
subjectsRouter.delete("/:subjectId", asyncHandler(disableSubject));
