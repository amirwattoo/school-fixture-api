import type { PrismaClient } from "@prisma/client";
import type { GeneratedTimetableRecord, TimetableValidationReport } from "./timetable-import.types.js";
type ImportClient = Pick<PrismaClient, "$transaction" | "school">;
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
export declare const importOfficialTimetableRecords: (schoolId: string, records: GeneratedTimetableRecord[], report: TimetableValidationReport, client?: ImportClient) => Promise<OfficialTimetableImportSummary>;
export declare const importOfficialTimetableFromFiles: (schoolId: string, recordsPath: string, reportPath: string, client?: ImportClient) => Promise<OfficialTimetableImportSummary>;
export {};
//# sourceMappingURL=official-timetable-import.service.d.ts.map