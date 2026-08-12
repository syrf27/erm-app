import { generateEmbedding, isEmbeddingAvailable } from "../src/lib/embedding";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Checking if embedding is available...");
  console.log("isEmbeddingAvailable():", isEmbeddingAvailable());

  if (!isEmbeddingAvailable()) {
    console.error("Embedding is not available. Please check if GEMINI_API_KEY is set in .env");
    process.exit(1);
  }

  try {
    const text = "Ini adalah teks contoh untuk menguji model embedding Gemini.";
    console.log(`Generating embedding for text: "${text}"`);
    const embedding = await generateEmbedding(text, "passage");
    console.log("Successfully generated embedding!");
    console.log("Embedding dimensions:", embedding.length);
    console.log("First 5 values:", embedding.slice(0, 5));
  } catch (error: any) {
    console.error("Failed to generate embedding:", error.message);
  }
}

main();
