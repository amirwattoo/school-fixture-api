import type { TeachingLevel } from "@prisma/client";

import { ApiError } from "../../common/api-error.js";
import { isoWeek } from "../../common/date-only.js";
import { attendanceExclusionReason } from "../attendance/attendance-availability.js";
import { fixturesRepository, type FixtureDb } from "./fixtures.repository.js";
import {
  classLevelScore,
  type ScoredCandidate,
  sortCandidates,
  subjectMatchScore,
  workloadBalanceScore,
} from "./fixtures.utils.js";

export type FixtureExclusionReason =
  | "ABSENT"
  | "ON_LEAVE"
  | "NOT_ARRIVED_YET"
  | "LEFT_ON_SHORT_LEAVE"
  | "OUTSIDE_PARTIAL_DAY_RANGE"
  | "TEACHING_CLASS"
  | "ALREADY_ASSIGNED_FIXTURE"
  | "INACTIVE"
  | "ORIGINAL_ABSENT_TEACHER"
  | "ALREADY_SELECTED_FOR_FIXTURE";

export type ExcludedFixtureTeacher = {
  teacherId: string;
  teacherName: string;
  reason: FixtureExclusionReason;
};

export type EligibilityInput = {
  schoolId: string;
  date: Date;
  dayOfWeek: Parameters<typeof fixturesRepository.regularBusyTeacherIds>[2];
  periodNumber: number;
  absentTeacherId: string;
  subjectName: string;
  subjectCode: string;
  classLevel: TeachingLevel;
  excludeFixtureId?: string;
  currentAssignedTeacherId?: string | null;
};

export const getEligibleTeachersForFixture = async (
  database: FixtureDb,
  input: EligibilityInput,
) => {
  const [pool, regularBusy, fixtureBusy] = await Promise.all([
    fixturesRepository.eligibilityPool(database, input.schoolId, input.date),
    fixturesRepository.regularBusyTeacherIds(
      database,
      input.schoolId,
      input.dayOfWeek,
      input.periodNumber,
    ),
    fixturesRepository.fixtureBusyTeacherIds(
      database,
      input.schoolId,
      input.date,
      input.periodNumber,
      input.excludeFixtureId,
    ),
  ]);
  const regularBusyIds = new Set(regularBusy.map((item) => item.teacherId));
  const fixtureBusyIds = new Set(
    fixtureBusy.flatMap((item) =>
      item.assignedTeacherId ? [item.assignedTeacherId] : [],
    ),
  );
  const excluded: ExcludedFixtureTeacher[] = [];
  const eligible = pool.filter((teacher) => {
    let reason: FixtureExclusionReason | undefined;
    if (!teacher.isActive) {
      reason = "INACTIVE";
    } else if (teacher.id === input.absentTeacherId) {
      reason = "ORIGINAL_ABSENT_TEACHER";
    } else if (teacher.id === input.currentAssignedTeacherId) {
      reason = "ALREADY_SELECTED_FOR_FIXTURE";
    } else {
      reason = attendanceExclusionReason(
        teacher.dailyAttendances[0],
        input.periodNumber,
      );
    }
    if (!reason && regularBusyIds.has(teacher.id)) reason = "TEACHING_CLASS";
    if (!reason && fixtureBusyIds.has(teacher.id)) {
      reason = "ALREADY_ASSIGNED_FIXTURE";
    }
    if (reason) {
      excluded.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        reason,
      });
      return false;
    }
    return true;
  });

  const { year, weekNumber } = isoWeek(input.date);
  const summaries = await fixturesRepository.summaries(
    database,
    input.schoolId,
    eligible.map((teacher) => teacher.id),
    year,
    weekNumber,
  );
  const counts = new Map(
    summaries.map((summary) => [summary.teacherId, summary.fixtureCount]),
  );
  const missingWorkloads = eligible.filter(
    (teacher) =>
      !Number.isInteger(teacher.baseWeeklyTeachingPeriods) ||
      teacher.baseWeeklyTeachingPeriods < 0,
  );
  if (missingWorkloads.length) {
    throw new ApiError(
      422,
      "WORKLOAD_DATA_MISSING",
      `Official weekly workload is missing for: ${missingWorkloads
        .map((teacher) => teacher.name)
        .join(", ")}`,
    );
  }
  const workloads = eligible.map(
    (teacher) =>
      teacher.baseWeeklyTeachingPeriods + (counts.get(teacher.id) ?? 0),
  );
  const minimumEligibleWorkload = workloads.length ? Math.min(...workloads) : 0;
  const maximumEligibleWorkload = workloads.length ? Math.max(...workloads) : 0;
  const candidates: ScoredCandidate[] = eligible.map((teacher) => {
    const weeklyFixtureCount = counts.get(teacher.id) ?? 0;
    const effectiveWeeklyWorkload =
      teacher.baseWeeklyTeachingPeriods + weeklyFixtureCount;
    const subjectScore = subjectMatchScore(
      input.subjectName,
      teacher.subjectSpecializations,
      input.subjectCode,
    );
    const levelScore = classLevelScore(teacher.teachingLevel, input.classLevel);
    const workloadScore = workloadBalanceScore(
      effectiveWeeklyWorkload,
      minimumEligibleWorkload,
      maximumEligibleWorkload,
    );
    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      subjectScore,
      classLevelScore: levelScore,
      workloadScore,
      baseWeeklyTeachingPeriods: teacher.baseWeeklyTeachingPeriods,
      weeklyFixtureCount,
      effectiveWeeklyWorkload,
      minimumEligibleWorkload,
      maximumEligibleWorkload,
      totalScore: Number(
        (subjectScore + levelScore + workloadScore).toFixed(2),
      ),
    };
  });
  return { candidates: sortCandidates(candidates), excluded };
};
