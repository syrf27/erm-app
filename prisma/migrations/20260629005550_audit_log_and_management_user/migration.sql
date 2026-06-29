/*
  Warnings:

  - You are about to drop the column `kategoriRisikoId` on the `KriteriaDampak` table. All the data in the column will be lost.
  - You are about to drop the column `levelDampakId` on the `KriteriaDampak` table. All the data in the column will be lost.
  - You are about to drop the column `persentaseDampak` on the `KriteriaDampak` table. All the data in the column will be lost.
  - Added the required column `nama` to the `KriteriaDampak` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "KriteriaDampak" DROP CONSTRAINT "KriteriaDampak_kategoriRisikoId_fkey";

-- DropForeignKey
ALTER TABLE "KriteriaDampak" DROP CONSTRAINT "KriteriaDampak_levelDampakId_fkey";

-- AlterTable
ALTER TABLE "KriteriaDampak" DROP COLUMN "kategoriRisikoId",
DROP COLUMN "levelDampakId",
DROP COLUMN "persentaseDampak",
ADD COLUMN     "nama" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "LevelRisiko" ADD COLUMN     "rentang" TEXT,
ADD COLUMN     "tindakan" TEXT,
ADD COLUMN     "warna" TEXT;

-- AlterTable
ALTER TABLE "RencanaPenanganan" ADD COLUMN     "disetujuiOleh" TEXT,
ADD COLUMN     "dokumenPendukung" TEXT,
ADD COLUMN     "persetujuan" TEXT,
ADD COLUMN     "realisasiOutput" TEXT,
ADD COLUMN     "realisasiWaktu" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatriksAnalisisRisiko" (
    "id" SERIAL NOT NULL,
    "levelKemungkinanId" INTEGER NOT NULL,
    "levelDampakId" INTEGER NOT NULL,
    "besaran" INTEGER NOT NULL,
    "levelRisikoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatriksAnalisisRisiko_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "password" TEXT NOT NULL DEFAULT 'password',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "userId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("userId","permissionId")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "Permission"("resource", "action");

-- AddForeignKey
ALTER TABLE "MatriksAnalisisRisiko" ADD CONSTRAINT "MatriksAnalisisRisiko_levelKemungkinanId_fkey" FOREIGN KEY ("levelKemungkinanId") REFERENCES "LevelKemungkinan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatriksAnalisisRisiko" ADD CONSTRAINT "MatriksAnalisisRisiko_levelDampakId_fkey" FOREIGN KEY ("levelDampakId") REFERENCES "LevelDampak"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatriksAnalisisRisiko" ADD CONSTRAINT "MatriksAnalisisRisiko_levelRisikoId_fkey" FOREIGN KEY ("levelRisikoId") REFERENCES "LevelRisiko"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
