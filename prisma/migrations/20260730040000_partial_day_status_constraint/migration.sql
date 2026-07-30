-- Extend the existing status/boundary integrity rule for PARTIAL_DAY.
ALTER TABLE "daily_attendance"
DROP CONSTRAINT "daily_attendance_status_periods_check";

ALTER TABLE "daily_attendance"
ADD CONSTRAINT "daily_attendance_status_periods_check"
CHECK (
  ("status"::text = 'LATE' AND "availableFromPeriod" IS NOT NULL AND "unavailableFromPeriod" IS NULL)
  OR
  ("status"::text = 'SHORT_LEAVE' AND "availableFromPeriod" IS NULL AND "unavailableFromPeriod" IS NOT NULL)
  OR
  (
    "status"::text = 'PARTIAL_DAY'
    AND ("availableFromPeriod" IS NOT NULL OR "unavailableFromPeriod" IS NOT NULL)
    AND (
      "availableFromPeriod" IS NULL
      OR "unavailableFromPeriod" IS NULL
      OR "availableFromPeriod" < "unavailableFromPeriod"
    )
  )
  OR
  ("status"::text IN ('PRESENT', 'ABSENT', 'LEAVE') AND "availableFromPeriod" IS NULL AND "unavailableFromPeriod" IS NULL)
);
