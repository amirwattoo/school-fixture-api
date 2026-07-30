-- Replace automatic-provider delivery states with explicit click-to-chat states.
-- Every legacy provider result becomes READY because it was not manually confirmed.
CREATE TYPE "WhatsAppStatus_click_to_chat" AS ENUM (
  'READY',
  'OPENED',
  'MANUALLY_CONFIRMED'
);

ALTER TABLE "whatsapp_notifications"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "whatsapp_notifications"
  ALTER COLUMN "status" TYPE "WhatsAppStatus_click_to_chat"
  USING ('READY'::"WhatsAppStatus_click_to_chat");

DROP TYPE "WhatsAppStatus";
ALTER TYPE "WhatsAppStatus_click_to_chat" RENAME TO "WhatsAppStatus";

ALTER TABLE "whatsapp_notifications"
  ALTER COLUMN "status" SET DEFAULT 'READY',
  ALTER COLUMN "provider" SET DEFAULT 'click_to_chat',
  ADD COLUMN "openedAt" TIMESTAMP(3),
  ADD COLUMN "manuallyConfirmedAt" TIMESTAMP(3);

UPDATE "whatsapp_notifications"
SET
  "provider" = 'click_to_chat',
  "providerMessageId" = NULL,
  "providerResponse" = NULL,
  "sentAt" = NULL,
  "failureReason" = NULL;
