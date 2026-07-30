-- Prevent duplicate fixtures for the same affected school lesson.
CREATE UNIQUE INDEX "proxy_fixtures_schoolId_date_periodNumber_classSectionId_absentTeacherId_key"
ON "proxy_fixtures"("schoolId", "date", "periodNumber", "classSectionId", "absentTeacherId");
