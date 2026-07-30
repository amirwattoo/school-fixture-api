import { resolve } from "node:path";

import { importOfficialTimetableFromFiles } from "../src/modules/timetable-import/official-timetable-import.service.js";
import { prisma } from "../src/prisma/client.js";

const sourceDirectory = resolve(import.meta.dirname, "../../../source-data");

try {
  const summary = await importOfficialTimetableFromFiles(
    "fgps-college-no-2",
    resolve(sourceDirectory, "generated-current-timetable.json"),
    resolve(sourceDirectory, "generated-current-timetable-validation.json"),
  );
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await prisma.$disconnect();
}
