import { type DayOfWeek } from "@prisma/client";
import { type AuditActor } from "../../common/audit.js";
export type TimetableInput = {
    dayOfWeek: DayOfWeek;
    periodNumber: number;
    classSectionId: string;
    teacherId: string;
    subjectId: string;
};
export declare const validatePeriodRange: (periodNumber: number, periodsPerDay: number) => void;
export declare const timetableService: {
    list(schoolId: string, filters: {
        dayOfWeek?: DayOfWeek;
        teacherId?: string;
        classSectionId?: string;
        subjectId?: string;
    }): Promise<({
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
    get(schoolId: string, entryId: string): Promise<{
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
    }>;
    create(actor: AuditActor, input: TimetableInput): Promise<({
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
    }) | undefined>;
    update(actor: AuditActor, entryId: string, input: Partial<TimetableInput>): Promise<({
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
    }) | undefined>;
    delete(actor: AuditActor, entryId: string): Promise<{
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
    }>;
};
//# sourceMappingURL=timetable.service.d.ts.map