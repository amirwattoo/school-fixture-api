import type { RequestHandler } from "express";

import { sendSuccess } from "../../common/response.js";
import {
  classSectionIdSchema,
  classSectionQuerySchema,
  createClassSectionSchema,
  updateClassSectionSchema,
} from "./class-sections.schemas.js";
import { classSectionsService } from "./class-sections.service.js";

export const listClassSections: RequestHandler = async (request, response) => {
  const query = classSectionQuerySchema.parse(request.query);
  const classSections = await classSectionsService.list(
    request.auth!.schoolId,
    {
      ...query,
      isActive:
        query.isActive === undefined ? undefined : query.isActive === "true",
    },
  );
  sendSuccess(response, { classSections }, "Class sections retrieved");
};

export const getClassSection: RequestHandler = async (request, response) => {
  const { classSectionId } = classSectionIdSchema.parse(request.params);
  sendSuccess(
    response,
    {
      classSection: await classSectionsService.get(
        request.auth!.schoolId,
        classSectionId,
      ),
    },
    "Class section retrieved",
  );
};

export const createClassSection: RequestHandler = async (request, response) => {
  const classSection = await classSectionsService.create(
    request.auth!,
    createClassSectionSchema.parse(request.body),
  );
  sendSuccess(response, { classSection }, "Class section created", 201);
};

export const updateClassSection: RequestHandler = async (request, response) => {
  const { classSectionId } = classSectionIdSchema.parse(request.params);
  const classSection = await classSectionsService.update(
    request.auth!,
    classSectionId,
    updateClassSectionSchema.parse(request.body),
  );
  sendSuccess(response, { classSection }, "Class section updated");
};

export const disableClassSection: RequestHandler = async (
  request,
  response,
) => {
  const { classSectionId } = classSectionIdSchema.parse(request.params);
  const classSection = await classSectionsService.disable(
    request.auth!,
    classSectionId,
  );
  sendSuccess(response, { classSection }, "Class section disabled");
};
