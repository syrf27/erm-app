import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, extname, basename } from "path";
import { existsSync } from "fs";
import { checkPermission } from "@/lib/access-control";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
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

    const isAllowed = await checkPermission("upload", "read", { ipAddress, userAgent });
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { filename } = await params;
    const safeFilename = basename(filename);
    const extension = extname(safeFilename).toLowerCase();

    // Files are stored outside web root
    const filePath = join(process.cwd(), "uploads", safeFilename);

    // Prevent path traversal
    if (!filePath.startsWith(join(process.cwd(), "uploads"))) {
      return new NextResponse("Invalid file path", { status: 400 });
    }

    if (!existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const fileBuffer = await readFile(filePath);

    const contentType =
      {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".csv": "text/csv",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".txt": "text/plain",
      }[extension] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (e: any) {
    console.error("Download error:", e);
    return new NextResponse("Error reading file", { status: 500 });
  }
}
