import { ApiError } from "../../common/api-error.js";
import { prisma } from "../../prisma/client.js";
import { attendanceExclusionReason } from "./attendance-availability.js";
export const attendanceRepository = {
    list(schoolId, date) {
        return prisma.dailyAttendance.findMany({
            where: { schoolId, date },
            include: {
                teacher: {
                    select: { id: true, name: true, employeeCode: true, isActive: true },
                },
                markedBy: { select: { id: true, name: true } },
            },
            orderBy: { teacher: { name: "asc" } },
        });
    },
    activeTeachers(schoolId, teacherIds) {
        return prisma.teacher.findMany({
            where: { schoolId, id: { in: teacherIds }, isActive: true },
            select: { id: true },
        });
    },
    activeTeacherCount(schoolId) {
        return prisma.teacher.count({ where: { schoolId, isActive: true } });
    },
    schoolSettings(schoolId) {
        return prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                timezone: true,
                periodsPerDay: true,
                halfDayBoundaryPeriod: true,
            },
        });
    },
    fixtureCount(schoolId, date) {
        return prisma.proxyFixture.count({ where: { schoolId, date } });
    },
    async saveBulk(schoolId, markedById, date, records, confirmPublishedFixtureImpact = false) {
        return prisma.$transaction(async (transaction) => {
            const recordByTeacher = new Map(records.map((record) => [record.teacherId, record]));
            const publishedAssignments = await transaction.proxyFixture.findMany({
                where: {
                    schoolId,
                    date,
                    assignedTeacherId: { in: records.map((record) => record.teacherId) },
                    status: "PUBLISHED",
                },
                select: {
                    id: true,
                    assignedTeacherId: true,
                    periodNumber: true,
                    classSection: { select: { name: true } },
                },
            });
            const affectedPublishedBeforeSave = publishedAssignments.filter((fixture) => {
                const record = fixture.assignedTeacherId
                    ? recordByTeacher.get(fixture.assignedTeacherId)
                    : undefined;
                return Boolean(record &&
                    attendanceExclusionReason({
                        status: record.status,
                        availableFromPeriod: record.availableFromPeriod ?? null,
                        unavailableFromPeriod: record.unavailableFromPeriod ?? null,
                    }, fixture.periodNumber));
            });
            if (affectedPublishedBeforeSave.length > 0 &&
                !confirmPublishedFixtureImpact) {
                throw new ApiError(409, "PUBLISHED_FIXTURE_CONFIRMATION_REQUIRED", "This attendance change affects published fixture assignments and requires explicit confirmation", {
                    fixtures: affectedPublishedBeforeSave.map((fixture) => ({
                        fixtureId: fixture.id,
                        periodNumber: fixture.periodNumber,
                        className: fixture.classSection.name,
                    })),
                });
            }
            const saved = [];
            for (const record of records) {
                saved.push(await transaction.dailyAttendance.upsert({
                    where: {
                        schoolId_date_teacherId: {
                            schoolId,
                            date,
                            teacherId: record.teacherId,
                        },
                    },
                    update: {
                        status: record.status,
                        availableFromPeriod: record.availableFromPeriod ?? null,
                        unavailableFromPeriod: record.unavailableFromPeriod ?? null,
                        reason: record.reason?.trim() || record.remarks?.trim() || null,
                        notes: record.notes?.trim() || null,
                        remarks: record.remarks?.trim() || null,
                        markedById,
                    },
                    create: {
                        schoolId,
                        date,
                        teacherId: record.teacherId,
                        status: record.status,
                        availableFromPeriod: record.availableFromPeriod ?? null,
                        unavailableFromPeriod: record.unavailableFromPeriod ?? null,
                        reason: record.reason?.trim() || record.remarks?.trim() || null,
                        notes: record.notes?.trim() || null,
                        remarks: record.remarks?.trim() || null,
                        markedById,
                    },
                }));
            }
            const affectedDraftFixtureIds = [];
            const affectedPublishedFixtureIds = [];
            for (const record of saved) {
                const fixtures = await transaction.proxyFixture.findMany({
                    where: {
                        schoolId,
                        date,
                        assignedTeacherId: record.teacherId,
                        status: { in: ["DRAFT", "PUBLISHED"] },
                    },
                    select: { id: true, periodNumber: true, status: true },
                });
                for (const fixture of fixtures) {
                    const reason = attendanceExclusionReason(record, fixture.periodNumber);
                    if (fixture.status === "PUBLISHED") {
                        if (reason)
                            affectedPublishedFixtureIds.push(fixture.id);
                        continue;
                    }
                    await transaction.proxyFixture.update({
                        where: { id: fixture.id },
                        data: {
                            requiresReassignment: Boolean(reason),
                            reassignmentReason: reason ?? null,
                        },
                    });
                    if (reason)
                        affectedDraftFixtureIds.push(fixture.id);
                }
            }
            await transaction.auditLog.create({
                data: {
                    schoolId,
                    userId: markedById,
                    action: "ATTENDANCE_SAVED",
                    entityType: "DailyAttendance",
                    details: {
                        date: date.toISOString().slice(0, 10),
                        records: records,
                        affectedDraftFixtureIds,
                        affectedPublishedFixtureIds,
                        publishedFixtureImpactConfirmed: confirmPublishedFixtureImpact &&
                            affectedPublishedFixtureIds.length > 0,
                    },
                },
            });
            return {
                records: saved,
                affectedDraftFixtureIds,
                affectedPublishedFixtureIds,
            };
        });
    },
    delete(schoolId, teacherId, date, userId) {
        return prisma.$transaction(async (transaction) => {
            const deleted = await transaction.dailyAttendance.deleteMany({
                where: { schoolId, teacherId, date },
            });
            await transaction.proxyFixture.updateMany({
                where: {
                    schoolId,
                    date,
                    assignedTeacherId: teacherId,
                    status: "DRAFT",
                    requiresReassignment: true,
                },
                data: { requiresReassignment: false, reassignmentReason: null },
            });
            await transaction.auditLog.create({
                data: {
                    schoolId,
                    userId,
                    action: "ATTENDANCE_EXCEPTION_REMOVED",
                    entityType: "DailyAttendance",
                    details: { teacherId, date: date.toISOString().slice(0, 10) },
                },
            });
            return deleted.count;
        });
    },
};
//# sourceMappingURL=attendance.repository.js.map