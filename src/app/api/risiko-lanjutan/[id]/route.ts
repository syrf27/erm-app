import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import {
  checkPermission,
  getAuthUserContext,
  isAdminRole,
} from "@/lib/access-control";
import { invalidateResourceCache } from "@/lib/cache";
import { logAudit } from "@/lib/audit-log";
import {
  DomainError,
  upsertRiskStages,
  validateFollowUpCompleteness,
  type RiskRegisterInput,
} from "@/lib/risk-register-service";
import { resolveAssessmentFromDb } from "@/lib/risk-assessment";
import { approveFollowUp } from "@/lib/pemantauan-service";
import {
  KEWAJIBAN_STATUS,
  RISK_CYCLE,
  RISK_CYCLE_LABEL,
} from "@/lib/risk-cycle";
import { followUpActionSchema, followUpStageSchema } from "@/lib/validators";

async function getActor() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("auth");
  if (!auth?.value) return null;
  try {
    const parsed = JSON.parse(auth.value);
    if (!parsed.email) return null;
    return { email: String(parsed.email), name: String(parsed.name ?? parsed.email) };
  } catch {
    return null;
  }
}

function toErrorResponse(error: unknown) {
  if (error instanceof DomainError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.status }
    );
  }
  console.error("risiko-lanjutan detail error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

async function loadFollowUp(id: number) {
  return prisma.identifikasiRisiko.findUnique({
    where: { id },
    include: {
      team: { select: { id: true, nama: true } },
      analisisRisiko: true,
      evaluasiRisiko: true,
      rencanaPenanganan: { include: { dokumenPendukungs: true } },
      parentRisk: { select: { id: true, risiko: true, statusSiklus: true } },
      sourceMonitoring: {
        select: {
          id: true,
          tahun: true,
          triwulan: true,
          besaran: true,
          seleraSnapshot: true,
          status: true,
          statusPelaksanaan: true,
          realisasiOutput: true,
          uraianPelaksanaan: true,
          pekerjaanTertunda: true,
          efektivitas: true,
          reconciliationDecision: true,
          reconciliationNote: true,
          risk: { select: { id: true, risiko: true } },
        },
      },
      kewajibanSebagaiLanjutan: true,
      childRisks: { select: { id: true, risiko: true, statusSiklus: true } },
    },
  });
}

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
    const risk = await loadFollowUp(riskId);
    if (!risk) {
      return NextResponse.json({ error: "Risiko lanjutan tidak ditemukan" }, { status: 404 });
    }
    if (!isAdminRole(ctx.roleName) && (risk.teamId == null || !ctx.teamIds.includes(risk.teamId))) {
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

    return NextResponse.json({
      risk,
      chain,
      statusLabel: RISK_CYCLE_LABEL[risk.statusSiklus] ?? risk.statusSiklus,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const allowed =
      (await checkPermission("risiko-lanjutan", "update")) ||
      (await checkPermission("identifikasi-risiko", "update"));
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const ctx = await getAuthUserContext();
    const actor = await getActor();
    if (!ctx || !actor) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const riskId = Number(id);
    if (!Number.isInteger(riskId) || riskId <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    let input;
    try {
      input = followUpStageSchema.parse(await request.json());
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      throw error;
    }

    const risk = await prisma.identifikasiRisiko.findUnique({
      where: { id: riskId },
      select: { id: true, teamId: true, statusSiklus: true, version: true, tahun: true },
    });
    if (!risk) {
      return NextResponse.json({ error: "Risiko lanjutan tidak ditemukan" }, { status: 404 });
    }
    if (!isAdminRole(ctx.roleName) && (risk.teamId == null || !ctx.teamIds.includes(risk.teamId))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (
      risk.statusSiklus !== RISK_CYCLE.FOLLOW_UP_DRAFT &&
      risk.statusSiklus !== RISK_CYCLE.FOLLOW_UP_SUBMITTED
    ) {
      return NextResponse.json(
        { error: "Risiko lanjutan sudah disahkan atau bukan draf." },
        { status: 409 }
      );
    }
    if (input.version == null) {
      return NextResponse.json(
        { error: "Versi data wajib dikirim untuk menyimpan draf lanjutan." },
        { status: 400 }
      );
    }
    if (input.version !== risk.version) {
      return NextResponse.json(
        { error: "Versi data sudah berubah. Muat ulang sebelum menyimpan." },
        { status: 409 }
      );
    }

    const identifikasi = {
      ...input.identifikasi,
      teamId: isAdminRole(ctx.roleName) && input.identifikasi.teamId
        ? input.identifikasi.teamId
        : risk.teamId,
    };

    const stages: RiskRegisterInput = {
      identifikasi,
      analisis: input.analisis ?? null,
      evaluasi: input.evaluasi ?? null,
      rencana: input.rencana ?? null,
    };

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.identifikasiRisiko.updateMany({
        where: {
          id: riskId,
          version: input.version as number,
          statusSiklus: {
            in: [RISK_CYCLE.FOLLOW_UP_DRAFT, RISK_CYCLE.FOLLOW_UP_SUBMITTED],
          },
        },
        data: { version: { increment: 1 } },
      });
      if (claimed.count === 0) {
        throw new DomainError(
          "Versi atau status risiko lanjutan sudah berubah. Muat ulang sebelum menyimpan.",
          409
        );
      }
      await upsertRiskStages(tx, riskId, stages);
    });

    await logAudit({
      userId: actor.email,
      userName: actor.name,
      action: "UPDATE",
      resource: "RisikoLanjutan",
      resourceId: riskId,
      details: {
        statusSiklus: risk.statusSiklus,
        teamIdSebelum: risk.teamId,
        teamIdSesudah: identifikasi.teamId,
      },
    });
    await invalidateResourceCache("risiko-lanjutan");
    await invalidateResourceCache("identifikasi-risiko");

    const updated = await loadFollowUp(riskId);
    return NextResponse.json(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthUserContext();
    const actor = await getActor();
    if (!ctx || !actor) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const riskId = Number(id);
    if (!Number.isInteger(riskId) || riskId <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    let input;
    try {
      input = followUpActionSchema.parse(await request.json());
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      throw error;
    }

    const risk = await loadFollowUp(riskId);
    if (!risk) {
      return NextResponse.json({ error: "Risiko lanjutan tidak ditemukan" }, { status: 404 });
    }
    if (!isAdminRole(ctx.roleName) && (risk.teamId == null || !ctx.teamIds.includes(risk.teamId))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (input.version == null) {
      return NextResponse.json(
        { error: "Versi data wajib dikirim untuk aksi ini." },
        { status: 400 }
      );
    }
    if (input.version !== risk.version) {
      return NextResponse.json(
        { error: "Versi data sudah berubah. Muat ulang sebelum melanjutkan." },
        { status: 409 }
      );
    }

    const stageInput = {
      analisis: risk.analisisRisiko,
      evaluasi: risk.evaluasiRisiko,
      rencana: risk.rencanaPenanganan,
    };

    const matrixErrors: string[] = [];
    const analisisPair = await resolveAssessmentFromDb(
      prisma as never,
      risk.analisisRisiko?.levelKemungkinanId,
      risk.analisisRisiko?.levelDampakId
    );
    if (risk.analisisRisiko && analisisPair.status !== "OK") {
      matrixErrors.push("Pasangan risiko aktual tidak ditemukan pada matriks.");
    }
    const residualPair = await resolveAssessmentFromDb(
      prisma as never,
      risk.evaluasiRisiko?.residualLevelKemungkinanId,
      risk.evaluasiRisiko?.residualLevelDampakId
    );
    if (risk.evaluasiRisiko && residualPair.status !== "OK") {
      matrixErrors.push("Pasangan residual evaluasi tidak ditemukan pada matriks.");
    }
    const targetPair = await resolveAssessmentFromDb(
      prisma as never,
      risk.rencanaPenanganan?.targetResidualLevelKemungkinanId,
      risk.rencanaPenanganan?.targetResidualLevelDampakId
    );
    if (risk.rencanaPenanganan && targetPair.status !== "OK") {
      matrixErrors.push("Pasangan residual harapan tidak ditemukan pada matriks.");
    }

    if (input.action === "submit") {
      const allowed =
        (await checkPermission("risiko-lanjutan", "update")) ||
        (await checkPermission("identifikasi-risiko", "update"));
      if (!allowed) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      if (risk.statusSiklus !== RISK_CYCLE.FOLLOW_UP_DRAFT) {
        return NextResponse.json(
          { error: "Hanya draf lanjutan yang dapat diajukan." },
          { status: 409 }
        );
      }
      const errors = [
        ...matrixErrors,
        ...validateFollowUpCompleteness(stageInput),
      ];
      if (errors.length > 0) {
        return NextResponse.json(
          { error: "Draf risiko lanjutan belum lengkap.", details: errors },
          { status: 400 }
        );
      }
      const updated = await prisma.$transaction(async (tx) => {
        const claimed = await tx.identifikasiRisiko.updateMany({
          where: {
            id: riskId,
            version: input.version as number,
            statusSiklus: RISK_CYCLE.FOLLOW_UP_DRAFT,
          },
          data: {
            statusSiklus: RISK_CYCLE.FOLLOW_UP_SUBMITTED,
            version: { increment: 1 },
          },
        });
        if (claimed.count === 0) {
          throw new DomainError(
            "Status atau versi draf lanjutan sudah berubah. Muat ulang.",
            409
          );
        }
        await tx.kewajibanTindakLanjut.updateMany({
          where: { followUpRiskId: riskId },
          data: { status: KEWAJIBAN_STATUS.MENUNGGU_VALIDASI },
        });
        return tx.identifikasiRisiko.findUniqueOrThrow({ where: { id: riskId } });
      });
      await logAudit({
        userId: actor.email,
        userName: actor.name,
        action: "UPDATE",
        resource: "RisikoLanjutan",
        resourceId: riskId,
        details: { aksi: "submit" },
      });
      await invalidateResourceCache("risiko-lanjutan");
      await invalidateResourceCache("kewajiban-tindak-lanjut");
      return NextResponse.json(updated);
    }

    if (input.action === "return") {
      if (!isAdminRole(ctx.roleName)) {
        return NextResponse.json({ error: "Hanya Admin yang dapat mengembalikan." }, { status: 403 });
      }
      if (risk.statusSiklus !== RISK_CYCLE.FOLLOW_UP_SUBMITTED) {
        return NextResponse.json(
          { error: "Hanya lanjutan yang diajukan dapat dikembalikan." },
          { status: 409 }
        );
      }
      if (!input.reason?.trim()) {
        return NextResponse.json({ error: "Alasan pengembalian wajib diisi." }, { status: 400 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        const claimed = await tx.identifikasiRisiko.updateMany({
          where: {
            id: riskId,
            version: input.version as number,
            statusSiklus: RISK_CYCLE.FOLLOW_UP_SUBMITTED,
          },
          data: {
            statusSiklus: RISK_CYCLE.FOLLOW_UP_DRAFT,
            version: { increment: 1 },
          },
        });
        if (claimed.count === 0) {
          throw new DomainError(
            "Status atau versi lanjutan sudah berubah. Muat ulang.",
            409
          );
        }
        await tx.kewajibanTindakLanjut.updateMany({
          where: { followUpRiskId: riskId },
          data: {
            status: KEWAJIBAN_STATUS.WAJIB,
            catatan: `Dikembalikan admin: ${input.reason?.trim()}`,
          },
        });
        return tx.identifikasiRisiko.findUniqueOrThrow({ where: { id: riskId } });
      });
      await logAudit({
        userId: actor.email,
        userName: actor.name,
        action: "REJECT",
        resource: "RisikoLanjutan",
        resourceId: riskId,
        details: { alasan: input.reason.trim() },
      });
      await invalidateResourceCache("risiko-lanjutan");
      await invalidateResourceCache("kewajiban-tindak-lanjut");
      return NextResponse.json(updated);
    }

    if (input.action === "approve") {
      if (!isAdminRole(ctx.roleName)) {
        return NextResponse.json({ error: "Hanya Admin yang dapat mengesahkan." }, { status: 403 });
      }
      if (risk.statusSiklus !== RISK_CYCLE.FOLLOW_UP_SUBMITTED) {
        return NextResponse.json(
          { error: "Hanya lanjutan yang diajukan dapat disahkan." },
          { status: 409 }
        );
      }
      const errors = [
        ...matrixErrors,
        ...validateFollowUpCompleteness(stageInput),
      ];
      if (errors.length > 0) {
        return NextResponse.json(
          { error: "Risiko lanjutan belum lengkap.", details: errors },
          { status: 400 }
        );
      }
      if (!risk.parentRiskId || !risk.sourceMonitoring) {
        return NextResponse.json(
          { error: "Risiko lanjutan tidak memiliki sumber rantai yang sah." },
          { status: 409 }
        );
      }

      const approved = await approveFollowUp({
        riskId,
        expectedVersion: input.version as number,
        actor,
      });

      await logAudit({
        userId: actor.email,
        userName: actor.name,
        action: "APPROVE",
        resource: "RisikoLanjutan",
        resourceId: riskId,
        details: { parentRiskId: risk.parentRiskId, monitoringId: risk.sourceMonitoring.id },
      });
      await invalidateResourceCache("risiko-lanjutan");
      await invalidateResourceCache("kewajiban-tindak-lanjut");
      await invalidateResourceCache("identifikasi-risiko");
      return NextResponse.json(approved);
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
