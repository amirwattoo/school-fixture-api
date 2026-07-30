import { formatDateOnly, weekdayForDate } from "../../common/date-only.js";
const safeText = (value) => value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
const readableDate = (date) => new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
}).format(date);
const readableDay = (date) => {
    const day = weekdayForDate(date).toLocaleLowerCase("en");
    return `${day.charAt(0).toUpperCase()}${day.slice(1)}`;
};
export const renderFixtureWhatsAppMessage = (input) => {
    const values = {
        schoolName: safeText(input.schoolName),
        teacherName: safeText(input.teacherName),
        date: readableDate(input.fixtureDate),
        day: readableDay(input.fixtureDate),
        period: String(input.periodNumber),
        className: safeText(input.className),
        subject: safeText(input.subjectName),
        absentTeacherName: safeText(input.absentTeacherName),
    };
    return {
        message: `${values.schoolName}

Dear ${values.teacherName},

Your fixture duty has been assigned.

Date: ${values.date}
Day: ${values.day}
Period: ${values.period}
Class: ${values.className}
Subject: ${values.subject}
Absent Teacher: ${values.absentTeacherName}

Please attend the assigned class during this period.

Developed by M. Aamir Wattoo
CI, FGPS & College No. 2`,
        templateParameters: [
            values.teacherName,
            values.date,
            values.day,
            values.period,
            values.className,
            values.subject,
            values.absentTeacherName,
        ],
        dateValue: formatDateOnly(input.fixtureDate),
    };
};
export const fixtureNotificationIdempotencyKey = (fixtureId, teacherId, assignmentVersion) => `fixture:${fixtureId}:teacher:${teacherId}:version:${assignmentVersion}`;
//# sourceMappingURL=whatsapp-message.service.js.map