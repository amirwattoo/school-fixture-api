import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DayOfWeek, Prisma } from "@prisma/client";

import { ApiError } from "../../common/api-error.js";
import { referenceCache } from "../../common/reference-cache.js";
import { prisma } from "../../prisma/client.js";
import { expandDayExpression, extractClassTimetableText, normalizeTeacherKey, parseClassTimetableText } from "./timetable-pdf.parser.js";

export type UploadRow = { dayOfWeek: DayOfWeek; periodNumber: number; className: string; teacherName: string; subjectName: string; subjectCode: string; workload?: number; rowNumber: number };
type InvalidUploadRow = { rowNumber: number; className: string; day: string; lesson: string; subjectName: string; teacherName: string; message: string };
export type PreviewTeacherMatch = { sourceName: string; status: "matched" | "new" | "ambiguous"; teacherId?: string; temporaryIdentity?: string; resolvedTeacherIdentifier?: string; candidates?: Array<{ id: string; name: string; resolvedTeacherIdentifier: string }>; workload?: number };
type PreviewData = { rows: UploadRow[]; totals: Record<string, number>; detected: Record<string, unknown>; teacherMatches: PreviewTeacherMatch[]; duplicateRows: number[]; invalidRows: InvalidUploadRow[]; warnings: string[]; blockingErrors: string[]; affectedFixtureCount: number };

const splitCsvLine = (line: string) => {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { cells.push(value.trim()); value = ""; }
    else value += character;
  }
  if (quoted) throw new Error("Unclosed quoted CSV field");
  cells.push(value.trim());
  return cells;
};

export const parseTimetableCsv = (buffer: Buffer): { rows: UploadRow[]; invalidRows: PreviewData["invalidRows"] } => {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) throw new ApiError(400, "EMPTY_TIMETABLE", "The timetable file is empty");
  const headers = splitCsvLine(lines[0]!).map((header) => header.toLowerCase().replace(/[ _-]/g, ""));
  const column = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const indexes = { day: column("day", "days", "dayofweek"), period: column("period", "periodnumber", "lesson"), className: column("class", "classname", "classsection", "section"), teacher: column("teacher", "teachername"), subject: column("subject", "subjectname"), subjectCode: column("subjectcode", "code"), workload: column("workload", "weeklyworkload", "periodsperweek") };
  if ([indexes.day, indexes.period, indexes.className, indexes.teacher, indexes.subject].some((index) => index < 0)) throw new ApiError(400, "INVALID_CSV_HEADERS", "CSV requires day, period, class, teacher, and subject columns");
  const rows: UploadRow[] = [];
  const invalidRows: PreviewData["invalidRows"] = [];
  lines.slice(1).forEach((line, offset) => {
    const rowNumber = offset + 2;
    let cells: string[] = [];
    try {
      cells = splitCsvLine(line);
      const periodNumber = Number(cells[indexes.period]);
      const className = cells[indexes.className]?.trim() ?? "";
      const teacherName = cells[indexes.teacher]?.trim() ?? "";
      const subjectName = cells[indexes.subject]?.trim() ?? "";
      const subjectCode = indexes.subjectCode >= 0 ? cells[indexes.subjectCode]?.trim() || subjectName : subjectName;
      const workloadValue = indexes.workload >= 0 && cells[indexes.workload] ? Number(cells[indexes.workload]) : undefined;
      if (!Number.isInteger(periodNumber) || periodNumber < 1 || !className || !teacherName || !subjectName || (workloadValue !== undefined && (!Number.isInteger(workloadValue) || workloadValue < 0))) throw new Error("Missing or invalid period, class, teacher, subject, or workload");
      for (const dayOfWeek of expandDayExpression(cells[indexes.day]!.replace(/[–—]/g, "-"))) rows.push({ dayOfWeek, periodNumber, className, teacherName, subjectName, subjectCode, workload: workloadValue, rowNumber });
    } catch (error) {
      invalidRows.push({
        rowNumber,
        className: cells[indexes.className]?.trim() || "(missing)",
        day: cells[indexes.day]?.trim() || "(missing)",
        lesson: cells[indexes.period]?.trim() || "(missing)",
        subjectName: cells[indexes.subject]?.trim() || "(missing)",
        teacherName: cells[indexes.teacher]?.trim() || "(missing)",
        message: error instanceof Error ? error.message : "Invalid row",
      });
    }
  });
  return { rows, invalidRows };
};

const rowsFromPdf = async (buffer: Buffer): Promise<{ rows: UploadRow[]; invalidRows: PreviewData["invalidRows"] }> => {
  const directory = await mkdtemp(join(tmpdir(), "proxy-timetable-"));
  const path = join(directory, "timetable.pdf");
  try {
    await writeFile(path, buffer, { flag: "wx" });
    const parsed = parseClassTimetableText(extractClassTimetableText(path));
    return { rows: parsed.records.map((row, index) => ({ dayOfWeek: row.dayOfWeek, periodNumber: row.periodNumber, className: row.className, teacherName: row.teacherName, subjectName: row.subjectCode, subjectCode: row.subjectCode, rowNumber: index + 1 })), invalidRows: parsed.malformedCells.map((cell) => ({ rowNumber: cell.periodNumber, className: cell.className, day: "(PDF)", lesson: String(cell.periodNumber), subjectName: cell.sourceCellText, teacherName: "(unresolved)", message: cell.reason })) };
  } finally { await rm(directory, { recursive: true, force: true }); }
};

const normalize = (value: string) => value.trim().toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const displayDay = (day: DayOfWeek) => `${day[0]}${day.slice(1).toLowerCase()}`;
const rowDetails = (row: UploadRow) => `CSV source row ${row.rowNumber} | Class: ${row.className} | Day: ${displayDay(row.dayOfWeek)} | Lesson: ${row.periodNumber} | Subject: ${row.subjectName} | Teacher: ${row.teacherName}`;
const invalidRowDetails = (row: InvalidUploadRow) => `CSV source row ${row.rowNumber} | Class: ${row.className} | Day: ${row.day} | Lesson: ${row.lesson} | Subject: ${row.subjectName} | Teacher: ${row.teacherName} | Invalid row: ${row.message}`;
const opaqueIdentity = (kind: "existing" | "preview", value: string) => `${kind}:${createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
const temporaryTeacherIdentity = (sourceName: string) => `preview:${createHash("sha256").update(sourceName).digest("hex")}`;

export const validatePreviewAssignments = (
  preview: Pick<PreviewData, "rows" | "teacherMatches" | "invalidRows">,
  teacherMappings: Record<string, string> = {},
) => {
  const identities = new Map<string, string>();
  const diagnostics = new Map<string, string>();
  const blockingErrors: string[] = [];
  for (const match of preview.teacherMatches) {
    const mappedId = teacherMappings[match.sourceName];
    const teacherId = mappedId || match.teacherId;
    if (match.status === "ambiguous" && !mappedId) {
      blockingErrors.push(`Teacher mapping required for ${match.sourceName}.`);
      continue;
    }
    const identity = teacherId ? `teacher:${teacherId}` : match.temporaryIdentity ?? temporaryTeacherIdentity(match.sourceName);
    identities.set(match.sourceName, identity);
    diagnostics.set(match.sourceName, teacherId ? opaqueIdentity("existing", teacherId) : opaqueIdentity("preview", identity));
  }

  const seen = new Map<string, UploadRow>();
  const duplicateRows: number[] = [];
  for (const row of preview.rows) {
    const identity = identities.get(row.teacherName);
    if (!identity) continue;
    const key = `${row.dayOfWeek}|${row.periodNumber}|${normalize(row.className)}|${identity}|${normalize(row.subjectCode)}`;
    const original = seen.get(key);
    if (original) {
      duplicateRows.push(row.rowNumber);
      blockingErrors.push(`${rowDetails(row)} | Resolved teacher: ${diagnostics.get(row.teacherName)} | Exact duplicate assignment of CSV source row ${original.rowNumber}.`);
    } else seen.set(key, row);
  }

  const duplicateRowNumbers = new Set(duplicateRows);
  const teacherSlots = new Map<string, UploadRow[]>();
  for (const row of preview.rows.filter((item) => !duplicateRowNumbers.has(item.rowNumber))) {
    const identity = identities.get(row.teacherName);
    if (!identity) continue;
    const key = `${row.dayOfWeek}|${row.periodNumber}|${identity}`;
    teacherSlots.set(key, [...(teacherSlots.get(key) ?? []), row]);
  }
  for (const rows of teacherSlots.values()) {
    if (new Set(rows.map((row) => normalize(row.className))).size <= 1) continue;
    for (const row of rows) {
      const others = rows.filter((candidate) => normalize(candidate.className) !== normalize(row.className));
      blockingErrors.push(`${rowDetails(row)} | Resolved teacher: ${diagnostics.get(row.teacherName)} | Teacher double-booking: also assigned to ${[...new Set(others.map((candidate) => `${candidate.className} (CSV source row ${candidate.rowNumber})`))].join(", ")} in the same day and lesson.`);
    }
  }
  if (!preview.rows.length) blockingErrors.push("No valid timetable rows were detected");
  blockingErrors.push(...preview.invalidRows.map(invalidRowDetails));
  return { blockingErrors, duplicateRows, identities, diagnostics };
};

export const timetableUploadService = {
  async preview(actor: { userId: string; schoolId: string }, file: Express.Multer.File) {
    const isPdf = file.mimetype === "application/pdf" && file.originalname.toLowerCase().endsWith(".pdf") && file.buffer.subarray(0, 5).toString() === "%PDF-";
    const isCsv = ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"].includes(file.mimetype) && file.originalname.toLowerCase().endsWith(".csv") && !file.buffer.includes(0);
    if (!isPdf && !isCsv) throw new ApiError(415, "UNSUPPORTED_TIMETABLE_FILE", "Upload a valid PDF or CSV timetable file");
    const parsed = isPdf ? await rowsFromPdf(file.buffer) : parseTimetableCsv(file.buffer);
    const [teachers, existingRows, affectedFixtureCount] = await Promise.all([
      prisma.teacher.findMany({ where: { schoolId: actor.schoolId }, select: { id: true, name: true, baseWeeklyTeachingPeriods: true, isActive: true } }),
      prisma.masterTimetable.count({ where: { schoolId: actor.schoolId } }),
      prisma.proxyFixture.count({ where: { schoolId: actor.schoolId, masterTimetableId: { not: null } } }),
    ]);
    const names = [...new Set(parsed.rows.map((row) => row.teacherName))];
    const teacherMatches: PreviewTeacherMatch[] = names.map((sourceName) => {
      const exactCandidates = teachers.filter((teacher) => teacher.name === sourceName);
      const candidates = exactCandidates.length ? exactCandidates : teachers.filter((teacher) => normalizeTeacherKey(teacher.name) === normalizeTeacherKey(sourceName));
      const workload = parsed.rows.find((row) => row.teacherName === sourceName)?.workload;
      if (candidates.length === 1) return { sourceName, status: "matched", teacherId: candidates[0]!.id, resolvedTeacherIdentifier: opaqueIdentity("existing", candidates[0]!.id), workload };
      if (candidates.length > 1) return { sourceName, status: "ambiguous", candidates: candidates.map(({ id, name }) => ({ id, name, resolvedTeacherIdentifier: opaqueIdentity("existing", id) })), workload };
      const temporaryIdentity = temporaryTeacherIdentity(sourceName);
      return { sourceName, status: "new", temporaryIdentity, resolvedTeacherIdentifier: opaqueIdentity("preview", temporaryIdentity), workload };
    });
    const { blockingErrors, duplicateRows } = validatePreviewAssignments({ rows: parsed.rows, teacherMatches, invalidRows: parsed.invalidRows });
    const duplicateRowNumbers = new Set(duplicateRows);
    const parallelSlots = new Map<string, UploadRow[]>();
    for (const row of parsed.rows.filter((item) => !duplicateRowNumbers.has(item.rowNumber))) {
      const key = `${row.dayOfWeek}|${row.periodNumber}|${normalize(row.className)}`;
      parallelSlots.set(key, [...(parallelSlots.get(key) ?? []), row]);
    }
    const parallelWarnings = [...parallelSlots.values()]
      .filter((rows) => rows.length > 1)
      .map((rows) => `Parallel assignments detected for ${rows[0]!.className}, ${displayDay(rows[0]!.dayOfWeek)}, Lesson ${rows[0]!.periodNumber}.`);
    const warnings = [existingRows ? `Confirmation will replace ${existingRows} current timetable rows.` : "", affectedFixtureCount ? `${affectedFixtureCount} historical fixtures will be detached from replaced timetable rows and preserved.` : "", ...parallelWarnings].filter(Boolean);
    const preview: PreviewData = {
      rows: parsed.rows, teacherMatches, duplicateRows, invalidRows: parsed.invalidRows, warnings, blockingErrors, affectedFixtureCount,
      detected: { teachers: names, subjects: [...new Set(parsed.rows.map((row) => row.subjectName))], classes: [...new Set(parsed.rows.map((row) => row.className))], periods: [...new Set(parsed.rows.map((row) => row.periodNumber))].sort(), days: [...new Set(parsed.rows.map((row) => row.dayOfWeek))], workloads: Object.fromEntries(teacherMatches.filter((item) => item.workload !== undefined).map((item) => [item.sourceName, item.workload])) },
      totals: { rows: parsed.rows.length, teachers: names.length, subjects: new Set(parsed.rows.map((row) => row.subjectName)).size, classes: new Set(parsed.rows.map((row) => row.className)).size, duplicateRows: duplicateRows.length, invalidRows: parsed.invalidRows.length, newTeachers: teacherMatches.filter((item) => item.status === "new").length, matchedTeachers: teacherMatches.filter((item) => item.status === "matched").length, ambiguousTeachers: teacherMatches.filter((item) => item.status === "ambiguous").length },
    };
    const batch = await prisma.timetableImportBatch.create({ data: { schoolId: actor.schoolId, createdById: actor.userId, originalFileName: file.originalname.slice(0, 255), fileType: isPdf ? "PDF" : "CSV", fileHash: createHash("sha256").update(file.buffer).digest("hex"), preview: preview as unknown as Prisma.InputJsonValue, warningCount: warnings.length, errorCount: blockingErrors.length } });
    await prisma.auditLog.create({ data: { schoolId: actor.schoolId, userId: actor.userId, action: "TIMETABLE_IMPORT_PREVIEWED", entityType: "TimetableImportBatch", entityId: batch.id, details: { fileType: batch.fileType, counts: preview.totals, warningCount: warnings.length, errorCount: blockingErrors.length } } });
    return { batchId: batch.id, status: batch.status, preview };
  },

  async confirm(actor: { userId: string; schoolId: string }, batchId: string, input: { confirmReplace: boolean; confirmTeacherUpdates: boolean; teacherMappings?: Record<string, string> }) {
    if (!input.confirmReplace) throw new ApiError(400, "REPLACEMENT_CONFIRMATION_REQUIRED", "Explicit timetable replacement confirmation is required");
    const batch = await prisma.timetableImportBatch.findFirst({ where: { id: batchId, schoolId: actor.schoolId, status: "PREVIEWED" }, select: { id: true, preview: true, fileType: true, warningCount: true } });
    if (!batch) throw new ApiError(404, "IMPORT_BATCH_NOT_FOUND", "Import preview was not found or was already used");
    const preview = batch.preview as unknown as PreviewData;
    const [teachers, subjects, classes, previous] = await Promise.all([
      prisma.teacher.findMany({ where: { schoolId: actor.schoolId }, select: { id: true, name: true, baseWeeklyTeachingPeriods: true } }),
      prisma.subject.findMany({ where: { schoolId: actor.schoolId }, select: { id: true, name: true, code: true } }),
      prisma.classSection.findMany({ where: { schoolId: actor.schoolId }, select: { id: true, name: true } }),
      prisma.masterTimetable.findMany({ where: { schoolId: actor.schoolId }, select: { dayOfWeek: true, periodNumber: true, classSectionId: true, teacherId: true, subjectId: true } }),
    ]);
    const teacherBySource = new Map<string, string>();
    for (const match of preview.teacherMatches) {
      const mapped = input.teacherMappings?.[match.sourceName];
      const id = mapped || match.teacherId;
      if (match.status === "ambiguous" && !mapped) throw new ApiError(400, "TEACHER_MAPPING_REQUIRED", `Resolve the ambiguous teacher mapping for ${match.sourceName}`);
      if (id && !teachers.some((teacher) => teacher.id === id)) throw new ApiError(400, "INVALID_TEACHER_MAPPING", `Teacher mapping for ${match.sourceName} is invalid`);
      if (id) teacherBySource.set(match.sourceName, id);
    }
    const validation = validatePreviewAssignments(preview, input.teacherMappings);
    if (validation.blockingErrors.length) throw new ApiError(400, "IMPORT_HAS_BLOCKING_ERRORS", "The resolved teacher mappings contain blocking errors", { blockingErrors: validation.blockingErrors });
    const teacherChanges = preview.teacherMatches.filter((match) => match.workload !== undefined && match.teacherId && teachers.find((teacher) => teacher.id === match.teacherId)?.baseWeeklyTeachingPeriods !== match.workload);
    if (teacherChanges.length && !input.confirmTeacherUpdates) throw new ApiError(400, "TEACHER_UPDATE_CONFIRMATION_REQUIRED", "Confirm workload changes for existing teachers");
    const summary = await prisma.$transaction(async (tx) => {
      const claimed = await tx.timetableImportBatch.updateMany({ where: { id: batch.id, schoolId: actor.schoolId, status: "PREVIEWED" }, data: { status: "IMPORTED", importedAt: new Date() } });
      if (claimed.count !== 1) throw new ApiError(409, "IMPORT_ALREADY_USED", "This import preview was already confirmed");
      let teachersCreated = 0; let teachersUpdated = 0;
      for (const match of preview.teacherMatches) {
        let teacherId = teacherBySource.get(match.sourceName);
        if (!teacherId) {
          const created = await tx.teacher.create({ data: { schoolId: actor.schoolId, name: match.sourceName, employeeCode: `IMP-${batch.id.slice(-6).toUpperCase()}-${++teachersCreated}`, teachingLevel: "BOTH", baseWeeklyTeachingPeriods: match.workload ?? 0 } });
          teacherId = created.id; teacherBySource.set(match.sourceName, teacherId);
        } else if (match.workload !== undefined && input.confirmTeacherUpdates) {
          const previousWorkload = teachers.find((teacher) => teacher.id === teacherId)?.baseWeeklyTeachingPeriods;
          await tx.teacher.updateMany({ where: { id: teacherId, schoolId: actor.schoolId }, data: { baseWeeklyTeachingPeriods: match.workload, isActive: true } });
          await tx.auditLog.create({ data: { schoolId: actor.schoolId, userId: actor.userId, action: "TEACHER_UPDATED_FROM_TIMETABLE", entityType: "Teacher", entityId: teacherId, details: { fields: ["baseWeeklyTeachingPeriods", "isActive"], previousWorkload, newWorkload: match.workload, importBatchId: batch.id } } });
          teachersUpdated += 1;
        }
      }
      const subjectIds = new Map(subjects.flatMap((subject) => [[normalize(subject.name), subject.id], [normalize(subject.code), subject.id]]));
      for (const row of preview.rows) if (!subjectIds.has(normalize(row.subjectCode))) { const created = await tx.subject.create({ data: { schoolId: actor.schoolId, name: row.subjectName, code: row.subjectCode.toUpperCase().replace(/\s+/g, "-").slice(0, 30) } }); subjectIds.set(normalize(row.subjectCode), created.id); subjectIds.set(normalize(row.subjectName), created.id); }
      const classIds = new Map(classes.map((item) => [normalize(item.name), item.id]));
      for (const row of preview.rows) if (!classIds.has(normalize(row.className))) { const match = /^(\d{1,2})\s*[- ]?\s*([A-Za-z]*)$/.exec(row.className); const created = await tx.classSection.create({ data: { schoolId: actor.schoolId, name: row.className, gradeNumber: match ? Number(match[1]) : null, section: match?.[2]?.toUpperCase() || row.className.slice(0, 20), teachingLevel: match && Number(match[1]) >= 9 ? "HIGHER" : "LOWER" } }); classIds.set(normalize(row.className), created.id); }
      await tx.masterTimetable.deleteMany({ where: { schoolId: actor.schoolId } });
      const rows = preview.rows.map((row) => ({ schoolId: actor.schoolId, dayOfWeek: row.dayOfWeek, periodNumber: row.periodNumber, classSectionId: classIds.get(normalize(row.className))!, teacherId: teacherBySource.get(row.teacherName)!, subjectId: subjectIds.get(normalize(row.subjectCode)) ?? subjectIds.get(normalize(row.subjectName))! }));
      const created = await tx.masterTimetable.createMany({ data: rows });
      const result = { previousRows: previous.length, importedRows: created.count, teachersCreated, teachersUpdated, affectedFixturesPreserved: preview.affectedFixtureCount };
      await tx.timetableImportBatch.update({ where: { id: batch.id }, data: { importedRows: created.count, previousSnapshot: previous as unknown as Prisma.InputJsonValue } });
      await tx.auditLog.create({ data: { schoolId: actor.schoolId, userId: actor.userId, action: "TIMETABLE_IMPORTED", entityType: "TimetableImportBatch", entityId: batch.id, details: { ...result, fileType: batch.fileType, warningCount: batch.warningCount } } });
      return result;
    });
    referenceCache.invalidateAllForSchool(actor.schoolId);
    return summary;
  },

  list(schoolId: string) { return prisma.timetableImportBatch.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, status: true, originalFileName: true, fileType: true, importedRows: true, warningCount: true, errorCount: true, importedAt: true, createdAt: true } }); },
};
