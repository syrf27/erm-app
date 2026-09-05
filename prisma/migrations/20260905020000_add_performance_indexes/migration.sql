CREATE INDEX IF NOT EXISTS "IdentifikasiRisiko_tahun_idx" ON "IdentifikasiRisiko"("tahun");
CREATE INDEX IF NOT EXISTS "IdentifikasiRisiko_tahun_updatedAt_idx" ON "IdentifikasiRisiko"("tahun", "updatedAt");
CREATE INDEX IF NOT EXISTS "IdentifikasiRisiko_sasaranId_idx" ON "IdentifikasiRisiko"("sasaranId");
CREATE INDEX IF NOT EXISTS "IdentifikasiRisiko_kegiatanId_idx" ON "IdentifikasiRisiko"("kegiatanId");
CREATE INDEX IF NOT EXISTS "IdentifikasiRisiko_prosesBisnisId_idx" ON "IdentifikasiRisiko"("prosesBisnisId");
CREATE INDEX IF NOT EXISTS "IdentifikasiRisiko_teamId_idx" ON "IdentifikasiRisiko"("teamId");
CREATE INDEX IF NOT EXISTS "IdentifikasiRisiko_jenisRisikoId_idx" ON "IdentifikasiRisiko"("jenisRisikoId");
CREATE INDEX IF NOT EXISTS "IdentifikasiRisiko_sumberRisikoId_idx" ON "IdentifikasiRisiko"("sumberRisikoId");
CREATE INDEX IF NOT EXISTS "IdentifikasiRisiko_kategoriRisikoId_idx" ON "IdentifikasiRisiko"("kategoriRisikoId");
CREATE INDEX IF NOT EXISTS "IdentifikasiRisiko_areaDampakId_idx" ON "IdentifikasiRisiko"("areaDampakId");

CREATE INDEX IF NOT EXISTS "AnalisisRisiko_levelKemungkinanId_idx" ON "AnalisisRisiko"("levelKemungkinanId");
CREATE INDEX IF NOT EXISTS "AnalisisRisiko_levelDampakId_idx" ON "AnalisisRisiko"("levelDampakId");
CREATE INDEX IF NOT EXISTS "AnalisisRisiko_levelRisikoId_idx" ON "AnalisisRisiko"("levelRisikoId");

CREATE INDEX IF NOT EXISTS "EvaluasiRisiko_responRisiko_idx" ON "EvaluasiRisiko"("responRisiko");
CREATE INDEX IF NOT EXISTS "EvaluasiRisiko_residualLevelKemungkinanId_idx" ON "EvaluasiRisiko"("residualLevelKemungkinanId");
CREATE INDEX IF NOT EXISTS "EvaluasiRisiko_residualLevelDampakId_idx" ON "EvaluasiRisiko"("residualLevelDampakId");
CREATE INDEX IF NOT EXISTS "EvaluasiRisiko_residualLevelRisikoId_idx" ON "EvaluasiRisiko"("residualLevelRisikoId");

CREATE INDEX IF NOT EXISTS "RencanaPenanganan_targetWaktu_idx" ON "RencanaPenanganan"("targetWaktu");
CREATE INDEX IF NOT EXISTS "RencanaPenanganan_penanggungJawab_idx" ON "RencanaPenanganan"("penanggungJawab");
CREATE INDEX IF NOT EXISTS "RencanaPenanganan_residualLevelKemungkinanId_idx" ON "RencanaPenanganan"("residualLevelKemungkinanId");
CREATE INDEX IF NOT EXISTS "RencanaPenanganan_residualLevelDampakId_idx" ON "RencanaPenanganan"("residualLevelDampakId");

CREATE INDEX IF NOT EXISTS "DokumenPendukung_rencanaPenangananId_idx" ON "DokumenPendukung"("rencanaPenangananId");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");
