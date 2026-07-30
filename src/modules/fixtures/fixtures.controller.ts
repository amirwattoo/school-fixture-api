import type { RequestHandler } from "express";

import { sendSuccess } from "../../common/response.js";
import {
  fixtureIdSchema,
  fixtureQuerySchema,
  generateFixturesSchema,
  overrideFixtureSchema,
  publishFixturesSchema,
} from "./fixtures.schemas.js";
import { fixturesService } from "./fixtures.service.js";

export const listFixtures: RequestHandler = async (request, response) => {
  const { date } = fixtureQuerySchema.parse(request.query);
  sendSuccess(
    response,
    { fixtures: await fixturesService.list(request.auth!.schoolId, date) },
    "Fixtures retrieved",
  );
};

export const getFixture: RequestHandler = async (request, response) => {
  const { fixtureId } = fixtureIdSchema.parse(request.params);
  sendSuccess(
    response,
    { fixture: await fixturesService.get(request.auth!.schoolId, fixtureId) },
    "Fixture retrieved",
  );
};

export const getFixtureScoring: RequestHandler = async (request, response) => {
  const { fixtureId } = fixtureIdSchema.parse(request.params);
  sendSuccess(
    response,
    {
      scoringDetails: await fixturesService.scoring(
        request.auth!.schoolId,
        fixtureId,
      ),
    },
    "Fixture scoring retrieved",
  );
};

export const getFixtureCandidates: RequestHandler = async (
  request,
  response,
) => {
  const { fixtureId } = fixtureIdSchema.parse(request.params);
  sendSuccess(
    response,
    await fixturesService.candidates(request.auth!.schoolId, fixtureId),
    "Eligible fixture candidates retrieved",
  );
};

export const generateFixtures: RequestHandler = async (request, response) => {
  const input = generateFixturesSchema.parse(request.body);
  const result = await fixturesService.generate(
    request.auth!,
    input.date,
    input.absentTeacherIds,
  );
  sendSuccess(response, result, "Fixtures generated");
};

export const overrideFixture: RequestHandler = async (request, response) => {
  const { fixtureId } = fixtureIdSchema.parse(request.params);
  const input = overrideFixtureSchema.parse(request.body);
  const fixture = await fixturesService.override(
    request.auth!,
    fixtureId,
    input.assignedTeacherId,
    input.reason,
  );
  sendSuccess(response, { fixture }, "Fixture overridden");
};

export const cancelFixture: RequestHandler = async (request, response) => {
  const { fixtureId } = fixtureIdSchema.parse(request.params);
  const fixture = await fixturesService.cancel(request.auth!, fixtureId);
  sendSuccess(response, { fixture }, "Fixture cancelled");
};

export const publishFixtures: RequestHandler = async (request, response) => {
  const { date } = publishFixturesSchema.parse(request.body);
  const result = await fixturesService.publish(request.auth!, date);
  sendSuccess(response, result, "Fixtures published successfully");
};
