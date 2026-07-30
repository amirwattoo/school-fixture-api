import { Prisma } from "@prisma/client";

import { ApiError } from "../../common/api-error.js";
import { type AuditActor, createAuditLog } from "../../common/audit.js";
import {
  cleanSpecializations,
  normalizeCode,
  normalizeDisplayName,
} from "../../common/school-data.js";
import { normalizePakistaniWhatsAppNumber } from "../whatsapp/whatsapp-number.util.js";
import {
  teachersRepository,
  type TeacherFilters,
} from "./teachers.repository.js";

type TeacherInput = {
  name: string;
  employeeCode: string;
  whatsappNumber?: string | null;
  subjectSpecializations: string[];
  teachingLevel: "LOWER" | "HIGHER" | "BOTH";
};

const handleDuplicate = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new ApiError(
      409,
      "DUPLICATE_EMPLOYEE_CODE",
      "A teacher with this employee code already exists",
    );
  }
  throw error;
};

const normalizedInput = (input: TeacherInput) => ({
  name: normalizeWhitespaceName(input.name),
  employeeCode: normalizeCode(input.employeeCode),
  whatsappNumber: normalizePakistaniWhatsAppNumber(input.whatsappNumber),
  subjectSpecializations: cleanSpecializations(input.subjectSpecializations),
  teachingLevel: input.teachingLevel,
});

const normalizeWhitespaceName = (name: string) =>
  name.trim().replace(/\s+/g, " ");

export const teachersService = {
  list(schoolId: string, filters: TeacherFilters) {
    return teachersRepository.list(schoolId, {
      ...filters,
      subject: filters.subject
        ? normalizeDisplayName(filters.subject)
        : undefined,
    });
  },

  async get(schoolId: string, teacherId: string) {
    const teacher = await teachersRepository.find(schoolId, teacherId);
    if (!teacher)
      throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher was not found");
    return teacher;
  },

  async create(actor: AuditActor, input: TeacherInput) {
    try {
      const teacher = await teachersRepository.create({
        schoolId: actor.schoolId,
        ...normalizedInput(input),
      });
      await createAuditLog(actor, "TEACHER_CREATED", "Teacher", teacher.id, {
        new: teacher,
      });
      return teacher;
    } catch (error) {
      handleDuplicate(error);
    }
  },

  async update(
    actor: AuditActor,
    teacherId: string,
    input: Partial<TeacherInput> & { isActive?: boolean },
  ) {
    const oldTeacher = await this.get(actor.schoolId, teacherId);
    try {
      const teacher = await teachersRepository.update(teacherId, {
        name: input.name?.trim().replace(/\s+/g, " "),
        employeeCode: input.employeeCode
          ? normalizeCode(input.employeeCode)
          : undefined,
        whatsappNumber:
          input.whatsappNumber !== undefined
            ? normalizePakistaniWhatsAppNumber(input.whatsappNumber)
            : undefined,
        subjectSpecializations: input.subjectSpecializations
          ? cleanSpecializations(input.subjectSpecializations)
          : undefined,
        teachingLevel: input.teachingLevel,
        isActive: input.isActive,
      });
      await createAuditLog(actor, "TEACHER_UPDATED", "Teacher", teacher.id, {
        old: oldTeacher,
        new: teacher,
      });
      return teacher;
    } catch (error) {
      handleDuplicate(error);
    }
  },

  async disable(actor: AuditActor, teacherId: string) {
    const oldTeacher = await this.get(actor.schoolId, teacherId);
    const teacher = await teachersRepository.update(teacherId, {
      isActive: false,
    });
    await createAuditLog(actor, "TEACHER_DISABLED", "Teacher", teacher.id, {
      old: oldTeacher,
      new: teacher,
    });
    return teacher;
  },
};
