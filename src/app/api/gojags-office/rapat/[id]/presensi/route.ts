import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { checkPermission } from "@/lib/access-control";
import { getGojagsOfficeConfig, getGojagsOfficeHeaders } from "@/lib/gojags-office";
import { uploadFile } from "@/lib/storage";

const MAX_PRESENSI_PDF_SIZE = 10 * 1024 * 1024;
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]);

function sanitizeTitle(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const isAllowed = await checkPermission("upload", "create", { ipAddress, userAgent });

    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { baseUrl } = getGojagsOfficeConfig();
    const { id } = await params;
    const meetingId = Number(id);

    if (!Number.isInteger(meetingId) || meetingId <= 0) {
      return NextResponse.json({ error: "ID rapat tidak valid" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const title = sanitizeTitle(body?.title || `Daftar Hadir Rapat #${meetingId}`);

    const upstreamUrl = new URL(`/api/tr-rapat/export-presensi-pdf/${meetingId}`, baseUrl);
    const response = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        ...getGojagsOfficeHeaders(),
        Accept: "application/pdf",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      return NextResponse.json(
        { error: "Gagal mengambil PDF presensi dari GOJAGS Office", detail: message.slice(0, 300) },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_PRESENSI_PDF_SIZE) {
      return NextResponse.json({ error: "PDF presensi terlalu besar" }, { status: 400 });
    }

    if (!buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES)) {
      return NextResponse.json({ error: "Response presensi bukan PDF yang valid" }, { status: 502 });
    }

    const filename = `${crypto.randomUUID()}.pdf`;
    const storedFile = await uploadFile({
      buffer,
      filename,
      contentType: "application/pdf",
    });

    return NextResponse.json({
      title,
      url: storedFile.url,
      filename: `${title}.pdf`,
      size: buffer.length,
    });
  } catch (error: any) {
    console.error("GOJAGS Office attendance import error:", error);

    if (error?.message === "GOJAGS_OFFICE_API_KEY_RAPAT is not configured") {
      return NextResponse.json({ error: "GOJAGS Office API key belum dikonfigurasi" }, { status: 500 });
    }

    return NextResponse.json({ error: "Gagal mengimpor PDF presensi rapat" }, { status: 500 });
  }
}
