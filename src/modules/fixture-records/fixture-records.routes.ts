import { Router } from "express";

import { asyncHandler } from "../../common/async-handler.js";
import { authenticate } from "../auth/auth.middleware.js";
import { authorizeRoles } from "../auth/authorize-roles.middleware.js";
import {
  attendanceRecords,
  teacherHistory,
  weeklyRecords,
  yearlyRecords,
} from "./fixture-records.controller.js";

export const fixtureRecordsRouter = Router();

fixtureRecordsRouter.use(
  authenticate,
  authorizeRoles("PRINCIPAL", "TIMETABLE_INCHARGE"),
);
fixtureRecordsRouter.get("/weekly", asyncHandler(weeklyRecords));
fixtureRecordsRouter.get("/yearly", asyncHandler(yearlyRecords));
fixtureRecordsRouter.get("/attendance", asyncHandler(attendanceRecords));
fixtureRecordsRouter.get("/teachers/:teacherId", asyncHandler(teacherHistory));
