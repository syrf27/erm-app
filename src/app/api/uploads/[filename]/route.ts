import { NextRequest, NextResponse } from "next/server";
import { basename } from "path";
import { checkPermission } from "@/lib/access-control";
import { cookies } from "next/headers";
import { getContentTypeFromFilename, readFileFromStorage } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");
    if (auth?.value) {
      try {
        JSON.parse(auth.value);
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

    const fileBuffer = await readFileFromStorage(`/api/uploads/${safeFilename}`);
    const contentType = getContentTypeFromFilename(safeFilename);

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (e: any) {
    console.error("Download error:", e);
    if (e?.message === "File not found") {
      return new NextResponse("File not found", { status: 404 });
    }
    return new NextResponse("Error reading file", { status: 500 });
  }
}
