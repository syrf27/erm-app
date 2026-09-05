ALTER TABLE "Repositori"
ADD COLUMN IF NOT EXISTS "extractedText" TEXT;

ALTER TABLE "DokumenPendukung"
ADD COLUMN IF NOT EXISTS "extractedText" TEXT;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "document_embeddings" (
    "id" SERIAL NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_id" INTEGER NOT NULL,
    "embedding" vector(1024),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_embeddings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_embeddings_document_type_document_id_key"
ON "document_embeddings"("document_type", "document_id");
