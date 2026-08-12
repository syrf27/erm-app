import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  await client.connect();
  await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
  console.log("pgvector extension enabled successfully in Supabase!");
  await client.end();
}

main().catch(console.error);
