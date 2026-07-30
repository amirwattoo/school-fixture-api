import { sendSuccess } from "../../common/response.js";
import { attendanceReportSchema, teacherHistoryParamsSchema, teacherHistoryQuerySchema, weeklyRecordsSchema, yearlyRecordsSchema, } from "./fixture-records.schemas.js";
import { fixtureRecordsService } from "./fixture-records.service.js";
export const weeklyRecords = async (request, response) => {
    const query = weeklyRecordsSchema.parse(request.query);
    const records = await fixtureRecordsService.weekly(request.auth.schoolId, query.year, query.week, query.sort);
    sendSuccess(response, { records }, "Weekly fixture records retrieved");
};
export const yearlyRecords = async (request, response) => {
    const query = yearlyRecordsSchema.parse(request.query);
    const records = await fixtureRecordsService.yearly(request.auth.schoolId, query.year, query.sort);
    sendSuccess(response, { records }, "Yearly fixture records retrieved");
};
export const teacherHistory = async (request, response) => {
    const { teacherId } = teacherHistoryParamsSchema.parse(request.params);
    const query = teacherHistoryQuerySchema.parse(request.query);
    const data = await fixtureRecordsService.history(request.auth.schoolId, teacherId, query);
    sendSuccess(response, data, "Teacher fixture history retrieved");
};
export const attendanceRecords = async (request, response) => {
    const query = attendanceReportSchema.parse(request.query);
    const records = await fixtureRecordsService.attendance(request.auth.schoolId, query);
    sendSuccess(response, { records }, "Attendance exception records retrieved");
};
//# sourceMappingURL=fixture-records.controller.js.map