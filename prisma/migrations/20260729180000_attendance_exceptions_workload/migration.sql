ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'SHORT_LEAVE';

ALTER TABLE "teachers"
ADD COLUMN "baseWeeklyTeachingPeriods" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "daily_attendance"
ADD COLUMN "availableFromPeriod" INTEGER,
ADD COLUMN "unavailableFromPeriod" INTEGER;

-- Historical LATE rows predate period-aware attendance. Period 1 retains those
-- reports while making the teacher available for the complete day.
UPDATE "daily_attendance"
SET "availableFromPeriod" = 1
WHERE "status" = 'LATE' AND "availableFromPeriod" IS NULL;

ALTER TABLE "daily_attendance"
ADD CONSTRAINT "daily_attendance_period_bounds_check"
CHECK (
  ("availableFromPeriod" IS NULL OR "availableFromPeriod" BETWEEN 1 AND 8)
  AND
  ("unavailableFromPeriod" IS NULL OR "unavailableFromPeriod" BETWEEN 1 AND 8)
),
ADD CONSTRAINT "daily_attendance_status_periods_check"
CHECK (
  ("status"::text = 'LATE' AND "availableFromPeriod" IS NOT NULL AND "unavailableFromPeriod" IS NULL)
  OR
  ("status"::text = 'SHORT_LEAVE' AND "availableFromPeriod" IS NULL AND "unavailableFromPeriod" IS NOT NULL)
  OR
  ("status"::text IN ('PRESENT', 'ABSENT', 'LEAVE') AND "availableFromPeriod" IS NULL AND "unavailableFromPeriod" IS NULL)
);

ALTER TABLE "proxy_fixtures"
ADD COLUMN "requiresReassignment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reassignmentReason" TEXT;

UPDATE "teachers"
SET "baseWeeklyTeachingPeriods" = CASE "name"
  WHEN 'Akhtar Ejaz' THEN 30
  WHEN 'Akif Inam' THEN 28
  WHEN 'Ali Hasnain' THEN 28
  WHEN 'Anees ur Rehman' THEN 22
  WHEN 'Azhar Abbas' THEN 15
  WHEN 'Babar Sultan' THEN 31
  WHEN 'Binyamin' THEN 28
  WHEN 'Chand Khushi' THEN 29
  WHEN 'Ehsan Ul Haq' THEN 30
  WHEN 'Habib ur Rehman' THEN 28
  WHEN 'Ibtsam Ashraf' THEN 28
  WHEN 'Ilahi Bukhsh' THEN 27
  WHEN 'Iqbal Hussain' THEN 30
  WHEN 'Muhammad Aamir' THEN 26
  WHEN 'Muhammad Jameel' THEN 20
  WHEN 'Muhammad Talha' THEN 32
  WHEN 'Naveed Arif' THEN 30
  WHEN 'Rizwan Nasir' THEN 29
  WHEN 'Saeed Ahmed Raza' THEN 32
  WHEN 'Sajid Tabbassum' THEN 30
  WHEN 'Sammar Hussain' THEN 25
  WHEN 'Saqib Sheraz' THEN 26
  WHEN 'Shahid Zulfiqar' THEN 28
  WHEN 'Shahzad Memon' THEN 0
  WHEN 'Shamim Ijaz' THEN 25
  WHEN 'Shoukat Ali' THEN 27
  WHEN 'Usman Afzal' THEN 29
  WHEN 'Waseem Haider' THEN 31
  WHEN 'Zahid Ikram' THEN 30
  WHEN 'Zahid Nadeem' THEN 26
  ELSE "baseWeeklyTeachingPeriods"
END
WHERE "name" IN (
  'Akhtar Ejaz', 'Akif Inam', 'Ali Hasnain', 'Anees ur Rehman',
  'Azhar Abbas', 'Babar Sultan', 'Binyamin', 'Chand Khushi',
  'Ehsan Ul Haq', 'Habib ur Rehman', 'Ibtsam Ashraf', 'Ilahi Bukhsh',
  'Iqbal Hussain', 'Muhammad Aamir', 'Muhammad Jameel', 'Muhammad Talha',
  'Naveed Arif', 'Rizwan Nasir', 'Saeed Ahmed Raza', 'Sajid Tabbassum',
  'Sammar Hussain', 'Saqib Sheraz', 'Shahid Zulfiqar', 'Shahzad Memon',
  'Shamim Ijaz', 'Shoukat Ali', 'Usman Afzal', 'Waseem Haider',
  'Zahid Ikram', 'Zahid Nadeem'
);
