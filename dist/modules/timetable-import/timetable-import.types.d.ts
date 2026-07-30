import type { DayOfWeek } from "@prisma/client";
export type GeneratedTimetableRecord = {
    dayOfWeek: DayOfWeek;
    periodNumber: number;
    className: string;
    teacherName: string;
    subjectCode: string;
    sourcePage: number;
    sourceCellText: string;
};
export type UnmatchedValue = {
    value: string;
    sourcePage: number;
    className: string;
    periodNumber: number;
    sourceCellText: string;
    reason: string;
};
export type TimetableConflict = {
    key: string;
    records: GeneratedTimetableRecord[];
};
export type TimetableValidationReport = {
    sourcePdf: string;
    sourcePages: number[];
    parsedGroups: number;
    parsedRows: number;
    uniqueRows: number;
    duplicateRows: GeneratedTimetableRecord[];
    classConflicts: TimetableConflict[];
    teacherConflicts: TimetableConflict[];
    unmatchedTeachers: UnmatchedValue[];
    unmatchedSubjects: UnmatchedValue[];
    unmatchedClasses: UnmatchedValue[];
    malformedCells: UnmatchedValue[];
    valid: boolean;
};
//# sourceMappingURL=timetable-import.types.d.ts.map