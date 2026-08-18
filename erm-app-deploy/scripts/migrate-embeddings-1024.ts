import { prisma } from "../src/lib/prisma";
import { generateAndStoreEmbedding, isEmbeddingAvailable } from "../src/lib/embedding";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Starting embedding dimension migration to 1024...");

  if (!isEmbeddingAvailable()) {
    console.error("Embedding is not available. Please verify GEMINI_API_KEY is set in your .env file.");
    process.exit(1);
  }

  try {
    // 1. Drop existing HNSW index and table to reset vector size constraints
    console.log("Dropping existing index and risk_embeddings table...");
    await prisma.$executeRaw`DROP INDEX IF EXISTS idx_risk_embeddings_embedding`;
    await prisma.$executeRaw`DROP TABLE IF EXISTS risk_embeddings`;
    console.log("Existing table and index dropped successfully.");

    // 2. Re-run setup-pgvector to create new table with vector(1024)
    console.log("Re-creating table with vector(1024) size...");
    const available = await prisma.$queryRaw<
      Array<{ name: string }>
    >`SELECT name FROM pg_available_extensions WHERE name = 'vector'`;

    if (available.length === 0) {
      throw new Error("pgvector extension is not available in PostgreSQL.");
    }

    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS risk_embeddings (
        id SERIAL PRIMARY KEY,
        identifikasi_risiko_id INTEGER NOT NULL UNIQUE,
        embedding vector(1024),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_risk_embeddings_embedding 
      ON risk_embeddings 
      USING hnsw (embedding vector_cosine_ops)
    `;
    console.log("Table and HNSW index recreated successfully with 1024 dimensions.");

    // 3. Fetch all existing identified risks to generate new embeddings
    console.log("Fetching existing identified risks from database...");
    const risks = await prisma.identifikasiRisiko.findMany({
      select: {
        id: true,
        risiko: true,
        penyebab: true,
        dampak: true,
      },
    });

    console.log(`Found ${risks.length} risk(s). Re-generating embeddings...`);

    let successCount = 0;
    for (const risk of risks) {
      const embeddingText = [risk.risiko, risk.penyebab, risk.dampak]
        .filter(Boolean)
        .join(". ");

      if (!embeddingText.trim()) {
        console.log(`Skipping risk #${risk.id} because it has no text content.`);
        continue;
      }

      console.log(`Generating embedding for risk #${risk.id}...`);
      const success = await generateAndStoreEmbedding(risk.id, embeddingText);
      if (success) {
        successCount++;
      } else {
        console.error(`Failed to generate/store embedding for risk #${risk.id}`);
      }
    }

    console.log(`Migration finished. Successfully updated ${successCount}/${risks.length} risk embeddings.`);

  } catch (error: any) {
    console.error("Migration failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
