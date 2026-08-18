import "dotenv/config";
import { pipeline } from "@xenova/transformers";
import pg from "pg";

const MODEL_NAME = "Xenova/multilingual-e5-base";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const extractor = await pipeline("feature-extraction", MODEL_NAME);
  console.log("Model loaded");

  const hasVector = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname='vector') AS exists`
  );
  if (!hasVector.rows[0].exists) {
    console.log("pgvector tidak tersedia, melewatkan pembuatan embedding.");
    return;
  }

  const { rows } = await pool.query(
    `SELECT id, risiko, penyebab, dampak FROM "IdentifikasiRisiko" WHERE tahun = 2024 ORDER BY id`
  );
  console.log("Risiko 2024 ditemukan:", rows.length);

  for (const r of rows) {
    const text = "passage: " + [r.risiko, r.penyebab, r.dampak].filter(Boolean).join(". ");
    const output = await extractor(text, { pooling: "mean", normalize: true });
    const vec = `[${Array.from(output.data).join(",")}]`;
    await pool.query(
      `INSERT INTO risk_embeddings (identifikasi_risiko_id, embedding, updated_at)
         VALUES ($1, $2::vector, NOW())
         ON CONFLICT (identifikasi_risiko_id)
         DO UPDATE SET embedding = $2::vector, updated_at = NOW()`,
      [r.id, vec]
    );
    console.log("embedded #" + r.id);
  }
  console.log("Selesai:", rows.length, "embedding dibuat/diperbarui");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => pool.end());