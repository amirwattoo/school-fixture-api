import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { splitEhsanTeachers } from "../scripts/split-ehsan-teachers.js";
import { prisma } from "../src/prisma/client.js";

const SCHOOL_ID = "split-ehsan-teachers-test";
const EXISTING_ID = "split-ehsan-existing-teacher";

before(async () => {
  await prisma.school.deleteMany({ where: { id: SCHOOL_ID } });
  await prisma.school.create({ data: { id: SCHOOL_ID, name: "Teacher Repair Test", academicYear: "2026" } });
});

after(async () => {
  await prisma.school.deleteMany({ where: { id: SCHOOL_ID } });
  await prisma.$disconnect();
});

test("scoped teacher split preserves historical fixture references and rejects duplicate codes", async () => {
  const teacher = await prisma.teacher.create({
    data: { id: EXISTING_ID, schoolId: SCHOOL_ID, name: "Ehsan Ul Haq", employeeCode: "OLD-EHSAN", teachingLevel: "BOTH", baseWeeklyTeachingPeriods: 30 },
  });
  const duplicate = await prisma.teacher.create({
    data: { schoolId: SCHOOL_ID, name: "Unrelated Teacher", employeeCode: "EHSAN-02", teachingLevel: "BOTH" },
  });
  const classSection = await prisma.classSection.create({
    data: { schoolId: SCHOOL_ID, name: "9-A", gradeNumber: 9, section: "A", teachingLevel: "HIGHER" },
  });
  const subject = await prisma.subject.create({ data: { schoolId: SCHOOL_ID, name: "Biology", code: "BIO" } });
  const timetable = await prisma.masterTimetable.create({
    data: { schoolId: SCHOOL_ID, dayOfWeek: "MONDAY", periodNumber: 1, classSectionId: classSection.id, teacherId: teacher.id, subjectId: subject.id },
  });
  const fixture = await prisma.proxyFixture.create({
    data: { schoolId: SCHOOL_ID, date: new Date("2026-08-03T00:00:00.000Z"), periodNumber: 1, masterTimetableId: timetable.id, classSectionId: classSection.id, subjectId: subject.id, absentTeacherId: teacher.id, assignedTeacherId: teacher.id },
  });
  const input = { schoolId: SCHOOL_ID, existingTeacherId: EXISTING_ID, existingEmployeeCode: "EHSAN-01", newEmployeeCode: "EHSAN-02" };
  const expected = { schoolId: SCHOOL_ID, existingTeacherId: EXISTING_ID };

  await assert.rejects(splitEhsanTeachers(prisma, input, expected), /employee codes already exist/);
  assert.equal((await prisma.teacher.findUniqueOrThrow({ where: { id: EXISTING_ID } })).baseWeeklyTeachingPeriods, 30);

  await prisma.teacher.delete({ where: { id: duplicate.id } });
  assert.deepEqual(await splitEhsanTeachers(prisma, input, expected), { updated: 1, created: 1 });

  const teachers = await prisma.teacher.findMany({ where: { schoolId: SCHOOL_ID }, orderBy: { name: "asc" } });
  assert.equal(teachers.length, 2);
  assert.deepEqual(teachers.map(({ name, employeeCode, baseWeeklyTeachingPeriods, isActive }) => ({ name, employeeCode, baseWeeklyTeachingPeriods, isActive })), [
    { name: "Ehsan Ul Haq", employeeCode: "EHSAN-01", baseWeeklyTeachingPeriods: 28, isActive: true },
    { name: "Ehsan ul Haq", employeeCode: "EHSAN-02", baseWeeklyTeachingPeriods: 27, isActive: true },
  ]);
  const preserved = await prisma.proxyFixture.findUniqueOrThrow({ where: { id: fixture.id } });
  assert.equal(preserved.masterTimetableId, timetable.id);
  assert.equal(preserved.absentTeacherId, EXISTING_ID);
  assert.equal(preserved.assignedTeacherId, EXISTING_ID);
});
