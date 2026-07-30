import { parseDateOnly } from "../../common/date-only.js";
import { prisma } from "../../prisma/client.js";
export const notificationInclude = {
    school: { select: { id: true, name: true, timezone: true } },
    teacher: {
        select: {
            id: true,
            name: true,
            employeeCode: true,
            whatsappNumber: true,
        },
    },
    fixture: {
        include: {
            classSection: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
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
        },
    },
};
const whereFor = (schoolId, filters) => ({
    schoolId,
    status: filters.status,
    teacherId: filters.teacherId,
    fixtureId: filters.fixtureId,
    fixture: filters.date ? { date: parseDateOnly(filters.date) } : undefined,
});
export const whatsappRepository = {
    async list(schoolId, filters) {
        const where = whereFor(schoolId, filters);
        const [notifications, total] = await prisma.$transaction([
            prisma.whatsAppNotification.findMany({
                where,
                include: notificationInclude,
                orderBy: { createdAt: "desc" },
                skip: (filters.page - 1) * filters.pageSize,
                take: filters.pageSize,
            }),
            prisma.whatsAppNotification.count({ where }),
        ]);
        return { notifications, total };
    },
    find(schoolId, notificationId) {
        return prisma.whatsAppNotification.findFirst({
            where: { id: notificationId, schoolId },
            include: notificationInclude,
        });
    },
    markOpened(notificationId, destination) {
        return prisma.whatsAppNotification.update({
            where: { id: notificationId },
            data: {
                destination,
                status: "OPENED",
                attemptCount: { increment: 1 },
                lastAttemptAt: new Date(),
                openedAt: new Date(),
                failureReason: null,
            },
            include: notificationInclude,
        });
    },
    markManuallyConfirmed(notificationId) {
        return prisma.whatsAppNotification.update({
            where: { id: notificationId },
            data: {
                status: "MANUALLY_CONFIRMED",
                sentAt: new Date(),
                manuallyConfirmedAt: new Date(),
                failureReason: null,
            },
            include: notificationInclude,
        });
    },
};
//# sourceMappingURL=whatsapp.repository.js.map