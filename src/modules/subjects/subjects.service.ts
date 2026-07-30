import { Prisma } from "@prisma/client";

import { ApiError } from "../../common/api-error.js";
import { type AuditActor, createAuditLog } from "../../common/audit.js";
import {
  normalizeCode,
  normalizeDisplayName,
} from "../../common/school-data.js";
import { subjectsRepository } from "./subjects.repository.js";

const handleDuplicate = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new ApiError(
      409,
      "DUPLICATE_SUBJECT",
      "A subject with this name or code already exists",
    );
  }
  throw error;
};

const ensureCanDisable = async (subjectId: string) => {
  if ((await subjectsRepository.timetableCount(subjectId)) > 0) {
    throw new ApiError(
      409,
      "SUBJECT_IN_USE",
      "This subject is used in the current timetable and cannot be disabled",
    );
  }
};

export const subjectsService = {
  list(schoolId: string, filters: { search?: string; isActive?: boolean }) {
    return subjectsRepository.list(schoolId, filters);
  },

  async get(schoolId: string, subjectId: string) {
    const subject = await subjectsRepository.find(schoolId, subjectId);
    if (!subject)
      throw new ApiError(404, "SUBJECT_NOT_FOUND", "Subject was not found");
    return subject;
  },

  async create(actor: AuditActor, input: { name: string; code: string }) {
    try {
      const subject = await subjectsRepository.create({
        schoolId: actor.schoolId,
        name: normalizeDisplayName(input.name),
        code: normalizeCode(input.code),
      });
      await createAuditLog(actor, "SUBJECT_CREATED", "Subject", subject.id, {
        new: subject,
      });
      return subject;
    } catch (error) {
      handleDuplicate(error);
    }
  },

  async update(
    actor: AuditActor,
    subjectId: string,
    input: { name?: string; code?: string; isActive?: boolean },
  ) {
    const oldSubject = await this.get(actor.schoolId, subjectId);
    if (input.isActive === false && oldSubject.isActive)
      await ensureCanDisable(subjectId);

    try {
      const subject = await subjectsRepository.update(subjectId, {
        name: input.name ? normalizeDisplayName(input.name) : undefined,
        code: input.code ? normalizeCode(input.code) : undefined,
        isActive: input.isActive,
      });
      await createAuditLog(actor, "SUBJECT_UPDATED", "Subject", subject.id, {
        old: oldSubject,
        new: subject,
      });
      return subject;
    } catch (error) {
      handleDuplicate(error);
    }
  },

  async disable(actor: AuditActor, subjectId: string) {
    const oldSubject = await this.get(actor.schoolId, subjectId);
    await ensureCanDisable(subjectId);
    const subject = await subjectsRepository.update(subjectId, {
      isActive: false,
    });
    await createAuditLog(actor, "SUBJECT_DISABLED", "Subject", subject.id, {
      old: oldSubject,
      new: subject,
    });
    return subject;
  },
};
