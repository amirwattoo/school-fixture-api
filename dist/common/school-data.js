export { normalizePakistaniWhatsAppNumber as normalizeWhatsappNumber } from "../modules/whatsapp/whatsapp-number.util.js";
export const normalizeWhitespace = (value) => value.trim().replace(/\s+/g, " ");
export const normalizeCode = (value) => normalizeWhitespace(value).toUpperCase();
export const normalizeSection = normalizeCode;
export const normalizeDisplayName = (value) => normalizeWhitespace(value)
    .toLocaleLowerCase("en")
    .replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("en"));
export const cleanSpecializations = (values) => {
    const unique = new Map();
    for (const value of values) {
        const normalized = normalizeDisplayName(value);
        if (normalized)
            unique.set(normalized.toLocaleLowerCase("en"), normalized);
    }
    return [...unique.values()];
};
export const deriveTeachingLevel = (gradeNumber) => gradeNumber >= 9 && gradeNumber <= 12 ? "HIGHER" : "LOWER";
export const buildClassName = (gradeNumber, section) => `Grade ${gradeNumber}-${normalizeSection(section)}`;
export const WEEKDAYS = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
];
export const weekdayOrder = (day) => WEEKDAYS.indexOf(day);
//# sourceMappingURL=school-data.js.map