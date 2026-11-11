import { NextRequest, NextResponse } from "next/server";
import { checkPermission } from "@/lib/access-control";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    if (!(await checkPermission("rencana-penanganan", "read", { ipAddress, userAgent }))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const rtpId = Number(searchParams.get("rtpId"));
    const take = Math.min(Math.max(Number(searchParams.get("limit")) || 100, 1), 500);
    const logs = await prisma.reminderLog.findMany({
      where: Number.isInteger(rtpId) && rtpId > 0 ? { rencanaPenangananId: rtpId } : undefined,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        rencanaPenanganan: {
          select: {
            id: true,
            identifikasiRisiko: { select: { risiko: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error("Reminder logs API error:", error);
    return NextResponse.json({ error: "Failed to fetch reminder logs" }, { status: 500 });
  }
}
