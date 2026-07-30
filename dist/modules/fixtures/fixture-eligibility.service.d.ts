import type { TeachingLevel } from "@prisma/client";
import { fixturesRepository, type FixtureDb } from "./fixtures.repository.js";
import { type ScoredCandidate } from "./fixtures.utils.js";
export type FixtureExclusionReason = "ABSENT" | "ON_LEAVE" | "NOT_ARRIVED_YET" | "LEFT_ON_SHORT_LEAVE" | "OUTSIDE_PARTIAL_DAY_RANGE" | "TEACHING_CLASS" | "ALREADY_ASSIGNED_FIXTURE" | "INACTIVE" | "ORIGINAL_ABSENT_TEACHER" | "ALREADY_SELECTED_FOR_FIXTURE";
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
export declare const getEligibleTeachersForFixture: (database: FixtureDb, input: EligibilityInput) => Promise<{
    candidates: ScoredCandidate[];
    excluded: ExcludedFixtureTeacher[];
}>;
//# sourceMappingURL=fixture-eligibility.service.d.ts.map