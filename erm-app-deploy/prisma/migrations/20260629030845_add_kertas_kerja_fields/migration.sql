-- AlterTable
ALTER TABLE "IdentifikasiRisiko" ADD COLUMN     "kegiatanId" INTEGER,
ADD COLUMN     "unitKerjaId" INTEGER;

-- AlterTable
ALTER TABLE "ProsesBisnis" ADD COLUMN     "kegiatanId" INTEGER;

-- AlterTable
ALTER TABLE "RencanaPenanganan" ADD COLUMN     "jenisPenanganan" TEXT,
ADD COLUMN     "keterjadiRisiko" TEXT;

-- AlterTable
ALTER TABLE "Sasaran" ADD COLUMN     "unitKerjaId" INTEGER;

-- CreateTable
CREATE TABLE "UnitKerja" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitKerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kegiatan" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "unitKerjaId" INTEGER,
    "sasaranId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnitKerja_nama_key" ON "UnitKerja"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "UnitKerja_kode_key" ON "UnitKerja"("kode");

-- AddForeignKey
ALTER TABLE "Kegiatan" ADD CONSTRAINT "Kegiatan_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kegiatan" ADD CONSTRAINT "Kegiatan_sasaranId_fkey" FOREIGN KEY ("sasaranId") REFERENCES "Sasaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sasaran" ADD CONSTRAINT "Sasaran_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProsesBisnis" ADD CONSTRAINT "ProsesBisnis_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "Kegiatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentifikasiRisiko" ADD CONSTRAINT "IdentifikasiRisiko_unitKerjaId_fkey" FOREIGN KEY ("unitKerjaId") REFERENCES "UnitKerja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentifikasiRisiko" ADD CONSTRAINT "IdentifikasiRisiko_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "Kegiatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
