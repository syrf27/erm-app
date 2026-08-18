-- AlterTable
ALTER TABLE "EvaluasiRisiko" ADD COLUMN     "residualLevelDampakId" INTEGER,
ADD COLUMN     "residualLevelKemungkinanId" INTEGER,
ADD COLUMN     "residualLevelRisikoId" INTEGER;

-- AddForeignKey
ALTER TABLE "EvaluasiRisiko" ADD CONSTRAINT "EvaluasiRisiko_residualLevelKemungkinanId_fkey" FOREIGN KEY ("residualLevelKemungkinanId") REFERENCES "LevelKemungkinan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluasiRisiko" ADD CONSTRAINT "EvaluasiRisiko_residualLevelDampakId_fkey" FOREIGN KEY ("residualLevelDampakId") REFERENCES "LevelDampak"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluasiRisiko" ADD CONSTRAINT "EvaluasiRisiko_residualLevelRisikoId_fkey" FOREIGN KEY ("residualLevelRisikoId") REFERENCES "LevelRisiko"("id") ON DELETE SET NULL ON UPDATE CASCADE;
