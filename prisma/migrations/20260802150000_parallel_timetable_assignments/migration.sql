DROP INDEX "master_timetable_schoolId_dayOfWeek_periodNumber_teacherId_key";

DROP INDEX "proxy_fixtures_schoolId_date_periodNumber_classSectionId_absentTeacherId_key";
CREATE UNIQUE INDEX "proxy_fixtures_exact_assignment_key"
ON "proxy_fixtures"("schoolId", "date", "periodNumber", "classSectionId", "subjectId", "absentTeacherId");
