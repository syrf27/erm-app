-- Integritas workflow, rekonsiliasi koreksi, snapshot matriks, dan notifikasi idempoten.

ALTER TABLE "KewajibanTindakLanjut" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "resolution" TEXT;

ALTER TABLE "Notification" ADD COLUMN     "dedupeKey" TEXT;

ALTER TABLE "PemantauanRisiko" ADD COLUMN     "matriksSnapshot" JSONB,
ADD COLUMN     "reconciledAt" TIMESTAMP(3),
ADD COLUMN     "reconciledBy" TEXT,
ADD COLUMN     "reconciliationDecision" TEXT,
ADD COLUMN     "reconciliationNote" TEXT;

CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
