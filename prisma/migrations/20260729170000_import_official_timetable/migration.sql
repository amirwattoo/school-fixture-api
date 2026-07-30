-- HIFZ is a named class group rather than a numbered grade.
ALTER TABLE "class_sections"
ALTER COLUMN "gradeNumber" DROP NOT NULL;

-- A class lesson may contain parallel subject groups in the authoritative PDF.
DROP INDEX "master_timetable_schoolId_dayOfWeek_periodNumber_classSecti_key";
CREATE UNIQUE INDEX "master_timetable_exact_lecture_key"
ON "master_timetable"(
  "schoolId",
  "dayOfWeek",
  "periodNumber",
  "classSectionId",
  "teacherId",
  "subjectId"
);

-- Link generated fixtures to their exact source lecture while preserving legacy
-- fixture rows, whose source lecture remains NULL.
ALTER TABLE "proxy_fixtures"
ADD COLUMN "masterTimetableId" TEXT;

DROP INDEX "proxy_fixtures_schoolId_date_periodNumber_classSectionId_key";
CREATE UNIQUE INDEX "proxy_fixtures_schoolId_date_masterTimetableId_key"
ON "proxy_fixtures"("schoolId", "date", "masterTimetableId");
CREATE INDEX "proxy_fixtures_masterTimetableId_idx"
ON "proxy_fixtures"("masterTimetableId");

ALTER TABLE "proxy_fixtures"
ADD CONSTRAINT "proxy_fixtures_masterTimetableId_fkey"
FOREIGN KEY ("masterTimetableId")
REFERENCES "master_timetable"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
