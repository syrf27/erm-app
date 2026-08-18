import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = "gemini-embedding-001";

let _ai: GoogleGenAI | null = null;
let _modelFailed = false;

function getAiClient(): GoogleGenAI | null {
  if (_ai) return _ai;
  if (_modelFailed) return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(
      "[embedding] GEMINI_API_KEY is not defined in .env. Embedding features are disabled."
    );
    _modelFailed = true;
    return null;
  }

  try {
    _ai = new GoogleGenAI({ apiKey });
    return _ai;
  } catch (e: any) {
    console.error("[embedding] Failed to initialize GoogleGenAI client:", e.message);
    _modelFailed = true;
    return null;
  }
}

export function isEmbeddingAvailable(): boolean {
  if (_modelFailed) return false;
  return !!process.env.GEMINI_API_KEY;
}

export async function generateEmbedding(
  text: string,
  type: "passage" | "query" = "passage"
): Promise<number[]> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error("Google Gen AI client is not available");
  }

  try {
    const response = await ai.models.embedContent({
      model: MODEL_NAME,
      contents: text,
      config: {
        taskType: type === "passage" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
        outputDimensionality: 1024,
      },
    });

    const values = response.embeddings?.[0]?.values;
    if (!values) {
      throw new Error("No embedding values returned from Gemini API");
    }

    return values;
  } catch (e: any) {
    console.error("[embedding] Gemini API request failed:", e.message);
    throw e;
  }
}

export async function generateAndStoreEmbedding(
  identifikasiRisikoId: number,
  text: string
): Promise<boolean> {
  if (!isEmbeddingAvailable()) {
    console.log("[embedding] Skipping - model or GEMINI_API_KEY not available");
    return false;
  }

  try {
    console.log("[embedding] Generating for risk #" + identifikasiRisikoId);
    const embedding = await generateEmbedding(text, "passage");

    const hasPgvector = await prisma.$queryRaw<
      Array<{ exists: boolean }>
    >`SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists`;

    if (!hasPgvector?.[0]?.exists) {
      console.log("[embedding] pgvector not available");
      return false;
    }

    const embeddingStr = `[${embedding.join(",")}]`;
    await prisma.$executeRaw`
      INSERT INTO risk_embeddings (identifikasi_risiko_id, embedding, updated_at)
      VALUES (${identifikasiRisikoId}, ${embeddingStr}::vector, NOW())
      ON CONFLICT (identifikasi_risiko_id)
      DO UPDATE SET embedding = ${embeddingStr}::vector, updated_at = NOW()
    `;

    console.log("[embedding] Stored for risk #" + identifikasiRisikoId);
    return true;
  } catch (e: any) {
    console.error(
      "[embedding] Failed for risk #" + identifikasiRisikoId + ":",
      e.message
    );
    return false;
  }
}
