import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/access-control";
import { getStorageExtension, readFileFromStorage } from "@/lib/storage";
import { generateAndStoreDocumentEmbedding } from "@/lib/embedding";
import { createWorker } from "tesseract.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// OpenCode Zen API configurations
const ZEN_API_URL = "https://opencode.ai/zen/v1/chat/completions";
const SUMMARY_MODEL = "nemotron-3-ultra-free";
const DIRECT_SUMMARY_CHAR_LIMIT = 12000;
const CHUNK_SIZE = 9000;
const CHUNK_OVERLAP = 700;
const MAX_CHUNKS = 8;
const OCR_MAX_PAGES = getPositiveIntegerEnv("OCR_MAX_PAGES", 3);
const OCR_RENDER_WIDTH = getPositiveIntegerEnv("OCR_RENDER_WIDTH", 1400);
let pdfWorkerConfigured = false;

interface ExtractedDocument {
  text: string;
  extension: string;
  pageCount?: number;
  charCount: number;
  avgCharsPerPage?: number;
  meaningfulWordCount: number;
  normalTextRatio: number;
  vowelRatio: number;
  isProbablyScanned: boolean;
  extractionMethod: "text-layer" | "ocr" | "none";
}

function getPositiveIntegerEnv(name: string, fallback: number) {
  const rawValue = process.env[name];
  if (!rawValue) return fallback;

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? Math.floor(parsedValue)
    : fallback;
}

function getOptionalModulePath(modulePath: string) {
  try {
    return require.resolve(modulePath);
  } catch (error: any) {
    console.warn(`[summarize-debug] Could not resolve ${modulePath}:`, error?.message);
    return undefined;
  }
}

function getPdfParseModule() {
  const pdfParseModule = require("pdf-parse");

  if (!pdfWorkerConfigured) {
    const { getData } = require("pdf-parse/worker");
    pdfParseModule.PDFParse.setWorker(getData());
    pdfWorkerConfigured = true;
  }

  return pdfParseModule;
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getNormalTextRatio(text: string) {
  const compact = text.replace(/\s/g, "");
  if (compact.length === 0) return 0;

  let normalChars = 0;
  for (const char of compact) {
    const code = char.charCodeAt(0);
    const isAsciiLetterOrNumber =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122);
    const isCommonPunctuation = `.,;:!?'"()[]{}%/-+&@#`.includes(char);
    const isCommonIndonesianLetter = "áàâäéèêëíìîïóòôöúùûüñç".includes(char.toLowerCase());

    if (isAsciiLetterOrNumber || isCommonPunctuation || isCommonIndonesianLetter) {
      normalChars += 1;
    }
  }
  return normalChars / compact.length;
}

function getMeaningfulWordCount(text: string) {
  return (text.match(/[A-Za-zÀ-ÿ]{3,}/g) ?? []).length;
}

function getVowelRatio(text: string) {
  const compact = text.replace(/\s/g, "");
  if (compact.length === 0) return 0;

  const vowels = text.match(/[aiueoAIUEO]/g)?.length ?? 0;
  return vowels / compact.length;
}

function buildExtractionResult({
  text,
  extension,
  pageCount,
  extractionMethod = "text-layer",
}: {
  text: string;
  extension: string;
  pageCount?: number;
  extractionMethod?: ExtractedDocument["extractionMethod"];
}): ExtractedDocument {
  const normalizedText = normalizeExtractedText(text);
  const charCount = normalizedText.length;
  const avgCharsPerPage = pageCount && pageCount > 0 ? charCount / pageCount : undefined;
  const meaningfulWordCount = getMeaningfulWordCount(normalizedText);
  const normalTextRatio = getNormalTextRatio(normalizedText);
  const vowelRatio = getVowelRatio(normalizedText);
  const minimumMeaningfulWords = pageCount && pageCount > 0 ? Math.max(8, pageCount * 5) : 8;
  const isProbablyScanned =
    extension === ".pdf" &&
    Boolean(pageCount && pageCount > 0) &&
    (
      charCount < 100 ||
      (avgCharsPerPage ?? 0) < 30 ||
      normalTextRatio < 0.55 ||
      meaningfulWordCount < minimumMeaningfulWords ||
      vowelRatio < 0.12
    );

  return {
    text: normalizedText,
    extension,
    pageCount,
    charCount,
    avgCharsPerPage,
    meaningfulWordCount,
    normalTextRatio,
    vowelRatio,
    isProbablyScanned,
    extractionMethod: isProbablyScanned && extractionMethod === "text-layer" ? "none" : extractionMethod,
  };
}

function createTextChunks(text: string) {
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    const nextParagraphBreak = text.lastIndexOf("\n\n", end);
    const nextSentenceBreak = text.lastIndexOf(". ", end);
    const preferredBreak = Math.max(nextParagraphBreak, nextSentenceBreak);

    if (preferredBreak > start + CHUNK_SIZE * 0.6) {
      end = preferredBreak + 1;
    }

    chunks.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  const nonEmptyChunks = chunks.filter(Boolean);
  if (nonEmptyChunks.length <= MAX_CHUNKS) return nonEmptyChunks;

  const sampledChunks: string[] = [];
  for (let index = 0; index < MAX_CHUNKS; index += 1) {
    const sourceIndex = Math.round((index * (nonEmptyChunks.length - 1)) / (MAX_CHUNKS - 1));
    sampledChunks.push(nonEmptyChunks[sourceIndex]);
  }

  return sampledChunks;
}

function buildUnreadableDocumentSummary(documentTitle: string, extracted: ExtractedDocument) {
  const pageInfo = extracted.pageCount ? `${extracted.pageCount} halaman` : "jumlah halaman tidak terdeteksi";
  const avgInfo =
    typeof extracted.avgCharsPerPage === "number"
      ? `${Math.round(extracted.avgCharsPerPage)} karakter per halaman`
      : "rata-rata karakter per halaman tidak tersedia";

  return [
    "**Ringkasan Singkat**",
    `Dokumen berjudul "${documentTitle}" belum dapat diringkas secara lengkap karena teks digital di dalam file tidak terbaca dengan baik. Sistem hanya menemukan ${extracted.charCount} karakter dari ${pageInfo} (${avgInfo}).`,
    "",
    "**Kemungkinan Penyebab**",
    "- Dokumen berupa hasil scan atau gambar.",
    "- PDF tidak memiliki text layer yang dapat diseleksi.",
    "- Kualitas atau struktur PDF membuat teks tidak dapat diekstrak oleh sistem.",
    "",
    "**Poin Penting**",
    "- Ringkasan isi dokumen belum dapat dibuat dari konten asli.",
    "- Sistem belum menjalankan OCR pada dokumen ini.",
    "- Untuk mendapatkan ringkasan penuh, gunakan dokumen PDF yang teksnya dapat diseleksi atau aktifkan fitur OCR.",
    "",
    "**Relevansi dengan Manajemen Risiko**",
    "Belum dapat ditentukan karena isi dokumen belum berhasil dibaca.",
  ].join("\n");
}

function getOcrPageNumbers(pageCount?: number) {
  if (!pageCount || pageCount <= OCR_MAX_PAGES) {
    return undefined;
  }

  const pages = new Set<number>([1, pageCount]);
  for (let index = 1; pages.size < OCR_MAX_PAGES && index < OCR_MAX_PAGES - 1; index += 1) {
    pages.add(Math.round(1 + (index * (pageCount - 1)) / (OCR_MAX_PAGES - 1)));
  }

  return Array.from(pages).sort((a, b) => a - b);
}

async function extractTextWithOcr(parser: any, pageCount?: number) {
  const partial = getOcrPageNumbers(pageCount);
  const screenshotResult = await parser.getScreenshot({
    desiredWidth: OCR_RENDER_WIDTH,
    imageDataUrl: false,
    imageBuffer: true,
    ...(partial ? { partial } : {}),
  });

  const workerPath = getOptionalModulePath("tesseract.js/src/worker-script/node/index.js");
  const corePath = getOptionalModulePath("tesseract.js-core/tesseract-core-simd-lstm.wasm.js");
  const langPath = process.env.TESSERACT_LANG_PATH;
  const worker = await createWorker("ind+eng", 1, {
    ...(workerPath ? { workerPath } : {}),
    ...(corePath ? { corePath } : {}),
    ...(langPath ? { langPath } : {}),
    cachePath: process.env.TESSERACT_CACHE_PATH || ".cache/tesseract",
    logger: (message) => {
      if (message.status === "recognizing text") {
        console.log("[summarize-debug] OCR progress:", {
          progress: Math.round((message.progress || 0) * 100),
        });
      }
    },
  });

  try {
    const pageTexts: string[] = [];
    for (const page of screenshotResult.pages || []) {
      if (!page?.data) continue;
      const result = await worker.recognize(Buffer.from(page.data));
      const text = result.data?.text?.trim();
      if (text) {
        pageTexts.push(`-- Halaman ${page.pageNumber ?? pageTexts.length + 1} --\n${text}`);
      }
    }

    return pageTexts.join("\n\n");
  } finally {
    await worker.terminate();
  }
}

async function requestSummary(messages: { role: "system" | "user"; content: string }[], apiKey: string) {
  const response = await fetch(ZEN_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: SUMMARY_MODEL,
      messages,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenCode Zen API failure details:", errorText);
    throw new Error(`OpenCode Zen API returned status: ${response.status}`);
  }

  const data = await response.json();
  const summary = data.choices?.[0]?.message?.content || "";

  if (!summary || summary.trim().length === 0) {
    throw new Error("Empty summary received from OpenCode Zen");
  }

  return summary.trim();
}

async function summarizeDocument(documentTitle: string, extracted: ExtractedDocument, apiKey: string) {
  const systemPrompt =
    "Anda adalah AI asisten pembaca dokumen yang cerdas, ringkas, dan objektif. Buat ringkasan dalam Bahasa Indonesia yang mudah dipahami pengguna non-teknis. Jangan mengarang informasi yang tidak ada di dokumen.";

  if (extracted.isProbablyScanned || extracted.charCount <= 50) {
    return buildUnreadableDocumentSummary(documentTitle, extracted);
  }

  if (extracted.charCount <= DIRECT_SUMMARY_CHAR_LIMIT) {
    const sourceNote =
      extracted.extractionMethod === "ocr"
        ? "Catatan: teks berikut berasal dari OCR dokumen scan, jadi abaikan karakter yang jelas salah baca dan jangan mengarang detail yang tidak jelas.\n\n"
        : "";

    return requestSummary(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            `Judul dokumen: "${documentTitle}"\n\n` +
            sourceNote +
            `Konten dokumen:\n${extracted.text}\n\n` +
            "Buat ringkasan dengan format: Ringkasan Singkat, Poin Penting, Informasi Tanggal/Nomor/Pihak Terkait jika ada, dan Relevansi dengan Manajemen Risiko jika ada.",
        },
      ],
      apiKey
    );
  }

  const chunks = createTextChunks(extracted.text);
  console.log(`[summarize-debug] Long document detected. Summarizing ${chunks.length} chunk(s).`);
  const chunkSourceNote =
    extracted.extractionMethod === "ocr"
      ? "Catatan: teks bagian ini berasal dari OCR dokumen scan, jadi ringkas hanya informasi yang terbaca jelas.\n"
      : "";

  const chunkSummaries = await Promise.all(
    chunks.map((chunk, index) =>
      requestSummary(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              `Judul dokumen: "${documentTitle}"\n` +
              `Bagian ${index + 1} dari ${chunks.length}:\n\n${chunkSourceNote}${chunk}\n\n` +
              "Ringkas bagian ini secara padat. Pertahankan fakta, angka, tanggal, keputusan, pihak terkait, dan poin penting.",
          },
        ],
        apiKey
      )
    )
  );

  return requestSummary(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content:
          `Judul dokumen: "${documentTitle}"\n\n` +
          `Berikut ringkasan per bagian dokumen:\n\n${chunkSummaries
            .map((summary, index) => `Bagian ${index + 1}:\n${summary}`)
            .join("\n\n")}\n\n` +
          "Gabungkan menjadi ringkasan final yang utuh, tidak repetitif, dan mudah dipahami. Gunakan format: Ringkasan Singkat, Poin Penting, Informasi Tanggal/Nomor/Pihak Terkait jika ada, dan Relevansi dengan Manajemen Risiko jika ada.",
      },
    ],
    apiKey
  );
}

async function extractTextFromFile(url: string): Promise<ExtractedDocument> {
  const buffer = await readFileFromStorage(url);
  const extension = getStorageExtension(url);

  if (extension === ".pdf") {
    if (typeof global !== "undefined") {
      if (!(global as any).DOMMatrix) {
        (global as any).DOMMatrix = class DOMMatrix {};
      }
      if (!(global as any).ImageData) {
        (global as any).ImageData = class ImageData {};
      }
      if (!(global as any).Path2D) {
        (global as any).Path2D = class Path2D {};
      }
    }

    const pdfParseModule = getPdfParseModule();
    const uint8Array = new Uint8Array(buffer);
    
    const parser = new pdfParseModule.PDFParse({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true,
    });
    
    try {
      const infoResult = await parser.getInfo().catch(() => null);
      const textResult = await parser.getText();
      const extracted = buildExtractionResult({
        text: textResult.text || "",
        extension,
        pageCount: infoResult?.total,
      });
    
      console.log("[summarize-debug] PDF parsing completed.", {
        charCount: extracted.charCount,
        pageCount: extracted.pageCount,
        avgCharsPerPage: extracted.avgCharsPerPage,
        meaningfulWordCount: extracted.meaningfulWordCount,
        normalTextRatio: extracted.normalTextRatio,
        vowelRatio: extracted.vowelRatio,
        isProbablyScanned: extracted.isProbablyScanned,
      });

      if (extracted.isProbablyScanned) {
        console.log("[summarize-debug] Text layer quality is poor. Starting OCR fallback.");
        const ocrText = await extractTextWithOcr(parser, extracted.pageCount);
        const ocrExtracted = buildExtractionResult({
          text: ocrText,
          extension,
          pageCount: extracted.pageCount,
          extractionMethod: "ocr",
        });

        console.log("[summarize-debug] OCR completed.", {
          charCount: ocrExtracted.charCount,
          pageCount: ocrExtracted.pageCount,
          avgCharsPerPage: ocrExtracted.avgCharsPerPage,
          meaningfulWordCount: ocrExtracted.meaningfulWordCount,
          normalTextRatio: ocrExtracted.normalTextRatio,
          vowelRatio: ocrExtracted.vowelRatio,
          isProbablyScanned: ocrExtracted.isProbablyScanned,
        });

        return ocrExtracted.charCount > extracted.charCount ? ocrExtracted : extracted;
      }

      return extracted;
    } finally {
      await parser.destroy();
    }
  } else if (extension === ".txt") {
    const text = buffer.toString("utf-8");
    const extracted = buildExtractionResult({ text, extension, extractionMethod: "text-layer" });
    console.log("[summarize-debug] TXT parsing completed. Extracted character length:", extracted.charCount);
    return extracted;
  }

  return buildExtractionResult({ text: "", extension });
}

export async function POST(request: NextRequest) {
  try {
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Enforce read/read-only permissions check for repository
    const isAllowed = await checkPermission("repositori", "read", { ipAddress, userAgent });
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    const isManual = id.startsWith("manual-");
    const isBukti = id.startsWith("bukti-");
    const dbId = parseInt(id.replace("manual-", "").replace("bukti-", ""), 10);

    if (isNaN(dbId)) {
      return NextResponse.json({ error: "Invalid Document ID format" }, { status: 400 });
    }

    // 1. Fetch current document details from DB
    let documentTitle = "";
    let documentUrl = "";
    let existingSummary: string | null = null;
    let existingExtractedText: string | null = null;

    if (isManual) {
      const doc = await prisma.repositori.findUnique({ where: { id: dbId } });
      if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
      documentTitle = doc.title;
      documentUrl = doc.url;
      existingSummary = doc.summary;
      existingExtractedText = doc.extractedText;
    } else if (isBukti) {
      const doc = await prisma.dokumenPendukung.findUnique({ where: { id: dbId } });
      if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
      documentTitle = doc.title;
      documentUrl = doc.url;
      existingSummary = doc.summary;
      existingExtractedText = doc.extractedText;
    } else {
      return NextResponse.json({ error: "Unsupported document type" }, { status: 400 });
    }

    // 2. If summary already exists in DB, return it immediately without calling AI
    if (existingSummary && existingSummary.trim().length > 0) {
      console.log(`[summarize-debug] Returning cached summary for ID: ${id}`);
      const embeddingText = [documentTitle, existingSummary, existingExtractedText]
        .filter(Boolean)
        .join("\n\n");
      generateAndStoreDocumentEmbedding(isManual ? "manual" : "bukti", dbId, embeddingText).catch((e) =>
        console.error("Document embedding refresh failed", id, e)
      );
      return NextResponse.json({ summary: existingSummary, cached: true });
    }

    // 3. Extract text from the document (Throw error jika pembacaan file gagal)
    console.log(`[summarize-debug] Fetching text content for title: "${documentTitle}" URL: "${documentUrl}"`);
    let extractedDocument: ExtractedDocument;
    try {
      extractedDocument = await extractTextFromFile(documentUrl);
    } catch (extractErr: any) {
      console.error("[summarize-debug] Text extraction process CRASHED:", extractErr);
      throw new Error(`Gagal membaca isi berkas fisik: ${extractErr.message}`);
    }

    if (extractedDocument.isProbablyScanned) {
      console.warn(
        `[summarize-debug] Document is probably scanned. charCount=${extractedDocument.charCount}, pageCount=${extractedDocument.pageCount}`
      );
    }

    // 4. Request summary from OpenCode Zen API with adaptive strategy when text is readable.
    let summary: string;
    if (extractedDocument.isProbablyScanned || extractedDocument.charCount <= 50) {
      summary = buildUnreadableDocumentSummary(documentTitle, extractedDocument);
    } else {
      const apiKey = process.env.OPENCODE_ZEN_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "OPENCODE_ZEN_API_KEY is not configured in .env" }, { status: 500 });
      }

      console.log("[summarize-debug] Sending request to OpenCode Zen API with adaptive summary strategy...");
      summary = await summarizeDocument(documentTitle, extractedDocument, apiKey);
    }

    const extractedTextForSearch =
      !extractedDocument.isProbablyScanned && extractedDocument.charCount > 50
        ? extractedDocument.text
        : null;

    // 5. Store the generated summary and readable extracted text back to database
    if (isManual) {
      await prisma.repositori.update({
        where: { id: dbId },
        data: { summary, extractedText: extractedTextForSearch },
      });
    } else if (isBukti) {
      await prisma.dokumenPendukung.update({
        where: { id: dbId },
        data: { summary, extractedText: extractedTextForSearch },
      });
    }

    const embeddingText = [documentTitle, summary, extractedTextForSearch]
      .filter(Boolean)
      .join("\n\n");
    generateAndStoreDocumentEmbedding(isManual ? "manual" : "bukti", dbId, embeddingText).catch((e) =>
      console.error("Document embedding generation failed", id, e)
    );

    console.log(`[summarize-debug] Successfully saved new summary in DB for ID: ${id}`);
    return NextResponse.json({ summary, cached: false });
  } catch (error: any) {
    console.error("Summarization API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate document summary" },
      { status: 500 }
    );
  }
}
