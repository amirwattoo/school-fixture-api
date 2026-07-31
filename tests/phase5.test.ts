import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

import bcrypt from "bcrypt";

import { createApp } from "../src/app.js";
import { parseDateOnly } from "../src/common/date-only.js";
import {
  fixtureNotificationIdempotencyKey,
  renderFixtureWhatsAppMessage,
} from "../src/modules/whatsapp/whatsapp-message.service.js";
import { fixturesRepository } from "../src/modules/fixtures/fixtures.repository.js";
import {
  buildWhatsAppClickToChatUrl,
  isValidE164Number,
  normalizePakistaniWhatsAppNumber,
} from "../src/modules/whatsapp/whatsapp-number.util.js";
import { prisma } from "../src/prisma/client.js";

const SCHOOL_ID = "phase-5-integration-school";
const OTHER_SCHOOL_ID = "phase-5-other-school";
const DATE = "2026-08-10";
const PASSWORD = "Testing123!";

let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let principalToken = "";
let inchargeToken = "";
const ids = new Map<string, string>();

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

before(async () => {
  await prisma.school.deleteMany({
    where: { id: { in: [SCHOOL_ID, OTHER_SCHOOL_ID] } },
  });
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const school = await prisma.school.create({
    data: {
      id: SCHOOL_ID,
      name: "Phase 5 Integration School",
      academicYear: "2026",
      users: {
        create: [
          {
            name: "WhatsApp Principal",
            email: "principal.phase5@example.local",
            passwordHash,
            role: "PRINCIPAL",
          },
          {
            name: "WhatsApp Incharge",
            email: "incharge.phase5@example.local",
            passwordHash,
            role: "TIMETABLE_INCHARGE",
          },
        ],
      },
    },
  });
  const teacherData = [
    ["Absent Teacher", "ABS", "+923001234501"],
    ["Valid Teacher", "VALID", "03001234567"],
    ["Mock Failure Teacher", "FAIL", "+923001230000"],
    ["Missing Number Teacher", "MISSING", null],
    ["Invalid Number Teacher", "INVALID", "invalid-number"],
  ] as const;
  for (const [name, employeeCode, whatsappNumber] of teacherData) {
    const teacher = await prisma.teacher.create({
      data: {
        schoolId: school.id,
        name,
        employeeCode,
        whatsappNumber,
        subjectSpecializations: ["Mathematics"],
        teachingLevel: "BOTH",
      },
    });
    ids.set(employeeCode, teacher.id);
  }
  const subject = await prisma.subject.create({
    data: { schoolId: school.id, name: "Mathematics", code: "MATH" },
  });
  ids.set("SUBJECT", subject.id);
  for (const [index, teacherCode] of [
    "VALID",
    "FAIL",
    "MISSING",
    "INVALID",
  ].entries()) {
    const classSection = await prisma.classSection.create({
      data: {
        schoolId: school.id,
        name: `Grade 9-${String.fromCharCode(65 + index)}`,
        gradeNumber: 9,
        section: String.fromCharCode(65 + index),
        teachingLevel: "HIGHER",
      },
    });
    const fixture = await prisma.proxyFixture.create({
      data: {
        schoolId: school.id,
        date: parseDateOnly(DATE),
        periodNumber: index + 1,
        classSectionId: classSection.id,
        subjectId: subject.id,
        absentTeacherId: ids.get("ABS")!,
        assignedTeacherId: ids.get(teacherCode)!,
        autoAssignedTeacherId: ids.get(teacherCode)!,
        workloadCounted: true,
      },
    });
    ids.set(`FIXTURE-${teacherCode}`, fixture.id);
    await prisma.teacherFixtureSummary.create({
      data: {
        schoolId: school.id,
        teacherId: ids.get(teacherCode)!,
        year: 2026,
        weekNumber: 33,
        fixtureCount: 1,
      },
    });
  }

  const otherSchool = await prisma.school.create({
    data: {
      id: OTHER_SCHOOL_ID,
      name: "Other Phase 5 School",
      academicYear: "2026",
      users: {
        create: {
          name: "Other Principal",
          email: "other.phase5@example.local",
          passwordHash,
          role: "PRINCIPAL",
        },
      },
      teachers: {
        create: [
          {
            name: "Other Absent",
            employeeCode: "O-ABS",
            teachingLevel: "LOWER",
          },
          {
            name: "Other Assigned",
            employeeCode: "O-ASG",
            whatsappNumber: "+923001234599",
            teachingLevel: "LOWER",
          },
        ],
      },
      subjects: { create: { name: "Other Subject", code: "OTHER" } },
      classSections: {
        create: {
          name: "Grade 6-Z",
          gradeNumber: 6,
          section: "Z",
          teachingLevel: "LOWER",
        },
      },
    },
    include: { teachers: true, subjects: true, classSections: true },
  });
  const otherFixture = await prisma.proxyFixture.create({
    data: {
      schoolId: OTHER_SCHOOL_ID,
      date: parseDateOnly(DATE),
      periodNumber: 1,
      classSectionId: otherSchool.classSections[0]!.id,
      subjectId: otherSchool.subjects[0]!.id,
      absentTeacherId: otherSchool.teachers[0]!.id,
      assignedTeacherId: otherSchool.teachers[1]!.id,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  const otherNotification = await prisma.whatsAppNotification.create({
    data: {
      schoolId: OTHER_SCHOOL_ID,
      fixtureId: otherFixture.id,
      teacherId: otherSchool.teachers[1]!.id,
      destination: "+923001234599",
      message: "Other school message",
      idempotencyKey: fixtureNotificationIdempotencyKey(
        otherFixture.id,
        otherSchool.teachers[1]!.id,
        1,
      ),
    },
  });
  ids.set("OTHER-NOTIFICATION", otherNotification.id);

  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  closeServer = () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  for (const [email, assign] of [
    [
      "principal.phase5@example.local",
      (token: string) => (principalToken = token),
    ],
    [
      "incharge.phase5@example.local",
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

test("normalizes Pakistani numbers for Click-to-Chat", () => {
  for (const input of [
    "03001234567",
    "3001234567",
    "923001234567",
    "+923001234567",
    "(0300) 123-4567",
  ]) {
    assert.equal(normalizePakistaniWhatsAppNumber(input), "923001234567");
  }
  assert.equal(isValidE164Number("+923001234567"), true);
  assert.equal(isValidE164Number("03001234567"), false);
  for (const input of ["123", "+920001234567", "+92300123abcd"]) {
    assert.throws(() => normalizePakistaniWhatsAppNumber(input));
  }
});

test("renders safe fixture messages and stable idempotency keys", () => {
  const rendered = renderFixtureWhatsAppMessage({
    schoolName: "Test\u0000 School",
    teacherName: "Teacher Name",
    fixtureDate: parseDateOnly(DATE),
    periodNumber: 2,
    className: "Grade 9-A",
    subjectName: "Mathematics",
    absentTeacherName: "Absent Teacher",
  });
  assert.match(rendered.message, /Test School/);
  assert.match(rendered.message, /Date: 10 Aug 2026/);
  assert.match(rendered.message, /Day: Monday/);
  assert.match(rendered.message, /Developed by M\. Aamir Wattoo/);
  assert.equal(rendered.templateParameters.length, 7);
  assert.equal(
    fixtureNotificationIdempotencyKey("fixture", "teacher", 2),
    "fixture:fixture:teacher:teacher:version:2",
  );
});

test("builds an encoded WhatsApp Click-to-Chat URL", () => {
  const message = "Fixture duty\nPeriod: 2 & Class: 9-A";
  const url = buildWhatsAppClickToChatUrl("03001234567", message);
  assert.equal(
    url,
    `https://wa.me/923001234567?text=${encodeURIComponent(message)}`,
  );
  assert.equal(new URL(url).searchParams.get("text"), message);
});

test("publication creates READY notifications without mock delivery", async () => {
  const workloadBefore = await prisma.teacherFixtureSummary.aggregate({
    where: { schoolId: SCHOOL_ID },
    _sum: { fixtureCount: true },
  });
  const published = await request<{
    publishedCount: number;
    notificationsCreated: number;
    messagesReady: number;
    messagesSent: number;
    messagesFailed: number;
  }>("/api/v1/fixtures/publish", {
    method: "POST",
    headers: auth(),
    body: JSON.stringify({ date: DATE }),
  });
  assert.equal(published.response.status, 200);
  assert.match(
    published.response.headers.get("x-request-id") ?? "",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  assert.deepEqual(
    {
      publishedCount: published.body.data?.publishedCount,
      notificationsCreated: published.body.data?.notificationsCreated,
      messagesReady: published.body.data?.messagesReady,
      messagesSent: published.body.data?.messagesSent,
      messagesFailed: published.body.data?.messagesFailed,
    },
    {
      publishedCount: 4,
      notificationsCreated: 4,
      messagesReady: 4,
      messagesSent: 0,
      messagesFailed: 0,
    },
  );
  assert.equal(
    await prisma.proxyFixture.count({
      where: { schoolId: SCHOOL_ID, status: "PUBLISHED" },
    }),
    4,
  );
  assert.equal(
    await prisma.whatsAppNotification.count({
      where: { schoolId: SCHOOL_ID },
    }),
    4,
  );
  const statuses = await prisma.whatsAppNotification.groupBy({
    by: ["status"],
    where: { schoolId: SCHOOL_ID },
    _count: true,
  });
  assert.equal(statuses.find((item) => item.status === "READY")?._count, 4);
  assert.equal(
    await prisma.auditLog.count({
      where: { schoolId: SCHOOL_ID, action: "FIXTURES_PUBLISHED" },
    }),
    1,
  );
  assert.equal(
    await prisma.auditLog.count({
      where: {
        schoolId: SCHOOL_ID,
        action: "WHATSAPP_NOTIFICATION_CREATED",
      },
    }),
    4,
  );
  const workloadAfter = await prisma.teacherFixtureSummary.aggregate({
    where: { schoolId: SCHOOL_ID },
    _sum: { fixtureCount: true },
  });
  assert.equal(
    workloadAfter._sum.fixtureCount,
    workloadBefore._sum.fixtureCount,
  );
});

test("dashboard summary returns all counters in one request", async () => {
  const result = await request<{
    summary: {
      drafts: number;
      published: number;
      messagesReady: number;
      messagesOpened: number;
      messagesConfirmed: number;
    };
  }>(`/api/v1/dashboard?date=${DATE}`, { headers: auth() });
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body.data?.summary, {
    absent: 0,
    drafts: 0,
    published: 4,
    unassigned: 0,
    weekly: 4,
    messagesReady: 4,
    messagesOpened: 0,
    messagesConfirmed: 0,
  });
});

test("missing and invalid numbers return visible Click-to-Chat errors", async () => {
  const result = await request<{
    notifications: Array<{
      teacher: { employeeCode: string };
      clickToChatUrl: string | null;
      clickToChatError: { code: string; message: string } | null;
    }>;
  }>(`/api/v1/whatsapp-notifications?date=${DATE}&pageSize=100`, {
    headers: auth(),
  });
  const missing = result.body.data!.notifications.find(
    (item) => item.teacher.employeeCode === "MISSING",
  )!;
  const invalid = result.body.data!.notifications.find(
    (item) => item.teacher.employeeCode === "INVALID",
  )!;
  assert.equal(missing.clickToChatUrl, null);
  assert.equal(missing.clickToChatError?.code, "WHATSAPP_NUMBER_MISSING");
  assert.equal(invalid.clickToChatUrl, null);
  assert.equal(invalid.clickToChatError?.code, "WHATSAPP_NUMBER_INVALID");
});

test("duplicate publication creates no duplicate notifications", async () => {
  const before = await prisma.whatsAppNotification.count({
    where: { schoolId: SCHOOL_ID },
  });
  const auditsBefore = await prisma.auditLog.count({
    where: {
      schoolId: SCHOOL_ID,
      action: { in: ["FIXTURES_PUBLISHED", "WHATSAPP_NOTIFICATION_CREATED"] },
    },
  });
  const repeated = await request<{
    publishedCount: number;
    notificationsCreated: number;
  }>("/api/v1/fixtures/publish", {
    method: "POST",
    headers: auth(),
    body: JSON.stringify({ date: DATE }),
  });
  assert.equal(repeated.response.status, 200);
  assert.equal(repeated.body.data?.publishedCount, 0);
  assert.equal(repeated.body.data?.notificationsCreated, 0);
  assert.equal(
    await prisma.whatsAppNotification.count({
      where: { schoolId: SCHOOL_ID },
    }),
    before,
  );
  assert.equal(
    await prisma.auditLog.count({
      where: {
        schoolId: SCHOOL_ID,
        action: {
          in: ["FIXTURES_PUBLISHED", "WHATSAPP_NOTIFICATION_CREATED"],
        },
      },
    }),
    auditsBefore,
  );
});

test("notification persistence failure does not roll back publication", async () => {
  const source = await prisma.proxyFixture.findFirstOrThrow({
    where: { schoolId: SCHOOL_ID },
  });
  const fixture = await prisma.proxyFixture.create({
    data: {
      schoolId: SCHOOL_ID,
      date: parseDateOnly("2026-08-11"),
      periodNumber: 1,
      classSectionId: source.classSectionId,
      subjectId: source.subjectId,
      absentTeacherId: source.absentTeacherId,
      assignedTeacherId: ids.get("VALID")!,
      autoAssignedTeacherId: ids.get("VALID")!,
      workloadCounted: true,
    },
  });
  const createNotifications = fixturesRepository.createNotificationRecords;
  fixturesRepository.createNotificationRecords = async () => {
    throw new Error("simulated post-commit notification failure");
  };
  try {
    const result = await request<{
      publishedCount: number;
      notificationsCreated: number;
    }>("/api/v1/fixtures/publish", {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({ date: "2026-08-11" }),
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data?.publishedCount, 1);
    assert.equal(result.body.data?.notificationsCreated, 0);
  } finally {
    fixturesRepository.createNotificationRecords = createNotifications;
  }
  assert.equal(
    (
      await prisma.proxyFixture.findUniqueOrThrow({ where: { id: fixture.id } })
    ).status,
    "PUBLISHED",
  );
  assert.equal(
    await prisma.whatsAppNotification.count({
      where: { fixtureId: fixture.id },
    }),
    0,
  );
});

test("notification APIs filter READY data and enforce school isolation", async () => {
  const ready = await request<{
    notifications: Array<{ status: string; provider?: unknown }>;
    pagination: { total: number };
  }>(`/api/v1/whatsapp-notifications?date=${DATE}&status=READY`, {
    headers: auth(),
  });
  assert.equal(ready.response.status, 200);
  assert.equal(ready.body.data?.pagination.total, 4);
  assert.ok(
    ready.body.data?.notifications.every(
      (item) => item.status === "READY" && !("provider" in item),
    ),
  );
  const teacherFiltered = await request<{
    pagination: { total: number };
  }>(
    `/api/v1/whatsapp-notifications?teacherId=${ids.get("VALID")}&fixtureId=${ids.get("FIXTURE-VALID")}`,
    { headers: auth() },
  );
  assert.equal(teacherFiltered.body.data?.pagination.total, 1);
  const isolated = await request(
    `/api/v1/whatsapp-notifications/${ids.get("OTHER-NOTIFICATION")}`,
    { headers: auth() },
  );
  assert.equal(isolated.response.status, 404);
  assert.equal(isolated.body.error?.code, "WHATSAPP_NOTIFICATION_NOT_FOUND");
});

test("opening Click-to-Chat updates the same record without marking it sent", async () => {
  const ready = await prisma.whatsAppNotification.findFirstOrThrow({
    where: { schoolId: SCHOOL_ID, teacherId: ids.get("VALID") },
  });
  const opened = await request<{
    notification: {
      id: string;
      status: string;
      attemptCount: number;
      destination: string;
      openedAt: string | null;
    };
  }>(`/api/v1/whatsapp-notifications/${ready.id}/opened`, {
    method: "POST",
    headers: auth(inchargeToken),
  });
  assert.equal(opened.response.status, 200);
  assert.deepEqual(
    {
      id: opened.body.data?.notification.id,
      status: opened.body.data?.notification.status,
      attemptCount: opened.body.data?.notification.attemptCount,
      destination: opened.body.data?.notification.destination,
    },
    {
      id: ready.id,
      status: "OPENED",
      attemptCount: 1,
      destination: "923001234567",
    },
  );
  assert.ok(opened.body.data?.notification.openedAt);
  assert.equal(
    await prisma.whatsAppNotification.count({
      where: { fixtureId: ready.fixtureId },
    }),
    1,
  );
});

test("manual confirmation is explicit and idempotent", async () => {
  const opened = await prisma.whatsAppNotification.findFirstOrThrow({
    where: { schoolId: SCHOOL_ID, status: "OPENED" },
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await request<{
      notification: {
        status: string;
        manuallyConfirmedAt: string | null;
      };
    }>(`/api/v1/whatsapp-notifications/${opened.id}/confirm`, {
      method: "POST",
      headers: auth(),
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data?.notification.status, "MANUALLY_CONFIRMED");
    assert.ok(result.body.data?.notification.manuallyConfirmedAt);
  }
});

test("both roles can view safe provider status and unauthenticated access is rejected", async () => {
  for (const token of [principalToken, inchargeToken]) {
    const result = await request<{
      provider: Record<string, unknown>;
    }>("/api/v1/whatsapp-notifications/provider-status", {
      headers: auth(token),
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data?.provider.provider, "click_to_chat");
    assert.equal(result.body.data?.provider.automaticDelivery, false);
    const serialized = JSON.stringify(result.body);
    assert.doesNotMatch(serialized, /accessToken":"/i);
    assert.doesNotMatch(serialized, /WHATSAPP_ACCESS_TOKEN/i);
  }
  const unauthenticated = await request("/api/v1/whatsapp-notifications");
  assert.equal(unauthenticated.response.status, 401);
});
