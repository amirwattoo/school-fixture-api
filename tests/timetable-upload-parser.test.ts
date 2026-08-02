import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTimetableCsv } from "../src/modules/timetable-import/timetable-upload.service.js";

test("CSV day ranges and workload columns parse without database work", () => {
  const parsed = parseTimetableCsv(Buffer.from("day,period,class,teacher,subject,subjectCode,workload\n1-5,2,1-A,Teacher One,Mathematics,MATH,18"));
  assert.equal(parsed.invalidRows.length, 0);
  assert.equal(parsed.rows.length, 5);
  assert.ok(parsed.rows.every((row) => row.workload === 18));
});

test("official 1,2,3,4 and 1-5 conventions expand correctly from CSV", () => {
  const csv = 'day,period,class,teacher,subject\n"1,2,3,4",1,1-A,Teacher One,Math\n1-5,2,1-A,Teacher Two,English';
  const parsed = parseTimetableCsv(Buffer.from(csv));
  assert.deepEqual(parsed.rows.slice(0, 4).map((row) => row.dayOfWeek), ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"]);
  assert.deepEqual(parsed.rows.slice(4).map((row) => row.dayOfWeek), ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
});

test("malformed CSV rows are reported instead of imported", () => {
  const parsed = parseTimetableCsv(Buffer.from("day,period,class,teacher,subject\n9,zero,,,"));
  assert.equal(parsed.rows.length, 0); assert.equal(parsed.invalidRows.length, 1);
});
