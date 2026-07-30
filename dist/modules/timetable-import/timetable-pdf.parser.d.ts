import type { DayOfWeek } from "@prisma/client";
import type { GeneratedTimetableRecord, UnmatchedValue } from "./timetable-import.types.js";
export declare const expandDayExpression: (expression: string) => DayOfWeek[];
export declare const normalizeTeacherKey: (value: string) => string;
export declare const resolveTeacherName: (value: string) => string | undefined;
export declare const normalizeSubjectCode: (value: string) => string | undefined;
export declare const normalizeClassKey: (value: string) => string | undefined;
export declare const extractClassTimetableText: (pdfPath: string) => string;
type ParseResult = {
    records: GeneratedTimetableRecord[];
    malformedCells: UnmatchedValue[];
    unmatchedTeachers: UnmatchedValue[];
    unmatchedSubjects: UnmatchedValue[];
    unmatchedClasses: UnmatchedValue[];
    parsedGroups: number;
    sourcePages: number[];
};
export declare const parseClassTimetableText: (text: string) => ParseResult;
export {};
//# sourceMappingURL=timetable-pdf.parser.d.ts.map