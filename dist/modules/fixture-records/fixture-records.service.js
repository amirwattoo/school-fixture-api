import { ApiError } from "../../common/api-error.js";
import { parseDateOnly } from "../../common/date-only.js";
import { attendancePeriodSummary } from "../attendance/attendance-availability.js";
import { fixtureRecordsRepository } from "./fixture-records.repository.js";
const sortRows = (rows, sort) => rows.sort((left, right) => {
    if (sort === "highest")
        return (right.fixtureCount - left.fixtureCount ||
            left.teacherName.localeCompare(right.teacherName));
    if (sort === "lowest")
        return (left.fixtureCount - right.fixtureCount ||
            left.teacherName.localeCompare(right.teacherName));
    return left.teacherName.localeCompare(right.teacherName);
});
export const fixtureRecordsService = {
    async weekly(schoolId, year, weekNumber, sort) {
        const [teachers, summaries] = await Promise.all([
            fixtureRecordsRepository.teachers(schoolId),
            fixtureRecordsRepository.weekly(schoolId, year, weekNumber),
        ]);
        const counts = new Map(summaries.map((summary) => [summary.teacherId, summary.fixtureCount]));
        return sortRows(teachers.map((teacher) => ({
            teacherId: teacher.id,
            teacherName: teacher.name,
            employeeCode: teacher.employeeCode,
            fixtureCount: counts.get(teacher.id) ?? 0,
            isActive: teacher.isActive,
        })), sort);
    },
    async yearly(schoolId, year, sort) {
        const [teachers, summaries] = await Promise.all([
            fixtureRecordsRepository.teachers(schoolId),
            fixtureRecordsRepository.yearly(schoolId, year),
        ]);
        const counts = new Map(summaries.map((summary) => [
            summary.teacherId,
            summary._sum.fixtureCount ?? 0,
        ]));
        return sortRows(teachers.map((teacher) => ({
            teacherId: teacher.id,
            teacherName: teacher.name,
            employeeCode: teacher.employeeCode,
            fixtureCount: counts.get(teacher.id) ?? 0,
            isActive: teacher.isActive,
        })), sort);
    },
    async history(schoolId, teacherId, filters) {
        const teacher = await fixtureRecordsRepository.teacher(schoolId, teacherId);
        if (!teacher)
            throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher was not found");
        const yearFrom = filters.year
            ? parseDateOnly(`${filters.year}-01-01`)
            : undefined;
        const yearTo = filters.year
            ? parseDateOnly(`${filters.year}-12-31`)
            : undefined;
        const fixtures = await fixtureRecordsRepository.history(schoolId, teacherId, {
            from: filters.from ? parseDateOnly(filters.from) : yearFrom,
            to: filters.to ? parseDateOnly(filters.to) : yearTo,
            status: filters.status,
        });
        return { teacher, fixtures };
    },
    async attendance(schoolId, filters) {
        const yearFrom = filters.year
            ? parseDateOnly(`${filters.year}-01-01`)
            : undefined;
        const yearTo = filters.year
            ? parseDateOnly(`${filters.year}-12-31`)
            : undefined;
        const range = {
            from: filters.from ? parseDateOnly(filters.from) : yearFrom,
            to: filters.to ? parseDateOnly(filters.to) : yearTo,
        };
        const [records, fixtureRows, school] = await Promise.all([
            fixtureRecordsRepository.attendance(schoolId, range),
            fixtureRecordsRepository.attendanceFixtureCounts(schoolId, range),
            fixtureRecordsRepository.schoolSettings(schoolId),
        ]);
        if (!school)
            throw new ApiError(404, "SCHOOL_NOT_FOUND", "School was not found");
        const fixtureCounts = new Map();
        for (const fixture of fixtureRows) {
            const key = `${fixture.absentTeacherId}:${fixture.date.toISOString().slice(0, 10)}`;
            fixtureCounts.set(key, (fixtureCounts.get(key) ?? 0) + 1);
        }
        return records.map((record) => {
            const periods = attendancePeriodSummary(record, school.periodsPerDay);
            const key = `${record.teacherId}:${record.date.toISOString().slice(0, 10)}`;
            return {
                id: record.id,
                teacher: record.teacher,
                date: record.date,
                exceptionType: record.status,
                availablePeriods: periods.availablePeriods,
                unavailablePeriods: periods.unavailablePeriods,
                reason: record.reason ?? record.remarks,
                notes: record.notes,
                fixturesGenerated: fixtureCounts.get(key) ?? 0,
            };
        });
    },
};
//# sourceMappingURL=fixture-records.service.js.map