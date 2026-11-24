import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import {
  checkPermission,
  getAuthUserContext,
  shouldScopeRiskByTeam,
} from "@/lib/access-control";
import { currentPeriode } from "@/lib/risk-assessment";
import { buildHistoricalReport } from "@/lib/pemantauan-report";

const HEADERS = [
  "Tahun",
  "Triwulan",
  "Risiko",
  "Tim",
  "Status Hasil",
  "Revisi",
  "Residual Acuan",
  "Residual Hasil",
  "Residual Harapan",
  "Selera",
  "Pencapaian",
  "Respons Final",
  "Risiko Asal",
  "Risiko Lanjutan",
  "Status Lanjutan",
  "Status Kewajiban",
  "Validator",
  "Waktu Finalisasi",
  "Alasan Koreksi",
  "Keputusan Rekonsiliasi",
];

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
      scopeToTeams: shouldScopeRiskByTeam(ctx),
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Historis");
    sheet.addRow(HEADERS);
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) {
      sheet.addRow([
        row.tahun,
        row.triwulan,
        row.risiko,
        row.team ?? "-",
        row.status,
        row.revision,
        row.residualAcuan ?? "Belum dapat dihitung",
        row.residualHasil ?? "Belum dapat dihitung",
        row.residualHarapan ?? "Belum dapat dihitung",
        row.selera ?? "-",
        row.pencapaian,
        row.responFinal ?? "-",
        row.risikoAsalId ?? "-",
        row.risikoLanjutanId ?? "-",
        row.statusRisikoLanjutan ?? "-",
        row.statusKewajiban ?? "-",
        row.finalizedBy ?? "-",
        row.finalizedAt ? row.finalizedAt.toISOString() : "-",
        row.correctionReason ?? "-",
        row.reconciliationDecision ?? "-",
      ]);
    }
    sheet.columns.forEach((column) => {
      column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laporan-pemantauan-${tahun}${triwulan ? `-TW${triwulan}` : ""}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("export laporan pemantauan error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
