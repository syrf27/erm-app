import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filePath = join(process.cwd(), "public", "uploads", filename);

    if (!existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const fileBuffer = await readFile(filePath);

    // Determine basic content types for inline preview
    let contentType = "application/octet-stream";
    if (filename.toLowerCase().endsWith(".pdf")) {
      contentType = "application/pdf";
    } else if (filename.toLowerCase().endsWith(".png")) {
      contentType = "image/png";
    } else if (filename.toLowerCase().endsWith(".jpg") || filename.toLowerCase().endsWith(".jpeg")) {
      contentType = "image/jpeg";
    } else if (filename.toLowerCase().endsWith(".gif")) {
      contentType = "image/gif";
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    return new NextResponse("Error reading file", { status: 500 });
  }
}
