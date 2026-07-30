type FixtureMessageInput = {
    schoolName: string;
    teacherName: string;
    fixtureDate: Date;
    periodNumber: number;
    className: string;
    subjectName: string;
    absentTeacherName: string;
};
export declare const renderFixtureWhatsAppMessage: (input: FixtureMessageInput) => {
    message: string;
    templateParameters: string[];
    dateValue: string;
};
export declare const fixtureNotificationIdempotencyKey: (fixtureId: string, teacherId: string, assignmentVersion: number) => string;
export {};
//# sourceMappingURL=whatsapp-message.service.d.ts.map