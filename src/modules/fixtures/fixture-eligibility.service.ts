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

type EligibilityPool = Awaited<
  ReturnType<typeof fixturesRepository.eligibilityPool>
>;

export type FixtureEligibilitySnapshot = {
  pool: EligibilityPool;
  regularBusyByPeriod: Map<number, Set<string>>;
  fixtureBusyByPeriod: Map<number, Set<string>>;
  weeklyCounts: Map<string, number>;
};

const addBusyTeacher = (
  target: Map<number, Set<string>>,
  periodNumber: number,
  teacherId: string,
) => {
  const teachers = target.get(periodNumber) ?? new Set<string>();
  teachers.add(teacherId);
  target.set(periodNumber, teachers);
};

export const loadFixtureEligibilitySnapshot = async (
  database: FixtureDb,
  input: Pick<
    EligibilityInput,
    "schoolId" | "date" | "dayOfWeek" | "excludeFixtureId"
  >,
): Promise<FixtureEligibilitySnapshot> => {
  const { year, weekNumber } = isoWeek(input.date);
  const [pool, regularBusy, fixtureBusy, summaries] = await Promise.all([
    fixturesRepository.eligibilityPool(database, input.schoolId, input.date),
    fixturesRepository.regularBusyPeriods(
      database,
      input.schoolId,
      input.dayOfWeek,
    ),
    fixturesRepository.fixtureBusyPeriods(
      database,
      input.schoolId,
      input.date,
    ),
    fixturesRepository.summariesForWeek(
      database,
      input.schoolId,
      year,
      weekNumber,
    ),
  ]);
  const regularBusyByPeriod = new Map<number, Set<string>>();
  for (const busy of regularBusy) {
    addBusyTeacher(regularBusyByPeriod, busy.periodNumber, busy.teacherId);
  }
  const fixtureBusyByPeriod = new Map<number, Set<string>>();
  for (const busy of fixtureBusy) {
    if (busy.id === input.excludeFixtureId || !busy.assignedTeacherId) continue;
    addBusyTeacher(
      fixtureBusyByPeriod,
      busy.periodNumber,
      busy.assignedTeacherId,
    );
  }
  return {
    pool,
    regularBusyByPeriod,
    fixtureBusyByPeriod,
    weeklyCounts: new Map(
      summaries.map((summary) => [summary.teacherId, summary.fixtureCount]),
    ),
  };
};

export const getEligibleTeachersFromSnapshot = (
  snapshot: FixtureEligibilitySnapshot,
  input: EligibilityInput,
  additionalBusyTeacherIds: ReadonlySet<string> = new Set(),
) => {
  const regularBusyIds =
    snapshot.regularBusyByPeriod.get(input.periodNumber) ?? new Set<string>();
  const fixtureBusyIds =
    snapshot.fixtureBusyByPeriod.get(input.periodNumber) ?? new Set<string>();
  const excluded: ExcludedFixtureTeacher[] = [];
  const eligible = snapshot.pool.filter((teacher) => {
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
    if (
      !reason &&
      (fixtureBusyIds.has(teacher.id) ||
        additionalBusyTeacherIds.has(teacher.id))
    ) {
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
      teacher.baseWeeklyTeachingPeriods +
      (snapshot.weeklyCounts.get(teacher.id) ?? 0),
  );
  const minimumEligibleWorkload = workloads.length ? Math.min(...workloads) : 0;
  const maximumEligibleWorkload = workloads.length ? Math.max(...workloads) : 0;
  const candidates: ScoredCandidate[] = eligible.map((teacher) => {
    const weeklyFixtureCount = snapshot.weeklyCounts.get(teacher.id) ?? 0;
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

export const getEligibleTeachersForFixture = async (
  database: FixtureDb,
  input: EligibilityInput,
) => {
  const snapshot = await loadFixtureEligibilitySnapshot(database, input);
  return getEligibleTeachersFromSnapshot(snapshot, input);
};
