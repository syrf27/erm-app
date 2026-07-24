import { prisma } from "@/lib/prisma";

const MODEL_NAME = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

let _pipeline: any = null;
let _pipelineLoading: Promise<any> | null = null;
let _pipelineFailed = false;

async function getPipeline(): Promise<any> {
  if (_pipeline) return _pipeline;
  if (_pipelineFailed) {
    console.warn("[embedding] Model previously failed, skipping");
    throw new Error("Transformers model previously failed");
  }
  if (_pipelineLoading) return _pipelineLoading;

  _pipelineLoading = (async () => {
    console.log("[embedding] Loading model:", MODEL_NAME);
    const { pipeline } = await import("@xenova/transformers");
    _pipeline = await pipeline("feature-extraction", MODEL_NAME);
    console.log("[embedding] Model loaded successfully");
    return _pipeline;
  })();

  try {
    return await _pipelineLoading;
  } catch (e: any) {
    console.error("[embedding] Model load failed:", e.message);
    _pipelineFailed = true;
    throw e;
  }
}

export function isEmbeddingAvailable(): boolean {
  return !_pipelineFailed;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await getPipeline();
  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data);
}

export async function generateAndStoreEmbedding(
  identifikasiRisikoId: number,
  text: string
): Promise<boolean> {
  if (!isEmbeddingAvailable()) {
    console.log("[embedding] Skipping - model not available");
    return false;
  }

  try {
    console.log("[embedding] Generating for risk #" + identifikasiRisikoId);
    const embedding = await generateEmbedding(text);

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
