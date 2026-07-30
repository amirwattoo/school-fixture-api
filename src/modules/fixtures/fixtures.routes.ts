import { Router } from "express";

import { asyncHandler } from "../../common/async-handler.js";
import { authenticate } from "../auth/auth.middleware.js";
import { authorizeRoles } from "../auth/authorize-roles.middleware.js";
import {
  cancelFixture,
  generateFixtures,
  getFixture,
  getFixtureCandidates,
  getFixtureScoring,
  listFixtures,
  overrideFixture,
  publishFixtures,
} from "./fixtures.controller.js";

export const fixturesRouter = Router();

fixturesRouter.use(
  authenticate,
  authorizeRoles("PRINCIPAL", "TIMETABLE_INCHARGE"),
);
fixturesRouter.get("/", asyncHandler(listFixtures));
fixturesRouter.post("/generate", asyncHandler(generateFixtures));
fixturesRouter.post("/publish", asyncHandler(publishFixtures));
fixturesRouter.get("/:fixtureId", asyncHandler(getFixture));
fixturesRouter.get("/:fixtureId/scoring", asyncHandler(getFixtureScoring));
fixturesRouter.get(
  "/:fixtureId/candidates",
  asyncHandler(getFixtureCandidates),
);
fixturesRouter.patch("/:fixtureId/override", asyncHandler(overrideFixture));
fixturesRouter.post("/:fixtureId/cancel", asyncHandler(cancelFixture));
