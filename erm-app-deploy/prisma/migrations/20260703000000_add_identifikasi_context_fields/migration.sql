-- AlterTable
ALTER TABLE "IdentifikasiRisiko" ADD COLUMN "sasaranId" INTEGER,
ADD COLUMN "prosesBisnisId" INTEGER;

-- AddForeignKey
ALTER TABLE "IdentifikasiRisiko" ADD CONSTRAINT "IdentifikasiRisiko_sasaranId_fkey" FOREIGN KEY ("sasaranId") REFERENCES "Sasaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentifikasiRisiko" ADD CONSTRAINT "IdentifikasiRisiko_prosesBisnisId_fkey" FOREIGN KEY ("prosesBisnisId") REFERENCES "ProsesBisnis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
