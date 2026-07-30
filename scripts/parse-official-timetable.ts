import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  extractClassTimetableText,
  parseClassTimetableText,
} from "../src/modules/timetable-import/timetable-pdf.parser.js";
import { validateTimetableRecords } from "../src/modules/timetable-import/timetable-import.validator.js";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const sourceDirectory = resolve(repositoryRoot, "source-data");
const pdfPath = resolve(sourceDirectory, "Timetable w e f 7-4-26.pdf");
const outputPath = resolve(sourceDirectory, "generated-current-timetable.json");
const reportPath = resolve(
  sourceDirectory,
  "generated-current-timetable-validation.json",
);

const text = extractClassTimetableText(pdfPath);
const extractionDiagnostics = {
  characters: text.length,
  formFeeds: [...text].filter((value) => value.charCodeAt(0) === 12).length,
  literalFormFeeds: text.split("\\f").length - 1,
  classHeadings: text.match(/Class\s+Timetable/g)?.length ?? 0,
  pageSegments: text
    .split(String.fromCharCode(12))
    .map((page) => page.match(/Class\s+Timetable/g)?.length ?? 0),
  headerLines: text
    .split(String.fromCharCode(12))
    .map((page) =>
      page
        .split(/\r?\n/)
        .findIndex(
          (line) => line.includes("Class") && line.includes("Lesson 8"),
        ),
    ),
};
const parsed = parseClassTimetableText(text);
const report = validateTimetableRecords(pdfPath, parsed.records, parsed);

await mkdir(sourceDirectory, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(parsed.records, null, 2)}\n`);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      outputPath,
      reportPath,
      extractionDiagnostics,
      sourcePages: report.sourcePages,
      parsedGroups: report.parsedGroups,
      parsedRows: report.parsedRows,
      duplicates: report.duplicateRows.length,
      classConflicts: report.classConflicts.length,
      teacherConflicts: report.teacherConflicts.length,
      unmatchedTeachers: report.unmatchedTeachers.length,
      unmatchedSubjects: report.unmatchedSubjects.length,
      unmatchedClasses: report.unmatchedClasses.length,
      malformedCells: report.malformedCells.length,
      valid: report.valid,
    },
    null,
    2,
  ),
);

if (!report.valid) process.exitCode = 2;
