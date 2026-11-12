-- Risiko residual harapan adalah target setelah RTP dilaksanakan, berbeda
-- dari residual aktual yang diisi saat pemantauan.
ALTER TABLE "RencanaPenanganan"
ADD COLUMN "targetResidualLevelKemungkinanId" INTEGER,
ADD COLUMN "targetResidualLevelDampakId" INTEGER;

CREATE INDEX "RencanaPenanganan_targetResidualLevelKemungkinanId_idx"
ON "RencanaPenanganan"("targetResidualLevelKemungkinanId");

CREATE INDEX "RencanaPenanganan_targetResidualLevelDampakId_idx"
ON "RencanaPenanganan"("targetResidualLevelDampakId");

ALTER TABLE "RencanaPenanganan"
ADD CONSTRAINT "RencanaPenanganan_targetResidualLevelKemungkinanId_fkey"
FOREIGN KEY ("targetResidualLevelKemungkinanId") REFERENCES "LevelKemungkinan"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RencanaPenanganan"
ADD CONSTRAINT "RencanaPenanganan_targetResidualLevelDampakId_fkey"
FOREIGN KEY ("targetResidualLevelDampakId") REFERENCES "LevelDampak"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
