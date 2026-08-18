-- AlterTable
ALTER TABLE "LevelDampak" ADD COLUMN     "skala" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "RencanaPenanganan" (
    "id" SERIAL NOT NULL,
    "identifikasiRisikoId" INTEGER NOT NULL,
    "rencanaTidakPenanganan" TEXT,
    "targetOutput" TEXT,
    "targetWaktu" TEXT,
    "penanggungJawab" TEXT,
    "residualLevelKemungkinanId" INTEGER,
    "residualLevelDampakId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RencanaPenanganan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RencanaPenanganan_identifikasiRisikoId_key" ON "RencanaPenanganan"("identifikasiRisikoId");

-- AddForeignKey
ALTER TABLE "RencanaPenanganan" ADD CONSTRAINT "RencanaPenanganan_identifikasiRisikoId_fkey" FOREIGN KEY ("identifikasiRisikoId") REFERENCES "IdentifikasiRisiko"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RencanaPenanganan" ADD CONSTRAINT "RencanaPenanganan_residualLevelKemungkinanId_fkey" FOREIGN KEY ("residualLevelKemungkinanId") REFERENCES "LevelKemungkinan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RencanaPenanganan" ADD CONSTRAINT "RencanaPenanganan_residualLevelDampakId_fkey" FOREIGN KEY ("residualLevelDampakId") REFERENCES "LevelDampak"("id") ON DELETE SET NULL ON UPDATE CASCADE;
