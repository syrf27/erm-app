-- Siklus pemantauan triwulanan, riwayat, dan rantai risiko lanjutan.
-- Migrasi aditif: record lama tetap ACTIVE tanpa parent/source monitoring.

ALTER TABLE "IdentifikasiRisiko" ADD COLUMN     "followUpApprovedAt" TIMESTAMP(3),
ADD COLUMN     "followUpApprovedBy" TEXT,
ADD COLUMN     "followUpTahun" INTEGER,
ADD COLUMN     "followUpTriwulan" INTEGER,
ADD COLUMN     "parentRiskId" INTEGER,
ADD COLUMN     "rootRiskId" INTEGER,
ADD COLUMN     "sourceMonitoringId" INTEGER,
ADD COLUMN     "statusSiklus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "RencanaPenanganan" ADD COLUMN     "alasanPenguatan" TEXT;

CREATE TABLE "PemantauanRisiko" (
    "id" SERIAL NOT NULL,
    "riskId" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "triwulan" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "previousRevisionId" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "rtpId" INTEGER,
    "rtpSnapshot" JSONB,
    "targetOutput" TEXT,
    "targetWaktu" TEXT,
    "penanggungJawab" TEXT,
    "statusPelaksanaan" TEXT,
    "uraianPelaksanaan" TEXT,
    "pekerjaanTertunda" TEXT,
    "realisasiWaktu" TEXT,
    "realisasiOutput" TEXT,
    "keterjadianRisiko" TEXT,
    "efektivitas" TEXT,
    "catatanEfektivitas" TEXT,
    "levelKemungkinanId" INTEGER,
    "levelDampakId" INTEGER,
    "kemungkinanLabel" TEXT,
    "dampakLabel" TEXT,
    "kemungkinanSkala" INTEGER,
    "dampakSkala" INTEGER,
    "besaran" INTEGER,
    "levelRisikoNama" TEXT,
    "levelRisikoWarna" TEXT,
    "seleraSnapshot" INTEGER,
    "residualAcuan" INTEGER,
    "residualHarapan" INTEGER,
    "responRisiko" TEXT,
    "responAlasan" TEXT,
    "createdBy" TEXT,
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "returnedBy" TEXT,
    "returnedAt" TIMESTAMP(3),
    "returnReason" TEXT,
    "finalizedBy" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "correctionReason" TEXT,
    "evaluasiSebelum" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PemantauanRisiko_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PemantauanDokumen" (
    "id" SERIAL NOT NULL,
    "pemantauanId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PemantauanDokumen_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KewajibanTindakLanjut" (
    "id" SERIAL NOT NULL,
    "monitoringId" INTEGER NOT NULL,
    "riskId" INTEGER NOT NULL,
    "followUpRiskId" INTEGER,
    "teamId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'WAJIB',
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastRemindedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KewajibanTindakLanjut_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PemantauanRisiko_previousRevisionId_key" ON "PemantauanRisiko"("previousRevisionId");
CREATE INDEX "PemantauanRisiko_tahun_triwulan_status_idx" ON "PemantauanRisiko"("tahun", "triwulan", "status");
CREATE INDEX "PemantauanRisiko_riskId_tahun_triwulan_idx" ON "PemantauanRisiko"("riskId", "tahun", "triwulan");
CREATE INDEX "PemantauanRisiko_status_idx" ON "PemantauanRisiko"("status");
CREATE UNIQUE INDEX "PemantauanRisiko_riskId_tahun_triwulan_revision_key" ON "PemantauanRisiko"("riskId", "tahun", "triwulan", "revision");
CREATE INDEX "PemantauanDokumen_pemantauanId_idx" ON "PemantauanDokumen"("pemantauanId");
CREATE UNIQUE INDEX "KewajibanTindakLanjut_monitoringId_key" ON "KewajibanTindakLanjut"("monitoringId");
CREATE UNIQUE INDEX "KewajibanTindakLanjut_followUpRiskId_key" ON "KewajibanTindakLanjut"("followUpRiskId");
CREATE INDEX "KewajibanTindakLanjut_status_idx" ON "KewajibanTindakLanjut"("status");
CREATE INDEX "KewajibanTindakLanjut_riskId_idx" ON "KewajibanTindakLanjut"("riskId");
CREATE INDEX "KewajibanTindakLanjut_teamId_idx" ON "KewajibanTindakLanjut"("teamId");
CREATE UNIQUE INDEX "IdentifikasiRisiko_sourceMonitoringId_key" ON "IdentifikasiRisiko"("sourceMonitoringId");
CREATE INDEX IF NOT EXISTS "IdentifikasiRisiko_archivedAt_tahun_idx" ON "IdentifikasiRisiko"("archivedAt", "tahun");
CREATE INDEX "IdentifikasiRisiko_statusSiklus_idx" ON "IdentifikasiRisiko"("statusSiklus");
CREATE INDEX "IdentifikasiRisiko_parentRiskId_idx" ON "IdentifikasiRisiko"("parentRiskId");
CREATE INDEX "IdentifikasiRisiko_rootRiskId_idx" ON "IdentifikasiRisiko"("rootRiskId");
CREATE INDEX "IdentifikasiRisiko_followUpTahun_followUpTriwulan_idx" ON "IdentifikasiRisiko"("followUpTahun", "followUpTriwulan");

ALTER TABLE "IdentifikasiRisiko" ADD CONSTRAINT "IdentifikasiRisiko_parentRiskId_fkey" FOREIGN KEY ("parentRiskId") REFERENCES "IdentifikasiRisiko"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IdentifikasiRisiko" ADD CONSTRAINT "IdentifikasiRisiko_rootRiskId_fkey" FOREIGN KEY ("rootRiskId") REFERENCES "IdentifikasiRisiko"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IdentifikasiRisiko" ADD CONSTRAINT "IdentifikasiRisiko_sourceMonitoringId_fkey" FOREIGN KEY ("sourceMonitoringId") REFERENCES "PemantauanRisiko"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PemantauanRisiko" ADD CONSTRAINT "PemantauanRisiko_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "IdentifikasiRisiko"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PemantauanRisiko" ADD CONSTRAINT "PemantauanRisiko_previousRevisionId_fkey" FOREIGN KEY ("previousRevisionId") REFERENCES "PemantauanRisiko"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PemantauanDokumen" ADD CONSTRAINT "PemantauanDokumen_pemantauanId_fkey" FOREIGN KEY ("pemantauanId") REFERENCES "PemantauanRisiko"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KewajibanTindakLanjut" ADD CONSTRAINT "KewajibanTindakLanjut_monitoringId_fkey" FOREIGN KEY ("monitoringId") REFERENCES "PemantauanRisiko"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KewajibanTindakLanjut" ADD CONSTRAINT "KewajibanTindakLanjut_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "IdentifikasiRisiko"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KewajibanTindakLanjut" ADD CONSTRAINT "KewajibanTindakLanjut_followUpRiskId_fkey" FOREIGN KEY ("followUpRiskId") REFERENCES "IdentifikasiRisiko"("id") ON DELETE SET NULL ON UPDATE CASCADE;
