import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    // Check if vector extension is available
    const available = await prisma.$queryRaw<
      Array<{ name: string }>
    >`SELECT name FROM pg_available_extensions WHERE name = 'vector'`;
    console.log("pgvector available:", available.length > 0);

    if (available.length === 0) {
      console.log(
        "\npgvector extension is NOT available in this PostgreSQL installation."
      );
      console.log("To install pgvector on Windows:");
      console.log("1. Download from https://github.com/pgvector/pgvector/releases");
      console.log("2. Or use a PostgreSQL distribution that includes pgvector (e.g., Supabase, Neon, or PostgreSQL 16+ with contrib)");
      console.log("3. Or use Docker: docker run -e POSTGRES_PASSWORD=password -p 5432:5432 pgvector/pgvector:pg17");
      console.log("\nThe app will still work without pgvector - semantic search will fall back to text search.\n");
    } else {
      // Try to enable the extension
      await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
      console.log("Vector extension enabled successfully");

      // Create risk_embeddings table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS risk_embeddings (
          id SERIAL PRIMARY KEY,
          identifikasi_risiko_id INTEGER NOT NULL UNIQUE,
          embedding vector(1024),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log("risk_embeddings table created successfully");

      // Create index for fast similarity search
      try {
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS idx_risk_embeddings_embedding 
          ON risk_embeddings 
          USING hnsw (embedding vector_cosine_ops)
        `;
        console.log("HNSW index created for vector similarity search");
      } catch (e: any) {
        console.log("Index creation note:", e.message);
      }
    }
  } catch (e: any) {
    console.error("Setup error:", e.message);
  }
  await prisma.$disconnect();
}

main();
