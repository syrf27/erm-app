import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrSet, REVALIDATE_CACHE_CONTROL } from "@/lib/cache";
import { getAuthUserContext, shouldScopeRiskByTeam } from "@/lib/access-control";
import { summarizePairedScores, summarizeTreatment } from "@/lib/dashboard-metrics";

export const dynamic = "force-dynamic";

// Aggregated statistics for the Enterprise Risk Management dashboard.
// Computed server-side in a single round-trip for performance.
// Cached in Redis for 300s (5 min) to reduce DB load.
export async function GET(request: Request) {
  try {
    const authContext = await getAuthUserContext();
    if (!authContext) return NextResponse.json({ error: "Access denied" }, { status: 403 });
    const url = new URL(request.url);
    const currentYear = new Date().getFullYear();
    const tahunDari = Number(url.searchParams.get("tahunDari")) || currentYear;
    const tahunSampai = Number(url.searchParams.get("tahunSampai")) || tahunDari;
    const yearRange = {
      gte: Math.min(tahunDari, tahunSampai),
      lte: Math.max(tahunDari, tahunSampai),
    };
    const teamScoped = shouldScopeRiskByTeam(authContext);
    const teamScope = teamScoped ? { teamId: { in: authContext.teamIds } } : {};
    const riskScope = {
      tahun: yearRange,
      archivedAt: null,
      statusSiklus: "ACTIVE",
      ...teamScope,
    };
    const relatedRiskScope = { identifikasiRisiko: riskScope };

    const stats = await getOrSet(
        `dashboard:stats:v3:${yearRange.gte}:${yearRange.lte}:${teamScoped ? authContext.teamIds.sort((a, b) => a - b).join("-") || "no-team" : "all"}`,
        async () => {
          const [
            levelKemungkinan,
            levelDampak,
            levelRisiko,
            matriks,
            identifikasiScope,
            countAnalisis,
            countEvaluasi,
            countKri,
            analisis,
            evaluasi,
            rencana,
            kris,
            belumDipantau,
            menungguValidasi,
            tindakLanjutWajib,
            followUpDrafts,
            seleraGlobal,
          ] = await Promise.all([
            prisma.levelKemungkinan.findMany({
              orderBy: { skala: "asc" },
              select: { id: true, nama: true, skala: true },
            }),
            prisma.levelDampak.findMany({
              orderBy: { skala: "asc" },
              select: { id: true, nama: true, skala: true },
            }),
            prisma.levelRisiko.findMany({
              select: { id: true, nama: true, warna: true },
            }),
            prisma.matriksAnalisisRisiko.findMany({
              select: {
                levelKemungkinanId: true,
                levelDampakId: true,
                besaran: true,
                levelRisikoId: true,
              },
            }),
            prisma.identifikasiRisiko.findMany({
              where: riskScope,
              select: { sasaranId: true, prosesBisnisId: true, kategoriRisiko: { select: { nama: true } } },
            }),
            prisma.analisisRisiko.count({ where: relatedRiskScope }),
            prisma.evaluasiRisiko.count({ where: relatedRiskScope }),
            prisma.kri.count({ where: relatedRiskScope }),
            prisma.analisisRisiko.findMany({
              where: relatedRiskScope,
              select: {
                id: true,
                identifikasiRisikoId: true,
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
            prisma.evaluasiRisiko.findMany({
              where: relatedRiskScope,
              select: {
                identifikasiRisikoId: true,
                responRisiko: true,
                residualLevelKemungkinanId: true,
                residualLevelDampakId: true,
                identifikasiRisiko: {
                  select: { risiko: true, kategoriRisiko: { select: { nama: true } } },
                },
              },
            }),
            prisma.rencanaPenanganan.findMany({
              where: relatedRiskScope,
              select: {
                identifikasiRisikoId: true,
                targetResidualLevelKemungkinanId: true,
                targetResidualLevelDampakId: true,
              },
            }),
            prisma.kri.findMany({
              where: relatedRiskScope,
              select: {
                id: true,
                namaIndikator: true,
                batasHijau: true,
                batasKuning: true,
                batasMerah: true,
                nilaiAktual: true,
              },
            }),
            prisma.identifikasiRisiko.count({
              where: {
                ...riskScope,
                rencanaPenanganan: { isNot: null },
                pemantauans: {
                  none: { status: "FINAL", tahun: yearRange },
                },
              },
            }),
            prisma.pemantauanRisiko.count({
              where: {
                status: "SUBMITTED",
                tahun: yearRange,
                ...(teamScoped ? { risk: { teamId: { in: authContext.teamIds } } } : {}),
              },
            }),
            prisma.kewajibanTindakLanjut.count({
              where: {
                status: { notIn: ["SELESAI", "DIBATALKAN"] },
                ...(teamScoped ? { teamId: { in: authContext.teamIds } } : {}),
              },
            }),
            prisma.identifikasiRisiko.count({
              where: {
                tahun: yearRange,
                archivedAt: null,
                statusSiklus: {
                  in: ["FOLLOW_UP_DRAFT", "FOLLOW_UP_SUBMITTED"],
                },
                ...teamScope,
              },
            }),
            prisma.seleraRisikoGlobal.findFirst({ orderBy: { id: "desc" }, select: { nilai: true } }),
          ]);

          const countIdentifikasi = identifikasiScope.length;
          const countSasaran = new Set(
            identifikasiScope.map((item) => item.sasaranId).filter((id) => id != null)
          ).size;
          const countProsesBisnis = new Set(
            identifikasiScope.map((item) => item.prosesBisnisId).filter((id) => id != null)
          ).size;

          // ---- Matrix lookup helpers ----
          const matriksKey = (k: number, d: number) => k + "-" + d;
          const matriksMap = new Map<
            string,
            { besaran: number; levelRisikoId: number }
          >();
          for (const m of matriks)
            matriksMap.set(matriksKey(m.levelKemungkinanId, m.levelDampakId), {
              besaran: m.besaran,
              levelRisikoId: m.levelRisikoId,
            });
          const levelRisikoMap = new Map(levelRisiko.map((l) => [l.id, l]));

          const resolveCell = (k?: number | null, d?: number | null) => {
            if (k == null || d == null) return null;
            return matriksMap.get(matriksKey(k, d)) ?? null;
          };

          // Both matrices use the same configured cells and currently scoped risks.
          const buildHeatmap = (pairs: readonly { k: number | null; d: number | null }[]) => {
            const counts = new Map<string, number>();
            for (const { k, d } of pairs) {
              if (!resolveCell(k, d)) continue;
              const key = matriksKey(k!, d!);
              counts.set(key, (counts.get(key) ?? 0) + 1);
            }
            return levelKemungkinan.map((k) => levelDampak.map((d) => {
              const key = matriksKey(k.id, d.id);
              const cell = matriksMap.get(key);
              const lr = cell ? levelRisikoMap.get(cell.levelRisikoId) : null;
              return {
                kemungkinanId: k.id,
                dampakId: d.id,
                count: counts.get(key) ?? 0,
                besaran: cell?.besaran ?? null,
                levelRisikoNama: lr?.nama ?? null,
                warna: lr?.warna ?? null,
              };
            }));
          };
          const heatmapAktual = buildHeatmap(analisis.map((a) => ({ k: a.levelKemungkinanId, d: a.levelDampakId })));
          const heatmapResidual = buildHeatmap(evaluasi.map((e) => ({ k: e.residualLevelKemungkinanId, d: e.residualLevelDampakId })));

          // ---- Risk distribution by level ----
          const byLevelMap = new Map<number, number>();
          for (const a of analisis) {
            const lrId =
              a.levelRisikoId ??
              resolveCell(a.levelKemungkinanId, a.levelDampakId)
                ?.levelRisikoId ??
              null;
            if (lrId != null)
              byLevelMap.set(lrId, (byLevelMap.get(lrId) ?? 0) + 1);
          }
          const byLevel = levelRisiko.map((l) => ({
            nama: l.nama,
            warna: l.warna,
            count: byLevelMap.get(l.id) ?? 0,
          }));

          // ---- By category & by type ----
          const tally = (arr: (string | null | undefined)[]) => {
            const map = new Map<string, number>();
            for (const v of arr) {
              const key = v || "Tidak terkategori";
              map.set(key, (map.get(key) ?? 0) + 1);
            }
            return Array.from(map.entries())
              .map(([nama, count]) => ({ nama, count }))
              .sort((a, b) => b.count - a.count);
          };
          const byCategory = tally(identifikasiScope.map((risk) => risk.kategoriRisiko?.nama));
          const byType = tally(
            analisis.map((a) => a.identifikasiRisiko?.jenisRisiko?.nama)
          );

          // ---- Risk response distribution ----
          const byResponse = tally(evaluasi.map((e) => e.responRisiko));

          const analysisByRiskId = new Map(analisis.map((a) => [a.identifikasiRisikoId, a]));
          const planByRiskId = new Map(rencana.map((plan) => [plan.identifikasiRisikoId, plan]));
          const riskScores = evaluasi.map((evaluation) => {
            const analysis = analysisByRiskId.get(evaluation.identifikasiRisikoId);
            return {
              id: evaluation.identifikasiRisikoId,
              actual: analysis ? resolveCell(analysis.levelKemungkinanId, analysis.levelDampakId)?.besaran ?? null : null,
              residual: resolveCell(evaluation.residualLevelKemungkinanId, evaluation.residualLevelDampakId)?.besaran ?? null,
              hasPlan: planByRiskId.has(evaluation.identifikasiRisikoId),
            };
          });
          const pairedScores = summarizePairedScores(riskScores);
          const treatment = summarizeTreatment(riskScores, seleraGlobal?.nilai ?? null);
          const targetScores = rencana
            .map((plan) => resolveCell(plan.targetResidualLevelKemungkinanId, plan.targetResidualLevelDampakId)?.besaran ?? null)
            .filter((score): score is number => score != null);
          const targetResidual = {
            count: targetScores.length,
            planCount: rencana.length,
            average: targetScores.length ? +(targetScores.reduce((sum, score) => sum + score, 0) / targetScores.length).toFixed(2) : null,
          };

          // ---- KRI status ----
          const kriStatus = kris.map((k) => {
            let status: "hijau" | "kuning" | "merah" | "belum" = "belum";
            const v = k.nilaiAktual;
            if (v != null) {
              if (k.batasMerah != null && v >= k.batasMerah) status = "merah";
              else if (k.batasKuning != null && v >= k.batasKuning)
                status = "kuning";
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
          const topRisks = evaluasi
            .map((evaluation) => {
              const c = resolveCell(evaluation.residualLevelKemungkinanId, evaluation.residualLevelDampakId);
              const lr = c ? levelRisikoMap.get(c.levelRisikoId) : null;
              return {
                id: evaluation.identifikasiRisikoId,
                risiko: evaluation.identifikasiRisiko?.risiko ?? "-",
                kategori: evaluation.identifikasiRisiko?.kategoriRisiko?.nama ?? "-",
                besaran: c?.besaran ?? null,
                level: lr?.nama ?? "-",
                warna: lr?.warna ?? null,
              };
            })
            .filter((risk) => treatment.appetite != null && risk.besaran != null && risk.besaran > treatment.appetite)
            .sort((a, b) => (b.besaran ?? 0) - (a.besaran ?? 0))
            .slice(0, 8);

          const analysisCoverage = countIdentifikasi
            ? Math.round((countAnalisis / countIdentifikasi) * 100)
            : null;
          const evaluationCoverage = countIdentifikasi
            ? Math.round((countEvaluasi / countIdentifikasi) * 100)
            : null;
          const funnel = [
            { tahap: "Identifikasi", count: countIdentifikasi, total: countIdentifikasi, coveragePercent: countIdentifikasi ? 100 : null },
            { tahap: "Analisis", count: countAnalisis, total: countIdentifikasi, coveragePercent: analysisCoverage },
            { tahap: "Evaluasi", count: countEvaluasi, total: countIdentifikasi, coveragePercent: evaluationCoverage },
            { tahap: "Rencana penanganan", count: treatment.planned, total: treatment.eligible, coveragePercent: treatment.coveragePercent },
          ];

          return {
            kpi: {
              totalRisiko: countIdentifikasi,
              dianalisis: countAnalisis,
              dievaluasi: countEvaluasi,
              ditangani: treatment.planned,
              kri: countKri,
              sasaran: countSasaran,
              prosesBisnis: countProsesBisnis,
              analysisCoverage,
              evaluationCoverage,
              treatmentCoverage: treatment.coveragePercent,
            },
            levelKemungkinan,
            levelDampak,
            heatmapAktual,
            heatmapResidual,
            byLevel,
            byCategory,
            byType,
            byResponse,
            pairedScores,
            targetResidual,
            treatment,
            kriStatus,
            kriSummary,
            topRisks,
            funnel,
            riskCycle: {
              belumDipantau,
              menungguValidasi,
              tindakLanjutWajib,
              followUpDrafts,
            },
          };
        },
        300
      );

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": REVALIDATE_CACHE_CONTROL,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
