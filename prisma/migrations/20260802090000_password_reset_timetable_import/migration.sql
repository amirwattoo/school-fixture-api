CREATE TYPE "TimetableImportStatus" AS ENUM ('PREVIEWED', 'IMPORTED', 'FAILED');

CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "requestedIpHash" TEXT,
  "userAgentHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_tokenHash_expiresAt_usedAt_idx" ON "password_reset_tokens"("tokenHash", "expiresAt", "usedAt");
CREATE INDEX "password_reset_tokens_userId_createdAt_idx" ON "password_reset_tokens"("userId", "createdAt");
CREATE INDEX "password_reset_tokens_schoolId_createdAt_idx" ON "password_reset_tokens"("schoolId", "createdAt");
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "system_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "timetable_import_batches" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "status" "TimetableImportStatus" NOT NULL DEFAULT 'PREVIEWED',
  "originalFileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileHash" TEXT NOT NULL,
  "preview" JSONB NOT NULL,
  "previousSnapshot" JSONB,
  "importedRows" INTEGER NOT NULL DEFAULT 0,
  "warningCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "importedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "timetable_import_batches_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "timetable_import_batches_schoolId_createdAt_idx" ON "timetable_import_batches"("schoolId", "createdAt");
CREATE INDEX "timetable_import_batches_schoolId_status_createdAt_idx" ON "timetable_import_batches"("schoolId", "status", "createdAt");
ALTER TABLE "timetable_import_batches" ADD CONSTRAINT "timetable_import_batches_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timetable_import_batches" ADD CONSTRAINT "timetable_import_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "system_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
