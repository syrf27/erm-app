import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/access-control";
import { join } from "path";
import { readFile } from "fs/promises";

export const dynamic = "force-dynamic";

// OpenCode Zen API configurations
const ZEN_API_URL = "https://opencode.ai/zen/v1/chat/completions";

async function extractTextFromFile(url: string): Promise<string> {
  const isLocal = url.startsWith("/uploads/") || url.startsWith("/api/uploads/");
  let buffer: Buffer;

  if (isLocal) {
    const filename = url.split("/").pop();
    if (!filename) throw new Error("Invalid filename in URL");
    const filePath = join("/Users/alfiansyrff/dev/erm-app", "uploads", filename);
    buffer = await readFile(filePath);
  } else {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch external file: ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  const lowercaseUrl = url.toLowerCase();
  if (lowercaseUrl.endsWith(".pdf")) {
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

    // Gunakan kelas PDFParse dari pdf-parse.
    // Dengan menyetel disableWorker: true, library akan memproses PDF sepenuhnya
    // di server-side main thread tanpa memicu inisialisasi worker thread (aman 100% dari crash Next.js).
    const pdfParseModule = require("pdf-parse");
    const uint8Array = new Uint8Array(buffer);
    
    const parser = new pdfParseModule.PDFParse({
      data: uint8Array,
      disableWorker: true,
      useSystemFonts: true,
      disableFontFace: true,
    });
    
    const textResult = await parser.getText();
    const textContent = textResult.text || "";
    
    await parser.destroy();
    
    console.log("[summarize-debug] Main thread PDF parsing completed. Extracted character length:", textContent.length);
    return textContent;
  } else if (lowercaseUrl.endsWith(".txt")) {
    const text = buffer.toString("utf-8");
    console.log("[summarize-debug] TXT parsing completed. Extracted character length:", text.length);
    return text;
  }

  return "";
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

    if (isManual) {
      const doc = await prisma.repositori.findUnique({ where: { id: dbId } });
      if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
      documentTitle = doc.title;
      documentUrl = doc.url;
      existingSummary = doc.summary;
    } else if (isBukti) {
      const doc = await prisma.dokumenPendukung.findUnique({ where: { id: dbId } });
      if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
      documentTitle = doc.title;
      documentUrl = doc.url;
      existingSummary = doc.summary;
    } else {
      return NextResponse.json({ error: "Unsupported document type" }, { status: 400 });
    }

    // 2. If summary already exists in DB, return it immediately without calling AI
    if (existingSummary && existingSummary.trim().length > 0) {
      console.log(`[summarize-debug] Returning cached summary for ID: ${id}`);
      return NextResponse.json({ summary: existingSummary, cached: true });
    }

    // 3. Extract text from the document (Throw error jika pembacaan file gagal)
    console.log(`[summarize-debug] Fetching text content for title: "${documentTitle}" URL: "${documentUrl}"`);
    let fileText = "";
    try {
      fileText = await extractTextFromFile(documentUrl);
      fileText = fileText.trim();
    } catch (extractErr: any) {
      console.error("[summarize-debug] Text extraction process CRASHED:", extractErr);
      throw new Error(`Gagal membaca isi berkas fisik: ${extractErr.message}`);
    }

    // If no text was extracted (e.g. image, external link, docx), summarize based on title
    const contentToSummarize = fileText.length > 50
      ? fileText.substring(0, 6000) // Limit text size to prevent token overhead
      : `Dokumen dengan judul: "${documentTitle}". Mohon berikan ringkasan deskriptif umum mengenai dokumen ini berdasarkan judulnya karena konten teks tidak dapat langsung diekstrak.`;

    if (fileText.length <= 50) {
      console.warn(`[summarize-debug] Extracted text length is very short (${fileText.length}). Will summarize based on title only.`);
    }

    const apiKey = process.env.OPENCODE_ZEN_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENCODE_ZEN_API_KEY is not configured in .env" }, { status: 500 });
    }

    // 4. Request summary from OpenCode Zen API (Menggunakan model 'nemotron-3-ultra-free' yang aktif & bebas rate limit)
    console.log("[summarize-debug] Sending request to OpenCode Zen API with prompt payload...");
    const response = await fetch(ZEN_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nemotron-3-ultra-free",
        messages: [
          {
            role: "system",
            content: "Anda adalah AI asisten pembaca dokumen yang cerdas dan objektif. Tugas Anda adalah membaca konten dokumen yang diberikan dan membuat ringkasan yang padat, jelas, dan informatif mengenai isi penting dokumen tersebut, apa saja topik utama yang dibahas, dan poin-poin penting di dalamnya. Tulis dalam Bahasa Indonesia.",
          },
          {
            role: "user",
            content: `Berikut adalah konten dokumen yang ingin diringkas:\n\n${contentToSummarize}\n\nBerikan ringkasan yang menjelaskan dokumen ini membahas tentang apa, apa saja isi pentingnya, dan tuliskan poin-poin utamanya secara objektif.`,
          },
        ],
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

    // 5. Store the generated summary back to database
    if (isManual) {
      await prisma.repositori.update({
        where: { id: dbId },
        data: { summary },
      });
    } else if (isBukti) {
      await prisma.dokumenPendukung.update({
        where: { id: dbId },
        data: { summary },
      });
    }

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
