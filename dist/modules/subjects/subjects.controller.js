import { sendSuccess } from "../../common/response.js";
import { createSubjectSchema, subjectIdSchema, subjectQuerySchema, updateSubjectSchema, } from "./subjects.schemas.js";
import { subjectsService } from "./subjects.service.js";
export const listSubjects = async (request, response) => {
    const query = subjectQuerySchema.parse(request.query);
    const subjects = await subjectsService.list(request.auth.schoolId, {
        ...query,
        isActive: query.isActive === undefined ? undefined : query.isActive === "true",
    });
    sendSuccess(response, { subjects }, "Subjects retrieved");
};
export const getSubject = async (request, response) => {
    const { subjectId } = subjectIdSchema.parse(request.params);
    sendSuccess(response, { subject: await subjectsService.get(request.auth.schoolId, subjectId) }, "Subject retrieved");
};
export const createSubject = async (request, response) => {
    const subject = await subjectsService.create(request.auth, createSubjectSchema.parse(request.body));
    sendSuccess(response, { subject }, "Subject created", 201);
};
export const updateSubject = async (request, response) => {
    const { subjectId } = subjectIdSchema.parse(request.params);
    const subject = await subjectsService.update(request.auth, subjectId, updateSubjectSchema.parse(request.body));
    sendSuccess(response, { subject }, "Subject updated");
};
export const disableSubject = async (request, response) => {
    const { subjectId } = subjectIdSchema.parse(request.params);
    const subject = await subjectsService.disable(request.auth, subjectId);
    sendSuccess(response, { subject }, "Subject disabled");
};
//# sourceMappingURL=subjects.controller.js.map