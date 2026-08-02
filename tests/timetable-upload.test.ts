import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma/client.js";

const SCHOOL_ID = "timetable-upload-api-test";
let baseUrl = ""; let closeServer: (() => Promise<void>) | undefined; let token = "";

before(async () => {
  await prisma.school.deleteMany({ where: { id: SCHOOL_ID } });
  await prisma.school.create({ data: { id: SCHOOL_ID, name: "Upload Test School", academicYear: "2026", users: { create: { name: "Principal", email: "upload-test@example.local", passwordHash: await bcrypt.hash("Testing123!", 12), role: "PRINCIPAL" } } } });
  const server = createApp().listen(0, "127.0.0.1"); await new Promise<void>((resolve) => server.once("listening", resolve)); baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; closeServer = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  const login = await fetch(`${baseUrl}/api/v1/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "upload-test@example.local", password: "Testing123!" }) }); token = ((await login.json()) as { data: { accessToken: string } }).data.accessToken;
});
after(async () => { await closeServer?.(); await prisma.school.deleteMany({ where: { id: SCHOOL_ID } }); await prisma.$disconnect(); });

const upload = (name: string, content: string, type: string) => { const form = new FormData(); form.append("file", new Blob([content], { type }), name); return fetch(`${baseUrl}/api/v1/timetable-imports/preview`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }); };
type UploadPreview = { data: { batchId: string; preview: { totals: { rows: number; newTeachers: number; invalidRows: number }; duplicateRows: number[]; invalidRows: Array<{ rowNumber: number; message: string }>; warnings: string[]; blockingErrors: string[] } } };

test("timetable upload requires authorization and rejects unsupported files", async () => {
  const form = new FormData(); form.append("file", new Blob(["data"], { type: "text/plain" }), "payload.exe");
  assert.equal((await fetch(`${baseUrl}/api/v1/timetable-imports/preview`, { method: "POST", body: form })).status, 401);
  assert.equal((await upload("payload.exe", "data", "text/plain")).status, 415);
});

test("CSV preview has no timetable mutation and confirmed import is school scoped", async () => {
  const csv = "day,period,class,teacher,subject,subjectCode,workload\n1-5,1,Grade 1 A,New Teacher,Mathematics,MATH,20";
  const response = await upload("timetable.csv", csv, "text/csv"); assert.equal(response.status, 201);
  const body = (await response.json()) as { data: { batchId: string; preview: { totals: { rows: number; newTeachers: number }; blockingErrors: string[] } } };
  assert.equal(body.data.preview.totals.rows, 5); assert.equal(body.data.preview.totals.newTeachers, 1); assert.deepEqual(body.data.preview.blockingErrors, []);
  assert.equal(await prisma.masterTimetable.count({ where: { schoolId: SCHOOL_ID } }), 0);
  const withoutConfirmation = await fetch(`${baseUrl}/api/v1/timetable-imports/${body.data.batchId}/confirm`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ confirmReplace: false }) }); assert.equal(withoutConfirmation.status, 400);
  const confirmed = await fetch(`${baseUrl}/api/v1/timetable-imports/${body.data.batchId}/confirm`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ confirmReplace: true, confirmTeacherUpdates: true }) }); assert.equal(confirmed.status, 200);
  assert.equal(await prisma.masterTimetable.count({ where: { schoolId: SCHOOL_ID } }), 5);
  const imported = await prisma.masterTimetable.findMany({ where: { schoolId: SCHOOL_ID }, select: { schoolId: true } });
  assert.ok(imported.every((row) => row.schoolId === SCHOOL_ID));
});

test("legitimate parallel class assignments are informational and importable", async () => {
  const csv = [
    "day,period,class,teacher,subject,subjectCode,workload",
    "1,4,9A,Parallel Teacher One,Biology,BIO,12",
    "1,4,9A,Parallel Teacher Two,Computer Science,CS,14",
  ].join("\n");
  const response = await upload("parallel.csv", csv, "text/csv");
  assert.equal(response.status, 201);
  const body = (await response.json()) as UploadPreview;
  assert.deepEqual(body.data.preview.blockingErrors, []);
  assert.ok(body.data.preview.warnings.includes("Parallel assignments detected for 9A, Monday, Lesson 4."));
});

test("same teacher in two classes at the same time is rejected with detailed rows", async () => {
  const csv = [
    "day,period,class,teacher,subject,subjectCode,workload",
    "1,4,9A,Double Booked Teacher,Biology,BIO,12",
    "1,4,9B,Double Booked Teacher,Chemistry,CHEM,12",
  ].join("\n");
  const response = await upload("double-booked.csv", csv, "text/csv");
  assert.equal(response.status, 201);
  const body = (await response.json()) as UploadPreview;
  assert.equal(body.data.preview.blockingErrors.length, 2);
  for (const error of body.data.preview.blockingErrors) {
    for (const detail of ["CSV source row", "Class:", "Day: Monday", "Lesson: 4", "Subject:", "Teacher: Double Booked Teacher", "Teacher double-booking:"]) assert.match(error, new RegExp(detail));
  }
});

test("exact duplicate assignments are rejected with the exact reason", async () => {
  const csv = [
    "day,period,class,teacher,subject,subjectCode,workload",
    "1,4,9A,Duplicate Teacher,Biology,BIO,12",
    "1,4,9A,Duplicate Teacher,Biology,BIO,12",
  ].join("\n");
  const response = await upload("duplicate.csv", csv, "text/csv");
  assert.equal(response.status, 201);
  const body = (await response.json()) as UploadPreview;
  assert.deepEqual(body.data.preview.duplicateRows, [3]);
  assert.equal(body.data.preview.blockingErrors.length, 1);
  assert.match(body.data.preview.blockingErrors[0]!, /CSV source row 3.*Class: 9A.*Day: Monday.*Lesson: 4.*Subject: Biology.*Teacher: Duplicate Teacher.*Exact duplicate assignment.*CSV source row 2/);
});

test("254 grouped assignments expand to and import all 800 timetable rows", async () => {
  const teachers = Array.from({ length: 20 }, (_, index) => ({
    schoolId: SCHOOL_ID,
    name: `Bulk Teacher ${String(index + 1).padStart(2, "0")}`,
    employeeCode: `BULK-${String(index + 1).padStart(2, "0")}`,
    teachingLevel: "BOTH" as const,
    baseWeeklyTeachingPeriods: index + 10,
  }));
  await prisma.teacher.createMany({ data: teachers, skipDuplicates: true });
  const cachedBeforeImport = await fetch(`${baseUrl}/api/v1/timetable/grid?view=class`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(cachedBeforeImport.status, 200);
  const assignments = Array.from({ length: 160 }, (_, index) => {
    const teacherIndex = Math.floor(index / 8);
    const period = (index % 8) + 1;
    const teacher = teachers[teacherIndex]!;
    const common = `9A,${teacher.name},Parallel Subject,PAR,${teacher.baseWeeklyTeachingPeriods}`;
    return index < 94
      ? [`1-2,${period},${common}`, `3-5,${period},${common}`]
      : [`1-5,${period},${common}`];
  }).flat();
  assert.equal(assignments.length, 254);
  const csv = ["day,period,class,teacher,subject,subjectCode,workload", ...assignments].join("\n");
  const response = await upload("official-800.csv", csv, "text/csv");
  assert.equal(response.status, 201);
  const body = (await response.json()) as UploadPreview;
  assert.equal(body.data.preview.totals.rows, 800);
  assert.deepEqual(body.data.preview.blockingErrors, []);
  assert.ok(body.data.preview.warnings.some((warning) => warning.startsWith("Parallel assignments detected")));

  const confirmed = await fetch(`${baseUrl}/api/v1/timetable-imports/${body.data.batchId}/confirm`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmReplace: true, confirmTeacherUpdates: true }),
  });
  assert.equal(confirmed.status, 200);
  assert.equal(await prisma.masterTimetable.count({ where: { schoolId: SCHOOL_ID } }), 800);
  const refreshedGrid = (await (await fetch(`${baseUrl}/api/v1/timetable/grid?view=class`, { headers: { Authorization: `Bearer ${token}` } })).json()) as { data: { grid: { entries: unknown[] } } };
  assert.equal(refreshedGrid.data.grid.entries.length, 800);
  const preservedWorkloads = await prisma.teacher.findMany({ where: { schoolId: SCHOOL_ID, employeeCode: { startsWith: "BULK-" } }, select: { name: true, baseWeeklyTeachingPeriods: true } });
  assert.equal(preservedWorkloads.length, 20);
  assert.ok(preservedWorkloads.every((teacher) => teacher.baseWeeklyTeachingPeriods === Number(teacher.name.slice(-2)) + 9));
});
