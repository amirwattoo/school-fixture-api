import type { TeachingLevel } from "@prisma/client";
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
export declare const subjectMatchScore: (requiredSubject: string, specializations: string[], subjectCode?: string) => 0 | 50;
export declare const classLevelScore: (teacherLevel: TeachingLevel, classLevel: TeachingLevel) => 0 | 30;
export declare const workloadBalanceScore: (count: number, minimum: number, maximum: number) => number;
export declare const sortCandidates: (candidates: ScoredCandidate[]) => ScoredCandidate[];
//# sourceMappingURL=fixtures.utils.d.ts.map