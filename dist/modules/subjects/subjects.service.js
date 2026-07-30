import { Prisma } from "@prisma/client";
import { ApiError } from "../../common/api-error.js";
import { createAuditLog } from "../../common/audit.js";
import { normalizeCode, normalizeDisplayName, } from "../../common/school-data.js";
import { subjectsRepository } from "./subjects.repository.js";
const handleDuplicate = (error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002") {
        throw new ApiError(409, "DUPLICATE_SUBJECT", "A subject with this name or code already exists");
    }
    throw error;
};
const ensureCanDisable = async (subjectId) => {
    if ((await subjectsRepository.timetableCount(subjectId)) > 0) {
        throw new ApiError(409, "SUBJECT_IN_USE", "This subject is used in the current timetable and cannot be disabled");
    }
};
export const subjectsService = {
    list(schoolId, filters) {
        return subjectsRepository.list(schoolId, filters);
    },
    async get(schoolId, subjectId) {
        const subject = await subjectsRepository.find(schoolId, subjectId);
        if (!subject)
            throw new ApiError(404, "SUBJECT_NOT_FOUND", "Subject was not found");
        return subject;
    },
    async create(actor, input) {
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
        }
        catch (error) {
            handleDuplicate(error);
        }
    },
    async update(actor, subjectId, input) {
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
        }
        catch (error) {
            handleDuplicate(error);
        }
    },
    async disable(actor, subjectId) {
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
//# sourceMappingURL=subjects.service.js.map