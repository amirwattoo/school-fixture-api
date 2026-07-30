import { prisma } from "../../prisma/client.js";
export const timetableInclude = {
    teacher: {
        select: {
            id: true,
            name: true,
            employeeCode: true,
            isActive: true,
        },
    },
    classSection: {
        select: {
            id: true,
            name: true,
            gradeNumber: true,
            section: true,
            isActive: true,
        },
    },
    subject: {
        select: { id: true, name: true, code: true, isActive: true },
    },
};
export const timetableRepository = {
    list(schoolId, filters) {
        return prisma.masterTimetable.findMany({
            where: { schoolId, ...filters },
            include: timetableInclude,
            take: 1000,
        });
    },
    find(schoolId, entryId) {
        return prisma.masterTimetable.findFirst({
            where: { id: entryId, schoolId },
            include: timetableInclude,
        });
    },
    school(schoolId) {
        return prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, periodsPerDay: true },
        });
    },
    teacher(schoolId, teacherId) {
        return prisma.teacher.findFirst({
            where: { id: teacherId, schoolId },
        });
    },
    subject(schoolId, subjectId) {
        return prisma.subject.findFirst({
            where: { id: subjectId, schoolId },
        });
    },
    classSection(schoolId, classSectionId) {
        return prisma.classSection.findFirst({
            where: { id: classSectionId, schoolId },
        });
    },
    teacherConflict(schoolId, dayOfWeek, periodNumber, teacherId, excludeId) {
        return prisma.masterTimetable.findFirst({
            where: {
                schoolId,
                dayOfWeek,
                periodNumber,
                teacherId,
                id: excludeId ? { not: excludeId } : undefined,
            },
            include: timetableInclude,
        });
    },
    classConflict(schoolId, dayOfWeek, periodNumber, classSectionId, excludeId) {
        return prisma.masterTimetable.findFirst({
            where: {
                schoolId,
                dayOfWeek,
                periodNumber,
                classSectionId,
                id: excludeId ? { not: excludeId } : undefined,
            },
            include: timetableInclude,
        });
    },
    create(data) {
        return prisma.masterTimetable.create({
            data,
            include: timetableInclude,
        });
    },
    update(entryId, data) {
        return prisma.masterTimetable.update({
            where: { id: entryId },
            data,
            include: timetableInclude,
        });
    },
    delete(entryId) {
        return prisma.masterTimetable.delete({
            where: { id: entryId },
            include: timetableInclude,
        });
    },
};
//# sourceMappingURL=timetable.repository.js.map