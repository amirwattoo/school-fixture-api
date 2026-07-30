import { Prisma, type DayOfWeek } from "@prisma/client";

import { ApiError } from "../../common/api-error.js";
import { type AuditActor, createAuditLog } from "../../common/audit.js";
import { weekdayOrder } from "../../common/school-data.js";
import { timetableRepository } from "./timetable.repository.js";

export type TimetableInput = {
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  classSectionId: string;
  teacherId: string;
  subjectId: string;
};

export const validatePeriodRange = (
  periodNumber: number,
  periodsPerDay: number,
) => {
  if (
    !Number.isInteger(periodNumber) ||
    periodNumber < 1 ||
    periodNumber > periodsPerDay
  ) {
    throw new ApiError(
      400,
      "INVALID_PERIOD_NUMBER",
      `Period number must be between 1 and ${periodsPerDay}`,
    );
  }
};

const validateResources = async (schoolId: string, input: TimetableInput) => {
  const [school, teacher, subject, classSection] = await Promise.all([
    timetableRepository.school(schoolId),
    timetableRepository.teacher(schoolId, input.teacherId),
    timetableRepository.subject(schoolId, input.subjectId),
    timetableRepository.classSection(schoolId, input.classSectionId),
  ]);

  if (!school)
    throw new ApiError(404, "SCHOOL_NOT_FOUND", "School was not found");
  validatePeriodRange(input.periodNumber, school.periodsPerDay);

  if (!teacher)
    throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher was not found");
  if (!teacher.isActive)
    throw new ApiError(
      409,
      "INACTIVE_TEACHER",
      "The selected teacher is inactive",
    );

  if (!subject)
    throw new ApiError(404, "SUBJECT_NOT_FOUND", "Subject was not found");
  if (!subject.isActive)
    throw new ApiError(
      409,
      "INACTIVE_SUBJECT",
      "The selected subject is inactive",
    );

  if (!classSection)
    throw new ApiError(
      404,
      "CLASS_SECTION_NOT_FOUND",
      "Class section was not found",
    );
  if (!classSection.isActive)
    throw new ApiError(
      409,
      "INACTIVE_CLASS_SECTION",
      "The selected class section is inactive",
    );
};

const validateConflicts = async (
  schoolId: string,
  input: TimetableInput,
  excludeId?: string,
) => {
  const [teacherConflict, classConflict] = await Promise.all([
    timetableRepository.teacherConflict(
      schoolId,
      input.dayOfWeek,
      input.periodNumber,
      input.teacherId,
      excludeId,
    ),
    timetableRepository.classConflict(
      schoolId,
      input.dayOfWeek,
      input.periodNumber,
      input.classSectionId,
      excludeId,
    ),
  ]);
  if (teacherConflict) {
    throw new ApiError(
      409,
      "TEACHER_TIMETABLE_CONFLICT",
      `${teacherConflict.teacher.name} already teaches ${teacherConflict.classSection.name} in this period`,
    );
  }
  if (classConflict) {
    throw new ApiError(
      409,
      "CLASS_TIMETABLE_CONFLICT",
      `${classConflict.classSection.name} already has ${classConflict.subject.name} in this period`,
    );
  }
};

const handleDatabaseConflict = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const fields = Array.isArray(error.meta?.target)
      ? error.meta.target.map(String)
      : [];
    if (fields.includes("teacherId")) {
      throw new ApiError(
        409,
        "TEACHER_TIMETABLE_CONFLICT",
        "The teacher already has a lecture in this period",
      );
    }
    throw new ApiError(
      409,
      "CLASS_TIMETABLE_CONFLICT",
      "The class already has a lecture in this period",
    );
  }
  throw error;
};

export const timetableService = {
  async list(
    schoolId: string,
    filters: {
      dayOfWeek?: DayOfWeek;
      teacherId?: string;
      classSectionId?: string;
      subjectId?: string;
    },
  ) {
    const entries = await timetableRepository.list(schoolId, filters);
    return entries.sort(
      (left, right) =>
        weekdayOrder(left.dayOfWeek) - weekdayOrder(right.dayOfWeek) ||
        left.periodNumber - right.periodNumber ||
        left.classSection.name.localeCompare(right.classSection.name),
    );
  },

  async get(schoolId: string, entryId: string) {
    const entry = await timetableRepository.find(schoolId, entryId);
    if (!entry)
      throw new ApiError(
        404,
        "TIMETABLE_ENTRY_NOT_FOUND",
        "Timetable entry was not found",
      );
    return entry;
  },

  async create(actor: AuditActor, input: TimetableInput) {
    await validateResources(actor.schoolId, input);
    await validateConflicts(actor.schoolId, input);
    try {
      const entry = await timetableRepository.create({
        schoolId: actor.schoolId,
        ...input,
      });
      await createAuditLog(
        actor,
        "TIMETABLE_ENTRY_CREATED",
        "MasterTimetable",
        entry.id,
        { new: entry },
      );
      return entry;
    } catch (error) {
      handleDatabaseConflict(error);
    }
  },

  async update(
    actor: AuditActor,
    entryId: string,
    input: Partial<TimetableInput>,
  ) {
    const oldEntry = await this.get(actor.schoolId, entryId);
    const completeInput: TimetableInput = {
      dayOfWeek: input.dayOfWeek ?? oldEntry.dayOfWeek,
      periodNumber: input.periodNumber ?? oldEntry.periodNumber,
      classSectionId: input.classSectionId ?? oldEntry.classSectionId,
      teacherId: input.teacherId ?? oldEntry.teacherId,
      subjectId: input.subjectId ?? oldEntry.subjectId,
    };
    await validateResources(actor.schoolId, completeInput);
    await validateConflicts(actor.schoolId, completeInput, entryId);
    try {
      const entry = await timetableRepository.update(entryId, completeInput);
      await createAuditLog(
        actor,
        "TIMETABLE_ENTRY_UPDATED",
        "MasterTimetable",
        entry.id,
        { old: oldEntry, new: entry },
      );
      return entry;
    } catch (error) {
      handleDatabaseConflict(error);
    }
  },

  async delete(actor: AuditActor, entryId: string) {
    const oldEntry = await this.get(actor.schoolId, entryId);
    const entry = await timetableRepository.delete(entryId);
    await createAuditLog(
      actor,
      "TIMETABLE_ENTRY_DELETED",
      "MasterTimetable",
      entry.id,
      { old: oldEntry },
    );
    return entry;
  },
};
