import { prisma } from "../../prisma/client.js";
export const fixtureInclude = {
    classSection: {
        select: {
            id: true,
            name: true,
            gradeNumber: true,
            section: true,
            teachingLevel: true,
        },
    },
    subject: { select: { id: true, name: true, code: true } },
    absentTeacher: {
        select: { id: true, name: true, employeeCode: true },
    },
    assignedTeacher: {
        select: {
            id: true,
            name: true,
            employeeCode: true,
            whatsappNumber: true,
        },
    },
    autoAssignedTeacher: {
        select: { id: true, name: true, employeeCode: true },
    },
};
export const fixturesRepository = {
    transaction(callback) {
        return prisma.$transaction(callback, { isolationLevel: "Serializable" });
    },
    list(schoolId, date) {
        return prisma.proxyFixture.findMany({
            where: { schoolId, date },
            include: fixtureInclude,
            orderBy: [{ periodNumber: "asc" }, { classSection: { name: "asc" } }],
        });
    },
    find(schoolId, fixtureId) {
        return prisma.proxyFixture.findFirst({
            where: { id: fixtureId, schoolId },
            include: fixtureInclude,
        });
    },
    schoolSettings(database, schoolId) {
        return database.school.findUnique({
            where: { id: schoolId },
            select: { timezone: true },
        });
    },
    absentTeachers(database, schoolId, teacherIds) {
        return database.teacher.findMany({
            where: { schoolId, id: { in: teacherIds } },
            select: { id: true, name: true, schoolId: true, isActive: true },
        });
    },
    teacherDiagnostics(database, teacherIds) {
        return database.teacher.findMany({
            where: { id: { in: teacherIds } },
            select: { id: true, name: true, schoolId: true },
        });
    },
    attendance(database, schoolId, date, teacherIds) {
        return database.dailyAttendance.findMany({
            where: { schoolId, date, teacherId: { in: teacherIds } },
            select: {
                teacherId: true,
                status: true,
                availableFromPeriod: true,
                unavailableFromPeriod: true,
            },
        });
    },
    absentLectures(database, schoolId, dayOfWeek, teacherIds) {
        return database.masterTimetable.findMany({
            where: { schoolId, dayOfWeek, teacherId: { in: teacherIds } },
            include: {
                teacher: true,
                subject: true,
                classSection: true,
            },
            orderBy: [{ periodNumber: "asc" }, { classSection: { name: "asc" } }],
        });
    },
    existingForLecture(database, schoolId, date, lecture) {
        return database.proxyFixture.findFirst({
            where: {
                schoolId,
                date,
                periodNumber: lecture.periodNumber,
                classSectionId: lecture.classSectionId,
                absentTeacherId: lecture.teacherId,
            },
            include: fixtureInclude,
        });
    },
    eligibilityPool(database, schoolId, date) {
        return database.teacher.findMany({
            where: {
                schoolId,
            },
            include: {
                dailyAttendances: {
                    where: { schoolId, date },
                    select: {
                        status: true,
                        availableFromPeriod: true,
                        unavailableFromPeriod: true,
                    },
                },
            },
            orderBy: [{ name: "asc" }, { id: "asc" }],
        });
    },
    regularBusyTeacherIds(database, schoolId, dayOfWeek, periodNumber) {
        return database.masterTimetable.findMany({
            where: { schoolId, dayOfWeek, periodNumber },
            select: { teacherId: true },
        });
    },
    fixtureBusyTeacherIds(database, schoolId, date, periodNumber, excludeFixtureId) {
        return database.proxyFixture.findMany({
            where: {
                schoolId,
                date,
                periodNumber,
                status: { not: "CANCELLED" },
                assignedTeacherId: { not: null },
                id: excludeFixtureId ? { not: excludeFixtureId } : undefined,
            },
            select: { assignedTeacherId: true },
        });
    },
    summaries(database, schoolId, teacherIds, year, weekNumber) {
        return database.teacherFixtureSummary.findMany({
            where: { schoolId, teacherId: { in: teacherIds }, year, weekNumber },
        });
    },
    incrementSummary(database, schoolId, teacherId, year, weekNumber) {
        return database.teacherFixtureSummary.upsert({
            where: {
                schoolId_teacherId_year_weekNumber: {
                    schoolId,
                    teacherId,
                    year,
                    weekNumber,
                },
            },
            update: { fixtureCount: { increment: 1 } },
            create: { schoolId, teacherId, year, weekNumber, fixtureCount: 1 },
        });
    },
    decrementSummary(database, schoolId, teacherId, year, weekNumber) {
        return database.teacherFixtureSummary.updateMany({
            where: {
                schoolId,
                teacherId,
                year,
                weekNumber,
                fixtureCount: { gt: 0 },
            },
            data: { fixtureCount: { decrement: 1 } },
        });
    },
    create(database, data) {
        return database.proxyFixture.create({
            data,
            include: fixtureInclude,
        });
    },
    findForUpdate(database, schoolId, fixtureId) {
        return database.proxyFixture.findFirst({
            where: { id: fixtureId, schoolId },
            include: fixtureInclude,
        });
    },
    update(database, fixtureId, data) {
        return database.proxyFixture.update({
            where: { id: fixtureId },
            data,
            include: fixtureInclude,
        });
    },
};
//# sourceMappingURL=fixtures.repository.js.map