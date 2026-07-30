import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

import type { DayOfWeek } from "@prisma/client";

import {
  OFFICIAL_CLASSES,
  OFFICIAL_SUBJECTS,
  OFFICIAL_TEACHER_NAMES,
  PDF_TEACHER_ALIASES,
  SUBJECT_ALIASES,
} from "./timetable-import.constants.js";
import type {
  GeneratedTimetableRecord,
  UnmatchedValue,
} from "./timetable-import.types.js";

const DAY_BY_NUMBER: Record<number, DayOfWeek> = {
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
};

const normalizeSpaces = (value: string) => value.trim().replace(/\s+/g, " ");

export const expandDayExpression = (expression: string): DayOfWeek[] => {
  const numbers: number[] = [];
  for (const part of expression.replace(/\s+/g, "").split(",")) {
    if (!part) throw new Error(`Invalid empty day in "${expression}"`);
    const range = /^([1-5])-([1-5])$/.exec(part);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start > end) throw new Error(`Invalid day range "${part}"`);
      for (let day = start; day <= end; day += 1) numbers.push(day);
      continue;
    }
    if (!/^[1-5]$/.test(part)) throw new Error(`Invalid day value "${part}"`);
    numbers.push(Number(part));
  }
  return [...new Set(numbers)]
    .sort((left, right) => left - right)
    .map((number) => DAY_BY_NUMBER[number]!);
};

export const normalizeTeacherKey = (value: string) =>
  normalizeSpaces(value)
    .toLocaleLowerCase("en")
    .replace(/\b(?:mr|sir)\.?\s+/g, "")
    .replace(/\./g, "")
    .replace(/^m\s+/, "muhammad ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const officialTeacherByKey = new Map(
  OFFICIAL_TEACHER_NAMES.map((name) => [normalizeTeacherKey(name), name]),
);
const teacherAliasByKey = new Map(
  Object.entries(PDF_TEACHER_ALIASES).map(([alias, name]) => [
    normalizeTeacherKey(alias),
    name,
  ]),
);

const searchableTeacherNames = [
  ...OFFICIAL_TEACHER_NAMES.map((name) => ({ source: name, canonical: name })),
  ...Object.entries(PDF_TEACHER_ALIASES).map(([source, canonical]) => ({
    source,
    canonical,
  })),
].sort((left, right) => right.source.length - left.source.length);

const teachersOnLine = (line: string) => {
  const lowerLine = line.toLocaleLowerCase("en");
  const matches: Array<{ index: number; name: string; length: number }> = [];
  for (const candidate of searchableTeacherNames) {
    const source = candidate.source.toLocaleLowerCase("en");
    let index = lowerLine.indexOf(source);
    while (index >= 0) {
      if (
        !matches.some(
          (match) =>
            index < match.index + match.length &&
            index + candidate.source.length > match.index,
        )
      ) {
        matches.push({
          index,
          name: candidate.canonical,
          length: candidate.source.length,
        });
      }
      index = lowerLine.indexOf(source, index + source.length);
    }
  }
  return matches.sort((left, right) => left.index - right.index);
};

export const resolveTeacherName = (value: string) =>
  officialTeacherByKey.get(normalizeTeacherKey(value)) ??
  teacherAliasByKey.get(normalizeTeacherKey(value));

export const normalizeSubjectCode = (value: string) => {
  const key = normalizeSpaces(value).toUpperCase();
  const canonicalCodes = new Set(OFFICIAL_SUBJECTS.map(([code]) => code));
  const normalized = SUBJECT_ALIASES[key] ?? key;
  return canonicalCodes.has(normalized as (typeof OFFICIAL_SUBJECTS)[number][0])
    ? normalized
    : undefined;
};

export const normalizeClassKey = (value: string) => {
  const key = value
    .toUpperCase()
    .replace(/^CLASS\s+/, "")
    .replace(/[\s-]/g, "");
  return OFFICIAL_CLASSES.some((item) => item.key === key) ? key : undefined;
};

const pdfTextExecutable = () => {
  const candidates = [
    process.env.PDFTOTEXT_PATH,
    "pdftotext.exe",
    "pdftotext",
    "C:\\Program Files\\Git\\mingw64\\bin\\pdftotext.exe",
  ].filter((item): item is string => Boolean(item));
  for (const candidate of candidates) {
    if (candidate.includes("\\") && !existsSync(candidate)) continue;
    const result = spawnSync(candidate, ["-v"], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (!result.error) return candidate;
  }
  throw new Error(
    "pdftotext is required. Set PDFTOTEXT_PATH to the Xpdf executable.",
  );
};

export const extractClassTimetableText = (pdfPath: string) => {
  const result = spawnSync(
    pdfTextExecutable(),
    ["-f", "1", "-l", "3", "-table", "-enc", "UTF-8", pdfPath, "-"],
    {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `PDF extraction failed: ${normalizeSpaces(result.stderr || "unknown error")}`,
    );
  }
  return result.stdout;
};

type ParseResult = {
  records: GeneratedTimetableRecord[];
  malformedCells: UnmatchedValue[];
  unmatchedTeachers: UnmatchedValue[];
  unmatchedSubjects: UnmatchedValue[];
  unmatchedClasses: UnmatchedValue[];
  parsedGroups: number;
  sourcePages: number[];
};

const subjectPattern = /^(.+?)\s*\(([\d,\-\s]+)\)$/;
const classPattern = /^\s*((?:[1-9]|1[0-2])[A-B]?|HIFZ)(?=\s|$)/;

export const parseClassTimetableText = (text: string): ParseResult => {
  const records: GeneratedTimetableRecord[] = [];
  const malformedCells: UnmatchedValue[] = [];
  const unmatchedTeachers: UnmatchedValue[] = [];
  const unmatchedSubjects: UnmatchedValue[] = [];
  const unmatchedClasses: UnmatchedValue[] = [];
  const sourcePages: number[] = [];
  let parsedGroups = 0;

  const pages = text
    .split(String.fromCharCode(12))
    .filter((page) => /Class\s+Timetable/.test(page));
  pages.forEach((page, pageIndex) => {
    const sourcePage = pageIndex + 1;
    const lines = page.split(/\r?\n/);
    const headerIndex = lines.findIndex(
      (line) => line.includes("Class") && line.includes("Lesson 8"),
    );
    if (headerIndex < 0) return;
    sourcePages.push(sourcePage);
    const header = lines[headerIndex]!;
    const columnStarts = [...header.matchAll(/Lesson\s+[1-8]/g)].map(
      (match) => match.index!,
    );
    if (columnStarts.length !== 8) {
      throw new Error(
        `Expected eight lesson columns on PDF page ${sourcePage}`,
      );
    }

    const content = lines.slice(headerIndex + 1);
    const classRows = content
      .map((line, index) => ({ index, match: classPattern.exec(line) }))
      .filter(
        (
          item,
        ): item is {
          index: number;
          match: RegExpExecArray;
        } => Boolean(item.match),
      );

    classRows.forEach((row, rowIndex) => {
      const rawClass = row.match[1]!;
      const classKey = normalizeClassKey(rawClass);
      const nextClassIndex = classRows[rowIndex + 1]?.index ?? content.length;
      const footerIndex = content.findIndex(
        (line, index) =>
          index > row.index &&
          (line.includes("Timetable Incharge") ||
            line.includes("Principal,") ||
            line.includes("©")),
      );
      const end =
        footerIndex >= 0
          ? Math.min(nextClassIndex, footerIndex)
          : nextClassIndex;
      const block = content.slice(row.index, end);
      if (!classKey) {
        unmatchedClasses.push({
          value: rawClass,
          sourcePage,
          className: rawClass,
          periodNumber: 0,
          sourceCellText: block.join("\n").trim(),
          reason: "Class is not in the official class list",
        });
        return;
      }
      const className =
        OFFICIAL_CLASSES.find((item) => item.key === classKey)?.name ??
        classKey;

      const tokensByLesson: string[][] = columnStarts.map(() => []);
      for (const line of block) {
        const teacherMatches = teachersOnLine(line);
        if (teacherMatches.length) {
          for (const match of teacherMatches) {
            let nominalLesson = 0;
            columnStarts.forEach((start, index) => {
              if (start <= match.index) nominalLesson = index;
            });
            const pendingLessons = tokensByLesson
              .map((tokens, index) => ({
                index,
                last: tokens[tokens.length - 1],
              }))
              .filter(
                (item) =>
                  item.last !== undefined && subjectPattern.test(item.last),
              )
              .sort(
                (left, right) =>
                  Math.abs(left.index - nominalLesson) -
                  Math.abs(right.index - nominalLesson),
              );
            const targetLesson =
              pendingLessons.find((item) => item.index === nominalLesson)
                ?.index ?? pendingLessons[0]?.index;
            if (targetLesson !== undefined) {
              tokensByLesson[targetLesson]!.push(match.name);
            }
          }
          continue;
        }
        columnStarts.forEach((start, lessonIndex) => {
          const finish = columnStarts[lessonIndex + 1];
          const token = normalizeSpaces(
            finish === undefined
              ? line.slice(start)
              : line.slice(start, finish),
          );
          if (token) {
            tokensByLesson[lessonIndex]!.push(token);
          }
        });
      }

      tokensByLesson.forEach((tokens, lessonIndex) => {
        if (!tokens.length) return;
        const sourceCellText = tokens.join("\n");
        for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
          const subjectMatch = subjectPattern.exec(tokens[tokenIndex]!);
          if (!subjectMatch) {
            malformedCells.push({
              value: tokens[tokenIndex]!,
              sourcePage,
              className,
              periodNumber: lessonIndex + 1,
              sourceCellText,
              reason: "Expected a subject with a bracketed day expression",
            });
            continue;
          }
          const teacherToken = tokens[tokenIndex + 1];
          if (!teacherToken || subjectPattern.test(teacherToken)) {
            malformedCells.push({
              value: tokens[tokenIndex]!,
              sourcePage,
              className,
              periodNumber: lessonIndex + 1,
              sourceCellText,
              reason: "Subject group has no following teacher name",
            });
            continue;
          }
          tokenIndex += 1;
          const subjectCode = normalizeSubjectCode(subjectMatch[1]!);
          const teacherName = resolveTeacherName(teacherToken);
          if (!subjectCode) {
            unmatchedSubjects.push({
              value: subjectMatch[1]!,
              sourcePage,
              className,
              periodNumber: lessonIndex + 1,
              sourceCellText,
              reason: "Subject is not in the canonical subject list",
            });
            continue;
          }
          if (!teacherName) {
            unmatchedTeachers.push({
              value: teacherToken,
              sourcePage,
              className,
              periodNumber: lessonIndex + 1,
              sourceCellText,
              reason: "Teacher is not in the official teacher list",
            });
            continue;
          }
          try {
            const days = expandDayExpression(subjectMatch[2]!);
            parsedGroups += 1;
            for (const dayOfWeek of days) {
              records.push({
                dayOfWeek,
                periodNumber: lessonIndex + 1,
                className,
                teacherName,
                subjectCode,
                sourcePage,
                sourceCellText,
              });
            }
          } catch (error) {
            malformedCells.push({
              value: subjectMatch[2]!,
              sourcePage,
              className,
              periodNumber: lessonIndex + 1,
              sourceCellText,
              reason:
                error instanceof Error
                  ? error.message
                  : "Invalid day expression",
            });
          }
        }
      });
    });
  });

  return {
    records,
    malformedCells,
    unmatchedTeachers,
    unmatchedSubjects,
    unmatchedClasses,
    parsedGroups,
    sourcePages,
  };
};
