import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkPermission,
  getAuthUserContext,
  shouldScopeRiskByTeam,
} from "@/lib/access-control";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const allowed =
      (await checkPermission("risiko-lanjutan", "read")) ||
      (await checkPermission("identifikasi-risiko", "read"));
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const ctx = await getAuthUserContext();
    if (!ctx) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { id } = await params;
    const riskId = Number(id);
    if (!Number.isInteger(riskId) || riskId <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }
    const risk = await prisma.identifikasiRisiko.findUnique({
      where: { id: riskId },
      select: { id: true, teamId: true, rootRiskId: true },
    });
    if (!risk) {
      return NextResponse.json({ error: "Risiko tidak ditemukan" }, { status: 404 });
    }
    if (
      shouldScopeRiskByTeam(ctx) &&
      (risk.teamId == null || !ctx.teamIds.includes(risk.teamId))
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const rootId = risk.rootRiskId ?? risk.id;
    const chain = await prisma.identifikasiRisiko.findMany({
      where: { OR: [{ id: rootId }, { rootRiskId: rootId }] },
      select: {
        id: true,
        risiko: true,
        statusSiklus: true,
        parentRiskId: true,
        rootRiskId: true,
        tahun: true,
        followUpTahun: true,
        followUpTriwulan: true,
        archivedAt: true,
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ rootId, chain });
  } catch (error) {
    console.error("risk chain error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
