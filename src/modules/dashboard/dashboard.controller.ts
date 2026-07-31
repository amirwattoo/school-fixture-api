import type { RequestHandler } from "express";

import { sendSuccess } from "../../common/response.js";
import { fixtureQuerySchema } from "../fixtures/fixtures.schemas.js";
import { dashboardService } from "./dashboard.service.js";

export const dashboardSummary: RequestHandler = async (request, response) => {
  const { date } = fixtureQuerySchema.parse(request.query);
  sendSuccess(
    response,
    { summary: await dashboardService.summary(request.auth!.schoolId, date) },
    "Dashboard summary retrieved",
  );
};
