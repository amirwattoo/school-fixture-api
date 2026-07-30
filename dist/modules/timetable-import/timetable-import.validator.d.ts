import type { GeneratedTimetableRecord, TimetableValidationReport, UnmatchedValue } from "./timetable-import.types.js";
export declare const validateTimetableRecords: (sourcePdf: string, records: GeneratedTimetableRecord[], parserDiagnostics: {
    parsedGroups: number;
    sourcePages: number[];
    malformedCells: UnmatchedValue[];
    unmatchedTeachers: UnmatchedValue[];
    unmatchedSubjects: UnmatchedValue[];
    unmatchedClasses: UnmatchedValue[];
}) => TimetableValidationReport;
//# sourceMappingURL=timetable-import.validator.d.ts.map