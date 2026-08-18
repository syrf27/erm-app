-- CreateTable
CREATE TABLE "AnalisisRisiko" (
    "id" SERIAL NOT NULL,
    "identifikasiRisikoId" INTEGER NOT NULL,
    "levelKemungkinanId" INTEGER NOT NULL,
    "levelDampakId" INTEGER NOT NULL,
    "levelRisikoId" INTEGER NOT NULL,
    "pengendalianUraian" TEXT,
    "pengendalianEfektivitas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalisisRisiko_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalisisRisiko_identifikasiRisikoId_key" ON "AnalisisRisiko"("identifikasiRisikoId");

-- AddForeignKey
ALTER TABLE "AnalisisRisiko" ADD CONSTRAINT "AnalisisRisiko_identifikasiRisikoId_fkey" FOREIGN KEY ("identifikasiRisikoId") REFERENCES "IdentifikasiRisiko"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalisisRisiko" ADD CONSTRAINT "AnalisisRisiko_levelKemungkinanId_fkey" FOREIGN KEY ("levelKemungkinanId") REFERENCES "LevelKemungkinan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalisisRisiko" ADD CONSTRAINT "AnalisisRisiko_levelDampakId_fkey" FOREIGN KEY ("levelDampakId") REFERENCES "LevelDampak"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalisisRisiko" ADD CONSTRAINT "AnalisisRisiko_levelRisikoId_fkey" FOREIGN KEY ("levelRisikoId") REFERENCES "LevelRisiko"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
