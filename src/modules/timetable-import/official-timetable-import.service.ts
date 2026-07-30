import { readFile } from "node:fs/promises";

import { Prisma } from "@prisma/client";
import type { PrismaClient, TeachingLevel } from "@prisma/client";

import { prisma } from "../../prisma/client.js";
import {
  OFFICIAL_CLASSES,
  OFFICIAL_SUBJECTS,
  OFFICIAL_WEEKLY_TEACHING_PERIODS,
  officialTeachers,
} from "./timetable-import.constants.js";
import type {
  GeneratedTimetableRecord,
  TimetableValidationReport,
} from "./timetable-import.types.js";
import { normalizeTeacherKey } from "./timetable-pdf.parser.js";

const seededPlaceholderNames = new Set(
  [
    "Muhammad Ahmed",
    "Ayesha Khan",
    "Ali Raza",
    "Fatima Noor",
    "Usman Tariq",
    "Sana Iqbal",
    "Bilal Hussain",
    "Maryam Siddiqui",
    "Hassan Mahmood",
    "Zainab Akhtar",
  ].map(normalizeTeacherKey),
);

type ImportClient = Pick<PrismaClient, "$transaction" | "school">;

const runSerializableImport = async <T>(
  client: ImportClient,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await client.$transaction(callback, {
        maxWait: 20_000,
        timeout: 120_000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 3
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Official timetable import transaction failed");
};

export type OfficialTimetableImportSummary = {
  teachersCreated: number;
  teachersUpdated: number;
  placeholdersDisabled: number;
  classesCreated: number;
  classesUpdated: number;
  subjectsCreated: number;
  subjectsUpdated: number;
  previousTimetableRows: number;
  importedTimetableRows: number;
};

const teachingLevelFor = (levels: Set<TeachingLevel>): TeachingLevel => {
  if (levels.has("BOTH") || (levels.has("LOWER") && levels.has("HIGHER"))) {
    return "BOTH";
  }
  return levels.has("HIGHER") ? "HIGHER" : "LOWER";
};

const assertValidatedInput = (
  records: GeneratedTimetableRecord[],
  report: TimetableValidationReport,
) => {
  if (!report.valid) {
    throw new Error(
      "Official timetable validation failed; database import was refused.",
    );
  }
  if (
    report.parsedRows !== records.length ||
    report.uniqueRows !== records.length
  ) {
    throw new Error(
      "Generated timetable and validation report row counts do not match.",
    );
  }
  const workloadCounts = new Map<string, number>();
  for (const record of records) {
    workloadCounts.set(
      record.teacherName,
      (workloadCounts.get(record.teacherName) ?? 0) + 1,
    );
  }
  const mismatches = officialTeachers.flatMap((teacher) => {
    const expected =
      OFFICIAL_WEEKLY_TEACHING_PERIODS[
        teacher.name as keyof typeof OFFICIAL_WEEKLY_TEACHING_PERIODS
      ];
    const actual = workloadCounts.get(teacher.name) ?? 0;
    return expected === actual
      ? []
      : [`${teacher.name}: official ${expected}, parsed ${actual}`];
  });
  if (mismatches.length) {
    throw new Error(
      `Official workload cross-check failed:\n${mismatches.join("\n")}`,
    );
  }
};

export const importOfficialTimetableRecords = async (
  schoolId: string,
  records: GeneratedTimetableRecord[],
  report: TimetableValidationReport,
  client: ImportClient = prisma,
): Promise<OfficialTimetableImportSummary> => {
  assertValidatedInput(records, report);
  const school = await client.school.findUnique({
    where: { id: schoolId },
    select: { id: true },
  });
  if (!school) throw new Error(`School "${schoolId}" does not exist.`);

  const preparedOfficialTeachers = officialTeachers.map((official) => {
    const assigned = records.filter(
      (record) => record.teacherName === official.name,
    );
    const levels = new Set(
      assigned.map(
        (record) =>
          OFFICIAL_CLASSES.find((item) => item.name === record.className)!
            .teachingLevel,
      ),
    );
    return {
      official,
      normalizedName: normalizeTeacherKey(official.name),
      specializations: [
        ...new Set(assigned.map((record) => record.subjectCode)),
      ].sort(),
      teachingLevel: teachingLevelFor(levels),
    };
  });
  const officialNameKeys = new Set(
    preparedOfficialTeachers.map((teacher) => teacher.normalizedName),
  );

  return runSerializableImport(client, async (tx) => {
    const summary: OfficialTimetableImportSummary = {
      teachersCreated: 0,
      teachersUpdated: 0,
      placeholdersDisabled: 0,
      classesCreated: 0,
      classesUpdated: 0,
      subjectsCreated: 0,
      subjectsUpdated: 0,
      previousTimetableRows: 0,
      importedTimetableRows: 0,
    };

    const existingTeachers = await tx.teacher.findMany({
      where: { schoolId },
    });
    const teachersByName = new Map<string, (typeof existingTeachers)[number]>();
    for (const teacher of existingTeachers) {
      const key = normalizeTeacherKey(teacher.name);
      if (teachersByName.has(key)) {
        throw new Error(
          `Multiple existing teachers normalize to "${teacher.name}"; import was refused.`,
        );
      }
      teachersByName.set(key, teacher);
    }

    for (const existing of existingTeachers) {
      if (
        /^T-\d{3}$/.test(existing.employeeCode) &&
        !officialNameKeys.has(normalizeTeacherKey(existing.name))
      ) {
        await tx.teacher.update({
          where: { id: existing.id },
          data: {
            employeeCode: `LEGACY-${existing.employeeCode}-${existing.id.slice(-6).toUpperCase()}`,
            isActive: false,
            whatsappNumber: seededPlaceholderNames.has(
              normalizeTeacherKey(existing.name),
            )
              ? null
              : existing.whatsappNumber,
          },
        });
        summary.placeholdersDisabled += 1;
      }
    }

    const teacherIds = new Map<string, string>();
    for (const { official } of preparedOfficialTeachers) {
      const existing = teachersByName.get(normalizeTeacherKey(official.name));
      if (existing) {
        const updated = await tx.teacher.update({
          where: { id: existing.id },
          data: {
            name: official.name,
            employeeCode: official.employeeCode,
            isActive: true,
          },
        });
        teacherIds.set(official.name, updated.id);
        summary.teachersUpdated += 1;
      } else {
        const created = await tx.teacher.create({
          data: {
            schoolId,
            name: official.name,
            employeeCode: official.employeeCode,
            whatsappNumber: null,
            subjectSpecializations: [],
            teachingLevel: "BOTH",
            baseWeeklyTeachingPeriods:
              OFFICIAL_WEEKLY_TEACHING_PERIODS[
                official.name as keyof typeof OFFICIAL_WEEKLY_TEACHING_PERIODS
              ],
          },
        });
        teacherIds.set(official.name, created.id);
        summary.teachersCreated += 1;
      }
    }

    const subjectIds = new Map<string, string>();
    for (const [code, name] of OFFICIAL_SUBJECTS) {
      const existing = await tx.subject.findFirst({
        where: { schoolId, OR: [{ code }, { name }] },
      });
      if (existing) {
        const updated = await tx.subject.update({
          where: { id: existing.id },
          data: { code, name, isActive: true },
        });
        subjectIds.set(code, updated.id);
        summary.subjectsUpdated += 1;
      } else {
        const created = await tx.subject.create({
          data: { schoolId, code, name },
        });
        subjectIds.set(code, created.id);
        summary.subjectsCreated += 1;
      }
    }

    const classIds = new Map<string, string>();
    for (const official of OFFICIAL_CLASSES) {
      const existing = await tx.classSection.findFirst({
        where:
          official.gradeNumber === null
            ? { schoolId, name: official.name }
            : {
                schoolId,
                gradeNumber: official.gradeNumber,
                section: official.section,
              },
      });
      if (existing) {
        const updated = await tx.classSection.update({
          where: { id: existing.id },
          data: {
            name: official.name,
            gradeNumber: official.gradeNumber,
            section: official.section,
            teachingLevel: official.teachingLevel,
            isActive: true,
          },
        });
        classIds.set(official.name, updated.id);
        summary.classesUpdated += 1;
      } else {
        const created = await tx.classSection.create({
          data: {
            schoolId,
            name: official.name,
            gradeNumber: official.gradeNumber,
            section: official.section,
            teachingLevel: official.teachingLevel,
          },
        });
        classIds.set(official.name, created.id);
        summary.classesCreated += 1;
      }
    }

    summary.previousTimetableRows = await tx.masterTimetable.count({
      where: { schoolId },
    });
    await tx.masterTimetable.deleteMany({ where: { schoolId } });
    const timetableRows = records.map((record) => ({
      schoolId,
      dayOfWeek: record.dayOfWeek,
      periodNumber: record.periodNumber,
      classSectionId: classIds.get(record.className)!,
      teacherId: teacherIds.get(record.teacherName)!,
      subjectId: subjectIds.get(record.subjectCode)!,
    }));
    if (
      timetableRows.some(
        (row) => !row.classSectionId || !row.teacherId || !row.subjectId,
      )
    ) {
      throw new Error("A validated timetable record has no database mapping.");
    }
    const created = await tx.masterTimetable.createMany({
      data: timetableRows,
    });
    summary.importedTimetableRows = created.count;

    for (const {
      official,
      specializations,
      teachingLevel,
    } of preparedOfficialTeachers) {
      await tx.teacher.update({
        where: { id: teacherIds.get(official.name)! },
        data: {
          subjectSpecializations: specializations,
          teachingLevel,
          baseWeeklyTeachingPeriods:
            OFFICIAL_WEEKLY_TEACHING_PERIODS[
              official.name as keyof typeof OFFICIAL_WEEKLY_TEACHING_PERIODS
            ],
        },
      });
    }

    await tx.auditLog.create({
      data: {
        schoolId,
        action: "OFFICIAL_TIMETABLE_IMPORTED",
        entityType: "MasterTimetable",
        details: JSON.parse(JSON.stringify(summary)) as Prisma.InputJsonValue,
      },
    });
    return summary;
  });
};

export const importOfficialTimetableFromFiles = async (
  schoolId: string,
  recordsPath: string,
  reportPath: string,
  client: ImportClient = prisma,
) => {
  const [recordsText, reportText] = await Promise.all([
    readFile(recordsPath, "utf8"),
    readFile(reportPath, "utf8"),
  ]);
  return importOfficialTimetableRecords(
    schoolId,
    JSON.parse(recordsText) as GeneratedTimetableRecord[],
    JSON.parse(reportText) as TimetableValidationReport,
    client,
  );
};
