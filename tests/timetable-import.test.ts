import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { resolve } from "node:path";

import { importOfficialTimetableRecords } from "../src/modules/timetable-import/official-timetable-import.service.js";
import type {
  GeneratedTimetableRecord,
  TimetableValidationReport,
} from "../src/modules/timetable-import/timetable-import.types.js";
import { validateTimetableRecords } from "../src/modules/timetable-import/timetable-import.validator.js";
import {
  expandDayExpression,
  normalizeSubjectCode,
  normalizeTeacherKey,
  parseClassTimetableText,
  resolveTeacherName,
} from "../src/modules/timetable-import/timetable-pdf.parser.js";
import { prisma } from "../src/prisma/client.js";

const SCHOOL_ID = "official-timetable-import-test";

const record = (
  overrides: Partial<GeneratedTimetableRecord> = {},
): GeneratedTimetableRecord => ({
  dayOfWeek: "MONDAY",
  periodNumber: 1,
  className: "Class 1-A",
  teacherName: "Sajid Tabbassum",
  subjectCode: "URDU",
  sourcePage: 1,
  sourceCellText: "URDU (1)\nSajid Tabbassum",
  ...overrides,
});

test("generic day expressions expand to weekdays", () => {
  assert.deepEqual(expandDayExpression("1-5"), [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
  ]);
  assert.deepEqual(expandDayExpression("1,2,3,4"), [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
  ]);
  assert.deepEqual(expandDayExpression("1,3,5"), [
    "MONDAY",
    "WEDNESDAY",
    "FRIDAY",
  ]);
  assert.deepEqual(expandDayExpression("2,4"), ["TUESDAY", "THURSDAY"]);
  assert.deepEqual(expandDayExpression("1-2,4-5"), [
    "MONDAY",
    "TUESDAY",
    "THURSDAY",
    "FRIDAY",
  ]);
  assert.deepEqual(expandDayExpression("3-5"), [
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
  ]);
});

test("multiple groups in one lesson cell are parsed separately", () => {
  const text = [
    "FG Public School - Class Timetable",
    "Class  Lesson 1         Lesson 2          Lesson 3          Lesson 4         Lesson 5         Lesson 6         Lesson 7          Lesson 8",
    "1A     COMP (1,3,5)",
    "       Sajid Tabbassum",
    "       ECA (2,4)",
    "       Muhammad Jameel",
  ].join("\n");
  const parsed = parseClassTimetableText(text);
  assert.equal(parsed.malformedCells.length, 0);
  assert.equal(parsed.records.length, 5);
  assert.deepEqual(
    [...new Set(parsed.records.map((item) => item.teacherName))].sort(),
    ["Muhammad Jameel", "Sajid Tabbassum"],
  );
});

test("subject aliases and teacher names normalize canonically", () => {
  assert.equal(normalizeSubjectCode("G.SCIENCE"), "GSC");
  assert.equal(normalizeSubjectCode("P.ST"), "PST");
  assert.equal(normalizeSubjectCode("CCA/ECC A"), "ECA");
  assert.equal(normalizeSubjectCode("ISL+N"), "ISL");
  assert.equal(
    normalizeTeacherKey(" Mr.   M. Aamir "),
    normalizeTeacherKey("Muhammad Aamir"),
  );
  assert.equal(resolveTeacherName("Mr. M. Aamir"), "Muhammad Aamir");
});

test("validation detects duplicates, teacher conflicts, and class conflicts", () => {
  const duplicate = record();
  const teacherConflict = record({
    className: "Class 2-A",
    subjectCode: "ENG",
    sourceCellText: "ENG (1)\nSajid Tabbassum",
  });
  const classConflict = record({
    teacherName: "Muhammad Jameel",
    subjectCode: "ECA",
    sourceCellText: "ECA (1)\nMuhammad Jameel",
  });
  const records = [duplicate, duplicate, teacherConflict, classConflict];
  const result = validateTimetableRecords("test.pdf", records, {
    parsedGroups: 4,
    sourcePages: [1, 2, 3],
    malformedCells: [],
    unmatchedTeachers: [],
    unmatchedSubjects: [],
    unmatchedClasses: [],
  });
  assert.equal(result.duplicateRows.length, 1);
  assert.equal(result.teacherConflicts.length, 1);
  assert.equal(result.classConflicts.length, 1);
  assert.equal(result.valid, false);
});

before(async () => {
  await prisma.school.deleteMany({ where: { id: SCHOOL_ID } });
  await prisma.school.create({
    data: {
      id: SCHOOL_ID,
      name: "Official Timetable Import Test",
      academicYear: "2026",
    },
  });
});

after(async () => {
  await prisma.school.deleteMany({ where: { id: SCHOOL_ID } });
  await prisma.$disconnect();
});

test("official timetable import is idempotent", async () => {
  const sourceDirectory = [
    resolve(import.meta.dirname, "../source-data"),
    resolve(import.meta.dirname, "../../SchoolFixtureSystem/source-data"),
    resolve(import.meta.dirname, "../../../source-data"),
  ].find(existsSync);
  assert.ok(sourceDirectory, "Official timetable source data was not found");
  const records = JSON.parse(
    await readFile(
      resolve(sourceDirectory, "generated-current-timetable.json"),
      "utf8",
    ),
  ) as GeneratedTimetableRecord[];
  const validation = JSON.parse(
    await readFile(
      resolve(sourceDirectory, "generated-current-timetable-validation.json"),
      "utf8",
    ),
  ) as TimetableValidationReport;
  await importOfficialTimetableRecords(SCHOOL_ID, records, validation, prisma);
  await importOfficialTimetableRecords(SCHOOL_ID, records, validation, prisma);
  assert.equal(
    await prisma.masterTimetable.count({ where: { schoolId: SCHOOL_ID } }),
    800,
  );
  assert.equal(
    await prisma.teacher.count({
      where: { schoolId: SCHOOL_ID, isActive: true },
    }),
    30,
  );
  const workloads = await prisma.teacher.findMany({
    where: {
      schoolId: SCHOOL_ID,
      name: {
        in: [
          "Azhar Abbas",
          "Muhammad Talha",
          "Zahid Nadeem",
          "Muhammad Jameel",
          "Shahzad Memon",
        ],
      },
    },
    select: { name: true, baseWeeklyTeachingPeriods: true },
  });
  assert.deepEqual(
    Object.fromEntries(
      workloads.map((teacher) => [
        teacher.name,
        teacher.baseWeeklyTeachingPeriods,
      ]),
    ),
    {
      "Azhar Abbas": 15,
      "Muhammad Talha": 32,
      "Zahid Nadeem": 26,
      "Muhammad Jameel": 20,
      "Shahzad Memon": 0,
    },
  );
});
