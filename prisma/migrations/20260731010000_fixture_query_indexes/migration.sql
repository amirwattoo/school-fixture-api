-- AddIndex
CREATE INDEX "master_timetable_schoolId_teacherId_dayOfWeek_periodNumber_idx"
ON "master_timetable"("schoolId", "teacherId", "dayOfWeek", "periodNumber");

-- AddIndex
CREATE INDEX "master_timetable_schoolId_classSectionId_dayOfWeek_periodNumber_idx"
ON "master_timetable"("schoolId", "classSectionId", "dayOfWeek", "periodNumber");

-- AddIndex
CREATE INDEX "daily_attendance_schoolId_teacherId_date_idx"
ON "daily_attendance"("schoolId", "teacherId", "date");

-- AddIndex
CREATE INDEX "proxy_fixtures_schoolId_assignedTeacherId_date_status_idx"
ON "proxy_fixtures"("schoolId", "assignedTeacherId", "date", "status");
