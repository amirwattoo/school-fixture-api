import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

import bcrypt from "bcrypt";

import { ApiError } from "../src/common/api-error.js";
import {
  buildClassName,
  cleanSpecializations,
  deriveTeachingLevel,
  normalizeWhatsappNumber,
  weekdayOrder,
} from "../src/common/school-data.js";
import { createApp } from "../src/app.js";
import { validatePeriodRange } from "../src/modules/timetable/timetable.service.js";
import { prisma } from "../src/prisma/client.js";

const SCHOOL_ID = "phase-3-integration-school";
const OTHER_SCHOOL_ID = "phase-3-other-school";
const PASSWORD = "Testing123!";

let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let principalToken = "";
let inchargeToken = "";
let teacherAId = "";
let teacherBId = "";
let inactiveTeacherId = "";
let subjectAId = "";
let classAId = "";
let classBId = "";
let otherTeacherId = "";
let otherSubjectId = "";
let otherClassId = "";
let timetableEntryId = "";

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
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return { response, body: (await response.json()) as ApiBody<T> };
};

const authorized = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

before(async () => {
  await prisma.school.deleteMany({
    where: { id: { in: [SCHOOL_ID, OTHER_SCHOOL_ID] } },
  });
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await prisma.school.create({
    data: {
      id: SCHOOL_ID,
      name: "Phase 3 Integration School",
      academicYear: "2026",
      periodsPerDay: 8,
      users: {
        create: [
          {
            name: "Phase 3 Principal",
            email: "principal.phase3@example.local",
            passwordHash,
            role: "PRINCIPAL",
          },
          {
            name: "Phase 3 Incharge",
            email: "incharge.phase3@example.local",
            passwordHash,
            role: "TIMETABLE_INCHARGE",
          },
        ],
      },
      teachers: {
        create: [
          {
            name: "Teacher Alpha",
            employeeCode: "BASE-A",
            teachingLevel: "BOTH",
          },
          {
            name: "Teacher Beta",
            employeeCode: "BASE-B",
            teachingLevel: "BOTH",
          },
          {
            name: "Inactive Teacher",
            employeeCode: "BASE-INACTIVE",
            teachingLevel: "LOWER",
            isActive: false,
          },
        ],
      },
      subjects: {
        create: [{ name: "Base Subject", code: "BASE" }],
      },
      classSections: {
        create: [
          {
            name: "Grade 6-A",
            gradeNumber: 6,
            section: "A",
            teachingLevel: "LOWER",
          },
          {
            name: "Grade 6-B",
            gradeNumber: 6,
            section: "B",
            teachingLevel: "LOWER",
          },
        ],
      },
    },
  });
  await prisma.school.create({
    data: {
      id: OTHER_SCHOOL_ID,
      name: "Other Phase 3 School",
      academicYear: "2026",
      teachers: {
        create: {
          name: "Other Teacher",
          employeeCode: "OTHER-T",
          teachingLevel: "BOTH",
        },
      },
      subjects: { create: { name: "Other Subject", code: "OTHER-S" } },
      classSections: {
        create: {
          name: "Grade 7-Z",
          gradeNumber: 7,
          section: "Z",
          teachingLevel: "LOWER",
        },
      },
    },
  });

  const [teachers, subject, classes, otherTeacher, otherSubject, otherClass] =
    await Promise.all([
      prisma.teacher.findMany({ where: { schoolId: SCHOOL_ID } }),
      prisma.subject.findFirstOrThrow({ where: { schoolId: SCHOOL_ID } }),
      prisma.classSection.findMany({ where: { schoolId: SCHOOL_ID } }),
      prisma.teacher.findFirstOrThrow({
        where: { schoolId: OTHER_SCHOOL_ID },
      }),
      prisma.subject.findFirstOrThrow({
        where: { schoolId: OTHER_SCHOOL_ID },
      }),
      prisma.classSection.findFirstOrThrow({
        where: { schoolId: OTHER_SCHOOL_ID },
      }),
    ]);
  teacherAId = teachers.find((item) => item.employeeCode === "BASE-A")!.id;
  teacherBId = teachers.find((item) => item.employeeCode === "BASE-B")!.id;
  inactiveTeacherId = teachers.find(
    (item) => item.employeeCode === "BASE-INACTIVE",
  )!.id;
  subjectAId = subject.id;
  classAId = classes.find((item) => item.section === "A")!.id;
  classBId = classes.find((item) => item.section === "B")!.id;
  otherTeacherId = otherTeacher.id;
  otherSubjectId = otherSubject.id;
  otherClassId = otherClass.id;

  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  closeServer = () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

  for (const [email, assign] of [
    [
      "principal.phase3@example.local",
      (token: string) => (principalToken = token),
    ],
    [
      "incharge.phase3@example.local",
      (token: string) => (inchargeToken = token),
    ],
  ] as const) {
    const login = await request<{ accessToken: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    assert.equal(login.response.status, 200);
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

test("normalizes Pakistani WhatsApp numbers for Click-to-Chat", () => {
  assert.equal(normalizeWhatsappNumber("0300 1234567"), "923001234567");
  assert.equal(normalizeWhatsappNumber("923001234567"), "923001234567");
  assert.equal(normalizeWhatsappNumber(""), null);
  assert.throws(() => normalizeWhatsappNumber("not-a-number"));
});

test("cleans and deduplicates teacher specializations", () => {
  assert.deepEqual(
    cleanSpecializations([" mathematics ", "MATHEMATICS", "Physics", ""]),
    ["Mathematics", "Physics"],
  );
});

test("generates class names and derives teaching levels", () => {
  assert.equal(buildClassName(9, " a "), "Grade 9-A");
  assert.equal(deriveTeachingLevel(9), "HIGHER");
  assert.equal(deriveTeachingLevel(10), "HIGHER");
  assert.equal(deriveTeachingLevel(8), "LOWER");
});

test("validates period range against school configuration", () => {
  assert.doesNotThrow(() => validatePeriodRange(8, 8));
  assert.throws(
    () => validatePeriodRange(9, 8),
    (error) =>
      error instanceof ApiError && error.code === "INVALID_PERIOD_NUMBER",
  );
});

test("orders weekdays logically rather than alphabetically", () => {
  const days = ["FRIDAY", "MONDAY", "WEDNESDAY"] as const;
  assert.deepEqual(
    [...days].sort((a, b) => weekdayOrder(a) - weekdayOrder(b)),
    ["MONDAY", "WEDNESDAY", "FRIDAY"],
  );
});

test("Principal creates a normalized teacher", async () => {
  const result = await request<{
    teacher: {
      id: string;
      employeeCode: string;
      whatsappNumber: string;
      subjectSpecializations: string[];
    };
  }>("/api/v1/teachers", {
    method: "POST",
    headers: authorized(principalToken),
    body: JSON.stringify({
      name: "Muhammad Ahmed",
      employeeCode: " new-001 ",
      whatsappNumber: "03001234567",
      subjectSpecializations: [" Mathematics ", "mathematics", "Physics"],
      teachingLevel: "HIGHER",
    }),
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.body.data?.teacher.employeeCode, "NEW-001");
  assert.equal(result.body.data?.teacher.whatsappNumber, "923001234567");
  assert.deepEqual(result.body.data?.teacher.subjectSpecializations, [
    "Mathematics",
    "Physics",
  ]);
});

test("rejects a duplicate employee code within the school", async () => {
  const result = await request("/api/v1/teachers", {
    method: "POST",
    headers: authorized(principalToken),
    body: JSON.stringify({
      name: "Duplicate Teacher",
      employeeCode: "new-001",
      subjectSpecializations: [],
      teachingLevel: "LOWER",
    }),
  });
  assert.equal(result.response.status, 409);
  assert.equal(result.body.error?.code, "DUPLICATE_EMPLOYEE_CODE");
});

test("teacher detail is isolated by school", async () => {
  const result = await request(`/api/v1/teachers/${otherTeacherId}`, {
    headers: authorized(principalToken),
  });
  assert.equal(result.response.status, 404);
});

test("normalizes subjects and rejects capitalization duplicates", async () => {
  const first = await request("/api/v1/subjects", {
    method: "POST",
    headers: authorized(principalToken),
    body: JSON.stringify({ name: "mathematics", code: "math" }),
  });
  assert.equal(first.response.status, 201);
  const duplicate = await request("/api/v1/subjects", {
    method: "POST",
    headers: authorized(principalToken),
    body: JSON.stringify({ name: "MATHEMATICS", code: "MATH-2" }),
  });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.body.error?.code, "DUPLICATE_SUBJECT");
});

test("derives class level and rejects duplicate grade-section", async () => {
  const gradeNine = await request<{
    classSection: { teachingLevel: string; name: string };
  }>("/api/v1/class-sections", {
    method: "POST",
    headers: authorized(principalToken),
    body: JSON.stringify({ gradeNumber: 9, section: "c" }),
  });
  assert.equal(gradeNine.body.data?.classSection.teachingLevel, "HIGHER");
  assert.equal(gradeNine.body.data?.classSection.name, "Grade 9-C");

  const gradeEight = await request<{
    classSection: { teachingLevel: string };
  }>("/api/v1/class-sections", {
    method: "POST",
    headers: authorized(principalToken),
    body: JSON.stringify({ gradeNumber: 8, section: "C" }),
  });
  assert.equal(gradeEight.body.data?.classSection.teachingLevel, "LOWER");

  const duplicate = await request("/api/v1/class-sections", {
    method: "POST",
    headers: authorized(principalToken),
    body: JSON.stringify({ gradeNumber: 9, section: " c " }),
  });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.body.error?.code, "DUPLICATE_CLASS_SECTION");
});

test("creates a timetable entry and permits a self-excluding update", async () => {
  const created = await request<{ entry: { id: string } }>(
    "/api/v1/timetable",
    {
      method: "POST",
      headers: authorized(principalToken),
      body: JSON.stringify({
        dayOfWeek: "MONDAY",
        periodNumber: 1,
        classSectionId: classAId,
        teacherId: teacherAId,
        subjectId: subjectAId,
      }),
    },
  );
  assert.equal(created.response.status, 201);
  timetableEntryId = created.body.data!.entry.id;

  const withoutConfirmation = await request(`/api/v1/timetable/${timetableEntryId}`, {
    method: "PATCH",
    headers: authorized(principalToken),
    body: JSON.stringify({ periodNumber: 1 }),
  });
  assert.equal(withoutConfirmation.response.status, 400);

  const updated = await request(`/api/v1/timetable/${timetableEntryId}`, {
    method: "PATCH",
    headers: authorized(principalToken),
    body: JSON.stringify({ periodNumber: 1, confirmChange: true }),
  });
  assert.equal(updated.response.status, 200);
  assert.ok(await prisma.auditLog.findFirst({ where: { schoolId: SCHOOL_ID, entityId: timetableEntryId, action: "TIMETABLE_ENTRY_UPDATED" } }));
});

test("rejects teacher double-bookings and exact duplicates but permits parallel class assignments", async () => {
  const teacherConflict = await request("/api/v1/timetable", {
    method: "POST",
    headers: authorized(principalToken),
    body: JSON.stringify({
      dayOfWeek: "MONDAY",
      periodNumber: 1,
      classSectionId: classBId,
      teacherId: teacherAId,
      subjectId: subjectAId,
    }),
  });
  assert.equal(teacherConflict.body.error?.code, "TEACHER_TIMETABLE_CONFLICT");

  const parallel = await request<{ entry: { id: string } }>("/api/v1/timetable", {
    method: "POST",
    headers: authorized(principalToken),
    body: JSON.stringify({
      dayOfWeek: "MONDAY",
      periodNumber: 1,
      classSectionId: classAId,
      teacherId: teacherBId,
      subjectId: subjectAId,
    }),
  });
  assert.equal(parallel.response.status, 201);

  const duplicate = await request("/api/v1/timetable", {
    method: "POST",
    headers: authorized(principalToken),
    body: JSON.stringify({
      dayOfWeek: "MONDAY",
      periodNumber: 1,
      classSectionId: classAId,
      teacherId: teacherBId,
      subjectId: subjectAId,
    }),
  });
  assert.equal(duplicate.body.error?.code, "DUPLICATE_TIMETABLE_ASSIGNMENT");
});

test("grid endpoint is normalized, school scoped, and cache invalidates after edits", async () => {
  type GridResponse = { grid: { periodsPerDay: number; entries: Array<{ id: string; periodNumber: number; classSectionId: string; teacherId: string }>; classes: Array<{ id: string }>; teachers: Array<{ id: string; baseWeeklyTeachingPeriods: number }>; subjects: Array<{ id: string }> } };
  const first = await request<GridResponse>("/api/v1/timetable/grid?view=class", { headers: authorized(principalToken) });
  assert.equal(first.response.status, 200);
  assert.equal(first.body.data!.grid.periodsPerDay, 8);
  assert.equal(first.body.data!.grid.entries.filter((entry) => entry.classSectionId === classAId && entry.periodNumber === 1).length, 2);
  assert.ok(first.body.data!.grid.entries.every((entry) => entry.teacherId !== otherTeacherId));
  assert.ok(first.body.data!.grid.classes.every((item) => item.id !== otherClassId));
  assert.ok(first.body.data!.grid.subjects.every((item) => item.id !== otherSubjectId));

  const updated = await request(`/api/v1/timetable/${timetableEntryId}`, {
    method: "PATCH",
    headers: authorized(inchargeToken),
    body: JSON.stringify({ periodNumber: 2, confirmChange: true }),
  });
  assert.equal(updated.response.status, 200);
  const refreshed = await request<GridResponse>("/api/v1/timetable/grid?view=class", { headers: authorized(principalToken) });
  assert.equal(refreshed.body.data!.grid.entries.find((entry) => entry.id === timetableEntryId)?.periodNumber, 2);
});

test("historically referenced timetable assignments cannot be deleted", async () => {
  const user = await prisma.systemUser.findFirstOrThrow({ where: { schoolId: SCHOOL_ID, role: "PRINCIPAL" } });
  await prisma.proxyFixture.create({ data: { schoolId: SCHOOL_ID, date: new Date("2026-08-03T00:00:00.000Z"), periodNumber: 2, masterTimetableId: timetableEntryId, classSectionId: classAId, subjectId: subjectAId, absentTeacherId: teacherAId, overriddenById: user.id } });
  const deleted = await request(`/api/v1/timetable/${timetableEntryId}`, { method: "DELETE", headers: authorized(principalToken) });
  assert.equal(deleted.response.status, 409);
  assert.equal(deleted.body.error?.code, "TIMETABLE_ENTRY_REFERENCED_BY_FIXTURE");
});

test("rejects inactive and other-school timetable resources", async () => {
  const inactive = await request("/api/v1/timetable", {
    method: "POST",
    headers: authorized(principalToken),
    body: JSON.stringify({
      dayOfWeek: "TUESDAY",
      periodNumber: 1,
      classSectionId: classAId,
      teacherId: inactiveTeacherId,
      subjectId: subjectAId,
    }),
  });
  assert.equal(inactive.body.error?.code, "INACTIVE_TEACHER");

  for (const [field, value, expectedCode] of [
    ["teacherId", otherTeacherId, "TEACHER_NOT_FOUND"],
    ["subjectId", otherSubjectId, "SUBJECT_NOT_FOUND"],
    ["classSectionId", otherClassId, "CLASS_SECTION_NOT_FOUND"],
  ] as const) {
    const body = {
      dayOfWeek: "TUESDAY",
      periodNumber: 2,
      classSectionId: classAId,
      teacherId: teacherAId,
      subjectId: subjectAId,
      [field]: value,
    };
    const result = await request("/api/v1/timetable", {
      method: "POST",
      headers: authorized(principalToken),
      body: JSON.stringify(body),
    });
    assert.equal(result.body.error?.code, expectedCode);
  }
});

test("both Principal and Timetable Incharge satisfy Phase 3 RBAC", async () => {
  const principal = await request("/api/v1/teachers", {
    headers: authorized(principalToken),
  });
  const incharge = await request("/api/v1/teachers", {
    headers: authorized(inchargeToken),
  });
  assert.equal(principal.response.status, 200);
  assert.equal(incharge.response.status, 200);
});
