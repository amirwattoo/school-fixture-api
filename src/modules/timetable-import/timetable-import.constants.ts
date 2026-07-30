import type { TeachingLevel } from "@prisma/client";

export const OFFICIAL_TEACHER_NAMES = [
  "Akhtar Ejaz",
  "Akif Inam",
  "Ali Hasnain",
  "Anees ur Rehman",
  "Azhar Abbas",
  "Babar Sultan",
  "Binyamin",
  "Chand Khushi",
  "Ehsan Ul Haq",
  "Habib ur Rehman",
  "Ibtsam Ashraf",
  "Ilahi Bukhsh",
  "Iqbal Hussain",
  "Muhammad Aamir",
  "Muhammad Jameel",
  "Muhammad Talha",
  "Naveed Arif",
  "Rizwan Nasir",
  "Saeed Ahmed Raza",
  "Sajid Tabbassum",
  "Sammar Hussain",
  "Saqib Sheraz",
  "Shahid Zulfiqar",
  "Shahzad Memon",
  "Shamim Ijaz",
  "Shoukat Ali",
  "Usman Afzal",
  "Waseem Haider",
  "Zahid Ikram",
  "Zahid Nadeem",
] as const;

export const officialTeachers = OFFICIAL_TEACHER_NAMES.map((name, index) => ({
  name,
  employeeCode: `T-${String(index + 1).padStart(3, "0")}`,
}));

export const OFFICIAL_WEEKLY_TEACHING_PERIODS: Readonly<
  Record<(typeof OFFICIAL_TEACHER_NAMES)[number], number>
> = {
  "Akhtar Ejaz": 30,
  "Akif Inam": 28,
  "Ali Hasnain": 28,
  "Anees ur Rehman": 22,
  "Azhar Abbas": 15,
  "Babar Sultan": 31,
  Binyamin: 28,
  "Chand Khushi": 29,
  "Ehsan Ul Haq": 30,
  "Habib ur Rehman": 28,
  "Ibtsam Ashraf": 28,
  "Ilahi Bukhsh": 27,
  "Iqbal Hussain": 30,
  "Muhammad Aamir": 26,
  "Muhammad Jameel": 20,
  "Muhammad Talha": 32,
  "Naveed Arif": 30,
  "Rizwan Nasir": 29,
  "Saeed Ahmed Raza": 32,
  "Sajid Tabbassum": 30,
  "Sammar Hussain": 25,
  "Saqib Sheraz": 26,
  "Shahid Zulfiqar": 28,
  "Shahzad Memon": 0,
  "Shamim Ijaz": 25,
  "Shoukat Ali": 27,
  "Usman Afzal": 29,
  "Waseem Haider": 31,
  "Zahid Ikram": 30,
  "Zahid Nadeem": 26,
};

export const OFFICIAL_SUBJECTS = [
  ["URDU", "Urdu"],
  ["ENG", "English"],
  ["GK", "General Knowledge"],
  ["COMP", "Computer Science"],
  ["ECA", "Extra-Curricular Activities"],
  ["MATH", "Mathematics"],
  ["ISL", "Islamiat"],
  ["GSC", "General Science"],
  ["SST", "Social Studies"],
  ["HIST", "History"],
  ["PHY", "Physics"],
  ["CHEM", "Chemistry"],
  ["BIO", "Biology"],
  ["PST", "Pakistan Studies"],
  ["TQM", "Tarjuma-tul-Quran"],
] as const;

export type OfficialClass = {
  key: string;
  name: string;
  gradeNumber: number | null;
  section: string;
  teachingLevel: TeachingLevel;
};

const gradedClasses: OfficialClass[] = [
  "1A",
  "2A",
  "3A",
  "3B",
  "4A",
  "4B",
  "5A",
  "5B",
  "6A",
  "6B",
  "7A",
  "7B",
  "8A",
  "8B",
  "9A",
  "9B",
  "10A",
  "10B",
  "11A",
  "12A",
].map((key) => {
  const match = /^(\d+)([A-Z])$/.exec(key)!;
  const gradeNumber = Number(match[1]);
  const section = match[2]!;
  return {
    key,
    name: `Class ${gradeNumber}-${section}`,
    gradeNumber,
    section,
    teachingLevel: gradeNumber <= 8 ? "LOWER" : "HIGHER",
  };
});

export const OFFICIAL_CLASSES: OfficialClass[] = [
  ...gradedClasses,
  {
    key: "HIFZ",
    name: "HIFZ",
    gradeNumber: null,
    section: "HIFZ",
    teachingLevel: "BOTH",
  },
];

export const SUBJECT_ALIASES: Readonly<Record<string, string>> = {
  "G.SCI": "GSC",
  "G.SCIENCE": "GSC",
  GSC: "GSC",
  "P.ST": "PST",
  "P.STUDIES": "PST",
  "HIS/GEO": "HIST",
  "HIST/GEO": "HIST",
  "CCA/ECCA": "ECA",
  "CCA/ECC A": "ECA",
  "ISL+N": "ISL",
  CS: "COMP",
  PAK: "PST",
};

export const PDF_TEACHER_ALIASES: Readonly<Record<string, string>> = {
  "muhammad jamee": "Muhammad Jameel",
};
