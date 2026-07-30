import { Prisma } from "@prisma/client";
import { ApiError } from "../../common/api-error.js";
import { createAuditLog } from "../../common/audit.js";
import { cleanSpecializations, normalizeCode, normalizeDisplayName, } from "../../common/school-data.js";
import { normalizePakistaniWhatsAppNumber } from "../whatsapp/whatsapp-number.util.js";
import { teachersRepository, } from "./teachers.repository.js";
const handleDuplicate = (error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002") {
        throw new ApiError(409, "DUPLICATE_EMPLOYEE_CODE", "A teacher with this employee code already exists");
    }
    throw error;
};
const normalizedInput = (input) => ({
    name: normalizeWhitespaceName(input.name),
    employeeCode: normalizeCode(input.employeeCode),
    whatsappNumber: normalizePakistaniWhatsAppNumber(input.whatsappNumber),
    subjectSpecializations: cleanSpecializations(input.subjectSpecializations),
    teachingLevel: input.teachingLevel,
});
const normalizeWhitespaceName = (name) => name.trim().replace(/\s+/g, " ");
export const teachersService = {
    list(schoolId, filters) {
        return teachersRepository.list(schoolId, {
            ...filters,
            subject: filters.subject
                ? normalizeDisplayName(filters.subject)
                : undefined,
        });
    },
    async get(schoolId, teacherId) {
        const teacher = await teachersRepository.find(schoolId, teacherId);
        if (!teacher)
            throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher was not found");
        return teacher;
    },
    async create(actor, input) {
        try {
            const teacher = await teachersRepository.create({
                schoolId: actor.schoolId,
                ...normalizedInput(input),
            });
            await createAuditLog(actor, "TEACHER_CREATED", "Teacher", teacher.id, {
                new: teacher,
            });
            return teacher;
        }
        catch (error) {
            handleDuplicate(error);
        }
    },
    async update(actor, teacherId, input) {
        const oldTeacher = await this.get(actor.schoolId, teacherId);
        try {
            const teacher = await teachersRepository.update(teacherId, {
                name: input.name?.trim().replace(/\s+/g, " "),
                employeeCode: input.employeeCode
                    ? normalizeCode(input.employeeCode)
                    : undefined,
                whatsappNumber: input.whatsappNumber !== undefined
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
        }
        catch (error) {
            handleDuplicate(error);
        }
    },
    async disable(actor, teacherId) {
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
//# sourceMappingURL=teachers.service.js.map