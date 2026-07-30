import { ApiError } from "../../common/api-error.js";
import { normalizeWhitespace } from "../../common/school-data.js";
export const subjectMatchScore = (requiredSubject, specializations, subjectCode) => {
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
export const classLevelScore = (teacherLevel, classLevel) => (teacherLevel === "BOTH" || teacherLevel === classLevel ? 30 : 0);
export const workloadBalanceScore = (count, minimum, maximum) => {
    if (![count, minimum, maximum].every((value) => Number.isFinite(value) && value >= 0)) {
        throw new ApiError(422, "WORKLOAD_DATA_MISSING", "Eligible candidate workload data is missing or invalid");
    }
    if (maximum === minimum)
        return 20;
    const score = ((maximum - count) / (maximum - minimum)) * 20;
    return Number(score.toFixed(2));
};
export const sortCandidates = (candidates) => [...candidates].sort((left, right) => right.totalScore - left.totalScore ||
    left.effectiveWeeklyWorkload - right.effectiveWeeklyWorkload ||
    left.weeklyFixtureCount - right.weeklyFixtureCount ||
    left.teacherName.localeCompare(right.teacherName) ||
    left.teacherId.localeCompare(right.teacherId));
//# sourceMappingURL=fixtures.utils.js.map