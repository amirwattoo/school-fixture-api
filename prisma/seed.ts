import bcrypt from "bcrypt";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

import { importOfficialTimetableFromFiles } from "../src/modules/timetable-import/official-timetable-import.service.js";

const prisma = new PrismaClient();

const seed = async () => {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  const school = await prisma.school.upsert({
    where: { id: "fgps-college-no-2" },
    update: {
      name: "FGPS & College No. 2",
      shortName: "FGPS College No. 2",
      timezone: "Asia/Karachi",
      academicYear: "2026",
      periodsPerDay: 8,
    },
    create: {
      id: "fgps-college-no-2",
      name: "FGPS & College No. 2",
      shortName: "FGPS College No. 2",
      timezone: "Asia/Karachi",
      academicYear: "2026",
      periodsPerDay: 8,
    },
  });

  const users = [
    {
      email: "principal@fgps2.local",
      name: "Principal",
      role: "PRINCIPAL" as const,
    },
    {
      email: "timetable@fgps2.local",
      name: "Timetable Incharge",
      role: "TIMETABLE_INCHARGE" as const,
    },
  ];

  for (const user of users) {
    await prisma.systemUser.upsert({
      where: {
        schoolId_email: {
          schoolId: school.id,
          email: user.email,
        },
      },
      update: {
        name: user.name,
        role: user.role,
        isActive: true,
      },
      create: {
        schoolId: school.id,
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        isActive: true,
        mustChangePassword: true,
      },
    });
  }

  const sourceDirectory = new URL("../../../source-data/", import.meta.url);
  const importSummary = await importOfficialTimetableFromFiles(
    school.id,
    fileURLToPath(new URL("generated-current-timetable.json", sourceDirectory)),
    fileURLToPath(
      new URL("generated-current-timetable-validation.json", sourceDirectory),
    ),
    prisma,
  );
  console.log(
    `Seeded FGPS & College No. 2: ${users.length} users and ${importSummary.importedTimetableRows} official timetable entries`,
  );
};

seed()
  .catch((error: unknown) => {
    console.error("Database seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
