import { Router } from "express";

import { asyncHandler } from "../../common/async-handler.js";
import { authenticate } from "../auth/auth.middleware.js";
import { authorizeRoles } from "../auth/authorize-roles.middleware.js";
import { dashboardSummary } from "./dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.use(
  authenticate,
  authorizeRoles("PRINCIPAL", "TIMETABLE_INCHARGE"),
);
dashboardRouter.get("/", asyncHandler(dashboardSummary));
