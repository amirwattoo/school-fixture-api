import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

import bcrypt from "bcrypt";

import {
  formatDateOnly,
  isoWeek,
  parseDateOnly,
  todayInTimezone,
  weekdayForDate,
} from "../src/common/date-only.js";
import {
  classLevelScore,
  sortCandidates,
  subjectMatchScore,
  workloadBalanceScore,
} from "../src/modules/fixtures/fixtures.utils.js";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma/client.js";

const SCHOOL_ID = "phase-4-integration-school";
const OTHER_SCHOOL_ID = "phase-4-other-school";
const DATE = "2026-08-03";
const PASSWORD = "Testing123!";

let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let principalToken = "";
let inchargeToken = "";
const ids = new Map<string, string>();
let generatedFixtureIds: string[] = [];
let firstFixtureId = "";
let secondFixtureId = "";
let unassignedFixtureId = "";

type ApiBody<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<{ response: Response; body: ApiBody<T> }> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  return { response, body: (await response.json()) as ApiBody<T> };
};

const auth = (token = principalToken) => ({
  Authorization: `Bearer ${token}`,
});

const summaryCount = async (teacherId: string) => {
  const week = isoWeek(parseDateOnly(DATE));
  return (
    (
      await prisma.teacherFixtureSummary.findUnique({
        where: {
          schoolId_teacherId_year_weekNumber: {
            schoolId: SCHOOL_ID,
            teacherId,
            year: week.year,
            weekNumber: week.weekNumber,
          },
        },
      })
    )?.fixtureCount ?? 0
  );
};

before(async () => {
  await prisma.school.deleteMany({
    where: { id: { in: [SCHOOL_ID, OTHER_SCHOOL_ID] } },
  });
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const school = await prisma.school.create({
    data: {
      id: SCHOOL_ID,
      name: "Phase 4 Integration School",
      academicYear: "2026",
      periodsPerDay: 8,
      users: {
        create: [
          {
            name: "Fixture Principal",
            email: "principal.phase4@example.local",
            passwordHash,
            role: "PRINCIPAL",
          },
          {
            name: "Fixture Incharge",
            email: "incharge.phase4@example.local",
            passwordHash,
            role: "TIMETABLE_INCHARGE",
          },
        ],
      },
    },
  });
  const teacherData = [
    ["Absent Alpha", "ABS-A", ["Mathematics"], "HIGHER"],
    ["Absent Beta", "ABS-B", ["Mathematics"], "HIGHER"],
    ["Alice Candidate", "CAN-A", ["Mathematics"], "HIGHER"],
    ["Bob Candidate", "CAN-B", ["Mathematics"], "HIGHER"],
    ["Charlie Candidate", "CAN-C", ["Mathematics"], "HIGHER"],
    ["Dave Late", "CAN-D", ["English"], "LOWER"],
    ["Leave Teacher", "LEAVE", ["Mathematics"], "HIGHER"],
  ] as const;
  for (const [
    name,
    employeeCode,
    specializations,
    teachingLevel,
  ] of teacherData) {
    const teacher = await prisma.teacher.create({
      data: {
        schoolId: school.id,
        name,
        employeeCode,
        subjectSpecializations: [...specializations],
        teachingLevel,
      },
    });
    ids.set(employeeCode, teacher.id);
  }
  const subject = await prisma.subject.create({
    data: {
      schoolId: school.id,
      name: "Mathematics",
      code: "MATH",
    },
  });
  ids.set("SUBJECT", subject.id);
  for (const [key, grade, section] of [
    ["9A", 9, "A"],
    ["9B", 9, "B"],
    ["9C", 9, "C"],
    ["9D", 9, "D"],
    ["8A", 8, "A"],
    ["8B", 8, "B"],
    ["8C", 8, "C"],
    ["8D", 8, "D"],
    ["8E", 8, "E"],
    ["7Z", 7, "Z"],
  ] as const) {
    const classSection = await prisma.classSection.create({
      data: {
        schoolId: school.id,
        name: `Grade ${grade}-${section}`,
        gradeNumber: grade,
        section,
        teachingLevel: grade === 9 ? "HIGHER" : "LOWER",
      },
    });
    ids.set(key, classSection.id);
  }
  const timetable = [
    [1, "9A", "ABS-A"],
    [2, "9B", "ABS-A"],
    [3, "9C", "ABS-A"],
    [4, "9D", "ABS-B"],
    [1, "8D", "CAN-C"],
    [4, "8A", "CAN-A"],
    [4, "8B", "CAN-B"],
    [4, "8C", "CAN-D"],
    [4, "8E", "CAN-C"],
  ] as const;
  for (const [periodNumber, classKey, teacherCode] of timetable) {
    await prisma.masterTimetable.create({
      data: {
        schoolId: school.id,
        dayOfWeek: "MONDAY",
        periodNumber,
        classSectionId: ids.get(classKey)!,
        teacherId: ids.get(teacherCode)!,
        subjectId: subject.id,
      },
    });
  }

  const otherSchool = await prisma.school.create({
    data: {
      id: OTHER_SCHOOL_ID,
      name: "Other Phase 4 School",
      academicYear: "2026",
      users: {
        create: {
          name: "Other Principal",
          email: "other.phase4@example.local",
          passwordHash,
          role: "PRINCIPAL",
        },
      },
      teachers: {
        create: {
          name: "Other Teacher",
          employeeCode: "OTHER",
          teachingLevel: "LOWER",
        },
      },
    },
    include: { teachers: true },
  });
  ids.set("OTHER", otherSchool.teachers[0]!.id);

  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  closeServer = () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  for (const [email, assign] of [
    [
      "principal.phase4@example.local",
      (token: string) => (principalToken = token),
    ],
    [
      "incharge.phase4@example.local",
      (token: string) => (inchargeToken = token),
    ],
  ] as const) {
    const login = await request<{ accessToken: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    assign(login.body.data!.accessToken);
  }
});

after(async () => {
  await closeServer?.();
  await prisma.school.deleteMany({
    where: { id: { in: [SCHOOL_ID, OTHER_SCHOOL_ID] } },
  });
  await prisma.$disconnect();
});

test("date-only utilities avoid timezone shifts and calculate boundaries", () => {
  const date = parseDateOnly("2026-08-03");
  assert.equal(formatDateOnly(date), "2026-08-03");
  assert.equal(weekdayForDate(date), "MONDAY");
  assert.equal(
    todayInTimezone("Asia/Karachi", new Date("2026-08-02T20:30:00Z")),
    "2026-08-03",
  );
  assert.deepEqual(isoWeek(parseDateOnly("2021-01-01")), {
    year: 2020,
    weekNumber: 53,
  });
});

test("100-point scoring components and deterministic ties work", () => {
  assert.equal(subjectMatchScore("  Mathematics ", ["mathematics"]), 50);
  assert.equal(classLevelScore("BOTH", "HIGHER"), 30);
  assert.equal(classLevelScore("LOWER", "HIGHER"), 0);
  assert.equal(workloadBalanceScore(2, 2, 2), 20);
  assert.equal(workloadBalanceScore(2, 0, 4), 10);
  const sorted = sortCandidates([
    {
      teacherId: "b",
      teacherName: "Same",
      subjectScore: 50,
      classLevelScore: 30,
      workloadScore: 20,
      baseWeeklyTeachingPeriods: 0,
      weeklyFixtureCount: 0,
      effectiveWeeklyWorkload: 0,
      minimumEligibleWorkload: 0,
      maximumEligibleWorkload: 0,
      totalScore: 100,
    },
    {
      teacherId: "a",
      teacherName: "Same",
      subjectScore: 50,
      classLevelScore: 30,
      workloadScore: 20,
      baseWeeklyTeachingPeriods: 0,
      weeklyFixtureCount: 0,
      effectiveWeeklyWorkload: 0,
      minimumEligibleWorkload: 0,
      maximumEligibleWorkload: 0,
      totalScore: 100,
    },
  ]);
  assert.deepEqual(
    sorted.map((candidate) => candidate.teacherId),
    ["a", "b"],
  );
});

test("saves bulk attendance and enforces school isolation", async () => {
  const records = (
    [
      ["ABS-A", "ABSENT"],
      ["ABS-B", "ABSENT"],
      ["CAN-D", "LATE"],
      ["LEAVE", "LEAVE"],
    ] as const
  ).map(([code, status]) => ({
    teacherId: ids.get(code)!,
    status,
    ...(status === "LATE" ? { availableFromPeriod: 3 } : {}),
  }));
  const saved = await request<{ records: unknown[] }>(
    "/api/v1/attendance/bulk",
    {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({ date: DATE, records }),
    },
  );
  assert.equal(saved.response.status, 200);
  assert.equal(saved.body.data?.records.length, 4);

  const isolated = await request("/api/v1/attendance/bulk", {
    method: "POST",
    headers: auth(),
    body: JSON.stringify({
      date: DATE,
      records: [{ teacherId: ids.get("OTHER"), status: "ABSENT" }],
    }),
  });
  assert.equal(isolated.response.status, 400);
  assert.equal(isolated.body.error?.code, "INVALID_ATTENDANCE_TEACHER");
});

test("generates absent lectures with eligible candidates and immediate workload balance", async () => {
  await prisma.proxyFixture.create({
    data: {
      schoolId: SCHOOL_ID,
      date: parseDateOnly(DATE),
      periodNumber: 3,
      classSectionId: ids.get("7Z")!,
      subjectId: ids.get("SUBJECT")!,
      absentTeacherId: ids.get("ABS-B")!,
      assignedTeacherId: ids.get("CAN-A")!,
      status: "DRAFT",
      workloadCounted: false,
    },
  });
  const result = await request<{
    fixtures: Array<{
      id: string;
      periodNumber: number;
      assignedTeacherId: string | null;
      scoringDetails: {
        candidates: Array<{ teacherId: string }>;
      };
    }>;
  }>("/api/v1/fixtures/generate", {
    method: "POST",
    headers: auth(),
    body: JSON.stringify({
      date: DATE,
      absentTeacherIds: [ids.get("ABS-A"), ids.get("ABS-B")],
    }),
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.data?.fixtures.length, 4);
  const fixtures = result.body.data!.fixtures;
  generatedFixtureIds = fixtures.map((fixture) => fixture.id);
  const periodOne = fixtures.find((fixture) => fixture.periodNumber === 1)!;
  const periodTwo = fixtures.find((fixture) => fixture.periodNumber === 2)!;
  const periodThree = fixtures.find((fixture) => fixture.periodNumber === 3)!;
  const periodFour = fixtures.find((fixture) => fixture.periodNumber === 4)!;
  firstFixtureId = periodOne.id;
  secondFixtureId = periodTwo.id;
  unassignedFixtureId = periodFour.id;

  assert.equal(periodOne.assignedTeacherId, ids.get("CAN-A"));
  assert.equal(periodTwo.assignedTeacherId, ids.get("CAN-B"));
  assert.equal(periodThree.assignedTeacherId, ids.get("CAN-C"));
  assert.equal(periodFour.assignedTeacherId, null);
  assert.ok(
    periodOne.scoringDetails.candidates.every(
      (candidate) =>
        candidate.teacherId !== ids.get("LEAVE") &&
        candidate.teacherId !== ids.get("ABS-B") &&
        candidate.teacherId !== ids.get("CAN-C"),
    ),
  );
  assert.ok(
    periodThree.scoringDetails.candidates.every(
      (candidate) => candidate.teacherId !== ids.get("CAN-A"),
    ),
  );
  assert.equal(await summaryCount(ids.get("CAN-A")!), 1);
  assert.equal(await summaryCount(ids.get("CAN-B")!), 1);
  assert.equal(await summaryCount(ids.get("CAN-C")!), 1);
});

test("duplicate generation returns existing fixtures without recounting", async () => {
  const before = await prisma.teacherFixtureSummary.aggregate({
    where: { schoolId: SCHOOL_ID },
    _sum: { fixtureCount: true },
  });
  const result = await request<{ fixtures: Array<{ id: string }> }>(
    "/api/v1/fixtures/generate",
    {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        date: DATE,
        absentTeacherIds: [ids.get("ABS-A"), ids.get("ABS-B")],
      }),
    },
  );
  const afterCount = await prisma.teacherFixtureSummary.aggregate({
    where: { schoolId: SCHOOL_ID },
    _sum: { fixtureCount: true },
  });
  assert.deepEqual(
    result.body.data?.fixtures.map((fixture) => fixture.id),
    generatedFixtureIds,
  );
  assert.equal(afterCount._sum.fixtureCount, before._sum.fixtureCount);
});

test("scoring API returns complete current workload details", async () => {
  const result = await request<{
    scoringDetails: {
      candidates: Array<{
        baseWeeklyTeachingPeriods: number;
        weeklyFixtureCount: number;
        effectiveWeeklyWorkload: number;
        minimumEligibleWorkload: number;
        maximumEligibleWorkload: number;
        workloadScore: number;
      }>;
    };
  }>(`/api/v1/fixtures/${firstFixtureId}/scoring`, {
    headers: auth(),
  });
  assert.equal(result.response.status, 200);
  assert.ok(result.body.data?.scoringDetails.candidates.length);
  for (const candidate of result.body.data!.scoringDetails.candidates) {
    assert.equal(typeof candidate.baseWeeklyTeachingPeriods, "number");
    assert.equal(typeof candidate.weeklyFixtureCount, "number");
    assert.equal(typeof candidate.effectiveWeeklyWorkload, "number");
    assert.equal(typeof candidate.minimumEligibleWorkload, "number");
    assert.equal(typeof candidate.maximumEligibleWorkload, "number");
    assert.equal(typeof candidate.workloadScore, "number");
  }
});

test("override candidates use shared eligibility and exclude every unavailable teacher", async () => {
  const result = await request<{
    candidates: Array<{ teacherId: string }>;
  }>(`/api/v1/fixtures/${firstFixtureId}/candidates`, {
    headers: auth(),
  });
  assert.equal(result.response.status, 200);
  assert.deepEqual(
    result.body.data?.candidates.map((candidate) => candidate.teacherId),
    [ids.get("CAN-B")],
  );
});

test("attendance changes flag affected drafts and restoring availability clears the warning", async () => {
  const unavailable = await request<{
    affectedDraftFixtureIds: string[];
    fixtureGeneration: {
      affectedLessons: number;
      fixturesCreated: number;
    };
  }>(`/api/v1/attendance/${ids.get("CAN-C")}`, {
    method: "PUT",
    headers: auth(),
    body: JSON.stringify({
      date: DATE,
      status: "SHORT_LEAVE",
      unavailableFromPeriod: 3,
    }),
  });
  assert.ok(
    unavailable.body.data?.affectedDraftFixtureIds.includes(
      generatedFixtureIds.find(
        (fixtureId) =>
          fixtureId !== firstFixtureId && fixtureId !== secondFixtureId,
      )!,
    ),
  );
  assert.equal(unavailable.body.data?.fixtureGeneration.affectedLessons, 1);
  assert.equal(unavailable.body.data?.fixtureGeneration.fixturesCreated, 1);
  assert.equal(
    (
      await prisma.proxyFixture.findFirst({
        where: {
          schoolId: SCHOOL_ID,
          date: parseDateOnly(DATE),
          assignedTeacherId: ids.get("CAN-C"),
          status: "DRAFT",
        },
      })
    )?.requiresReassignment,
    true,
  );

  await request(`/api/v1/attendance/${ids.get("CAN-C")}`, {
    method: "PUT",
    headers: auth(),
    body: JSON.stringify({
      date: DATE,
      status: "SHORT_LEAVE",
      unavailableFromPeriod: 5,
    }),
  });
  assert.equal(
    (
      await prisma.proxyFixture.findFirst({
        where: {
          schoolId: SCHOOL_ID,
          date: parseDateOnly(DATE),
          assignedTeacherId: ids.get("CAN-C"),
          status: "DRAFT",
        },
      })
    )?.requiresReassignment,
    false,
  );

  const newlyCreated = await prisma.proxyFixture.findMany({
    where: {
      schoolId: SCHOOL_ID,
      date: parseDateOnly(DATE),
      absentTeacherId: ids.get("CAN-C"),
      status: "DRAFT",
    },
    select: { id: true },
  });
  for (const fixture of newlyCreated) {
    await request(`/api/v1/fixtures/${fixture.id}/cancel`, {
      method: "POST",
      headers: auth(),
    });
  }
});

test("manual override transfers counts and same-teacher override is stable", async () => {
  const overridden = await request(
    `/api/v1/fixtures/${firstFixtureId}/override`,
    {
      method: "PATCH",
      headers: auth(),
      body: JSON.stringify({
        assignedTeacherId: ids.get("CAN-B"),
        reason: "Administrative adjustment",
      }),
    },
  );
  assert.equal(overridden.response.status, 200);
  assert.equal(await summaryCount(ids.get("CAN-A")!), 0);
  assert.equal(await summaryCount(ids.get("CAN-B")!), 2);

  const sameTeacher = await request(
    `/api/v1/fixtures/${firstFixtureId}/override`,
    {
      method: "PATCH",
      headers: auth(),
      body: JSON.stringify({
        assignedTeacherId: ids.get("CAN-B"),
        reason: "Updated administrative reason",
      }),
    },
  );
  assert.equal(sameTeacher.response.status, 400);
  assert.equal(await summaryCount(ids.get("CAN-B")!), 2);
});

test("cancellation decrements once and publication rejects unassigned drafts", async () => {
  const cancelled = await request(
    `/api/v1/fixtures/${secondFixtureId}/cancel`,
    {
      method: "POST",
      headers: auth(),
    },
  );
  assert.equal(cancelled.response.status, 200);
  assert.equal(await summaryCount(ids.get("CAN-B")!), 1);

  const rejected = await request("/api/v1/fixtures/publish", {
    method: "POST",
    headers: auth(),
    body: JSON.stringify({ date: DATE }),
  });
  assert.equal(rejected.response.status, 409);
  assert.equal(rejected.body.error?.code, "UNASSIGNED_FIXTURES");
});

test("cancelling unassigned fixture allows publication without workload changes", async () => {
  const totalBefore = await prisma.teacherFixtureSummary.aggregate({
    where: { schoolId: SCHOOL_ID },
    _sum: { fixtureCount: true },
  });
  await request(`/api/v1/fixtures/${unassignedFixtureId}/cancel`, {
    method: "POST",
    headers: auth(),
  });
  const published = await request<{ fixtures: unknown[] }>(
    "/api/v1/fixtures/publish",
    {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({ date: DATE }),
    },
  );
  assert.equal(published.response.status, 200);
  const totalAfter = await prisma.teacherFixtureSummary.aggregate({
    where: { schoolId: SCHOOL_ID },
    _sum: { fixtureCount: true },
  });
  assert.equal(totalAfter._sum.fixtureCount, totalBefore._sum.fixtureCount);
});

test("attendance changes warn about published fixtures without modifying them", async () => {
  const confirmationRequired = await request(
    `/api/v1/attendance/${ids.get("CAN-B")}`,
    {
      method: "PUT",
      headers: auth(),
      body: JSON.stringify({
        date: DATE,
        status: "SHORT_LEAVE",
        unavailableFromPeriod: 1,
      }),
    },
  );
  assert.equal(confirmationRequired.response.status, 409);
  assert.equal(
    confirmationRequired.body.error?.code,
    "PUBLISHED_FIXTURE_CONFIRMATION_REQUIRED",
  );

  const result = await request<{
    affectedPublishedFixtureIds: string[];
  }>(`/api/v1/attendance/${ids.get("CAN-B")}`, {
    method: "PUT",
    headers: auth(),
    body: JSON.stringify({
      date: DATE,
      status: "SHORT_LEAVE",
      unavailableFromPeriod: 1,
      confirmPublishedFixtureImpact: true,
      reason: "Medical appointment",
      notes: "Published assignment reviewed by the incharge",
    }),
  });
  assert.ok(
    result.body.data?.affectedPublishedFixtureIds.includes(firstFixtureId),
  );
  const fixture = await prisma.proxyFixture.findUnique({
    where: { id: firstFixtureId },
  });
  assert.equal(fixture?.status, "PUBLISHED");
  assert.equal(fixture?.requiresReassignment, false);
});

test("attendance reports keep partial-day exceptions separate with period details", async () => {
  const report = await request<{
    records: Array<{
      teacher: { id: string };
      exceptionType: string;
      availablePeriods: number[];
      unavailablePeriods: number[];
      reason: string | null;
      notes: string | null;
      fixturesGenerated: number;
    }>;
  }>("/api/v1/records/attendance?year=2026", {
    headers: auth(),
  });
  assert.equal(report.response.status, 200);
  const shortLeave = report.body.data?.records.find(
    (record) => record.teacher.id === ids.get("CAN-B"),
  );
  assert.equal(shortLeave?.exceptionType, "SHORT_LEAVE");
  assert.deepEqual(shortLeave?.availablePeriods, []);
  assert.deepEqual(shortLeave?.unavailablePeriods, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(shortLeave?.reason, "Medical appointment");
  assert.equal(
    shortLeave?.notes,
    "Published assignment reviewed by the incharge",
  );
  assert.equal(typeof shortLeave?.fixturesGenerated, "number");
  assert.ok(
    report.body.data?.records.every(
      (record) => record.teacher.id !== ids.get("OTHER"),
    ),
  );
});

test("weekly, yearly, and teacher history records reflect committed workloads", async () => {
  const { year, weekNumber } = isoWeek(parseDateOnly(DATE));
  const weekly = await request<{
    records: Array<{ teacherId: string; fixtureCount: number }>;
  }>(`/api/v1/records/weekly?year=${year}&week=${weekNumber}`, {
    headers: auth(),
  });
  const yearly = await request<{
    records: Array<{ teacherId: string; fixtureCount: number }>;
  }>(`/api/v1/records/yearly?year=${year}`, { headers: auth() });
  const weeklyTotal = weekly.body.data!.records.reduce(
    (sum, record) => sum + record.fixtureCount,
    0,
  );
  const yearlyTotal = yearly.body.data!.records.reduce(
    (sum, record) => sum + record.fixtureCount,
    0,
  );
  assert.equal(weeklyTotal, 2);
  assert.equal(yearlyTotal, 2);

  const history = await request<{
    fixtures: Array<{ id: string; isManuallyOverridden: boolean }>;
  }>(`/api/v1/records/teachers/${ids.get("CAN-B")}?year=${year}`, {
    headers: auth(),
  });
  assert.ok(
    history.body.data?.fixtures.some(
      (fixture) =>
        fixture.id === firstFixtureId && fixture.isManuallyOverridden,
    ),
  );
});

test("both roles can access Phase 4 APIs", async () => {
  const principal = await request(`/api/v1/attendance?date=${DATE}`, {
    headers: auth(principalToken),
  });
  const incharge = await request(`/api/v1/attendance?date=${DATE}`, {
    headers: auth(inchargeToken),
  });
  assert.equal(principal.response.status, 200);
  assert.equal(incharge.response.status, 200);
});
