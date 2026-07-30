-- CreateEnum
CREATE TYPE "TeachingLevel" AS ENUM ('LOWER', 'HIGHER', 'BOTH');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "whatsappNumber" TEXT,
    "subjectSpecializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "teachingLevel" "TeachingLevel" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sections" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeNumber" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "teachingLevel" "TeachingLevel" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_timetable" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "classSectionId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_timetable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teachers_schoolId_isActive_idx" ON "teachers"("schoolId", "isActive");

-- CreateIndex
CREATE INDEX "teachers_schoolId_name_idx" ON "teachers"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_schoolId_employeeCode_key" ON "teachers"("schoolId", "employeeCode");

-- CreateIndex
CREATE INDEX "subjects_schoolId_isActive_idx" ON "subjects"("schoolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_schoolId_name_key" ON "subjects"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_schoolId_code_key" ON "subjects"("schoolId", "code");

-- CreateIndex
CREATE INDEX "class_sections_schoolId_isActive_idx" ON "class_sections"("schoolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "class_sections_schoolId_gradeNumber_section_key" ON "class_sections"("schoolId", "gradeNumber", "section");

-- CreateIndex
CREATE UNIQUE INDEX "class_sections_schoolId_name_key" ON "class_sections"("schoolId", "name");

-- CreateIndex
CREATE INDEX "master_timetable_schoolId_dayOfWeek_periodNumber_idx" ON "master_timetable"("schoolId", "dayOfWeek", "periodNumber");

-- CreateIndex
CREATE INDEX "master_timetable_teacherId_dayOfWeek_idx" ON "master_timetable"("teacherId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "master_timetable_classSectionId_dayOfWeek_idx" ON "master_timetable"("classSectionId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "master_timetable_schoolId_dayOfWeek_periodNumber_classSecti_key" ON "master_timetable"("schoolId", "dayOfWeek", "periodNumber", "classSectionId");

-- CreateIndex
CREATE UNIQUE INDEX "master_timetable_schoolId_dayOfWeek_periodNumber_teacherId_key" ON "master_timetable"("schoolId", "dayOfWeek", "periodNumber", "teacherId");

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_timetable" ADD CONSTRAINT "master_timetable_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_timetable" ADD CONSTRAINT "master_timetable_classSectionId_fkey" FOREIGN KEY ("classSectionId") REFERENCES "class_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_timetable" ADD CONSTRAINT "master_timetable_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_timetable" ADD CONSTRAINT "master_timetable_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
