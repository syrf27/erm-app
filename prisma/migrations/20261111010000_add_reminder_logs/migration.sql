CREATE TABLE "ReminderLog" (
    "id" SERIAL NOT NULL,
    "rencanaPenangananId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "recipientSource" TEXT,
    "status" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "error" TEXT,
    "sentBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReminderLog_rencanaPenangananId_createdAt_idx" ON "ReminderLog"("rencanaPenangananId", "createdAt");
CREATE INDEX "ReminderLog_channel_status_createdAt_idx" ON "ReminderLog"("channel", "status", "createdAt");
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_rencanaPenangananId_fkey" FOREIGN KEY ("rencanaPenangananId") REFERENCES "RencanaPenanganan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
