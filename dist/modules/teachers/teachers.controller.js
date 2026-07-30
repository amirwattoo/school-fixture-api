import { sendSuccess } from "../../common/response.js";
import { createTeacherSchema, teacherIdSchema, teacherQuerySchema, updateTeacherSchema, } from "./teachers.schemas.js";
import { teachersService } from "./teachers.service.js";
export const listTeachers = async (request, response) => {
    const query = teacherQuerySchema.parse(request.query);
    const teachers = await teachersService.list(request.auth.schoolId, {
        ...query,
        isActive: query.isActive === undefined ? undefined : query.isActive === "true",
    });
    sendSuccess(response, { teachers }, "Teachers retrieved");
};
export const getTeacher = async (request, response) => {
    const { teacherId } = teacherIdSchema.parse(request.params);
    sendSuccess(response, { teacher: await teachersService.get(request.auth.schoolId, teacherId) }, "Teacher retrieved");
};
export const createTeacher = async (request, response) => {
    const teacher = await teachersService.create(request.auth, createTeacherSchema.parse(request.body));
    sendSuccess(response, { teacher }, "Teacher created", 201);
};
export const updateTeacher = async (request, response) => {
    const { teacherId } = teacherIdSchema.parse(request.params);
    const teacher = await teachersService.update(request.auth, teacherId, updateTeacherSchema.parse(request.body));
    sendSuccess(response, { teacher }, "Teacher updated");
};
export const disableTeacher = async (request, response) => {
    const { teacherId } = teacherIdSchema.parse(request.params);
    const teacher = await teachersService.disable(request.auth, teacherId);
    sendSuccess(response, { teacher }, "Teacher disabled");
};
//# sourceMappingURL=teachers.controller.js.map