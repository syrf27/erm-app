import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Aggregated statistics for the Enterprise Risk Management dashboard.
// Computed server-side in a single round-trip for performance.
export async function GET() {
  try {
    const [
      levelKemungkinan,
      levelDampak,
      levelRisiko,
      matriks,
      countIdentifikasi,
      countAnalisis,
      countEvaluasi,
      countRencana,
      countKri,
      countSasaran,
      countProsesBisnis,
      analisis,
      evaluasi,
      rencana,
      kris,
    ] = await Promise.all([
      prisma.levelKemungkinan.findMany({ orderBy: { skala: "asc" }, select: { id: true, nama: true, skala: true } }),
      prisma.levelDampak.findMany({ orderBy: { skala: "asc" }, select: { id: true, nama: true, skala: true } }),
      prisma.levelRisiko.findMany({ select: { id: true, nama: true, warna: true } }),
      prisma.matriksAnalisisRisiko.findMany({ select: { levelKemungkinanId: true, levelDampakId: true, besaran: true, levelRisikoId: true } }),
      prisma.identifikasiRisiko.count(),
      prisma.analisisRisiko.count(),
      prisma.evaluasiRisiko.count(),
      prisma.rencanaPenanganan.count(),
      prisma.kri.count(),
      prisma.sasaran.count(),
      prisma.prosesBisnis.count(),
      prisma.analisisRisiko.findMany({
        select: {
          id: true,
          levelKemungkinanId: true,
          levelDampakId: true,
          levelRisikoId: true,
          identifikasiRisiko: {
            select: {
              risiko: true,
              jenisRisiko: { select: { nama: true } },
              kategoriRisiko: { select: { nama: true } },
            },
          },
        },
      }),
      prisma.evaluasiRisiko.findMany({ select: { responRisiko: true } }),
      prisma.rencanaPenanganan.findMany(),
      prisma.kri.findMany({ select: { id: true, namaIndikator: true, batasHijau: true, batasKuning: true, batasMerah: true, nilaiAktual: true } }),
    ]);

    // ---- Matrix lookup helpers ----
    const matriksKey = (k: number, d: number) => k + "-" + d;
    const matriksMap = new Map<string, { besaran: number; levelRisikoId: number }>();
    for (const m of matriks) matriksMap.set(matriksKey(m.levelKemungkinanId, m.levelDampakId), { besaran: m.besaran, levelRisikoId: m.levelRisikoId });
    const levelRisikoMap = new Map(levelRisiko.map((l) => [l.id, l]));

    const resolveCell = (k?: number | null, d?: number | null) => {
      if (k == null || d == null) return null;
      return matriksMap.get(matriksKey(k, d)) ?? null;
    };

    // ---- Heatmap (Kemungkinan x Dampak) ----
    const cellCounts = new Map<string, number>();
    for (const a of analisis) {
      if (a.levelKemungkinanId != null && a.levelDampakId != null) {
        const key = matriksKey(a.levelKemungkinanId, a.levelDampakId);
        cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
      }
    }
    const heatmap = levelKemungkinan.map((k) =>
      levelDampak.map((d) => {
        const cell = matriksMap.get(matriksKey(k.id, d.id));
        const lr = cell ? levelRisikoMap.get(cell.levelRisikoId) : null;
        return {
          kemungkinanId: k.id,
          dampakId: d.id,
          count: cellCounts.get(matriksKey(k.id, d.id)) ?? 0,
          besaran: cell?.besaran ?? k.skala * d.skala,
          levelRisikoNama: lr?.nama ?? null,
          warna: lr?.warna ?? null,
        };
      })
    );

    // ---- Risk distribution by level ----
    const byLevelMap = new Map<number, number>();
    for (const a of analisis) {
      const lrId = a.levelRisikoId ?? resolveCell(a.levelKemungkinanId, a.levelDampakId)?.levelRisikoId ?? null;
      if (lrId != null) byLevelMap.set(lrId, (byLevelMap.get(lrId) ?? 0) + 1);
    }
    const byLevel = levelRisiko.map((l) => ({ nama: l.nama, warna: l.warna, count: byLevelMap.get(l.id) ?? 0 }));

    // ---- By category & by type ----
    const tally = (arr: (string | null | undefined)[]) => {
      const map = new Map<string, number>();
      for (const v of arr) { const key = v || "Tidak terkategori"; map.set(key, (map.get(key) ?? 0) + 1); }
      return Array.from(map.entries()).map(([nama, count]) => ({ nama, count })).sort((a, b) => b.count - a.count);
    };
    const byCategory = tally(analisis.map((a) => a.identifikasiRisiko?.kategoriRisiko?.nama));
    const byType = tally(analisis.map((a) => a.identifikasiRisiko?.jenisRisiko?.nama));

    // ---- Risk response distribution ----
    const byResponse = tally(evaluasi.map((e) => e.responRisiko));

    // ---- Inherent vs Residual ----
    let inherentSum = 0, inherentN = 0;
    for (const a of analisis) { const c = resolveCell(a.levelKemungkinanId, a.levelDampakId); if (c) { inherentSum += c.besaran; inherentN++; } }
    let residualSum = 0, residualN = 0;
    for (const r of rencana as any[]) {
      const c = resolveCell(r.residualLevelKemungkinanId, r.residualLevelDampakId);
      if (c) { residualSum += c.besaran; residualN++; }
    }
    const inherentAvg = inherentN ? +(inherentSum / inherentN).toFixed(2) : 0;
    const residualAvg = residualN ? +(residualSum / residualN).toFixed(2) : 0;

    // ---- KRI status ----
    const kriStatus = kris.map((k) => {
      let status: "hijau" | "kuning" | "merah" | "belum" = "belum";
      const v = k.nilaiAktual;
      if (v != null) {
        // Assume higher value = worse. Thresholds: <=hijau green, <=kuning yellow, else red.
        if (k.batasMerah != null && v >= k.batasMerah) status = "merah";
        else if (k.batasKuning != null && v >= k.batasKuning) status = "kuning";
        else status = "hijau";
      }
      return { nama: k.namaIndikator, nilai: v, status };
    });
    const kriSummary = {
      hijau: kriStatus.filter((k) => k.status === "hijau").length,
      kuning: kriStatus.filter((k) => k.status === "kuning").length,
      merah: kriStatus.filter((k) => k.status === "merah").length,
      belum: kriStatus.filter((k) => k.status === "belum").length,
    };

    // ---- Top risks ----
    const topRisks = analisis
      .map((a) => {
        const c = resolveCell(a.levelKemungkinanId, a.levelDampakId);
        const lr = c ? levelRisikoMap.get(c.levelRisikoId) : null;
        return {
          risiko: a.identifikasiRisiko?.risiko ?? "-",
          kategori: a.identifikasiRisiko?.kategoriRisiko?.nama ?? "-",
          besaran: c?.besaran ?? 0,
          level: lr?.nama ?? "-",
          warna: lr?.warna ?? null,
        };
      })
      .sort((a, b) => b.besaran - a.besaran)
      .slice(0, 8);

    // ---- Process funnel / maturity ----
    const funnel = [
      { tahap: "Identifikasi", count: countIdentifikasi },
      { tahap: "Analisis", count: countAnalisis },
      { tahap: "Evaluasi", count: countEvaluasi },
      { tahap: "Penanganan", count: countRencana },
    ];
    const treatmentCoverage = countIdentifikasi ? Math.round((countRencana / countIdentifikasi) * 100) : 0;
    const analysisCoverage = countIdentifikasi ? Math.round((countAnalisis / countIdentifikasi) * 100) : 0;

    return NextResponse.json({
      kpi: {
        totalRisiko: countIdentifikasi,
        dianalisis: countAnalisis,
        dievaluasi: countEvaluasi,
        ditangani: countRencana,
        kri: countKri,
        sasaran: countSasaran,
        prosesBisnis: countProsesBisnis,
        analysisCoverage,
        treatmentCoverage,
      },
      levelKemungkinan,
      levelDampak,
      heatmap,
      byLevel,
      byCategory,
      byType,
      byResponse,
      inherentVsResidual: { inherentAvg, residualAvg, residualN },
      kriStatus,
      kriSummary,
      topRisks,
      funnel,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}