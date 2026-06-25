-- CreateTable
CREATE TABLE "EvaluasiRisiko" (
    "id" SERIAL NOT NULL,
    "identifikasiRisikoId" INTEGER NOT NULL,
    "responRisiko" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluasiRisiko_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvaluasiRisiko_identifikasiRisikoId_key" ON "EvaluasiRisiko"("identifikasiRisikoId");

-- AddForeignKey
ALTER TABLE "EvaluasiRisiko" ADD CONSTRAINT "EvaluasiRisiko_identifikasiRisikoId_fkey" FOREIGN KEY ("identifikasiRisikoId") REFERENCES "IdentifikasiRisiko"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
