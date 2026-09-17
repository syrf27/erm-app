ALTER TABLE "AreaDampak"
ADD COLUMN IF NOT EXISTS "kode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AreaDampak_kode_key"
ON "AreaDampak"("kode");
