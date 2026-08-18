import { NextRequest, NextResponse } from "next/server";
import { extname } from "path";
import { checkPermission } from "@/lib/access-control";
import { logAudit } from "@/lib/audit-log";
import { cookies } from "next/headers";
import { uploadFile } from "@/lib/storage";
import crypto from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".xlsx", ".csv", ".docx", ".doc", ".txt"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
];

const MAGIC_BYTES: Record<string, Buffer> = {
  ".pdf": Buffer.from([0x25, 0x50, 0x44, 0x46]),
  ".png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ".jpg": Buffer.from([0xff, 0xd8, 0xff]),
  ".jpeg": Buffer.from([0xff, 0xd8, 0xff]),
  ".gif": Buffer.from([0x47, 0x49, 0x46, 0x38]),
};

function validateFileType(buffer: Buffer, extension: string): boolean {
  const checker = MAGIC_BYTES[extension.toLowerCase()];
  if (!checker) return true;
  return buffer.subarray(0, checker.length).equals(checker);
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");
    let userId = "anonymous";
    let userName = "Anonymous";
    if (auth?.value) {
      try {
        const parsed = JSON.parse(auth.value);
        userId = parsed.email || "anonymous";
        userName = parsed.name || "Anonymous";
      } catch {}
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const isAllowed = await checkPermission("upload", "create", { ipAddress, userAgent });
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate file extension
    const extension = extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate MIME type from File object
    if (ALLOWED_MIME_TYPES.length > 0 && file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File MIME type not allowed" },
        { status: 400 }
      );
    }

    // Validate magic bytes
    if (!validateFileType(buffer, extension)) {
      return NextResponse.json(
        { error: "File content does not match its extension. Possible upload attack." },
        { status: 400 }
      );
    }

    // Generate secure filename using UUID
    const uuid = crypto.randomUUID();
    const filename = `${uuid}${extension}`;
    const storedFile = await uploadFile({
      buffer,
      filename,
      contentType: file.type || undefined,
    });

    await logAudit({
      userId,
      userName,
      action: "UPLOAD",
      resource: "upload",
      resourceId: filename,
      details: { originalName: file.name, size: file.size, mimeType: file.type, url: storedFile.url },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      url: storedFile.url,
      filename: file.name,
      originalName: file.name,
      size: file.size,
    });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
