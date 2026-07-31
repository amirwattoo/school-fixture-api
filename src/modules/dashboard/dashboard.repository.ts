import { prisma } from "../../prisma/client.js";

export const dashboardRepository = {
  attendanceSummary(schoolId: string, date: Date) {
    return prisma.dailyAttendance.groupBy({
      by: ["status"],
      where: { schoolId, date },
      _count: true,
    });
  },

  fixtureSummary(schoolId: string, date: Date) {
    return prisma.proxyFixture.groupBy({
      by: ["status", "assignedTeacherId"],
      where: { schoolId, date },
      _count: true,
    });
  },

  weeklyFixtureCount(
    schoolId: string,
    year: number,
    weekNumber: number,
  ) {
    return prisma.teacherFixtureSummary.aggregate({
      where: { schoolId, year, weekNumber },
      _sum: { fixtureCount: true },
    });
  },

  notificationSummary(schoolId: string, date: Date) {
    return prisma.whatsAppNotification.groupBy({
      by: ["status"],
      where: { schoolId, fixture: { date } },
      _count: true,
    });
  },
};
