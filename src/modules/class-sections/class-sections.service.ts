import { Prisma } from "@prisma/client";

import { ApiError } from "../../common/api-error.js";
import { type AuditActor, createAuditLog } from "../../common/audit.js";
import {
  buildClassName,
  deriveTeachingLevel,
  normalizeSection,
} from "../../common/school-data.js";
import { classSectionsRepository } from "./class-sections.repository.js";

const handleDuplicate = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new ApiError(
      409,
      "DUPLICATE_CLASS_SECTION",
      "This grade and section already exists",
    );
  }
  throw error;
};

const derivedValues = (gradeNumber: number, section: string) => ({
  gradeNumber,
  section: normalizeSection(section),
  name: buildClassName(gradeNumber, section),
  teachingLevel: deriveTeachingLevel(gradeNumber),
});

export const classSectionsService = {
  list(
    schoolId: string,
    filters: { gradeNumber?: number; isActive?: boolean },
  ) {
    return classSectionsRepository.list(schoolId, filters);
  },

  async get(schoolId: string, classSectionId: string) {
    const classSection = await classSectionsRepository.find(
      schoolId,
      classSectionId,
    );
    if (!classSection)
      throw new ApiError(
        404,
        "CLASS_SECTION_NOT_FOUND",
        "Class section was not found",
      );
    return classSection;
  },

  async create(
    actor: AuditActor,
    input: { gradeNumber: number; section: string },
  ) {
    try {
      const classSection = await classSectionsRepository.create({
        schoolId: actor.schoolId,
        ...derivedValues(input.gradeNumber, input.section),
      });
      await createAuditLog(
        actor,
        "CLASS_SECTION_CREATED",
        "ClassSection",
        classSection.id,
        { new: classSection },
      );
      return classSection;
    } catch (error) {
      handleDuplicate(error);
    }
  },

  async update(
    actor: AuditActor,
    classSectionId: string,
    input: { gradeNumber?: number; section?: string; isActive?: boolean },
  ) {
    const oldClass = await this.get(actor.schoolId, classSectionId);
    const gradeNumber = input.gradeNumber ?? oldClass.gradeNumber;
    const section = input.section ?? oldClass.section;
    const values =
      gradeNumber === null
        ? {
            gradeNumber: null,
            section: oldClass.section,
            name: oldClass.name,
            teachingLevel: "BOTH" as const,
          }
        : derivedValues(gradeNumber, section);
    try {
      const classSection = await classSectionsRepository.update(
        classSectionId,
        {
          ...values,
          isActive: input.isActive,
        },
      );
      await createAuditLog(
        actor,
        "CLASS_SECTION_UPDATED",
        "ClassSection",
        classSection.id,
        { old: oldClass, new: classSection },
      );
      return classSection;
    } catch (error) {
      handleDuplicate(error);
    }
  },

  async disable(actor: AuditActor, classSectionId: string) {
    const oldClass = await this.get(actor.schoolId, classSectionId);
    const classSection = await classSectionsRepository.update(classSectionId, {
      isActive: false,
    });
    await createAuditLog(
      actor,
      "CLASS_SECTION_DISABLED",
      "ClassSection",
      classSection.id,
      { old: oldClass, new: classSection },
    );
    return classSection;
  },
};
