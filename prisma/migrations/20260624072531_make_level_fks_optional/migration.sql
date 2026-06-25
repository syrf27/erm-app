-- DropForeignKey
ALTER TABLE "AnalisisRisiko" DROP CONSTRAINT "AnalisisRisiko_levelDampakId_fkey";

-- DropForeignKey
ALTER TABLE "AnalisisRisiko" DROP CONSTRAINT "AnalisisRisiko_levelKemungkinanId_fkey";

-- DropForeignKey
ALTER TABLE "AnalisisRisiko" DROP CONSTRAINT "AnalisisRisiko_levelRisikoId_fkey";

-- AlterTable
ALTER TABLE "AnalisisRisiko" ALTER COLUMN "levelKemungkinanId" DROP NOT NULL,
ALTER COLUMN "levelDampakId" DROP NOT NULL,
ALTER COLUMN "levelRisikoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AnalisisRisiko" ADD CONSTRAINT "AnalisisRisiko_levelKemungkinanId_fkey" FOREIGN KEY ("levelKemungkinanId") REFERENCES "LevelKemungkinan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalisisRisiko" ADD CONSTRAINT "AnalisisRisiko_levelDampakId_fkey" FOREIGN KEY ("levelDampakId") REFERENCES "LevelDampak"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalisisRisiko" ADD CONSTRAINT "AnalisisRisiko_levelRisikoId_fkey" FOREIGN KEY ("levelRisikoId") REFERENCES "LevelRisiko"("id") ON DELETE SET NULL ON UPDATE CASCADE;
