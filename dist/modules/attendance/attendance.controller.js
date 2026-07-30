import { sendSuccess } from "../../common/response.js";
import { attendanceQuerySchema, attendanceTeacherParamsSchema, bulkAttendanceSchema, updateAttendanceSchema, } from "./attendance.schemas.js";
import { attendanceService } from "./attendance.service.js";
export const listAttendance = async (request, response) => {
    const { date } = attendanceQuerySchema.parse(request.query);
    const result = await attendanceService.list(request.auth.schoolId, date);
    sendSuccess(response, result, "Attendance retrieved");
};
export const saveBulkAttendance = async (request, response) => {
    const input = bulkAttendanceSchema.parse(request.body);
    const result = await attendanceService.save(request.auth, input.date, input.records, input.confirmPublishedFixtureImpact);
    sendSuccess(response, result, "Attendance exceptions saved");
};
export const updateAttendance = async (request, response) => {
    const { teacherId } = attendanceTeacherParamsSchema.parse(request.params);
    const input = updateAttendanceSchema.parse(request.body);
    const { confirmPublishedFixtureImpact, ...record } = input;
    const result = await attendanceService.save(request.auth, input.date, [{ teacherId, ...record }], confirmPublishedFixtureImpact);
    sendSuccess(response, { ...result, record: result.records[0] }, "Attendance exception updated");
};
export const deleteAttendance = async (request, response) => {
    const { teacherId } = attendanceTeacherParamsSchema.parse(request.params);
    const { date } = attendanceQuerySchema.parse(request.query);
    await attendanceService.remove(request.auth, date, teacherId);
    sendSuccess(response, {}, "Attendance exception removed");
};
//# sourceMappingURL=attendance.controller.js.map