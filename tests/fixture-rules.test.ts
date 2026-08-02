import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { isoWeek, resolveSchoolDate } from "../src/common/date-only.js";
import {
  attendanceExclusionReason,
  isTeacherAvailableAtPeriod,
} from "../src/modules/attendance/attendance-availability.js";
import { attendanceService } from "../src/modules/attendance/attendance.service.js";
import { updateAttendanceSchema } from "../src/modules/attendance/attendance.schemas.js";
import { getEligibleTeachersForFixture } from "../src/modules/fixtures/fixture-eligibility.service.js";
import {
  fixturesRepository,
  type FixtureDb,
} from "../src/modules/fixtures/fixtures.repository.js";
import { fixturesService } from "../src/modules/fixtures/fixtures.service.js";
import {
  sortCandidates,
  workloadBalanceScore,
} from "../src/modules/fixtures/fixtures.utils.js";
import { prisma } from "../src/prisma/client.js";

const SCHOOL_ID = "fixture-rules-test-school";
const DATE = new Date("2026-08-03T00:00:00.000Z");
const ids = new Map<string, string>();

for (const [selectedDate, expectedWeekday] of [
  ["2026-08-03", "MONDAY"],
  ["2026-08-04", "TUESDAY"],
  ["2026-08-07", "FRIDAY"],
  ["2026-08-08", "SATURDAY"],
  ["2026-08-09", "SUNDAY"],
] as const) {
  test(`${selectedDate} resolves to ${expectedWeekday} in Asia/Karachi`, () => {
    const resolved = resolveSchoolDate(selectedDate, "Asia/Karachi");
    assert.equal(resolved.selectedDate, selectedDate);
    assert.equal(
      resolved.storageDate.toISOString(),
      `${selectedDate}T00:00:00.000Z`,
    );
    assert.equal(resolved.timezone, "Asia/Karachi");
    assert.equal(resolved.weekday, expectedWeekday);
  });
}

test("period-aware attendance availability follows every exception rule", () => {
  const absent = {
    status: "ABSENT" as const,
    availableFromPeriod: null,
    unavailableFromPeriod: null,
  };
  const leave = { ...absent, status: "LEAVE" as const };
  const late = {
    status: "LATE" as const,
    availableFromPeriod: 3,
    unavailableFromPeriod: null,
  };
  const shortLeave = {
    status: "SHORT_LEAVE" as const,
    availableFromPeriod: null,
    unavailableFromPeriod: 5,
  };
  assert.equal(isTeacherAvailableAtPeriod(absent, 1), false);
  assert.equal(isTeacherAvailableAtPeriod(absent, 8), false);
  assert.equal(isTeacherAvailableAtPeriod(leave, 1), false);
  assert.equal(isTeacherAvailableAtPeriod(leave, 8), false);
  assert.equal(attendanceExclusionReason(late, 1), "NOT_ARRIVED_YET");
  assert.equal(isTeacherAvailableAtPeriod(late, 2), false);
  assert.equal(isTeacherAvailableAtPeriod(late, 3), true);
  assert.equal(isTeacherAvailableAtPeriod(late, 8), true);
  assert.equal(
    isTeacherAvailableAtPeriod({ ...late, availableFromPeriod: 1 }, 1),
    true,
  );
  assert.equal(isTeacherAvailableAtPeriod(shortLeave, 1), true);
  assert.equal(isTeacherAvailableAtPeriod(shortLeave, 4), true);
  assert.equal(attendanceExclusionReason(shortLeave, 5), "LEFT_ON_SHORT_LEAVE");
  assert.equal(isTeacherAvailableAtPeriod(shortLeave, 8), false);
  assert.equal(isTeacherAvailableAtPeriod(undefined, 4), true);

  const partialDay = {
    status: "PARTIAL_DAY" as const,
    availableFromPeriod: 3,
    unavailableFromPeriod: 7,
  };
  assert.equal(isTeacherAvailableAtPeriod(partialDay, 1), false);
  assert.equal(isTeacherAvailableAtPeriod(partialDay, 2), false);
  assert.equal(isTeacherAvailableAtPeriod(partialDay, 3), true);
  assert.equal(isTeacherAvailableAtPeriod(partialDay, 6), true);
  assert.equal(
    attendanceExclusionReason(partialDay, 7),
    "OUTSIDE_PARTIAL_DAY_RANGE",
  );
  assert.equal(isTeacherAvailableAtPeriod(partialDay, 8), false);

  const firstHalfLeave = {
    ...partialDay,
    availableFromPeriod: 5,
    unavailableFromPeriod: null,
  };
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7, 8].filter((period) =>
      isTeacherAvailableAtPeriod(firstHalfLeave, period),
    ),
    [5, 6, 7, 8],
  );
  const secondHalfLeave = {
    ...partialDay,
    availableFromPeriod: null,
    unavailableFromPeriod: 5,
  };
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7, 8].filter((period) =>
      isTeacherAvailableAtPeriod(secondHalfLeave, period),
    ),
    [1, 2, 3, 4],
  );
});

test("partial-day attendance validation requires a valid period range", () => {
  assert.equal(
    updateAttendanceSchema.safeParse({
      date: "2026-08-03",
      status: "PARTIAL_DAY",
    }).success,
    false,
  );
  assert.equal(
    updateAttendanceSchema.safeParse({
      date: "2026-08-03",
      status: "PARTIAL_DAY",
      availableFromPeriod: 7,
      unavailableFromPeriod: 3,
    }).success,
    false,
  );
  assert.equal(
    updateAttendanceSchema.safeParse({
      date: "2026-08-03",
      status: "PARTIAL_DAY",
      availableFromPeriod: 3,
      unavailableFromPeriod: 7,
    }).success,
    true,
  );
});

test("workload normalization uses effective workload and deterministic ties", () => {
  assert.equal(workloadBalanceScore(15, 15, 32), 20);
  assert.equal(workloadBalanceScore(32, 15, 32), 0);
  assert.equal(workloadBalanceScore(20, 20, 20), 20);
  assert.throws(
    () => workloadBalanceScore(Number.NaN, 15, 32),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "WORKLOAD_DATA_MISSING",
  );
  assert.ok(
    workloadBalanceScore(21, 15, 32) < workloadBalanceScore(20, 15, 32),
  );
  const sorted = sortCandidates([
    {
      teacherId: "b",
      teacherName: "Beta",
      subjectScore: 50,
      classLevelScore: 30,
      workloadScore: 10,
      baseWeeklyTeachingPeriods: 20,
      weeklyFixtureCount: 1,
      effectiveWeeklyWorkload: 21,
      minimumEligibleWorkload: 20,
      maximumEligibleWorkload: 22,
      totalScore: 90,
    },
    {
      teacherId: "a",
      teacherName: "Alpha",
      subjectScore: 50,
      classLevelScore: 30,
      workloadScore: 10,
      baseWeeklyTeachingPeriods: 20,
      weeklyFixtureCount: 0,
      effectiveWeeklyWorkload: 20,
      minimumEligibleWorkload: 20,
      maximumEligibleWorkload: 22,
      totalScore: 90,
    },
  ]);
  assert.deepEqual(
    sorted.map((candidate) => candidate.teacherId),
    ["a", "b"],
  );
});

test("Azhar Abbas scores above Muhammad Talha when both are eligible", async () => {
  const schoolId = "official-workload-score-test-school";
  await prisma.school.deleteMany({ where: { id: schoolId } });
  try {
    await prisma.school.create({
      data: {
        id: schoolId,
        name: "Official Workload Score Test",
        academicYear: "2026",
      },
    });
    await prisma.teacher.createMany({
      data: [
        {
          schoolId,
          name: "Original Absent",
          employeeCode: "ABSENT",
          subjectSpecializations: ["MATH"],
          teachingLevel: "BOTH",
          baseWeeklyTeachingPeriods: 25,
        },
        {
          schoolId,
          name: "Azhar Abbas",
          employeeCode: "T-005",
          subjectSpecializations: ["MATH"],
          teachingLevel: "BOTH",
          baseWeeklyTeachingPeriods: 15,
        },
        {
          schoolId,
          name: "Muhammad Talha",
          employeeCode: "T-016",
          subjectSpecializations: ["MATH"],
          teachingLevel: "BOTH",
          baseWeeklyTeachingPeriods: 32,
        },
      ],
    });
    const teachers = await prisma.teacher.findMany({ where: { schoolId } });
    const absentTeacherId = teachers.find(
      (teacher) => teacher.name === "Original Absent",
    )!.id;
    const result = await prisma.$transaction((database) =>
      getEligibleTeachersForFixture(database, {
        schoolId,
        date: DATE,
        dayOfWeek: "MONDAY",
        periodNumber: 1,
        absentTeacherId,
        subjectName: "Mathematics",
        subjectCode: "MATH",
        classLevel: "HIGHER",
      }),
    );
    const azhar = result.candidates.find(
      (candidate) => candidate.teacherName === "Azhar Abbas",
    )!;
    const talha = result.candidates.find(
      (candidate) => candidate.teacherName === "Muhammad Talha",
    )!;
    assert.equal(azhar.baseWeeklyTeachingPeriods, 15);
    assert.equal(talha.baseWeeklyTeachingPeriods, 32);
    assert.equal(azhar.minimumEligibleWorkload, 15);
    assert.equal(azhar.maximumEligibleWorkload, 32);
    assert.equal(azhar.workloadScore, 20);
    assert.equal(talha.workloadScore, 0);
    assert.ok(azhar.workloadScore > talha.workloadScore);
  } finally {
    await prisma.school.deleteMany({ where: { id: schoolId } });
  }
});

before(async () => {
  await prisma.school.deleteMany({ where: { id: SCHOOL_ID } });
  const school = await prisma.school.create({
    data: {
      id: SCHOOL_ID,
      name: "Fixture Rules Test",
      academicYear: "2026",
      users: {
        create: {
          name: "Fixture Rules User",
          email: "fixture-rules@example.local",
          passwordHash: "not-used",
          role: "PRINCIPAL",
        },
      },
    },
    include: { users: true },
  });
  ids.set("USER", school.users[0]!.id);
  for (const [key, name, workload] of [
    ["ABSENT", "Original Absent", 0],
    ["FREE", "Default Present", 10],
    ["LATE", "Late Teacher", 20],
    ["SHORT", "Short Leave Teacher", 30],
    ["LEAVE", "Leave Teacher", 15],
    ["TIMETABLE", "Timetable Busy", 5],
    ["FIXTURE", "Fixture Busy", 5],
  ] as const) {
    const teacher = await prisma.teacher.create({
      data: {
        schoolId: SCHOOL_ID,
        name,
        employeeCode: key,
        subjectSpecializations: ["MATH"],
        teachingLevel: "BOTH",
        baseWeeklyTeachingPeriods: workload,
      },
    });
    ids.set(key, teacher.id);
  }
  const subject = await prisma.subject.create({
    data: { schoolId: SCHOOL_ID, name: "Mathematics", code: "MATH" },
  });
  const parallelSubject = await prisma.subject.create({
    data: { schoolId: SCHOOL_ID, name: "Computer Science", code: "CS" },
  });
  const classSection = await prisma.classSection.create({
    data: {
      schoolId: SCHOOL_ID,
      name: "Class 9-A",
      gradeNumber: 9,
      section: "A",
      teachingLevel: "HIGHER",
    },
  });
  ids.set("SUBJECT", subject.id);
  ids.set("CLASS", classSection.id);
  await prisma.masterTimetable.create({
    data: {
      schoolId: SCHOOL_ID,
      dayOfWeek: "MONDAY",
      periodNumber: 3,
      classSectionId: classSection.id,
      teacherId: ids.get("TIMETABLE")!,
      subjectId: subject.id,
    },
  });
  for (const [periodNumber, section, teacherKey] of [
    [1, "B", "LATE"],
    [3, "C", "LATE"],
    [6, "F", "LATE"],
    [7, "G", "LATE"],
    [2, "D", "SHORT"],
    [5, "E", "SHORT"],
    [6, "H", "SHORT"],
    [8, "I", "SHORT"],
  ] as const) {
    const timetableClass = await prisma.classSection.create({
      data: {
        schoolId: SCHOOL_ID,
        name: `Class 9-${section}`,
        gradeNumber: 9,
        section,
        teachingLevel: "HIGHER",
      },
    });
    await prisma.masterTimetable.create({
      data: {
        schoolId: SCHOOL_ID,
        dayOfWeek: "MONDAY",
        periodNumber,
        classSectionId: timetableClass.id,
        teacherId: ids.get(teacherKey)!,
        subjectId: subject.id,
      },
    });
    if (teacherKey === "SHORT" && periodNumber === 6) {
      await prisma.masterTimetable.create({
        data: {
          schoolId: SCHOOL_ID,
          dayOfWeek: "MONDAY",
          periodNumber,
          classSectionId: timetableClass.id,
          teacherId: ids.get(teacherKey)!,
          subjectId: parallelSubject.id,
        },
      });
    }
  }
  await prisma.proxyFixture.create({
    data: {
      schoolId: SCHOOL_ID,
      date: DATE,
      periodNumber: 3,
      classSectionId: classSection.id,
      subjectId: subject.id,
      absentTeacherId: ids.get("ABSENT")!,
      assignedTeacherId: ids.get("FIXTURE")!,
    },
  });
  await prisma.dailyAttendance.createMany({
    data: [
      {
        schoolId: SCHOOL_ID,
        date: DATE,
        teacherId: ids.get("ABSENT")!,
        status: "ABSENT",
        markedById: ids.get("USER")!,
      },
      {
        schoolId: SCHOOL_ID,
        date: DATE,
        teacherId: ids.get("LEAVE")!,
        status: "LEAVE",
        markedById: ids.get("USER")!,
      },
      {
        schoolId: SCHOOL_ID,
        date: DATE,
        teacherId: ids.get("LATE")!,
        status: "LATE",
        availableFromPeriod: 3,
        markedById: ids.get("USER")!,
      },
      {
        schoolId: SCHOOL_ID,
        date: DATE,
        teacherId: ids.get("SHORT")!,
        status: "SHORT_LEAVE",
        unavailableFromPeriod: 5,
        markedById: ids.get("USER")!,
      },
      {
        schoolId: SCHOOL_ID,
        date: DATE,
        teacherId: ids.get("FREE")!,
        status: "PRESENT",
        markedById: ids.get("USER")!,
      },
    ],
  });
  const week = isoWeek(DATE);
  await prisma.teacherFixtureSummary.create({
    data: {
      schoolId: SCHOOL_ID,
      teacherId: ids.get("FREE")!,
      year: week.year,
      weekNumber: week.weekNumber,
      fixtureCount: 2,
    },
  });
});

after(async () => {
  await prisma.school.deleteMany({ where: { id: SCHOOL_ID } });
  await prisma.$disconnect();
});

const eligibilityFor = (periodNumber: number) =>
  prisma.$transaction((database) =>
    getEligibleTeachersForFixture(database, {
      schoolId: SCHOOL_ID,
      date: DATE,
      dayOfWeek: "MONDAY",
      periodNumber,
      absentTeacherId: ids.get("ABSENT")!,
      subjectName: "Mathematics",
      subjectCode: "MATH",
      classLevel: "HIGHER",
    }),
  );

test("shared eligibility excludes attendance, timetable, fixture, and original teacher conflicts", async () => {
  const periodOne = await eligibilityFor(1);
  assert.ok(
    periodOne.excluded.some(
      (item) =>
        item.teacherId === ids.get("ABSENT") &&
        item.reason === "ORIGINAL_ABSENT_TEACHER",
    ),
  );
  assert.ok(
    periodOne.excluded.some(
      (item) =>
        item.teacherId === ids.get("LEAVE") && item.reason === "ON_LEAVE",
    ),
  );
  assert.ok(
    periodOne.excluded.some(
      (item) =>
        item.teacherId === ids.get("LATE") && item.reason === "NOT_ARRIVED_YET",
    ),
  );
  assert.ok(
    periodOne.candidates.some((item) => item.teacherId === ids.get("SHORT")),
  );

  const periodThree = await eligibilityFor(3);
  assert.ok(
    periodThree.excluded.some(
      (item) =>
        item.teacherId === ids.get("TIMETABLE") &&
        item.reason === "TEACHING_CLASS",
    ),
  );
  assert.ok(
    periodThree.excluded.some(
      (item) =>
        item.teacherId === ids.get("FIXTURE") &&
        item.reason === "ALREADY_ASSIGNED_FIXTURE",
    ),
  );
  assert.ok(
    periodThree.excluded.some(
      (item) =>
        item.teacherId === ids.get("LATE") && item.reason === "TEACHING_CLASS",
    ),
  );
  const free = periodThree.candidates.find(
    (item) => item.teacherId === ids.get("FREE"),
  )!;
  const short = periodThree.candidates.find(
    (item) => item.teacherId === ids.get("SHORT"),
  )!;
  assert.equal(free.workloadScore, 20);
  assert.equal(free.baseWeeklyTeachingPeriods, 10);
  assert.equal(free.weeklyFixtureCount, 2);
  assert.equal(free.effectiveWeeklyWorkload, 12);
  assert.equal(short.workloadScore, 0);

  const periodFive = await eligibilityFor(5);
  assert.ok(
    periodFive.excluded.some(
      (item) =>
        item.teacherId === ids.get("SHORT") &&
        item.reason === "LEFT_ON_SHORT_LEAVE",
    ),
  );
});

test("historical PRESENT records remain readable while missing rows are present by default", async () => {
  const result = await attendanceService.list(SCHOOL_ID, "2026-08-03");
  assert.ok(result.records.some((record) => record.status === "PRESENT"));
  assert.equal(result.summary.presentByDefault, 3);
});

test("short leave generates a distinct proxy for every parallel timetable assignment", async () => {
  const result = await fixturesService.generate(
    { schoolId: SCHOOL_ID, userId: ids.get("USER")! },
    "2026-08-03",
    [ids.get("LATE")!, ids.get("SHORT")!],
  );
  assert.deepEqual(
    result.fixtures
      .filter((fixture) => fixture.absentTeacherId === ids.get("SHORT"))
      .map((fixture) => fixture.periodNumber)
      .sort((a, b) => a - b),
    [5, 6, 6, 8],
  );

  const lessonSixFixtures = result.fixtures.filter((fixture) => fixture.absentTeacherId === ids.get("SHORT") && fixture.periodNumber === 6);
  assert.equal(lessonSixFixtures.length, 2);
  assert.equal(new Set(lessonSixFixtures.map((fixture) => fixture.subjectId)).size, 2);
  assert.equal(new Set(lessonSixFixtures.map((fixture) => fixture.classSectionId)).size, 1);
  assert.equal(new Set(lessonSixFixtures.map((fixture) => fixture.assignedTeacherId)).size, 2);
  const lessonSix = lessonSixFixtures[0]!;
  assert.ok(lessonSix.assignedTeacherId);
  const proxyLeave = await attendanceService.save(
    { schoolId: SCHOOL_ID, userId: ids.get("USER")! },
    "2026-08-03",
    [
      {
        teacherId: lessonSix.assignedTeacherId!,
        status: "SHORT_LEAVE",
        unavailableFromPeriod: 6,
      },
    ],
  );
  assert.ok(proxyLeave.affectedDraftFixtureIds.includes(lessonSix.id));
  assert.equal(
    (
      await prisma.proxyFixture.findUnique({
        where: { id: lessonSix.id },
      })
    )?.requiresReassignment,
    true,
  );

  await prisma.proxyFixture.update({
    where: { id: result.fixtures[0]!.id },
    data: { status: "PUBLISHED" },
  });
  const duplicateRun = await fixturesService.generate(
    { schoolId: SCHOOL_ID, userId: ids.get("USER")! },
    "2026-08-03",
    [ids.get("LATE")!, ids.get("SHORT")!],
  );
  assert.deepEqual(
    duplicateRun.fixtures.map((fixture) => fixture.id).sort(),
    result.fixtures.map((fixture) => fixture.id).sort(),
  );
});

test("partial day generates fixtures only outside its available range", async () => {
  await prisma.dailyAttendance.update({
    where: {
      schoolId_date_teacherId: {
        schoolId: SCHOOL_ID,
        date: DATE,
        teacherId: ids.get("LATE")!,
      },
    },
    data: {
      status: "PARTIAL_DAY",
      availableFromPeriod: 3,
      unavailableFromPeriod: 7,
    },
  });
  const result = await fixturesService.generate(
    { schoolId: SCHOOL_ID, userId: ids.get("USER")! },
    "2026-08-03",
    [ids.get("LATE")!],
  );
  assert.deepEqual(
    result.fixtures
      .map((fixture) => fixture.periodNumber)
      .sort((left, right) => left - right),
    [1, 7],
  );
  assert.equal(result.diagnostics.affectedLessonCount, 2);
  assert.equal(result.diagnostics.createdFixtureCount, 1);
  assert.equal(result.diagnostics.existingFixtureCount, 1);
});

test("zero fixture generation returns actionable diagnostics", async () => {
  const result = await fixturesService.generate(
    { schoolId: SCHOOL_ID, userId: ids.get("USER")! },
    "2026-08-03",
    [ids.get("ABSENT")!],
  );
  assert.deepEqual(result.fixtures, []);
  assert.deepEqual(result.diagnostics, {
    selectedDate: "2026-08-03",
    resolvedWeekday: "MONDAY",
    unavailableTeacherCount: 1,
    matchingTimetablePeriodCount: 0,
    affectedLessonCount: 0,
    createdFixtureCount: 0,
    existingFixtureCount: 0,
    fixturesWithoutEligibleReplacementCount: 0,
    skippedReasons: [
      "No MONDAY timetable periods matched the selected unavailable teachers",
    ],
  });
});

test("generation performs bulk eligibility reads outside its short write transaction", async () => {
  const originalWriteTransaction = fixturesRepository.writeTransaction;
  const originalEligibilityPool = fixturesRepository.eligibilityPool;
  const originalRegularBusyPeriods = fixturesRepository.regularBusyPeriods;
  const originalFixtureBusyPeriods = fixturesRepository.fixtureBusyPeriods;
  const originalSummariesForWeek = fixturesRepository.summariesForWeek;
  const originalExistingForLectures = fixturesRepository.existingForLectures;
  let insideWriteTransaction = false;
  let writeTransactionCalls = 0;
  const assertReadIsOutsideWriteTransaction = () =>
    assert.equal(
      insideWriteTransaction,
      false,
      "fixture generation attempted a read-heavy query inside its write transaction",
    );

  fixturesRepository.writeTransaction = async <T>(
    callback: (database: FixtureDb) => Promise<T>,
  ) => {
    writeTransactionCalls += 1;
    return originalWriteTransaction(async (database) => {
      insideWriteTransaction = true;
      try {
        return await callback(database);
      } finally {
        insideWriteTransaction = false;
      }
    });
  };
  fixturesRepository.eligibilityPool = (...args) => {
    assertReadIsOutsideWriteTransaction();
    return originalEligibilityPool(...args);
  };
  fixturesRepository.regularBusyPeriods = (...args) => {
    assertReadIsOutsideWriteTransaction();
    return originalRegularBusyPeriods(...args);
  };
  fixturesRepository.fixtureBusyPeriods = (...args) => {
    assertReadIsOutsideWriteTransaction();
    return originalFixtureBusyPeriods(...args);
  };
  fixturesRepository.summariesForWeek = (...args) => {
    assertReadIsOutsideWriteTransaction();
    return originalSummariesForWeek(...args);
  };
  fixturesRepository.existingForLectures = (...args) => {
    assertReadIsOutsideWriteTransaction();
    return originalExistingForLectures(...args);
  };

  try {
    await fixturesService.generate(
      { schoolId: SCHOOL_ID, userId: ids.get("USER")! },
      "2026-08-03",
      [ids.get("ABSENT")!],
    );
    assert.equal(writeTransactionCalls, 1);
  } finally {
    fixturesRepository.writeTransaction = originalWriteTransaction;
    fixturesRepository.eligibilityPool = originalEligibilityPool;
    fixturesRepository.regularBusyPeriods = originalRegularBusyPeriods;
    fixturesRepository.fixtureBusyPeriods = originalFixtureBusyPeriods;
    fixturesRepository.summariesForWeek = originalSummariesForWeek;
    fixturesRepository.existingForLectures = originalExistingForLectures;
  }
});

test("override eligibility excludes teachers outside a partial-day range", async () => {
  await prisma.dailyAttendance.update({
    where: {
      schoolId_date_teacherId: {
        schoolId: SCHOOL_ID,
        date: DATE,
        teacherId: ids.get("FREE")!,
      },
    },
    data: {
      status: "PARTIAL_DAY",
      availableFromPeriod: 4,
      unavailableFromPeriod: 7,
    },
  });
  try {
    const result = await eligibilityFor(3);
    assert.ok(
      result.excluded.some(
        (teacher) =>
          teacher.teacherId === ids.get("FREE") &&
          teacher.reason === "OUTSIDE_PARTIAL_DAY_RANGE",
      ),
    );
  } finally {
    await prisma.dailyAttendance.update({
      where: {
        schoolId_date_teacherId: {
          schoolId: SCHOOL_ID,
          date: DATE,
          teacherId: ids.get("FREE")!,
        },
      },
      data: {
        status: "PRESENT",
        availableFromPeriod: null,
        unavailableFromPeriod: null,
      },
    });
  }
});

for (const weekendDate of ["2026-08-08", "2026-08-09"] as const) {
  test(`fixture generation rejects weekend date ${weekendDate}`, async () => {
    await assert.rejects(
      fixturesService.generate(
        { schoolId: SCHOOL_ID, userId: ids.get("USER")! },
        weekendDate,
        [ids.get("ABSENT")!],
      ),
      (error: unknown) =>
        error instanceof Error &&
        "code" in error &&
        error.code === "NON_WORKING_DAY" &&
        error.message.includes("Monday-to-Friday"),
    );
  });
}
