import { databasePhase } from "../../common/request-timing.js";
import { isoWeek, parseDateOnly } from "../../common/date-only.js";
import { dashboardRepository } from "./dashboard.repository.js";

export const dashboardService = {
  async summary(schoolId: string, dateValue: string) {
    const date = parseDateOnly(dateValue);
    const { year, weekNumber } = isoWeek(date);
    const [attendance, fixtures, weekly, notifications] = await Promise.all([
      databasePhase("dashboard-attendance-summary", () =>
        dashboardRepository.attendanceSummary(schoolId, date),
      ),
      databasePhase("dashboard-fixture-summary", () =>
        dashboardRepository.fixtureSummary(schoolId, date),
      ),
      databasePhase("dashboard-weekly-summary", () =>
        dashboardRepository.weeklyFixtureCount(schoolId, year, weekNumber),
      ),
      databasePhase("dashboard-notification-summary", () =>
        dashboardRepository.notificationSummary(schoolId, date),
      ),
    ]);
    const attendanceCount = (status: string) =>
      attendance.find((row) => row.status === status)?._count ?? 0;
    const fixtureCount = (status: string) =>
      fixtures
        .filter((row) => row.status === status)
        .reduce((total, row) => total + row._count, 0);
    const notificationCount = (status: string) =>
      notifications.find((row) => row.status === status)?._count ?? 0;
    return {
      absent: attendanceCount("ABSENT"),
      drafts: fixtureCount("DRAFT"),
      published: fixtureCount("PUBLISHED"),
      unassigned: fixtures
        .filter(
          (row) => row.status === "DRAFT" && row.assignedTeacherId === null,
        )
        .reduce((total, row) => total + row._count, 0),
      weekly: weekly._sum.fixtureCount ?? 0,
      messagesReady: notificationCount("READY"),
      messagesOpened: notificationCount("OPENED"),
      messagesConfirmed: notificationCount("MANUALLY_CONFIRMED"),
    };
  },
};
