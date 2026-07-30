import type { TeachingLevel } from "@prisma/client";

import { ApiError } from "../../common/api-error.js";
import { normalizeWhitespace } from "../../common/school-data.js";

export type ScoredCandidate = {
  teacherId: string;
  teacherName: string;
  subjectScore: number;
  classLevelScore: number;
  workloadScore: number;
  baseWeeklyTeachingPeriods: number;
  weeklyFixtureCount: number;
  effectiveWeeklyWorkload: number;
  minimumEligibleWorkload: number;
  maximumEligibleWorkload: number;
  totalScore: number;
};

export const subjectMatchScore = (
  requiredSubject: string,
  specializations: string[],
  subjectCode?: string,
) => {
  const required = normalizeWhitespace(requiredSubject).toLocaleLowerCase("en");
  const requiredCode = subjectCode
    ? normalizeWhitespace(subjectCode).toLocaleLowerCase("en")
    : undefined;
  return specializations.some((value) => {
    const normalized = normalizeWhitespace(value).toLocaleLowerCase("en");
    return normalized === required || normalized === requiredCode;
  })
    ? 50
    : 0;
};

export const classLevelScore = (
  teacherLevel: TeachingLevel,
  classLevel: TeachingLevel,
) => (teacherLevel === "BOTH" || teacherLevel === classLevel ? 30 : 0);

export const workloadBalanceScore = (
  count: number,
  minimum: number,
  maximum: number,
) => {
  if (
    ![count, minimum, maximum].every(
      (value) => Number.isFinite(value) && value >= 0,
    )
  ) {
    throw new ApiError(
      422,
      "WORKLOAD_DATA_MISSING",
      "Eligible candidate workload data is missing or invalid",
    );
  }
  if (maximum === minimum) return 20;
  const score = ((maximum - count) / (maximum - minimum)) * 20;
  return Number(score.toFixed(2));
};

export const sortCandidates = (candidates: ScoredCandidate[]) =>
  [...candidates].sort(
    (left, right) =>
      right.totalScore - left.totalScore ||
      left.effectiveWeeklyWorkload - right.effectiveWeeklyWorkload ||
      left.weeklyFixtureCount - right.weeklyFixtureCount ||
      left.teacherName.localeCompare(right.teacherName) ||
      left.teacherId.localeCompare(right.teacherId),
  );
