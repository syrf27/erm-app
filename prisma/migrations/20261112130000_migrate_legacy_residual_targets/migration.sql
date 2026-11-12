-- Before dedicated residual-target columns existed, target values were stored
-- in RencanaPenanganan.residualLevel*. Move only rows that have no monitoring
-- realization/evidence, so genuine post-RTP monitoring results are preserved.
UPDATE "RencanaPenanganan" AS rp
SET
  "targetResidualLevelKemungkinanId" = COALESCE(
    rp."targetResidualLevelKemungkinanId",
    rp."residualLevelKemungkinanId"
  ),
  "targetResidualLevelDampakId" = COALESCE(
    rp."targetResidualLevelDampakId",
    rp."residualLevelDampakId"
  ),
  "residualLevelKemungkinanId" = NULL,
  "residualLevelDampakId" = NULL
WHERE
  (rp."residualLevelKemungkinanId" IS NOT NULL OR rp."residualLevelDampakId" IS NOT NULL)
  AND rp."keterjadiRisiko" IS NULL
  AND rp."realisasiWaktu" IS NULL
  AND rp."realisasiOutput" IS NULL
  AND rp."dokumenPendukung" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "DokumenPendukung" AS dp
    WHERE dp."rencanaPenangananId" = rp."id"
  );
