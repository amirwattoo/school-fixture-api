import { ApiError } from "../../common/api-error.js";
import type { AuditActor } from "../../common/audit.js";
import { parseDateOnly } from "../../common/date-only.js";
import {
  attendanceRepository,
  type AttendanceRecordInput,
} from "./attendance.repository.js";
import { fixturesService } from "../fixtures/fixtures.service.js";

export const attendanceService = {
  async list(schoolId: string, dateValue: string) {
    const date = parseDateOnly(dateValue);
    const [records, activeTeacherCount, school] = await Promise.all([
      attendanceRepository.list(schoolId, date),
      attendanceRepository.activeTeacherCount(schoolId),
      attendanceRepository.schoolSettings(schoolId),
    ]);
    if (!school)
      throw new ApiError(404, "SCHOOL_NOT_FOUND", "School was not found");
    const count = (status: AttendanceRecordInput["status"]) =>
      records.filter((record) => record.status === status).length;
    const partialDayRecords = records.filter(
      (record) => record.status === "PARTIAL_DAY",
    );
    return {
      records,
      settings: {
        periodsPerDay: school.periodsPerDay,
        halfDayBoundaryPeriod: school.halfDayBoundaryPeriod,
      },
      summary: {
        absent: count("ABSENT"),
        onLeave: count("LEAVE"),
        late: count("LATE"),
        shortLeave: count("SHORT_LEAVE"),
        firstHalfLeave: partialDayRecords.filter(
          (record) =>
            record.availableFromPeriod === school.halfDayBoundaryPeriod &&
            record.unavailableFromPeriod === null,
        ).length,
        secondHalfLeave: partialDayRecords.filter(
          (record) =>
            record.availableFromPeriod === null &&
            record.unavailableFromPeriod === school.halfDayBoundaryPeriod,
        ).length,
        partialDay: partialDayRecords.filter(
          (record) =>
            !(
              (record.availableFromPeriod === school.halfDayBoundaryPeriod &&
                record.unavailableFromPeriod === null) ||
              (record.availableFromPeriod === null &&
                record.unavailableFromPeriod === school.halfDayBoundaryPeriod)
            ),
        ).length,
        presentByDefault:
          activeTeacherCount -
          records.filter(
            (record) => record.teacher.isActive && record.status !== "PRESENT",
          ).length,
      },
    };
  },

  async save(
    actor: AuditActor,
    dateValue: string,
    records: AttendanceRecordInput[],
    confirmPublishedFixtureImpact = false,
  ) {
    const date = parseDateOnly(dateValue);
    const [teachers, school, existingFixtureCount] = await Promise.all([
      attendanceRepository.activeTeachers(
        actor.schoolId,
        records.map((record) => record.teacherId),
      ),
      attendanceRepository.schoolSettings(actor.schoolId),
      attendanceRepository.fixtureCount(actor.schoolId, date),
    ]);
    if (!school)
      throw new ApiError(404, "SCHOOL_NOT_FOUND", "School was not found");
    if (teachers.length !== records.length) {
      throw new ApiError(
        400,
        "INVALID_ATTENDANCE_TEACHER",
        "Every attendance teacher must be active and belong to your school",
      );
    }
    for (const record of records) {
      for (const boundary of [
        record.availableFromPeriod,
        record.unavailableFromPeriod,
      ]) {
        if (
          boundary !== undefined &&
          boundary !== null &&
          (boundary < 1 || boundary > school.periodsPerDay)
        ) {
          throw new ApiError(
            400,
            "INVALID_ATTENDANCE_PERIOD",
            `Attendance periods must be between 1 and ${school.periodsPerDay}`,
          );
        }
      }
      if (
        record.availableFromPeriod != null &&
        record.unavailableFromPeriod != null &&
        record.availableFromPeriod >= record.unavailableFromPeriod
      ) {
        throw new ApiError(
          400,
          "INVALID_ATTENDANCE_RANGE",
          "Available from lesson must be before unavailable from lesson",
        );
      }
    }
    const saved = await attendanceRepository.saveBulk(
      actor.schoolId,
      actor.userId,
      date,
      records,
      confirmPublishedFixtureImpact,
    );
    const generation =
      existingFixtureCount > 0
        ? await fixturesService.generate(
            actor,
            dateValue,
            records.map((record) => record.teacherId),
          )
        : null;
    return {
      ...saved,
      fixtureGeneration: {
        affectedLessons: generation?.diagnostics.affectedLessonCount ?? 0,
        fixturesCreated: generation?.diagnostics.createdFixtureCount ?? 0,
        fixturesAlreadyExisting:
          generation?.diagnostics.existingFixtureCount ?? 0,
        fixturesWithoutEligibleReplacement:
          generation?.diagnostics.fixturesWithoutEligibleReplacementCount ?? 0,
      },
    };
  },

  remove(actor: AuditActor, dateValue: string, teacherId: string) {
    return attendanceRepository.delete(
      actor.schoolId,
      teacherId,
      parseDateOnly(dateValue),
      actor.userId,
    );
  },
};
