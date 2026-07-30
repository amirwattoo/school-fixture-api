import type { DayOfWeek, Prisma } from "@prisma/client";
export declare const timetableInclude: {
    teacher: {
        select: {
            id: true;
            name: true;
            employeeCode: true;
            isActive: true;
        };
    };
    classSection: {
        select: {
            id: true;
            name: true;
            gradeNumber: true;
            section: true;
            isActive: true;
        };
    };
    subject: {
        select: {
            id: true;
            name: true;
            code: true;
            isActive: true;
        };
    };
};
type Filters = {
    dayOfWeek?: DayOfWeek;
    teacherId?: string;
    classSectionId?: string;
    subjectId?: string;
};
export declare const timetableRepository: {
    list(schoolId: string, filters: Filters): Prisma.PrismaPromise<({
        teacher: {
            name: string;
            id: string;
            isActive: boolean;
            employeeCode: string;
        };
        subject: {
            code: string;
            name: string;
            id: string;
            isActive: boolean;
        };
        classSection: {
            name: string;
            id: string;
            isActive: boolean;
            gradeNumber: number | null;
            section: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        dayOfWeek: import("@prisma/client").$Enums.DayOfWeek;
        periodNumber: number;
        classSectionId: string;
        teacherId: string;
        subjectId: string;
    })[]>;
    find(schoolId: string, entryId: string): Prisma.Prisma__MasterTimetableClient<({
        teacher: {
            name: string;
            id: string;
            isActive: boolean;
            employeeCode: string;
        };
        subject: {
            code: string;
            name: string;
            id: string;
            isActive: boolean;
        };
        classSection: {
            name: string;
            id: string;
            isActive: boolean;
            gradeNumber: number | null;
            section: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        dayOfWeek: import("@prisma/client").$Enums.DayOfWeek;
        periodNumber: number;
        classSectionId: string;
        teacherId: string;
        subjectId: string;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    school(schoolId: string): Prisma.Prisma__SchoolClient<{
        id: string;
        periodsPerDay: number;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    teacher(schoolId: string, teacherId: string): Prisma.Prisma__TeacherClient<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        employeeCode: string;
        whatsappNumber: string | null;
        subjectSpecializations: string[];
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        baseWeeklyTeachingPeriods: number;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    subject(schoolId: string, subjectId: string): Prisma.Prisma__SubjectClient<{
        code: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    classSection(schoolId: string, classSectionId: string): Prisma.Prisma__ClassSectionClient<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        isActive: boolean;
        teachingLevel: import("@prisma/client").$Enums.TeachingLevel;
        gradeNumber: number | null;
        section: string;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    teacherConflict(schoolId: string, dayOfWeek: DayOfWeek, periodNumber: number, teacherId: string, excludeId?: string): Prisma.Prisma__MasterTimetableClient<({
        teacher: {
            name: string;
            id: string;
            isActive: boolean;
            employeeCode: string;
        };
        subject: {
            code: string;
            name: string;
            id: string;
            isActive: boolean;
        };
        classSection: {
            name: string;
            id: string;
            isActive: boolean;
            gradeNumber: number | null;
            section: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        dayOfWeek: import("@prisma/client").$Enums.DayOfWeek;
        periodNumber: number;
        classSectionId: string;
        teacherId: string;
        subjectId: string;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    classConflict(schoolId: string, dayOfWeek: DayOfWeek, periodNumber: number, classSectionId: string, excludeId?: string): Prisma.Prisma__MasterTimetableClient<({
        teacher: {
            name: string;
            id: string;
            isActive: boolean;
            employeeCode: string;
        };
        subject: {
            code: string;
            name: string;
            id: string;
            isActive: boolean;
        };
        classSection: {
            name: string;
            id: string;
            isActive: boolean;
            gradeNumber: number | null;
            section: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        dayOfWeek: import("@prisma/client").$Enums.DayOfWeek;
        periodNumber: number;
        classSectionId: string;
        teacherId: string;
        subjectId: string;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    create(data: Prisma.MasterTimetableUncheckedCreateInput): Prisma.Prisma__MasterTimetableClient<{
        teacher: {
            name: string;
            id: string;
            isActive: boolean;
            employeeCode: string;
        };
        subject: {
            code: string;
            name: string;
            id: string;
            isActive: boolean;
        };
        classSection: {
            name: string;
            id: string;
            isActive: boolean;
            gradeNumber: number | null;
            section: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        dayOfWeek: import("@prisma/client").$Enums.DayOfWeek;
        periodNumber: number;
        classSectionId: string;
        teacherId: string;
        subjectId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    update(entryId: string, data: Prisma.MasterTimetableUpdateInput): Prisma.Prisma__MasterTimetableClient<{
        teacher: {
            name: string;
            id: string;
            isActive: boolean;
            employeeCode: string;
        };
        subject: {
            code: string;
            name: string;
            id: string;
            isActive: boolean;
        };
        classSection: {
            name: string;
            id: string;
            isActive: boolean;
            gradeNumber: number | null;
            section: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        dayOfWeek: import("@prisma/client").$Enums.DayOfWeek;
        periodNumber: number;
        classSectionId: string;
        teacherId: string;
        subjectId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    delete(entryId: string): Prisma.Prisma__MasterTimetableClient<{
        teacher: {
            name: string;
            id: string;
            isActive: boolean;
            employeeCode: string;
        };
        subject: {
            code: string;
            name: string;
            id: string;
            isActive: boolean;
        };
        classSection: {
            name: string;
            id: string;
            isActive: boolean;
            gradeNumber: number | null;
            section: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        schoolId: string;
        dayOfWeek: import("@prisma/client").$Enums.DayOfWeek;
        periodNumber: number;
        classSectionId: string;
        teacherId: string;
        subjectId: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
};
export {};
//# sourceMappingURL=timetable.repository.d.ts.map