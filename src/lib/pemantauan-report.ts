import { prisma } from "@/lib/prisma";
import { compareResidualToTolerance } from "@/lib/risk-assessment";
import { PEMANTAUAN_STATUS } from "@/lib/risk-cycle";

export interface HistoricalReportFilters {
  tahun: number;
  triwulan?: number;
  teamIds?: number[];
  isAdmin: boolean;
}

export interface HistoricalReportRow {
  monitoringId: number;
  riskId: number;
  risiko: string;
  team: string | null;
  tahun: number;
  triwulan: number;
  status: string;
  revision: number;
  residualAcuan: number | null;
  residualHasil: number | null;
  residualHarapan: number | null;
  selera: number | null;
  levelRisiko: string | null;
  warnaRisiko: string | null;
  pencapaian: string;
  responFinal: string | null;
  risikoAsalId: number | null;
  risikoLanjutanId: number | null;
  statusRisikoLanjutan: string | null;
  statusKewajiban: string | null;
  finalizedBy: string | null;
  finalizedAt: Date | null;
  correctionReason: string | null;
  reconciliationDecision: string | null;
  hasSnapshot: boolean;
}

export async function buildHistoricalReport(
  filters: HistoricalReportFilters
): Promise<HistoricalReportRow[]> {
  const { tahun, triwulan, teamIds = [], isAdmin } = filters;
  const monitorings = await prisma.pemantauanRisiko.findMany({
    where: {
      status: PEMANTAUAN_STATUS.FINAL,
      tahun,
      ...(triwulan ? { triwulan } : {}),
      ...(isAdmin
        ? {}
        : { risk: { teamId: { in: teamIds } } }),
    },
    orderBy: [{ tahun: "asc" }, { triwulan: "asc" }, { riskId: "asc" }],
    include: {
      risk: {
        select: {
          id: true,
          risiko: true,
          team: { select: { nama: true } },
          parentRiskId: true,
        },
      },
      followUpRisk: { select: { id: true, statusSiklus: true } },
      kewajiban: { select: { status: true } },
    },
  });

  // Hubungan penerus/kewajiban dapat melekat pada revisi lama yang sudah
  // SUPERSEDED. Telusuri seluruh revisi pada risiko+periode yang sama agar
  // laporan tidak kehilangan jejak rantai setelah koreksi.
  const riskIds = Array.from(
    new Set(monitorings.map((monitoring) => monitoring.riskId))
  );
  const relatedMonitorings = riskIds.length
    ? await prisma.pemantauanRisiko.findMany({
        where: {
          riskId: { in: riskIds },
          OR: [
            { followUpRisk: { isNot: null } },
            { kewajiban: { isNot: null } },
          ],
        },
        select: {
          riskId: true,
          tahun: true,
          triwulan: true,
          revision: true,
          followUpRisk: { select: { id: true, statusSiklus: true } },
          kewajiban: { select: { id: true, status: true } },
        },
        orderBy: [{ revision: "asc" }, { id: "asc" }],
      })
    : [];

  const successorByKey = new Map<
    string,
    { id: number; statusSiklus: string }
  >();
  const obligationByKey = new Map<string, { status: string }>();
  for (const related of relatedMonitorings) {
    const key = `${related.riskId}:${related.tahun}:${related.triwulan}`;
    if (related.followUpRisk && !successorByKey.has(key)) {
      successorByKey.set(key, related.followUpRisk);
    }
    if (related.kewajiban && !obligationByKey.has(key)) {
      obligationByKey.set(key, related.kewajiban);
    }
  }

  return monitorings.map((monitoring) => {
    const comparison = compareResidualToTolerance(
      monitoring.besaran,
      monitoring.seleraSnapshot
    );
    const key = `${monitoring.riskId}:${monitoring.tahun}:${monitoring.triwulan}`;
    const followUp = monitoring.followUpRisk ?? successorByKey.get(key) ?? null;
    const obligation = monitoring.kewajiban ?? obligationByKey.get(key) ?? null;
    return {
      monitoringId: monitoring.id,
      riskId: monitoring.riskId,
      risiko: monitoring.risk.risiko,
      team: monitoring.risk.team?.nama ?? null,
      tahun: monitoring.tahun,
      triwulan: monitoring.triwulan,
      status: monitoring.status,
      revision: monitoring.revision,
      residualAcuan: monitoring.residualAcuan,
      residualHasil: monitoring.besaran,
      residualHarapan: monitoring.residualHarapan,
      selera: monitoring.seleraSnapshot,
      levelRisiko: monitoring.levelRisikoNama,
      warnaRisiko: monitoring.levelRisikoWarna,
      pencapaian:
        comparison === "DI_BAWAH"
          ? "Di bawah selera"
          : comparison === "BELUM_DI_BAWAH"
          ? "Belum di bawah selera"
          : "Belum dapat dinilai",
      responFinal: monitoring.responRisiko,
      risikoAsalId: monitoring.risk.parentRiskId ?? monitoring.riskId,
      risikoLanjutanId: followUp?.id ?? null,
      statusRisikoLanjutan: followUp?.statusSiklus ?? null,
      statusKewajiban: obligation?.status ?? null,
      finalizedBy: monitoring.finalizedBy,
      finalizedAt: monitoring.finalizedAt,
      correctionReason: monitoring.correctionReason,
      reconciliationDecision: monitoring.reconciliationDecision,
      hasSnapshot:
        monitoring.besaran != null && monitoring.seleraSnapshot != null,
    };
  });
}
