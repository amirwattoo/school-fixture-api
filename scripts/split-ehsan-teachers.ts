import { fileURLToPath } from "node:url";

import { Prisma, PrismaClient } from "@prisma/client";

const EXPECTED_SCHOOL_ID = "fgps-college-no-2";
const EXPECTED_EXISTING_TEACHER_ID = "cms6cc5i0000huaqo0lfwk3kz";
const EXISTING_NAME = "Ehsan Ul Haq";
const NEW_NAME = "Ehsan ul Haq";

export type SplitTeacherInput = {
  schoolId: string;
  existingTeacherId: string;
  existingEmployeeCode: string;
  newEmployeeCode: string;
};

const argument = (name: string) => {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
};

export const splitEhsanTeachers = async (
  database: PrismaClient,
  input: SplitTeacherInput,
  expected = { schoolId: EXPECTED_SCHOOL_ID, existingTeacherId: EXPECTED_EXISTING_TEACHER_ID },
) => {
  if (input.schoolId !== expected.schoolId || input.existingTeacherId !== expected.existingTeacherId) {
    throw new Error("Refused: the exact production school and existing teacher identifiers are required.");
  }
  if (!input.existingEmployeeCode.trim() || !input.newEmployeeCode.trim() || input.existingEmployeeCode === input.newEmployeeCode) {
    throw new Error("Refused: two different, non-empty employee codes are required.");
  }

  return database.$transaction(async (tx) => {
    const [schoolCount, existingMatches, newNameMatches, employeeCodeMatches] = await Promise.all([
      tx.school.count({ where: { id: input.schoolId } }),
      tx.teacher.findMany({
        where: { id: input.existingTeacherId, schoolId: input.schoolId, name: EXISTING_NAME, isActive: true },
        select: { id: true, baseWeeklyTeachingPeriods: true },
        take: 2,
      }),
      tx.teacher.findMany({ where: { schoolId: input.schoolId, name: NEW_NAME }, select: { id: true }, take: 2 }),
      tx.teacher.findMany({
        where: { schoolId: input.schoolId, employeeCode: { in: [input.existingEmployeeCode, input.newEmployeeCode] } },
        select: { id: true },
        take: 3,
      }),
    ]);

    if (schoolCount !== 1) throw new Error("Refused: expected exactly one school record.");
    if (existingMatches.length !== 1) throw new Error("Refused: expected exactly one matching existing teacher record.");
    if (existingMatches[0]!.baseWeeklyTeachingPeriods !== 30) throw new Error("Refused: the existing workload is not the expected value.");
    if (newNameMatches.length !== 0) throw new Error("Refused: a record with the new teacher's exact name already exists.");
    if (employeeCodeMatches.length !== 0) throw new Error("Refused: one or more requested employee codes already exist.");

    await tx.teacher.update({
      where: { id: input.existingTeacherId },
      data: { employeeCode: input.existingEmployeeCode, baseWeeklyTeachingPeriods: 28 },
    });
    await tx.teacher.create({
      data: {
        schoolId: input.schoolId,
        name: NEW_NAME,
        employeeCode: input.newEmployeeCode,
        teachingLevel: "BOTH",
        baseWeeklyTeachingPeriods: 27,
        isActive: true,
      },
    });

    return { updated: 1, created: 1 };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 10_000 });
};

const main = async () => {
  const input = {
    schoolId: argument("school-id") ?? "",
    existingTeacherId: argument("existing-teacher-id") ?? "",
    existingEmployeeCode: argument("existing-employee-code") ?? "",
    newEmployeeCode: argument("new-employee-code") ?? "",
  };
  if (Object.values(input).some((value) => !value)) {
    throw new Error("Usage: npm run admin:split-ehsan-teachers -- --school-id=<exact-id> --existing-teacher-id=<exact-id> --existing-employee-code=<unique-code> --new-employee-code=<unique-code>");
  }
  const database = new PrismaClient();
  try {
    await splitEhsanTeachers(database, input);
    console.info("Teacher data repair completed: one record updated and one record created.");
  } finally {
    await database.$disconnect();
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
