import type { FixtureStatus } from "@prisma/client";

import { ApiError } from "../../common/api-error.js";
import { parseDateOnly } from "../../common/date-only.js";
import { databasePhase } from "../../common/request-timing.js";
import { referenceCache } from "../../common/reference-cache.js";
import { attendancePeriodSummary } from "../attendance/attendance-availability.js";
import { fixtureRecordsRepository } from "./fixture-records.repository.js";

type RecordRow = {
  teacherId: string;
  teacherName: string;
  employeeCode: string;
  fixtureCount: number;
  isActive: boolean;
};

const sortRows = (rows: RecordRow[], sort: "highest" | "lowest" | "name") =>
  rows.sort((left, right) => {
    if (sort === "highest")
      return (
        right.fixtureCount - left.fixtureCount ||
        left.teacherName.localeCompare(right.teacherName)
      );
    if (sort === "lowest")
      return (
        left.fixtureCount - right.fixtureCount ||
        left.teacherName.localeCompare(right.teacherName)
      );
    return left.teacherName.localeCompare(right.teacherName);
  });

export const fixtureRecordsService = {
  async weekly(
    schoolId: string,
    year: number,
    weekNumber: number,
    sort: "highest" | "lowest" | "name",
  ) {
    const [teachers, summaries] = await Promise.all([
      referenceCache.getOrLoad("records-teachers", schoolId, "all", () =>
        databasePhase("records-teacher-directory", () =>
          fixtureRecordsRepository.teachers(schoolId),
        ),
      ),
      databasePhase("records-weekly-summary", () =>
        fixtureRecordsRepository.weekly(schoolId, year, weekNumber),
      ),
    ]);
    const counts = new Map(
      summaries.map((summary) => [summary.teacherId, summary.fixtureCount]),
    );
    return sortRows(
      teachers.map((teacher) => ({
        teacherId: teacher.id,
        teacherName: teacher.name,
        employeeCode: teacher.employeeCode,
        fixtureCount: counts.get(teacher.id) ?? 0,
        isActive: teacher.isActive,
      })),
      sort,
    );
  },

  async yearly(
    schoolId: string,
    year: number,
    sort: "highest" | "lowest" | "name",
  ) {
    const [teachers, summaries] = await Promise.all([
      referenceCache.getOrLoad("records-teachers", schoolId, "all", () =>
        databasePhase("records-teacher-directory", () =>
          fixtureRecordsRepository.teachers(schoolId),
        ),
      ),
      databasePhase("records-yearly-summary", () =>
        fixtureRecordsRepository.yearly(schoolId, year),
      ),
    ]);
    const counts = new Map(
      summaries.map((summary) => [
        summary.teacherId,
        summary._sum.fixtureCount ?? 0,
      ]),
    );
    return sortRows(
      teachers.map((teacher) => ({
        teacherId: teacher.id,
        teacherName: teacher.name,
        employeeCode: teacher.employeeCode,
        fixtureCount: counts.get(teacher.id) ?? 0,
        isActive: teacher.isActive,
      })),
      sort,
    );
  },

  async history(
    schoolId: string,
    teacherId: string,
    filters: {
      year?: number;
      from?: string;
      to?: string;
      status?: FixtureStatus;
      page: number;
      pageSize: number;
    },
  ) {
    const yearFrom = filters.year
      ? parseDateOnly(`${filters.year}-01-01`)
      : undefined;
    const yearTo = filters.year
      ? parseDateOnly(`${filters.year}-12-31`)
      : undefined;
    const [teacher, historyResult] = await Promise.all([
      databasePhase("records-history-teacher", () =>
        fixtureRecordsRepository.teacher(schoolId, teacherId),
      ),
      databasePhase("records-history", () =>
        fixtureRecordsRepository.history(schoolId, teacherId, {
        from: filters.from ? parseDateOnly(filters.from) : yearFrom,
        to: filters.to ? parseDateOnly(filters.to) : yearTo,
        status: filters.status,
          page: filters.page,
          pageSize: filters.pageSize,
        }),
      ),
    ]);
    if (!teacher)
      throw new ApiError(404, "TEACHER_NOT_FOUND", "Teacher was not found");
    const [fixtures, total] = historyResult;
    return {
      teacher,
      fixtures,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.ceil(total / filters.pageSize),
      },
    };
  },

  async attendance(
    schoolId: string,
    filters: {
      year?: number;
      from?: string;
      to?: string;
      page: number;
      pageSize: number;
    },
  ) {
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
    const [attendanceResult, fixtureRows, school] = await Promise.all([
      databasePhase("records-attendance", () =>
        fixtureRecordsRepository.attendance(schoolId, {
          ...range,
          page: filters.page,
          pageSize: filters.pageSize,
        }),
      ),
      databasePhase("records-attendance-fixture-counts", () =>
        fixtureRecordsRepository.attendanceFixtureCounts(schoolId, range),
      ),
      referenceCache.getOrLoad("school-settings", schoolId, "records", () =>
        databasePhase("records-school-settings", () =>
          fixtureRecordsRepository.schoolSettings(schoolId),
        ),
      ),
    ]);
    if (!school)
      throw new ApiError(404, "SCHOOL_NOT_FOUND", "School was not found");
    const fixtureCounts = new Map<string, number>();
    for (const fixture of fixtureRows) {
      const key = `${fixture.absentTeacherId}:${fixture.date.toISOString().slice(0, 10)}`;
      fixtureCounts.set(key, fixture._count);
    }
    const [records, total] = attendanceResult;
    const result = records.map((record) => {
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
    return {
      records: result,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.ceil(total / filters.pageSize),
      },
    };
  },
};
