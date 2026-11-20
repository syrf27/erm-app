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

  return monitorings.map((monitoring) => {
    const comparison = compareResidualToTolerance(
      monitoring.besaran,
      monitoring.seleraSnapshot
    );
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
      risikoLanjutanId: monitoring.followUpRisk?.id ?? null,
      statusRisikoLanjutan: monitoring.followUpRisk?.statusSiklus ?? null,
      statusKewajiban: monitoring.kewajiban?.status ?? null,
      finalizedBy: monitoring.finalizedBy,
      finalizedAt: monitoring.finalizedAt,
      correctionReason: monitoring.correctionReason,
      reconciliationDecision: monitoring.reconciliationDecision,
      hasSnapshot:
        monitoring.besaran != null && monitoring.seleraSnapshot != null,
    };
  });
}
