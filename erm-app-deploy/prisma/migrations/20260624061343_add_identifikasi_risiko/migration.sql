-- CreateTable
CREATE TABLE "IdentifikasiRisiko" (
    "id" SERIAL NOT NULL,
    "risiko" TEXT NOT NULL,
    "jenisRisikoId" INTEGER NOT NULL,
    "sumberRisikoId" INTEGER NOT NULL,
    "kategoriRisikoId" INTEGER NOT NULL,
    "areaDampakId" INTEGER NOT NULL,
    "penyebab" TEXT,
    "dampak" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentifikasiRisiko_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IdentifikasiRisiko" ADD CONSTRAINT "IdentifikasiRisiko_jenisRisikoId_fkey" FOREIGN KEY ("jenisRisikoId") REFERENCES "JenisRisiko"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentifikasiRisiko" ADD CONSTRAINT "IdentifikasiRisiko_sumberRisikoId_fkey" FOREIGN KEY ("sumberRisikoId") REFERENCES "SumberRisiko"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentifikasiRisiko" ADD CONSTRAINT "IdentifikasiRisiko_kategoriRisikoId_fkey" FOREIGN KEY ("kategoriRisikoId") REFERENCES "KategoriRisiko"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentifikasiRisiko" ADD CONSTRAINT "IdentifikasiRisiko_areaDampakId_fkey" FOREIGN KEY ("areaDampakId") REFERENCES "AreaDampak"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
