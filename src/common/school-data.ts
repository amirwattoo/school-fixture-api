import type { DayOfWeek, TeachingLevel } from "@prisma/client";

export { normalizePakistaniWhatsAppNumber as normalizeWhatsappNumber } from "../modules/whatsapp/whatsapp-number.util.js";

export const normalizeWhitespace = (value: string) =>
  value.trim().replace(/\s+/g, " ");

export const normalizeCode = (value: string) =>
  normalizeWhitespace(value).toUpperCase();

export const normalizeSection = normalizeCode;

export const normalizeDisplayName = (value: string) =>
  normalizeWhitespace(value)
    .toLocaleLowerCase("en")
    .replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("en"));

export const cleanSpecializations = (values: string[]) => {
  const unique = new Map<string, string>();
  for (const value of values) {
    const normalized = normalizeDisplayName(value);
    if (normalized) unique.set(normalized.toLocaleLowerCase("en"), normalized);
  }
  return [...unique.values()];
};

export const deriveTeachingLevel = (gradeNumber: number): TeachingLevel =>
  gradeNumber >= 9 && gradeNumber <= 12 ? "HIGHER" : "LOWER";

export const buildClassName = (gradeNumber: number, section: string) =>
  `Grade ${gradeNumber}-${normalizeSection(section)}`;

export const WEEKDAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const weekdayOrder = (day: DayOfWeek) => WEEKDAYS.indexOf(day);
