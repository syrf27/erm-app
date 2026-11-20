import { NextRequest, NextResponse } from "next/server";
import {
  checkPermission,
  getAuthUserContext,
  isAdminRole,
} from "@/lib/access-control";
import { currentPeriode } from "@/lib/risk-assessment";
import { buildHistoricalReport } from "@/lib/pemantauan-report";

export async function GET(request: NextRequest) {
  try {
    const allowed =
      (await checkPermission("pemantauan-risiko", "read")) ||
      (await checkPermission("rencana-penanganan", "read"));
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const ctx = await getAuthUserContext();
    if (!ctx) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const fallback = currentPeriode();
    const tahun = Number(searchParams.get("tahun")) || fallback.tahun;
    const triwulan = Number(searchParams.get("triwulan")) || undefined;

    const rows = await buildHistoricalReport({
      tahun,
      triwulan,
      teamIds: ctx.teamIds,
      isAdmin: isAdminRole(ctx.roleName),
    });

    return NextResponse.json({ tahun, triwulan: triwulan ?? null, rows });
  } catch (error) {
    console.error("laporan pemantauan error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
