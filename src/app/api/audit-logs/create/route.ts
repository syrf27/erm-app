import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      userId,
      userName,
      action,
      resource,
      resourceId,
      details,
    } = body;

    // Get IP address and user agent from request
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    await logAudit({
      userId,
      userName,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating audit log:", error);
    return NextResponse.json(
      { error: "Failed to create audit log" },
      { status: 500 }
    );
  }
}
