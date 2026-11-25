import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  checkPermission,
  getAuthUserContext,
  isAdminRole,
} from "@/lib/access-control";
import { invalidateResourceCache } from "@/lib/cache";
import { logAudit } from "@/lib/audit-log";
import { isSafeAppUrl } from "@/lib/safe-url";
import {
  requiresFollowUp,
  resolveAssessmentFromDb,
} from "@/lib/risk-assessment";
import {
  buildMonitoringSnapshot,
  cancelObligationThroughCorrection,
  finalizeMonitoring,
  notifyObligation,
  validateMonitoringForSubmit,
} from "@/lib/pemantauan-service";
import {
  KEWAJIBAN_STATUS,
  PEMANTAUAN_STATUS,
  RISK_CYCLE,
} from "@/lib/risk-cycle";
import {
  monitoringActionSchema,
  savePemantauanPatchSchema,
} from "@/lib/validators";
import { DomainError } from "@/lib/risk-register-service";

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

async function canReadMonitoring() {
  return (
    (await checkPermission("pemantauan-risiko", "read")) ||
    (await checkPermission("rencana-penanganan", "read"))
  );
}

async function canWriteMonitoring() {
  return (
    (await checkPermission("pemantauan-risiko", "update")) ||
    (await checkPermission("rencana-penanganan", "update"))
  );
}

function canAccessTeam(
  _ctx: { roleName: string; teamIds: number[] },
  _teamId: number | null,
  _action: "read" | "write" = "write"
) {
  // Pemantauan merupakan proses lintas tim. Aksesnya mengikuti permission
  // pemantauan, bukan pembatasan team kerja pada risk register.
  return true;
}

function toErrorResponse(error: unknown) {
  if (error instanceof DomainError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.status }
    );
  }
  console.error("pemantauan detail error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await canReadMonitoring()) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const ctx = await getAuthUserContext();
    if (!ctx) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { id } = await params;
    const monitoringId = Number(id);
    if (!Number.isInteger(monitoringId) || monitoringId <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const monitoring = await prisma.pemantauanRisiko.findUnique({
      where: { id: monitoringId },
      include: {
        dokumens: true,
        kewajiban: true,
        risk: {
          include: {
            team: { select: { id: true, nama: true } },
            analisisRisiko: true,
            evaluasiRisiko: true,
            rencanaPenanganan: true,
          },
        },
      },
    });
    if (!monitoring) {
      return NextResponse.json({ error: "Pemantauan tidak ditemukan" }, { status: 404 });
    }
    if (!canAccessTeam(ctx, monitoring.risk.teamId, "read")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const history = await prisma.pemantauanRisiko.findMany({
      where: {
        riskId: monitoring.riskId,
        tahun: monitoring.tahun,
        triwulan: monitoring.triwulan,
      },
      orderBy: [{ revision: "desc" }, { id: "desc" }],
      include: {
        dokumens: true,
        kewajiban: { select: { id: true, status: true } },
      },
    });

    const events = await prisma.auditLog.findMany({
      where: {
        resource: "PemantauanRisiko",
        resourceId: { in: history.map((entry) => String(entry.id)) },
        action: { in: ["UPDATE", "REJECT", "APPROVE"] },
      },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({ monitoring, history, events: events.filter((event) => {
      const details = event.details as Record<string, unknown> | null;
      return details?.aksi === "submit" || event.action === "REJECT" || event.action === "APPROVE";
    }) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await canWriteMonitoring()) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const ctx = await getAuthUserContext();
    const actor = await getActor();
    if (!ctx || !actor) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const monitoringId = Number(id);
    if (!Number.isInteger(monitoringId) || monitoringId <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    let input;
    try {
      input = savePemantauanPatchSchema.parse(await request.json());
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      throw error;
    }

    const monitoring = await prisma.pemantauanRisiko.findUnique({
      where: { id: monitoringId },
      include: {
        risk: { include: { rencanaPenanganan: true } },
      },
    });
    if (!monitoring) {
      return NextResponse.json({ error: "Pemantauan tidak ditemukan" }, { status: 404 });
    }
    if (!canAccessTeam(ctx, monitoring.risk.teamId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (
      monitoring.status !== PEMANTAUAN_STATUS.DRAFT &&
      monitoring.status !== PEMANTAUAN_STATUS.RETURNED
    ) {
      return NextResponse.json(
        { error: "Hasil final tidak dapat diubah langsung. Buat revisi koreksi." },
        { status: 409 }
      );
    }
    if (input.version !== monitoring.version) {
      return NextResponse.json(
        { error: "Versi data sudah berubah. Muat ulang sebelum menyimpan." },
        { status: 409 }
      );
    }

    const unsafeDoc = (input.dokumens ?? []).find((doc) => !isSafeAppUrl(doc.url));
    if (unsafeDoc) {
      return NextResponse.json(
        { error: "Tautan dokumen tidak aman." },
        { status: 400 }
      );
    }

    const snapshot = await buildMonitoringSnapshot(prisma as never, {
      levelKemungkinanId: input.levelKemungkinanId,
      levelDampakId: input.levelDampakId,
      kategoriRisikoId: monitoring.risk.kategoriRisikoId,
    });
    const { levelRisikoId: _levelRisikoId, ...snapshotData } = snapshot;
    const acuan = await prisma.evaluasiRisiko.findUnique({
      where: { identifikasiRisikoId: monitoring.riskId },
      select: {
        residualLevelKemungkinanId: true,
        residualLevelDampakId: true,
      },
    });
    const acuanAssessment = acuan
      ? await resolveAssessmentFromDb(
          prisma as never,
          acuan.residualLevelKemungkinanId,
          acuan.residualLevelDampakId
        )
      : null;
    const harapanAssessment = await resolveAssessmentFromDb(
      prisma as never,
      monitoring.risk.rencanaPenanganan?.targetResidualLevelKemungkinanId,
      monitoring.risk.rencanaPenanganan?.targetResidualLevelDampakId
    );

    const updated = await prisma.$transaction(async (tx) => {
      // Klaim baris terlebih dahulu dengan versi + status yang diharapkan.
      const claimed = await tx.pemantauanRisiko.updateMany({
        where: {
          id: monitoringId,
          version: input.version,
          status: {
            in: [PEMANTAUAN_STATUS.DRAFT, PEMANTAUAN_STATUS.RETURNED],
          },
        },
        data: {
          targetOutput: input.targetOutput ?? monitoring.targetOutput,
          targetWaktu: input.targetWaktu ?? monitoring.targetWaktu,
          penanggungJawab: input.penanggungJawab ?? monitoring.penanggungJawab,
          statusPelaksanaan: input.statusPelaksanaan ?? monitoring.statusPelaksanaan,
          uraianPelaksanaan: input.uraianPelaksanaan ?? monitoring.uraianPelaksanaan,
          pekerjaanTertunda: input.pekerjaanTertunda ?? monitoring.pekerjaanTertunda,
          realisasiWaktu: input.realisasiWaktu ?? null,
          realisasiOutput: input.realisasiOutput ?? null,
          keterjadianRisiko: input.keterjadianRisiko ?? null,
          efektivitas: input.efektivitas ?? monitoring.efektivitas,
          catatanEfektivitas: input.catatanEfektivitas ?? monitoring.catatanEfektivitas,
          levelKemungkinanId: input.levelKemungkinanId ?? null,
          levelDampakId: input.levelDampakId ?? null,
          ...snapshotData,
          // Snapshot acuan/harapan yang sudah ada tidak dihitung ulang.
          residualAcuan:
            monitoring.residualAcuan ?? acuanAssessment?.besaran ?? null,
          residualHarapan:
            monitoring.residualHarapan ?? harapanAssessment?.besaran ?? null,
          responRisiko: input.responRisiko ?? monitoring.responRisiko,
          responAlasan: input.responAlasan ?? monitoring.responAlasan,
          version: { increment: 1 },
        },
      });
      if (claimed.count === 0) {
        throw new DomainError(
          "Versi atau status pemantauan sudah berubah. Muat ulang sebelum menyimpan.",
          409
        );
      }

      await tx.pemantauanDokumen.deleteMany({
        where: { pemantauanId: monitoringId },
      });
      if (input.dokumens?.length) {
        await tx.pemantauanDokumen.createMany({
          data: input.dokumens.map((doc) => ({
            pemantauanId: monitoringId,
            title: doc.title,
            url: doc.url,
            uploadedBy: actor.name || actor.email,
          })),
        });
      }
      return tx.pemantauanRisiko.findUniqueOrThrow({
        where: { id: monitoringId },
        include: { dokumens: true },
      });
    });

    await logAudit({
      userId: actor.email,
      userName: actor.name,
      action: "UPDATE",
      resource: "PemantauanRisiko",
      resourceId: monitoring.id,
      details: { status: updated.status, tahun: updated.tahun, triwulan: updated.triwulan },
    });
    await invalidateResourceCache("pemantauan-risiko");

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
    const monitoringId = Number(id);
    if (!Number.isInteger(monitoringId) || monitoringId <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    let input;
    try {
      input = monitoringActionSchema.parse(await request.json());
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      throw error;
    }

    const monitoring = await prisma.pemantauanRisiko.findUnique({
      where: { id: monitoringId },
      include: {
        dokumens: true,
        kewajiban: true,
        risk: {
          include: {
            evaluasiRisiko: true,
            rencanaPenanganan: true,
          },
        },
      },
    });
    if (!monitoring) {
      return NextResponse.json({ error: "Pemantauan tidak ditemukan" }, { status: 404 });
    }
    if (!canAccessTeam(ctx, monitoring.risk.teamId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const isIdempotentFinalize =
      input.action === "finalize" &&
      monitoring.status === PEMANTAUAN_STATUS.FINAL;
    if (
      ["submit", "return", "revise"].includes(input.action) &&
      input.version == null
    ) {
      return NextResponse.json(
        { error: "Versi data wajib dikirim untuk aksi ini." },
        { status: 400 }
      );
    }
    if (
      input.version != null &&
      input.version !== monitoring.version &&
      !isIdempotentFinalize
    ) {
      return NextResponse.json(
        { error: "Versi data sudah berubah. Muat ulang sebelum melanjutkan." },
        { status: 409 }
      );
    }

    if (input.action === "submit") {
      if (!await canWriteMonitoring()) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      if (
        monitoring.status !== PEMANTAUAN_STATUS.DRAFT &&
        monitoring.status !== PEMANTAUAN_STATUS.RETURNED
      ) {
        return NextResponse.json(
          { error: "Hanya draf/dikembalikan yang dapat diajukan." },
          { status: 409 }
        );
      }
      const snapshot = await buildMonitoringSnapshot(prisma as never, {
        levelKemungkinanId: monitoring.levelKemungkinanId,
        levelDampakId: monitoring.levelDampakId,
        kategoriRisikoId: monitoring.risk.kategoriRisikoId,
      });
      if (
        monitoring.besaran != null &&
        snapshot.besaran != null &&
        snapshot.besaran !== monitoring.besaran
      ) {
        return NextResponse.json(
          {
            error:
              "Matriks risiko berubah sejak draf terakhir disimpan. Tinjau ulang nilai resmi sebelum mengajukan.",
          },
          { status: 409 }
        );
      }
      const errors = validateMonitoringForSubmit(monitoring, {
        assessmentOk: snapshot.besaran != null,
        selera: snapshot.seleraSnapshot,
        documentCount: monitoring.dokumens.length,
        baselineRespon: monitoring.risk.evaluasiRisiko?.responRisiko,
        responAlasan: monitoring.responAlasan,
      });
      if (errors.length > 0) {
        return NextResponse.json(
          { error: "Data pemantauan belum lengkap.", details: errors },
          { status: 400 }
        );
      }
      const { levelRisikoId: _level, ...snapshotData } = snapshot;
      const claimed = await prisma.pemantauanRisiko.updateMany({
        where: {
          id: monitoring.id,
          version: input.version as number,
          status: {
            in: [PEMANTAUAN_STATUS.DRAFT, PEMANTAUAN_STATUS.RETURNED],
          },
        },
        data: {
          ...snapshotData,
          status: PEMANTAUAN_STATUS.SUBMITTED,
          submittedBy: actor.name || actor.email,
          submittedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (claimed.count === 0) {
        return NextResponse.json(
          { error: "Status atau versi pemantauan sudah berubah. Muat ulang." },
          { status: 409 }
        );
      }
      const updated = await prisma.pemantauanRisiko.findUniqueOrThrow({
        where: { id: monitoring.id },
        include: { dokumens: true },
      });
      await logAudit({
        userId: actor.email,
        userName: actor.name,
        action: "UPDATE",
        resource: "PemantauanRisiko",
        resourceId: monitoring.id,
        details: {
          aksi: "submit",
          snapshot: {
            targetWaktu: updated.targetWaktu,
            targetOutput: updated.targetOutput,
            penanggungJawab: updated.penanggungJawab,
            keterjadianRisiko: updated.keterjadianRisiko,
            realisasiWaktu: updated.realisasiWaktu,
            realisasiOutput: updated.realisasiOutput,
            kemungkinanLabel: updated.kemungkinanLabel,
            dampakLabel: updated.dampakLabel,
            besaran: updated.besaran,
            dokumens: updated.dokumens.map((doc) => ({ title: doc.title, url: doc.url })),
          },
        },
      });
      await invalidateResourceCache("pemantauan-risiko");
      return NextResponse.json(updated);
    }

    if (input.action === "return") {
      if (!isAdminRole(ctx.roleName)) {
        return NextResponse.json({ error: "Hanya Admin yang dapat mengembalikan." }, { status: 403 });
      }
      if (monitoring.status !== PEMANTAUAN_STATUS.SUBMITTED) {
        return NextResponse.json(
          { error: "Hanya pemantauan Diajukan yang dapat dikembalikan." },
          { status: 409 }
        );
      }
      if (!input.reason?.trim()) {
        return NextResponse.json({ error: "Alasan pengembalian wajib diisi." }, { status: 400 });
      }
      const claimed = await prisma.pemantauanRisiko.updateMany({
        where: {
          id: monitoring.id,
          version: input.version as number,
          status: PEMANTAUAN_STATUS.SUBMITTED,
        },
        data: {
          status: PEMANTAUAN_STATUS.RETURNED,
          returnedBy: actor.name || actor.email,
          returnedAt: new Date(),
          returnReason: input.reason.trim(),
          version: { increment: 1 },
        },
      });
      if (claimed.count === 0) {
        return NextResponse.json(
          { error: "Status atau versi pemantauan sudah berubah. Muat ulang." },
          { status: 409 }
        );
      }
      const updated = await prisma.pemantauanRisiko.findUniqueOrThrow({
        where: { id: monitoring.id },
      });
      await logAudit({
        userId: actor.email,
        userName: actor.name,
        action: "REJECT",
        resource: "PemantauanRisiko",
        resourceId: monitoring.id,
        details: { alasan: input.reason.trim() },
      });
      await invalidateResourceCache("pemantauan-risiko");
      return NextResponse.json(updated);
    }

    if (input.action === "finalize") {
      if (!isAdminRole(ctx.roleName)) {
        return NextResponse.json({ error: "Hanya Admin yang dapat memfinalisasi." }, { status: 403 });
      }
      const result = await finalizeMonitoring({
        monitoringId: monitoring.id,
        expectedVersion: input.version ?? monitoring.version,
        actor,
        acknowledgeChanges: input.acknowledgeChanges,
        reconciliation: input.reconciliation,
      });
      if (!result.alreadyFinal) {
        await logAudit({
          userId: actor.email,
          userName: actor.name,
          action: "APPROVE",
          resource: "PemantauanRisiko",
          resourceId: monitoring.id,
          details: {
            followUpRiskId: result.followUpRiskId,
            obligationId: result.obligationId,
            skippedEvaluasiUpdate: result.skippedEvaluasiUpdate,
          },
        });
        if (result.obligationId) {
          await notifyObligation(result.obligationId);
        }
      }
      await invalidateResourceCache("pemantauan-risiko");
      await invalidateResourceCache("identifikasi-risiko");
      await invalidateResourceCache("kewajiban-tindak-lanjut");
      return NextResponse.json(result);
    }

    if (input.action === "revise") {
      if (!isAdminRole(ctx.roleName) && !await canWriteMonitoring()) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      if (monitoring.status !== PEMANTAUAN_STATUS.FINAL) {
        return NextResponse.json(
          { error: "Revisi hanya dibuat dari hasil Final." },
          { status: 409 }
        );
      }
      if (!input.reason?.trim()) {
        return NextResponse.json({ error: "Alasan koreksi wajib diisi." }, { status: 400 });
      }
      let revision;
      try {
        revision = await prisma.$transaction(async (tx) => {
          const current = await tx.pemantauanRisiko.findUnique({
            where: { id: monitoring.id },
            select: { status: true, version: true },
          });
          if (
            !current ||
            current.status !== PEMANTAUAN_STATUS.FINAL ||
            current.version !== input.version
          ) {
            throw new DomainError(
              "Hasil final sudah berubah. Muat ulang sebelum membuat revisi.",
              409
            );
          }
          const existingNext = await tx.pemantauanRisiko.findFirst({
            where: { previousRevisionId: monitoring.id },
            select: { id: true },
          });
          if (existingNext) {
            throw new DomainError(
              `Revisi untuk hasil ini sudah ada (ID ${existingNext.id}).`,
              409,
              { monitoringId: existingNext.id }
            );
          }
          return tx.pemantauanRisiko.create({
            data: {
              riskId: monitoring.riskId,
              tahun: monitoring.tahun,
              triwulan: monitoring.triwulan,
              status: PEMANTAUAN_STATUS.DRAFT,
              revision: monitoring.revision + 1,
              previousRevisionId: monitoring.id,
              createdBy: actor.name || actor.email,
              rtpId: monitoring.rtpId,
              rtpSnapshot: (monitoring.rtpSnapshot ?? null) as Prisma.InputJsonValue,
              targetOutput: monitoring.targetOutput,
              targetWaktu: monitoring.targetWaktu,
              penanggungJawab: monitoring.penanggungJawab,
              statusPelaksanaan: monitoring.statusPelaksanaan,
              uraianPelaksanaan: monitoring.uraianPelaksanaan,
              pekerjaanTertunda: monitoring.pekerjaanTertunda,
              realisasiWaktu: monitoring.realisasiWaktu,
              realisasiOutput: monitoring.realisasiOutput,
              keterjadianRisiko: monitoring.keterjadianRisiko,
              efektivitas: monitoring.efektivitas,
              catatanEfektivitas: monitoring.catatanEfektivitas,
              levelKemungkinanId: monitoring.levelKemungkinanId,
              levelDampakId: monitoring.levelDampakId,
              kemungkinanLabel: monitoring.kemungkinanLabel,
              dampakLabel: monitoring.dampakLabel,
              kemungkinanSkala: monitoring.kemungkinanSkala,
              dampakSkala: monitoring.dampakSkala,
              besaran: monitoring.besaran,
              levelRisikoNama: monitoring.levelRisikoNama,
              levelRisikoWarna: monitoring.levelRisikoWarna,
              seleraSnapshot: monitoring.seleraSnapshot,
              residualAcuan: monitoring.residualAcuan,
              residualHarapan: monitoring.residualHarapan,
              responRisiko: monitoring.responRisiko,
              responAlasan: monitoring.responAlasan,
              correctionReason: input.reason?.trim() ?? "",
              dokumens: monitoring.dokumens.length
                ? {
                    create: monitoring.dokumens.map((doc) => ({
                      title: doc.title,
                      url: doc.url,
                      uploadedBy: doc.uploadedBy,
                    })),
                  }
                : undefined,
            },
            include: { dokumens: true },
          });
        });
      } catch (error) {
        if (error instanceof DomainError) throw error;
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          return NextResponse.json(
            { error: "Revisi untuk hasil ini sudah ada. Muat ulang halaman." },
            { status: 409 }
          );
        }
        throw error;
      }
      await logAudit({
        userId: actor.email,
        userName: actor.name,
        action: "CREATE",
        resource: "PemantauanRisiko",
        resourceId: revision.id,
        details: { revisiDari: monitoring.id, alasan: input.reason.trim() },
      });
      await invalidateResourceCache("pemantauan-risiko");
      return NextResponse.json(revision, { status: 201 });
    }

    if (input.action === "cancel-obligation") {
      if (!isAdminRole(ctx.roleName)) {
        return NextResponse.json(
          { error: "Hanya Admin yang dapat membatalkan kewajiban." },
          { status: 403 }
        );
      }
      if (!input.correctionMonitoringId) {
        return NextResponse.json(
          {
            error:
              "Kewajiban tidak dapat dibatalkan hanya dengan alasan. Lampirkan ID hasil koreksi final yang membuktikan pemicu tidak lagi berlaku.",
          },
          { status: 400 }
        );
      }
      if (!input.reason?.trim()) {
        return NextResponse.json(
          { error: "Catatan pembatalan wajib diisi." },
          { status: 400 }
        );
      }

      const updated = await cancelObligationThroughCorrection({
        monitoringId: monitoring.id,
        correctionMonitoringId: input.correctionMonitoringId,
        reason: input.reason.trim(),
        actor,
      });

      await logAudit({
        userId: actor.email,
        userName: actor.name,
        action: "UPDATE",
        resource: "KewajibanTindakLanjut",
        resourceId: updated.id,
        details: {
          aksi: "batalkan-melalui-koreksi",
          correctionMonitoringId: input.correctionMonitoringId,
          alasan: input.reason.trim(),
        },
      });
      await invalidateResourceCache("kewajiban-tindak-lanjut");
      await invalidateResourceCache("pemantauan-risiko");
      await invalidateResourceCache("risiko-lanjutan");
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
