import { ApiError } from "../../common/api-error.js";
import { isoWeek } from "../../common/date-only.js";
import { attendanceExclusionReason } from "../attendance/attendance-availability.js";
import { fixturesRepository } from "./fixtures.repository.js";
import { classLevelScore, sortCandidates, subjectMatchScore, workloadBalanceScore, } from "./fixtures.utils.js";
export const getEligibleTeachersForFixture = async (database, input) => {
    const [pool, regularBusy, fixtureBusy] = await Promise.all([
        fixturesRepository.eligibilityPool(database, input.schoolId, input.date),
        fixturesRepository.regularBusyTeacherIds(database, input.schoolId, input.dayOfWeek, input.periodNumber),
        fixturesRepository.fixtureBusyTeacherIds(database, input.schoolId, input.date, input.periodNumber, input.excludeFixtureId),
    ]);
    const regularBusyIds = new Set(regularBusy.map((item) => item.teacherId));
    const fixtureBusyIds = new Set(fixtureBusy.flatMap((item) => item.assignedTeacherId ? [item.assignedTeacherId] : []));
    const excluded = [];
    const eligible = pool.filter((teacher) => {
        let reason;
        if (!teacher.isActive) {
            reason = "INACTIVE";
        }
        else if (teacher.id === input.absentTeacherId) {
            reason = "ORIGINAL_ABSENT_TEACHER";
        }
        else if (teacher.id === input.currentAssignedTeacherId) {
            reason = "ALREADY_SELECTED_FOR_FIXTURE";
        }
        else {
            reason = attendanceExclusionReason(teacher.dailyAttendances[0], input.periodNumber);
        }
        if (!reason && regularBusyIds.has(teacher.id))
            reason = "TEACHING_CLASS";
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
    const summaries = await fixturesRepository.summaries(database, input.schoolId, eligible.map((teacher) => teacher.id), year, weekNumber);
    const counts = new Map(summaries.map((summary) => [summary.teacherId, summary.fixtureCount]));
    const missingWorkloads = eligible.filter((teacher) => !Number.isInteger(teacher.baseWeeklyTeachingPeriods) ||
        teacher.baseWeeklyTeachingPeriods < 0);
    if (missingWorkloads.length) {
        throw new ApiError(422, "WORKLOAD_DATA_MISSING", `Official weekly workload is missing for: ${missingWorkloads
            .map((teacher) => teacher.name)
            .join(", ")}`);
    }
    const workloads = eligible.map((teacher) => teacher.baseWeeklyTeachingPeriods + (counts.get(teacher.id) ?? 0));
    const minimumEligibleWorkload = workloads.length ? Math.min(...workloads) : 0;
    const maximumEligibleWorkload = workloads.length ? Math.max(...workloads) : 0;
    const candidates = eligible.map((teacher) => {
        const weeklyFixtureCount = counts.get(teacher.id) ?? 0;
        const effectiveWeeklyWorkload = teacher.baseWeeklyTeachingPeriods + weeklyFixtureCount;
        const subjectScore = subjectMatchScore(input.subjectName, teacher.subjectSpecializations, input.subjectCode);
        const levelScore = classLevelScore(teacher.teachingLevel, input.classLevel);
        const workloadScore = workloadBalanceScore(effectiveWeeklyWorkload, minimumEligibleWorkload, maximumEligibleWorkload);
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
            totalScore: Number((subjectScore + levelScore + workloadScore).toFixed(2)),
        };
    });
    return { candidates: sortCandidates(candidates), excluded };
};
//# sourceMappingURL=fixture-eligibility.service.js.map