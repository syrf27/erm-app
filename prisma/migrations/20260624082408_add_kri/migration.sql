-- CreateTable
CREATE TABLE "Kri" (
    "id" SERIAL NOT NULL,
    "namaIndikator" TEXT NOT NULL,
    "deskripsi" TEXT,
    "batasHijau" DOUBLE PRECISION,
    "batasKuning" DOUBLE PRECISION,
    "batasMerah" DOUBLE PRECISION,
    "nilaiAktual" DOUBLE PRECISION,
    "frekuensiPemantauan" TEXT,
    "identifikasiRisikoId" INTEGER,
    "penanggungJawab" TEXT,
    "targetNilaiHarapan" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kri_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Kri" ADD CONSTRAINT "Kri_identifikasiRisikoId_fkey" FOREIGN KEY ("identifikasiRisikoId") REFERENCES "IdentifikasiRisiko"("id") ON DELETE SET NULL ON UPDATE CASCADE;
