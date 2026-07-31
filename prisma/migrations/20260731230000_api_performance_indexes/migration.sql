-- Support subject-filtered timetable screens without scanning a school's
-- complete timetable.
CREATE INDEX "master_timetable_schoolId_subjectId_dayOfWeek_periodNumber_idx"
ON "master_timetable"("schoolId", "subjectId", "dayOfWeek", "periodNumber");

-- Support status-filtered notification lists ordered by newest first.
CREATE INDEX "whatsapp_notifications_schoolId_status_createdAt_idx"
ON "whatsapp_notifications"("schoolId", "status", "createdAt");

-- Support teacher-filtered notification history ordered by newest first.
CREATE INDEX "whatsapp_notifications_schoolId_teacherId_createdAt_idx"
ON "whatsapp_notifications"("schoolId", "teacherId", "createdAt");
