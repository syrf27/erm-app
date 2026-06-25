-- CreateTable
CREATE TABLE "Sasaran" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sasaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProsesBisnis" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProsesBisnis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PemangkuKepentingan" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PemangkuKepentingan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeraturanPerundangan" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeraturanPerundangan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JenisRisiko" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JenisRisiko_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SumberRisiko" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SumberRisiko_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KategoriRisiko" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KategoriRisiko_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaDampak" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaDampak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelKemungkinan" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "skala" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelKemungkinan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelDampak" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelDampak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelRisiko" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelRisiko_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpsiPenanganan" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpsiPenanganan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KriteriaKemungkinan" (
    "id" SERIAL NOT NULL,
    "kategoriRisikoId" INTEGER NOT NULL,
    "levelKemungkinanId" INTEGER NOT NULL,
    "persentaseKemungkinan" INTEGER NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KriteriaKemungkinan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KriteriaDampak" (
    "id" SERIAL NOT NULL,
    "kategoriRisikoId" INTEGER NOT NULL,
    "levelDampakId" INTEGER NOT NULL,
    "persentaseDampak" INTEGER NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KriteriaDampak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeleraRisiko" (
    "id" SERIAL NOT NULL,
    "kategoriRisikoId" INTEGER NOT NULL,
    "besaranRisikoMinimum" INTEGER NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeleraRisiko_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JenisRisiko_nama_key" ON "JenisRisiko"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "SumberRisiko_nama_key" ON "SumberRisiko"("nama");

-- AddForeignKey
ALTER TABLE "KriteriaKemungkinan" ADD CONSTRAINT "KriteriaKemungkinan_kategoriRisikoId_fkey" FOREIGN KEY ("kategoriRisikoId") REFERENCES "KategoriRisiko"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KriteriaKemungkinan" ADD CONSTRAINT "KriteriaKemungkinan_levelKemungkinanId_fkey" FOREIGN KEY ("levelKemungkinanId") REFERENCES "LevelKemungkinan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KriteriaDampak" ADD CONSTRAINT "KriteriaDampak_kategoriRisikoId_fkey" FOREIGN KEY ("kategoriRisikoId") REFERENCES "KategoriRisiko"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KriteriaDampak" ADD CONSTRAINT "KriteriaDampak_levelDampakId_fkey" FOREIGN KEY ("levelDampakId") REFERENCES "LevelDampak"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeleraRisiko" ADD CONSTRAINT "SeleraRisiko_kategoriRisikoId_fkey" FOREIGN KEY ("kategoriRisikoId") REFERENCES "KategoriRisiko"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
