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
