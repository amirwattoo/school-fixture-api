-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LEAVE', 'LATE');

-- CreateEnum
CREATE TYPE "FixtureStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "daily_attendance" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "teacherId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "remarks" TEXT,
    "markedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proxy_fixtures" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "classSectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "absentTeacherId" TEXT NOT NULL,
    "assignedTeacherId" TEXT,
    "autoAssignedTeacherId" TEXT,
    "status" "FixtureStatus" NOT NULL DEFAULT 'DRAFT',
    "autoScore" DOUBLE PRECISION,
    "scoringDetails" JSONB,
    "isManuallyOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "overriddenById" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "workloadCounted" BOOLEAN NOT NULL DEFAULT false,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proxy_fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_fixture_summaries" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "fixtureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_fixture_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_attendance_schoolId_date_status_idx" ON "daily_attendance"("schoolId", "date", "status");

-- CreateIndex
CREATE INDEX "daily_attendance_teacherId_date_idx" ON "daily_attendance"("teacherId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_attendance_schoolId_date_teacherId_key" ON "daily_attendance"("schoolId", "date", "teacherId");

-- CreateIndex
CREATE INDEX "proxy_fixtures_schoolId_date_status_idx" ON "proxy_fixtures"("schoolId", "date", "status");

-- CreateIndex
CREATE INDEX "proxy_fixtures_schoolId_date_assignedTeacherId_idx" ON "proxy_fixtures"("schoolId", "date", "assignedTeacherId");

-- CreateIndex
CREATE INDEX "proxy_fixtures_schoolId_date_periodNumber_assignedTeacherId_idx" ON "proxy_fixtures"("schoolId", "date", "periodNumber", "assignedTeacherId");

-- CreateIndex
CREATE UNIQUE INDEX "proxy_fixtures_schoolId_date_periodNumber_classSectionId_key" ON "proxy_fixtures"("schoolId", "date", "periodNumber", "classSectionId");

-- CreateIndex
CREATE INDEX "teacher_fixture_summaries_schoolId_year_weekNumber_idx" ON "teacher_fixture_summaries"("schoolId", "year", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_fixture_summaries_schoolId_teacherId_year_weekNumbe_key" ON "teacher_fixture_summaries"("schoolId", "teacherId", "year", "weekNumber");

-- AddForeignKey
ALTER TABLE "daily_attendance" ADD CONSTRAINT "daily_attendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_attendance" ADD CONSTRAINT "daily_attendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_attendance" ADD CONSTRAINT "daily_attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "system_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proxy_fixtures" ADD CONSTRAINT "proxy_fixtures_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proxy_fixtures" ADD CONSTRAINT "proxy_fixtures_classSectionId_fkey" FOREIGN KEY ("classSectionId") REFERENCES "class_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proxy_fixtures" ADD CONSTRAINT "proxy_fixtures_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proxy_fixtures" ADD CONSTRAINT "proxy_fixtures_absentTeacherId_fkey" FOREIGN KEY ("absentTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proxy_fixtures" ADD CONSTRAINT "proxy_fixtures_assignedTeacherId_fkey" FOREIGN KEY ("assignedTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proxy_fixtures" ADD CONSTRAINT "proxy_fixtures_autoAssignedTeacherId_fkey" FOREIGN KEY ("autoAssignedTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proxy_fixtures" ADD CONSTRAINT "proxy_fixtures_overriddenById_fkey" FOREIGN KEY ("overriddenById") REFERENCES "system_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proxy_fixtures" ADD CONSTRAINT "proxy_fixtures_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "system_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_fixture_summaries" ADD CONSTRAINT "teacher_fixture_summaries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_fixture_summaries" ADD CONSTRAINT "teacher_fixture_summaries_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
