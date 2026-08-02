import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
type UploadPreview = { data: { batchId: string; preview: { rows: Array<{ rowNumber: number; teacherName: string; sourceTeacherRef: string }>; totals: { rows: number; teachers: number; newTeachers: number; invalidRows: number }; teacherMatches: Array<{ sourceTeacherRef: string; sourceName: string; sourceEmployeeCode?: string; status: string; teacherId?: string; resolvedTeacherIdentifier?: string; candidates?: Array<{ id: string; name: string }>; workload?: number }>; duplicateRows: number[]; invalidRows: Array<{ rowNumber: number; message: string }>; warnings: string[]; blockingErrors: string[] } } };

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

test("teachers differing only by case require explicit selection without employee codes", async () => {
  await prisma.teacher.createMany({ data: [
    { schoolId: SCHOOL_ID, name: "Ehsan Ul Haq", employeeCode: "BULK-01", teachingLevel: "BOTH", baseWeeklyTeachingPeriods: 28 },
    { schoolId: SCHOOL_ID, name: "Ehsan ul Haq", employeeCode: "BULK-02", teachingLevel: "BOTH", baseWeeklyTeachingPeriods: 27 },
  ], skipDuplicates: true });
  const csv = [
    "day,period,class,teacher,subject,subjectCode,workload",
    "1,4,9A,Ehsan Ul Haq,Biology,BIO,28",
    "1,4,9B,Ehsan ul Haq,Chemistry,CHEM,27",
  ].join("\n");
  const response = await upload("case-distinct-teachers.csv", csv, "text/csv");
  assert.equal(response.status, 201);
  const body = (await response.json()) as UploadPreview;
  assert.equal(body.data.preview.blockingErrors.length, 2);
  assert.deepEqual(body.data.preview.duplicateRows, []);
  const matches = body.data.preview.teacherMatches;
  assert.equal(matches.length, 2);
  assert.notEqual(matches[0]!.sourceTeacherRef, matches[1]!.sourceTeacherRef);
  assert.ok(matches.every((match) => match.status === "ambiguous" && match.candidates?.length === 2 && !match.teacherId));
  const upperId = matches[0]!.candidates!.find((candidate) => candidate.name === "Ehsan Ul Haq")!.id;
  const collapsedMappings = matches.map((match) => ({ sourceTeacherRef: match.sourceTeacherRef, sourceTeacherName: match.sourceName, resolvedTeacherId: upperId }));
  const collapsed = await fetch(`${baseUrl}/api/v1/timetable-imports/${body.data.batchId}/confirm`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ confirmReplace: true, confirmTeacherUpdates: true, teacherMappings: collapsedMappings }) });
  assert.equal(collapsed.status, 400);
  assert.match(JSON.stringify(await collapsed.json()), /Teacher double-booking/);
});

test("employee codes resolve case-distinct teachers without false double-booking", async () => {
  const csv = [
    "day,period,class,teacher,employeeCode,subject,subjectCode,workload",
    "1,4,9A,Ehsan Ul Haq,BULK-01,Biology,BIO,28",
    "1,4,9B,Ehsan ul Haq,BULK-02,Chemistry,CHEM,27",
  ].join("\n");
  const body = (await (await upload("employee-coded-teachers.csv", csv, "text/csv")).json()) as UploadPreview;
  assert.deepEqual(body.data.preview.blockingErrors, []);
  const matches = body.data.preview.teacherMatches;
  assert.ok(matches.every((match) => match.status === "matched" && match.teacherId));
  assert.notEqual(matches[0]!.teacherId, matches[1]!.teacherId);
  assert.deepEqual(matches.map((match) => match.sourceEmployeeCode), ["BULK-01", "BULK-02"]);
});

test("an exact teacher ID remains authoritative over a conflicting employee code", async () => {
  const target = await prisma.teacher.findFirstOrThrow({ where: { schoolId: SCHOOL_ID, employeeCode: "BULK-01" } });
  const csv = [
    "day,period,class,teacher,teacherId,employeeCode,subject,subjectCode,workload",
    `1,5,9A,Ehsan ul Haq,${target.id},BULK-02,Biology,BIO,28`,
  ].join("\n");
  const body = (await (await upload("teacher-id-authoritative.csv", csv, "text/csv")).json()) as UploadPreview;
  assert.deepEqual(body.data.preview.blockingErrors, []);
  assert.equal(body.data.preview.teacherMatches[0]!.teacherId, target.id);
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
  const teachers = Array.from({ length: 30 }, (_, index) => ({
    schoolId: SCHOOL_ID,
    name: index === 0 ? "Ehsan Ul Haq" : index === 1 ? "Ehsan ul Haq" : `Bulk Teacher ${String(index + 1).padStart(2, "0")}`,
    employeeCode: `BULK-${String(index + 1).padStart(2, "0")}`,
    teachingLevel: "BOTH" as const,
    baseWeeklyTeachingPeriods: index === 0 ? 28 : index === 1 ? 27 : index + 10,
  }));
  await prisma.teacher.createMany({ data: teachers, skipDuplicates: true });
  const cachedBeforeImport = await fetch(`${baseUrl}/api/v1/timetable/grid?view=class`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(cachedBeforeImport.status, 200);
  await prisma.teacher.createMany({ data: Array.from({ length: 28 }, (_, index) => ({ schoolId: SCHOOL_ID, name: `Regression Teacher ${String(index + 3).padStart(2, "0")}`, employeeCode: `REG-${String(index + 3).padStart(2, "0")}`, teachingLevel: "BOTH" as const, baseWeeklyTeachingPeriods: 10 + ((index + 3) % 15) })), skipDuplicates: true });
  const rawCsv = await readFile(new URL("./fixtures/timetable-import-800-case-distinct.csv", import.meta.url), "utf8");
  const csv = rawCsv.split(/\r?\n/).map((line, index) => !line ? line : index === 0 ? `${line},employeeCode` : `${line},${line.includes(",Ehsan Ul Haq,") ? "BULK-01" : line.includes(",Ehsan ul Haq,") ? "BULK-02" : ""}`).join("\n");
  const response = await upload("official-800.csv", csv, "text/csv");
  assert.equal(response.status, 201);
  const body = (await response.json()) as UploadPreview;
  assert.equal(body.data.preview.totals.rows, 800);
  assert.equal(body.data.preview.totals.teachers, 30);
  assert.equal(body.data.preview.invalidRows.length, 0);
  assert.deepEqual(body.data.preview.blockingErrors, []);
  assert.deepEqual(body.data.preview.duplicateRows, []);
  assert.ok(body.data.preview.warnings.some((warning) => warning.startsWith("Parallel assignments detected")));
  const upper = body.data.preview.teacherMatches.find((match) => match.sourceName === "Ehsan Ul Haq")!;
  const lower = body.data.preview.teacherMatches.find((match) => match.sourceName === "Ehsan ul Haq")!;
  assert.equal(upper.workload, 28); assert.equal(lower.workload, 27);
  assert.notEqual(upper.sourceTeacherRef, lower.sourceTeacherRef);
  assert.notEqual(upper.teacherId, lower.teacherId);
  assert.ok(body.data.preview.rows.some((row) => row.rowNumber === 7 && row.teacherName === "Ehsan Ul Haq" && row.sourceTeacherRef === upper.sourceTeacherRef));
  assert.ok(body.data.preview.rows.some((row) => row.rowNumber === 75 && row.teacherName === "Ehsan ul Haq" && row.sourceTeacherRef === lower.sourceTeacherRef));
  const stored = await prisma.timetableImportBatch.findUniqueOrThrow({ where: { id: body.data.batchId }, select: { preview: true } });
  const reloadedMatches = (stored.preview as { teacherMatches: Array<{ sourceTeacherRef: string }> }).teacherMatches;
  assert.deepEqual(reloadedMatches.map((match) => match.sourceTeacherRef), body.data.preview.teacherMatches.map((match) => match.sourceTeacherRef));
  const teacherMappings = body.data.preview.teacherMatches.map((match) => ({ sourceTeacherRef: match.sourceTeacherRef, sourceTeacherName: match.sourceName, resolvedTeacherId: match.teacherId }));
  assert.equal(teacherMappings.length, 30);

  const confirmed = await fetch(`${baseUrl}/api/v1/timetable-imports/${body.data.batchId}/confirm`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmReplace: true, confirmTeacherUpdates: true, teacherMappings }),
  });
  assert.equal(confirmed.status, 200);
  assert.equal(await prisma.masterTimetable.count({ where: { schoolId: SCHOOL_ID } }), 800);
  const refreshedGrid = (await (await fetch(`${baseUrl}/api/v1/timetable/grid?view=class`, { headers: { Authorization: `Bearer ${token}` } })).json()) as { data: { grid: { entries: unknown[] } } };
  assert.equal(refreshedGrid.data.grid.entries.length, 800);
  const preservedWorkloads = await prisma.teacher.findMany({ where: { schoolId: SCHOOL_ID, employeeCode: { startsWith: "BULK-" } }, select: { name: true, baseWeeklyTeachingPeriods: true } });
  assert.equal(preservedWorkloads.find((teacher) => teacher.name === "Ehsan Ul Haq")?.baseWeeklyTeachingPeriods, 28);
  assert.equal(preservedWorkloads.find((teacher) => teacher.name === "Ehsan ul Haq")?.baseWeeklyTeachingPeriods, 27);
});

test("confirmation blocks a genuinely shared resolved teacher that is double-booked", async () => {
  const shared = await prisma.teacher.create({ data: { schoolId: SCHOOL_ID, name: "Shared Resolution Teacher", employeeCode: "SHARED-RES", teachingLevel: "BOTH", baseWeeklyTeachingPeriods: 12 } });
  const csv = ["day,period,class,teacher,subject,subjectCode,workload", "1,4,9A,Unmatched Alias A,Biology,BIO-A,12", "1,4,9B,Unmatched Alias B,Chemistry,CHEM-B,12"].join("\n");
  const body = (await (await upload("shared-resolution.csv", csv, "text/csv")).json()) as UploadPreview;
  assert.deepEqual(body.data.preview.blockingErrors, []);
  const teacherMappings = body.data.preview.teacherMatches.map((match) => ({ sourceTeacherRef: match.sourceTeacherRef, sourceTeacherName: match.sourceName, resolvedTeacherId: shared.id }));
  const confirmed = await fetch(`${baseUrl}/api/v1/timetable-imports/${body.data.batchId}/confirm`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ confirmReplace: true, confirmTeacherUpdates: true, teacherMappings }) });
  assert.equal(confirmed.status, 400);
  assert.match(JSON.stringify(await confirmed.json()), /Teacher double-booking/);
});
