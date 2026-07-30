import type { TeachingLevel } from "@prisma/client";
export declare const OFFICIAL_TEACHER_NAMES: readonly ["Akhtar Ejaz", "Akif Inam", "Ali Hasnain", "Anees ur Rehman", "Azhar Abbas", "Babar Sultan", "Binyamin", "Chand Khushi", "Ehsan Ul Haq", "Habib ur Rehman", "Ibtsam Ashraf", "Ilahi Bukhsh", "Iqbal Hussain", "Muhammad Aamir", "Muhammad Jameel", "Muhammad Talha", "Naveed Arif", "Rizwan Nasir", "Saeed Ahmed Raza", "Sajid Tabbassum", "Sammar Hussain", "Saqib Sheraz", "Shahid Zulfiqar", "Shahzad Memon", "Shamim Ijaz", "Shoukat Ali", "Usman Afzal", "Waseem Haider", "Zahid Ikram", "Zahid Nadeem"];
export declare const officialTeachers: {
    name: "Akhtar Ejaz" | "Akif Inam" | "Ali Hasnain" | "Anees ur Rehman" | "Azhar Abbas" | "Babar Sultan" | "Binyamin" | "Chand Khushi" | "Ehsan Ul Haq" | "Habib ur Rehman" | "Ibtsam Ashraf" | "Ilahi Bukhsh" | "Iqbal Hussain" | "Muhammad Aamir" | "Muhammad Jameel" | "Muhammad Talha" | "Naveed Arif" | "Rizwan Nasir" | "Saeed Ahmed Raza" | "Sajid Tabbassum" | "Sammar Hussain" | "Saqib Sheraz" | "Shahid Zulfiqar" | "Shahzad Memon" | "Shamim Ijaz" | "Shoukat Ali" | "Usman Afzal" | "Waseem Haider" | "Zahid Ikram" | "Zahid Nadeem";
    employeeCode: string;
}[];
export declare const OFFICIAL_WEEKLY_TEACHING_PERIODS: Readonly<Record<(typeof OFFICIAL_TEACHER_NAMES)[number], number>>;
export declare const OFFICIAL_SUBJECTS: readonly [readonly ["URDU", "Urdu"], readonly ["ENG", "English"], readonly ["GK", "General Knowledge"], readonly ["COMP", "Computer Science"], readonly ["ECA", "Extra-Curricular Activities"], readonly ["MATH", "Mathematics"], readonly ["ISL", "Islamiat"], readonly ["GSC", "General Science"], readonly ["SST", "Social Studies"], readonly ["HIST", "History"], readonly ["PHY", "Physics"], readonly ["CHEM", "Chemistry"], readonly ["BIO", "Biology"], readonly ["PST", "Pakistan Studies"], readonly ["TQM", "Tarjuma-tul-Quran"]];
export type OfficialClass = {
    key: string;
    name: string;
    gradeNumber: number | null;
    section: string;
    teachingLevel: TeachingLevel;
};
export declare const OFFICIAL_CLASSES: OfficialClass[];
export declare const SUBJECT_ALIASES: Readonly<Record<string, string>>;
export declare const PDF_TEACHER_ALIASES: Readonly<Record<string, string>>;
//# sourceMappingURL=timetable-import.constants.d.ts.map