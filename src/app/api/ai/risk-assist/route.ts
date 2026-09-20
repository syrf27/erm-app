import { NextRequest, NextResponse } from "next/server";
import { checkPermission } from "@/lib/access-control";
import { safePlainText } from "@/lib/ai-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROQ_BASE_URL = (process.env.GROQ_API_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
const GROQ_MODEL = process.env.GROQ_RISK_ASSIST_MODEL || process.env.GROQ_MODEL || "openai/gpt-oss-20b";

type Candidate = { id: number; nama: string };

function candidateText(items: Candidate[]) {
  return items.map((item) => `${item.id}: ${item.nama}`).join("\n");
}

function parseJsonObject(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1] ?? value;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI returned an invalid suggestion");
  return JSON.parse(fenced.slice(start, end + 1));
}

export async function POST(request: NextRequest) {
  try {
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    if (!(await checkPermission("identifikasi-risiko", "read", { ipAddress, userAgent }))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const description = safePlainText(body?.description, 4000);
    if (!description) return NextResponse.json({ error: "Jelaskan risiko yang ingin dibantu" }, { status: 400 });
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY belum dikonfigurasi" }, { status: 503 });

    const lists = body?.lists ?? {};
    const system = `Anda adalah asisten manajemen risiko organisasi di Indonesia. Buat DRAFT yang masuk akal berdasarkan deskripsi pengguna. Jangan mengarang fakta spesifik. Semua pilihan harus diambil persis dari daftar yang tersedia. Kembalikan JSON valid saja tanpa markdown dengan bentuk:
{"risiko":"...","penyebab":"...","dampak":"...","sasaran":"nama atau kosong","kegiatan":"nama atau kosong","prosesBisnis":"nama atau kosong","jenisRisiko":"nama pilihan","sumberRisiko":"nama pilihan","kategori":"nama pilihan","areaDampak":"nama pilihan","levelKemungkinan":"nama pilihan","levelDampak":"nama pilihan","responRisiko":"menerima|menghindari|mengurangi|mentransfer","alasan":"...","catatan":"..."}
Jika konteks tidak jelas, biarkan sasaran/kegiatan/prosesBisnis kosong. Gunakan kalimat singkat dan mudah ditinjau manusia.`;
    const user = `Deskripsi pengguna:\n${description}\n\nDaftar pilihan konteks dan klasifikasi:\nSasaran:\n${candidateText(lists.sasaran ?? [])}\nKegiatan:\n${candidateText(lists.kegiatan ?? [])}\nProses Bisnis:\n${candidateText(lists.prosesBisnis ?? [])}\nJenis Risiko:\n${candidateText(lists.jenisRisiko ?? [])}\nSumber Risiko:\n${candidateText(lists.sumberRisiko ?? [])}\nKategori Risiko:\n${candidateText(lists.kategori ?? [])}\nArea Dampak:\n${candidateText(lists.areaDampak ?? [])}\nLevel Kemungkinan:\n${candidateText(lists.levelKemungkinan ?? [])}\nLevel Dampak:\n${candidateText(lists.levelDampak ?? [])}\n\nPilih level kemungkinan dan dampak yang paling masuk akal sebagai DRAFT, serta respons risiko awal. Pengguna akan memeriksa dan mengubahnya.`;

    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        max_completion_tokens: 1200,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        ...(GROQ_MODEL.startsWith("openai/gpt-oss-") ? { reasoning_effort: "low" } : {}),
      }),
    });
    if (!response.ok) {
      console.error("Risk assistant provider error:", (await response.text()).slice(0, 1000));
      return NextResponse.json({ error: "Layanan AI tidak dapat digunakan saat ini" }, { status: 502 });
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("Empty AI response");
    return NextResponse.json({ suggestion: parseJsonObject(content), model: GROQ_MODEL });
  } catch (error: any) {
    console.error("Risk assistant error:", error?.message || error);
    return NextResponse.json({ error: "Gagal membuat saran pengisian risiko" }, { status: 500 });
  }
}
