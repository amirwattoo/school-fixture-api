-- Add a unified partial-day attendance status and configurable half-day boundary.
ALTER TYPE "AttendanceStatus" ADD VALUE 'PARTIAL_DAY';

ALTER TABLE "schools"
ADD COLUMN "halfDayBoundaryPeriod" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "daily_attendance"
ADD COLUMN "reason" TEXT,
ADD COLUMN "notes" TEXT;

-- Preserve the meaning of legacy remarks as the new reason field.
UPDATE "daily_attendance"
SET "reason" = "remarks"
WHERE "reason" IS NULL AND "remarks" IS NOT NULL;

ALTER TABLE "daily_attendance"
ADD CONSTRAINT "daily_attendance_available_period_check"
CHECK ("availableFromPeriod" IS NULL OR "availableFromPeriod" BETWEEN 1 AND 8),
ADD CONSTRAINT "daily_attendance_unavailable_period_check"
CHECK ("unavailableFromPeriod" IS NULL OR "unavailableFromPeriod" BETWEEN 1 AND 8),
ADD CONSTRAINT "daily_attendance_period_range_check"
CHECK (
  "availableFromPeriod" IS NULL
  OR "unavailableFromPeriod" IS NULL
  OR "availableFromPeriod" < "unavailableFromPeriod"
);

ALTER TABLE "schools"
ADD CONSTRAINT "schools_half_day_boundary_check"
CHECK (
  "halfDayBoundaryPeriod" >= 2
  AND "halfDayBoundaryPeriod" <= "periodsPerDay"
);
