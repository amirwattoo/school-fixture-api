-- CreateEnum
CREATE TYPE "WhatsAppStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "proxy_fixtures" ADD COLUMN     "assignmentVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "whatsapp_notifications" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "WhatsAppStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "providerResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_notifications_idempotencyKey_key" ON "whatsapp_notifications"("idempotencyKey");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_schoolId_status_idx" ON "whatsapp_notifications"("schoolId", "status");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_schoolId_createdAt_idx" ON "whatsapp_notifications"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_fixtureId_idx" ON "whatsapp_notifications"("fixtureId");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_teacherId_idx" ON "whatsapp_notifications"("teacherId");

-- AddForeignKey
ALTER TABLE "whatsapp_notifications" ADD CONSTRAINT "whatsapp_notifications_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notifications" ADD CONSTRAINT "whatsapp_notifications_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "proxy_fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notifications" ADD CONSTRAINT "whatsapp_notifications_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
