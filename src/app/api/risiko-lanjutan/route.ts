import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkPermission,
  getAuthUserContext,
  isAdminRole,
} from "@/lib/access-control";
import {
  KEWAJIBAN_STATUS,
  RISK_CYCLE,
  RISK_CYCLE_LABEL,
} from "@/lib/risk-cycle";

export async function GET() {
  try {
    const allowed =
      (await checkPermission("risiko-lanjutan", "read")) ||
      (await checkPermission("identifikasi-risiko", "read"));
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const ctx = await getAuthUserContext();
    if (!ctx) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const scopedWhere = isAdminRole(ctx.roleName)
      ? {}
      : { teamId: { in: ctx.teamIds } };

    const [obligations, drafts] = await Promise.all([
      prisma.kewajibanTindakLanjut.findMany({
        where: {
          status: {
            notIn: [KEWAJIBAN_STATUS.SELESAI, KEWAJIBAN_STATUS.DIBATALKAN],
          },
          ...scopedWhere,
        },
        include: {
          risk: { select: { id: true, risiko: true, teamId: true } },
          monitoring: {
            select: { id: true, tahun: true, triwulan: true, besaran: true, seleraSnapshot: true },
          },
          followUpRisk: {
            select: {
              id: true,
              risiko: true,
              statusSiklus: true,
              followUpTahun: true,
              followUpTriwulan: true,
              team: { select: { id: true, nama: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.identifikasiRisiko.findMany({
        where: {
          statusSiklus: {
            in: [RISK_CYCLE.FOLLOW_UP_DRAFT, RISK_CYCLE.FOLLOW_UP_SUBMITTED],
          },
          archivedAt: null,
          ...scopedWhere,
        },
        select: {
          id: true,
          risiko: true,
          statusSiklus: true,
          followUpTahun: true,
          followUpTriwulan: true,
          parentRiskId: true,
          team: { select: { id: true, nama: true } },
          kewajibanSebagaiLanjutan: { select: { id: true, status: true } },
        },
        orderBy: { id: "asc" },
      }),
    ]);

    const rows = [
      ...obligations.map((obligation) => ({
        obligationId: obligation.id,
        statusKewajiban: obligation.status,
        status: "WAJIB",
        riskId: obligation.riskId,
        risiko: obligation.risk.risiko,
        monitoring: obligation.monitoring,
        followUpRiskId: obligation.followUpRisk?.id ?? null,
        followUpStatus: obligation.followUpRisk?.statusSiklus ?? null,
        followUpStatusLabel: obligation.followUpRisk
          ? RISK_CYCLE_LABEL[obligation.followUpRisk.statusSiklus]
          : null,
        team: obligation.followUpRisk?.team ?? null,
        tahun: obligation.followUpRisk?.followUpTahun ?? null,
        triwulan: obligation.followUpRisk?.followUpTriwulan ?? null,
        createdAt: obligation.createdAt,
        lastRemindedAt: obligation.lastRemindedAt,
      })),
      ...drafts
        .filter(
          (draft) =>
            !obligations.some(
              (obligation) => obligation.followUpRisk?.id === draft.id
            )
        )
        .map((draft) => ({
          obligationId: draft.kewajibanSebagaiLanjutan?.id ?? null,
          statusKewajiban: draft.kewajibanSebagaiLanjutan?.status ?? null,
          status: "DRAF",
          riskId: draft.parentRiskId,
          risiko: draft.risiko,
          monitoring: null,
          followUpRiskId: draft.id,
          followUpStatus: draft.statusSiklus,
          followUpStatusLabel: RISK_CYCLE_LABEL[draft.statusSiklus],
          team: draft.team,
          tahun: draft.followUpTahun,
          triwulan: draft.followUpTriwulan,
          createdAt: null,
          lastRemindedAt: null,
        })),
    ];

    return NextResponse.json({
      rows,
      counts: {
        wajib: obligations.filter((o) => o.status === KEWAJIBAN_STATUS.WAJIB).length,
        menungguValidasi: obligations.filter(
          (o) => o.status === KEWAJIBAN_STATUS.MENUNGGU_VALIDASI
        ).length,
        draf: drafts.length,
      },
    });
  } catch (error) {
    console.error("risiko-lanjutan GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
