import type { DayOfWeek, TeachingLevel } from "@prisma/client";
export { normalizePakistaniWhatsAppNumber as normalizeWhatsappNumber } from "../modules/whatsapp/whatsapp-number.util.js";
export declare const normalizeWhitespace: (value: string) => string;
export declare const normalizeCode: (value: string) => string;
export declare const normalizeSection: (value: string) => string;
export declare const normalizeDisplayName: (value: string) => string;
export declare const cleanSpecializations: (values: string[]) => string[];
export declare const deriveTeachingLevel: (gradeNumber: number) => TeachingLevel;
export declare const buildClassName: (gradeNumber: number, section: string) => string;
export declare const WEEKDAYS: DayOfWeek[];
export declare const weekdayOrder: (day: DayOfWeek) => number;
//# sourceMappingURL=school-data.d.ts.map