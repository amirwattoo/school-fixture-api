import {
  OFFICIAL_CLASSES,
  OFFICIAL_SUBJECTS,
  OFFICIAL_TEACHER_NAMES,
} from "./timetable-import.constants.js";
import {
  normalizeClassKey,
  normalizeSubjectCode,
  resolveTeacherName,
} from "./timetable-pdf.parser.js";
import type {
  GeneratedTimetableRecord,
  TimetableConflict,
  TimetableValidationReport,
  UnmatchedValue,
} from "./timetable-import.types.js";

const recordKey = (record: GeneratedTimetableRecord) =>
  [
    record.dayOfWeek,
    record.periodNumber,
    record.className,
    record.teacherName,
    record.subjectCode,
  ].join("|");

const conflictsFor = (
  records: GeneratedTimetableRecord[],
  keyFor: (record: GeneratedTimetableRecord) => string,
  allowParallelSourceCell = false,
): TimetableConflict[] => {
  const groups = new Map<string, GeneratedTimetableRecord[]>();
  for (const record of records) {
    const key = keyFor(record);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.entries()]
    .filter(([, items]) => {
      if (items.length <= 1) return false;
      if (!allowParallelSourceCell) return true;
      const first = items[0]!;
      return !items.every(
        (item) =>
          item.sourcePage === first.sourcePage &&
          item.sourceCellText === first.sourceCellText,
      );
    })
    .map(([key, items]) => ({ key, records: items }));
};

const unmatchedFromRecords = (
  records: GeneratedTimetableRecord[],
  type: "teacher" | "subject" | "class",
): UnmatchedValue[] =>
  records.flatMap((record) => {
    const value =
      type === "teacher"
        ? record.teacherName
        : type === "subject"
          ? record.subjectCode
          : record.className;
    const matched =
      type === "teacher"
        ? Boolean(resolveTeacherName(value))
        : type === "subject"
          ? Boolean(normalizeSubjectCode(value))
          : Boolean(normalizeClassKey(value));
    return matched
      ? []
      : [
          {
            value,
            sourcePage: record.sourcePage,
            className: record.className,
            periodNumber: record.periodNumber,
            sourceCellText: record.sourceCellText,
            reason: `Generated ${type} is not canonical`,
          },
        ];
  });

export const validateTimetableRecords = (
  sourcePdf: string,
  records: GeneratedTimetableRecord[],
  parserDiagnostics: {
    parsedGroups: number;
    sourcePages: number[];
    malformedCells: UnmatchedValue[];
    unmatchedTeachers: UnmatchedValue[];
    unmatchedSubjects: UnmatchedValue[];
    unmatchedClasses: UnmatchedValue[];
  },
): TimetableValidationReport => {
  const seen = new Set<string>();
  const duplicateRows: GeneratedTimetableRecord[] = [];
  const uniqueRows: GeneratedTimetableRecord[] = [];
  for (const record of records) {
    const key = recordKey(record);
    if (seen.has(key)) duplicateRows.push(record);
    else {
      seen.add(key);
      uniqueRows.push(record);
    }
  }
  const classConflicts = conflictsFor(
    uniqueRows,
    (record) =>
      `${record.dayOfWeek}|${record.periodNumber}|${record.className}`,
    true,
  );
  const teacherConflicts = conflictsFor(
    uniqueRows,
    (record) =>
      `${record.dayOfWeek}|${record.periodNumber}|${record.teacherName}`,
  ).filter((conflict) => new Set(conflict.records.map((record) => record.className)).size > 1);
  const unmatchedTeachers = [
    ...parserDiagnostics.unmatchedTeachers,
    ...unmatchedFromRecords(records, "teacher"),
  ];
  const unmatchedSubjects = [
    ...parserDiagnostics.unmatchedSubjects,
    ...unmatchedFromRecords(records, "subject"),
  ];
  const unmatchedClasses = [
    ...parserDiagnostics.unmatchedClasses,
    ...unmatchedFromRecords(records, "class"),
  ];
  const valid =
    parserDiagnostics.sourcePages.length === 3 &&
    duplicateRows.length === 0 &&
    teacherConflicts.length === 0 &&
    unmatchedTeachers.length === 0 &&
    unmatchedSubjects.length === 0 &&
    unmatchedClasses.length === 0 &&
    parserDiagnostics.malformedCells.length === 0 &&
    OFFICIAL_TEACHER_NAMES.length === 30 &&
    OFFICIAL_CLASSES.length === 21 &&
    OFFICIAL_SUBJECTS.length === 15;
  return {
    sourcePdf,
    sourcePages: parserDiagnostics.sourcePages,
    parsedGroups: parserDiagnostics.parsedGroups,
    parsedRows: records.length,
    uniqueRows: uniqueRows.length,
    duplicateRows,
    classConflicts,
    teacherConflicts,
    unmatchedTeachers,
    unmatchedSubjects,
    unmatchedClasses,
    malformedCells: parserDiagnostics.malformedCells,
    valid,
  };
};
