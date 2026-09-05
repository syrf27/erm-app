-- Backfill migration for models that exist in schema.prisma and some local databases,
-- but were not represented in the migration history yet.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "Team" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Team_nama_key" ON "Team"("nama");
CREATE UNIQUE INDEX IF NOT EXISTS "Team_kode_key" ON "Team"("kode");

CREATE TABLE IF NOT EXISTS "user_teams" (
    "user_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,

    CONSTRAINT "user_teams_pkey" PRIMARY KEY ("user_id", "team_id")
);

CREATE TABLE IF NOT EXISTS "DokumenPendukung" (
    "id" SERIAL NOT NULL,
    "rencanaPenangananId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DokumenPendukung_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FcmToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FcmToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FcmToken_token_key" ON "FcmToken"("token");

CREATE TABLE IF NOT EXISTS "Repositori" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'pedoman',
    "tahun" INTEGER NOT NULL DEFAULT 2026,
    "uploader" TEXT NOT NULL DEFAULT 'Admin',
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repositori_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "risk_embeddings" (
    "id" SERIAL NOT NULL,
    "identifikasi_risiko_id" INTEGER NOT NULL,
    "embedding" vector,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_embeddings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "risk_embeddings_identifikasi_risiko_id_key"
ON "risk_embeddings"("identifikasi_risiko_id");

ALTER TABLE "IdentifikasiRisiko"
ADD COLUMN IF NOT EXISTS "sasaranId" INTEGER,
ADD COLUMN IF NOT EXISTS "prosesBisnisId" INTEGER,
ADD COLUMN IF NOT EXISTS "tahun" INTEGER NOT NULL DEFAULT 2026,
ADD COLUMN IF NOT EXISTS "teamId" INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'IdentifikasiRisiko_sasaranId_fkey'
    ) THEN
        ALTER TABLE "IdentifikasiRisiko"
        ADD CONSTRAINT "IdentifikasiRisiko_sasaranId_fkey"
        FOREIGN KEY ("sasaranId") REFERENCES "Sasaran"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'IdentifikasiRisiko_prosesBisnisId_fkey'
    ) THEN
        ALTER TABLE "IdentifikasiRisiko"
        ADD CONSTRAINT "IdentifikasiRisiko_prosesBisnisId_fkey"
        FOREIGN KEY ("prosesBisnisId") REFERENCES "ProsesBisnis"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'IdentifikasiRisiko_teamId_fkey'
    ) THEN
        ALTER TABLE "IdentifikasiRisiko"
        ADD CONSTRAINT "IdentifikasiRisiko_teamId_fkey"
        FOREIGN KEY ("teamId") REFERENCES "Team"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_teams_user_id_fkey'
    ) THEN
        ALTER TABLE "user_teams"
        ADD CONSTRAINT "user_teams_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_teams_team_id_fkey'
    ) THEN
        ALTER TABLE "user_teams"
        ADD CONSTRAINT "user_teams_team_id_fkey"
        FOREIGN KEY ("team_id") REFERENCES "Team"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DokumenPendukung_rencanaPenangananId_fkey'
    ) THEN
        ALTER TABLE "DokumenPendukung"
        ADD CONSTRAINT "DokumenPendukung_rencanaPenangananId_fkey"
        FOREIGN KEY ("rencanaPenangananId") REFERENCES "RencanaPenanganan"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FcmToken_userId_fkey'
    ) THEN
        ALTER TABLE "FcmToken"
        ADD CONSTRAINT "FcmToken_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey'
    ) THEN
        ALTER TABLE "Notification"
        ADD CONSTRAINT "Notification_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
