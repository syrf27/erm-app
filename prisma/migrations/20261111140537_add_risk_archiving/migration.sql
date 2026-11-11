-- AlterTable
ALTER TABLE "IdentifikasiRisiko" ADD COLUMN     "archiveReason" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT;

-- CreateIndex
CREATE INDEX "IdentifikasiRisiko_archivedAt_tahun_idx"
ON "IdentifikasiRisiko"("archivedAt", "tahun");
