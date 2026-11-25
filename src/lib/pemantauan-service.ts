import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  nextPeriode,
  resolveAssessmentFromDb,
  resolveSeleraFromDb,
  requiresFollowUp,
  type AssessmentDb,
} from "@/lib/risk-assessment";
import {
  KEWAJIBAN_STATUS,
  OPEN_OBLIGATION_STATUSES,
  PEMANTAUAN_STATUS,
  PELAKSANAAN,
  RISK_CYCLE,
} from "@/lib/risk-cycle";
import { DomainError } from "@/lib/risk-register-service";
import {
  buildMatrixSnapshot,
  lockRiskForResidual,
} from "@/lib/pemantauan-integrity";

type Db = Prisma.TransactionClient;
type AnySettingDb = Parameters<typeof buildMatrixSnapshot>[0];

const asAssessmentDb = (db: Db) => db as unknown as AssessmentDb;

export interface MonitoringSnapshot {
  besaran: number | null;
  levelRisikoId: number | null;
  levelRisikoNama: string | null;
  levelRisikoWarna: string | null;
  kemungkinanLabel: string | null;
  dampakLabel: string | null;
  kemungkinanSkala: number | null;
  dampakSkala: number | null;
  seleraSnapshot: number | null;
}

export async function buildMonitoringSnapshot(
  db: Db,
  input: {
    levelKemungkinanId?: number | null;
    levelDampakId?: number | null;
    kategoriRisikoId?: number | null;
  }
): Promise<MonitoringSnapshot> {
  const assessment = await resolveAssessmentFromDb(
    asAssessmentDb(db),
    input.levelKemungkinanId,
    input.levelDampakId
  );
  const selera = await resolveSeleraFromDb(
    asAssessmentDb(db),
    input.kategoriRisikoId
  );

  let kemungkinanLabel: string | null = null;
  let dampakLabel: string | null = null;
  let kemungkinanSkala: number | null = null;
  let dampakSkala: number | null = null;

  if (input.levelKemungkinanId) {
    const level = await db.levelKemungkinan.findUnique({
      where: { id: input.levelKemungkinanId },
      select: { nama: true, skala: true },
    });
    kemungkinanLabel = level?.nama ?? null;
    kemungkinanSkala = level?.skala ?? null;
  }
  if (input.levelDampakId) {
    const level = await db.levelDampak.findUnique({
      where: { id: input.levelDampakId },
      select: { nama: true, skala: true },
    });
    dampakLabel = level?.nama ?? null;
    dampakSkala = level?.skala ?? null;
  }

  return {
    besaran: assessment.besaran,
    levelRisikoId: assessment.levelRisikoId,
    levelRisikoNama: assessment.level,
    levelRisikoWarna: assessment.warna,
    kemungkinanLabel,
    dampakLabel,
    kemungkinanSkala,
    dampakSkala,
    seleraSnapshot: selera,
  };
}

export function validateMonitoringForSubmit(
  monitoring: {
    realisasiWaktu?: string | null;
    realisasiOutput?: string | null;
    keterjadianRisiko?: string | null;
    levelKemungkinanId?: number | null;
    levelDampakId?: number | null;
  },
  options: {
    assessmentOk: boolean;
    selera: number | null;
    documentCount: number;
    baselineRespon?: string | null;
    responAlasan?: string | null;
  }
): string[] {
  const errors: string[] = [];

  if (!monitoring.keterjadianRisiko) {
    errors.push("Keterjadian risiko wajib diisi.");
  }
  if (!monitoring.realisasiWaktu?.trim()) {
    errors.push("Realisasi waktu wajib diisi.");
  }
  if (!monitoring.realisasiOutput?.trim()) {
    errors.push("Realisasi output wajib diisi.");
  }
  if (!monitoring.levelKemungkinanId || !monitoring.levelDampakId) {
    errors.push("Kemungkinan dan dampak hasil pemantauan wajib diisi berpasangan.");
  } else if (!options.assessmentOk) {
    errors.push(
      "Pasangan kemungkinan–dampak tidak ditemukan pada Matriks Risiko. Nilai belum dapat dihitung."
    );
  }
  if (options.selera == null) {
    errors.push("Selera risiko belum tersedia sehingga hasil belum dapat dinilai.");
  }
  return errors;
}

export interface Actor {
  email: string;
  name: string;
}

export type ReconciliationDecision =
  | "KEEP_ACTIVE_CHAIN"
  | "MARK_FOR_REVIEW"
  | "CANCELLED";

export interface ReconciliationInput {
  decision: ReconciliationDecision;
  note: string;
}

interface FinalizeParams {
  monitoringId: number;
  expectedVersion: number;
  actor: Actor;
  acknowledgeChanges?: boolean;
  reconciliation?: ReconciliationInput | null;
}

export interface FinalizeResult {
  monitoring: unknown;
  followUpRiskId: number | null;
  obligationId: number | null;
  alreadyFinal: boolean;
  skippedEvaluasiUpdate: boolean;
  reconciliationDecision?: string | null;
}

interface RtpSnapshot {
  uraian?: string | null;
  targetOutput?: string | null;
  targetWaktu?: string | null;
  penanggungJawab?: string | null;
}

function readRtpSnapshot(value: unknown): RtpSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    uraian: typeof record.uraian === "string" ? record.uraian : null,
    targetOutput:
      typeof record.targetOutput === "string" ? record.targetOutput : null,
    targetWaktu:
      typeof record.targetWaktu === "string" ? record.targetWaktu : null,
    penanggungJawab:
      typeof record.penanggungJawab === "string"
        ? record.penanggungJawab
        : null,
  };
}

function buildPengendalianUraian(
  monitoring: {
    statusPelaksanaan: string | null;
    uraianPelaksanaan: string | null;
    realisasiOutput: string | null;
    rtpSnapshot: unknown;
  },
  fallbackRtpUraian: string | null
): string | null {
  const parts: string[] = [];
  if (monitoring.statusPelaksanaan === PELAKSANAAN.SELESAI) {
    const snapshot = readRtpSnapshot(monitoring.rtpSnapshot);
    const uraian = snapshot?.uraian ?? fallbackRtpUraian;
    if (uraian) parts.push(uraian);
    if (monitoring.realisasiOutput) parts.push(monitoring.realisasiOutput);
  } else if (monitoring.statusPelaksanaan === PELAKSANAAN.SEBAGIAN) {
    if (monitoring.uraianPelaksanaan) parts.push(monitoring.uraianPelaksanaan);
    if (monitoring.realisasiOutput) parts.push(monitoring.realisasiOutput);
  }
  return parts.length > 0 ? parts.join("\n\n") : null;
}

interface SuccessorRecord {
  id: number;
  statusSiklus: string;
  sourceMonitoring: { id: number; revision: number } | null;
  directSuccessorId: number;
  /** Ada generasi penerus yang sudah disahkan (CONTINUED) di rantai. */
  isDownstreamApproved: boolean;
  chainDepth: number;
}

type SuccessorNode = {
  id: number;
  statusSiklus: string;
  sourceMonitoring: { id: number; revision: number } | null;
};

/**
 * Menelusuri rantai penerus, bukan hanya anak langsung. Contoh A → B → C:
 * ketika B sudah CONTINUED, koreksi A harus melihat C (aktif/draf) agar tidak
 * melewati rekonsiliasi atau membuat penerus baru.
 */
async function findSuccessor(
  tx: Db,
  originRiskId: number
): Promise<SuccessorRecord | null> {
  let current: SuccessorNode | null = await tx.identifikasiRisiko.findFirst({
    where: {
      parentRiskId: originRiskId,
      statusSiklus: {
        in: [
          RISK_CYCLE.FOLLOW_UP_DRAFT,
          RISK_CYCLE.FOLLOW_UP_SUBMITTED,
          RISK_CYCLE.ACTIVE,
          RISK_CYCLE.CONTINUED,
        ],
      },
    },
    orderBy: { id: "desc" },
    select: {
      id: true,
      statusSiklus: true,
      sourceMonitoring: { select: { id: true, revision: true } },
    },
  });

  if (!current) return null;
  const directSuccessorId = current.id;
  let isDownstreamApproved = false;
  let chainDepth = 1;

  while (
    current.statusSiklus === RISK_CYCLE.CONTINUED &&
    chainDepth < 50
  ) {
    isDownstreamApproved = true;
    const next: SuccessorNode | null =
      await tx.identifikasiRisiko.findFirst({
        where: {
          parentRiskId: current.id,
          statusSiklus: {
            in: [
              RISK_CYCLE.FOLLOW_UP_DRAFT,
              RISK_CYCLE.FOLLOW_UP_SUBMITTED,
              RISK_CYCLE.ACTIVE,
              RISK_CYCLE.CONTINUED,
            ],
          },
        },
        orderBy: { id: "desc" },
        select: {
          id: true,
          statusSiklus: true,
          sourceMonitoring: { select: { id: true, revision: true } },
        },
      });
    if (!next) break;
    current = next;
    chainDepth += 1;
  }

  return {
    id: current.id,
    statusSiklus: current.statusSiklus,
    sourceMonitoring: current.sourceMonitoring,
    directSuccessorId,
    isDownstreamApproved,
    chainDepth,
  };
}

function successorNeedsReconciliation(successor: SuccessorRecord): boolean {
  return (
    successor.isDownstreamApproved ||
    successor.statusSiklus === RISK_CYCLE.ACTIVE ||
    successor.statusSiklus === RISK_CYCLE.CONTINUED
  );
}

async function cancelSuccessor(
  tx: Db,
  successor: SuccessorRecord,
  reason: string,
  actor: Actor
) {
  await tx.identifikasiRisiko.updateMany({
    where: {
      id: successor.id,
      statusSiklus: {
        in: [RISK_CYCLE.FOLLOW_UP_DRAFT, RISK_CYCLE.FOLLOW_UP_SUBMITTED],
      },
    },
    data: {
      statusSiklus: RISK_CYCLE.FOLLOW_UP_CANCELLED,
      version: { increment: 1 },
    },
  });
  await tx.kewajibanTindakLanjut.updateMany({
    where: {
      followUpRiskId: successor.id,
      status: { in: OPEN_OBLIGATION_STATUSES },
    },
    data: {
      status: KEWAJIBAN_STATUS.DIBATALKAN,
      resolution: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: actor.name || actor.email,
      cancelReason: reason,
      catatan: `Dibatalkan melalui koreksi final: ${reason}`,
    },
  });
}

/**
 * Finalisasi admin dalam satu transaksi.
 * Baris pemantauan diklaim lebih dulu dengan conditional update (id + versi +
 * status) agar dua request tidak dapat menimpa hasil yang sama.
 */
export async function finalizeMonitoring({
  monitoringId,
  expectedVersion,
  actor,
  acknowledgeChanges = false,
  reconciliation = null,
}: FinalizeParams): Promise<FinalizeResult> {
  return prisma.$transaction(async (tx) => {
    const initial = await tx.pemantauanRisiko.findUnique({
      where: { id: monitoringId },
      select: { riskId: true },
    });
    if (!initial) throw new DomainError("Pemantauan tidak ditemukan.", 404);

    // Kunci per risiko sebelum membaca status final. Ini juga menyerialkan
    // finalisasi dua periode berbeda pada risiko yang sama.
    await lockRiskForResidual(tx as never, initial.riskId);

    const monitoring = await tx.pemantauanRisiko.findUnique({
      where: { id: monitoringId },
      include: {
        dokumens: { select: { id: true, title: true, url: true } },
        followUpRisk: { select: { id: true } },
        risk: {
          include: {
            evaluasiRisiko: true,
            rencanaPenanganan: true,
          },
        },
      },
    });
    if (!monitoring) throw new DomainError("Pemantauan tidak ditemukan.", 404);

    if (monitoring.status === PEMANTAUAN_STATUS.FINAL) {
      return {
        monitoring,
        followUpRiskId: monitoring.followUpRisk?.id ?? null,
        obligationId: null,
        alreadyFinal: true,
        skippedEvaluasiUpdate: false,
        reconciliationDecision: monitoring.reconciliationDecision,
      };
    }
    if (monitoring.status !== PEMANTAUAN_STATUS.SUBMITTED) {
      throw new DomainError(
        "Hanya pemantauan berstatus Diajukan yang dapat difinalisasi.",
        409
      );
    }
    if (monitoring.version !== expectedVersion) {
      throw new DomainError(
        "Versi data sudah berubah. Muat ulang halaman sebelum memfinalisasi.",
        409
      );
    }

    const assessment = await buildMonitoringSnapshot(tx, {
      levelKemungkinanId: monitoring.levelKemungkinanId,
      levelDampakId: monitoring.levelDampakId,
      kategoriRisikoId: monitoring.risk.kategoriRisikoId,
    });
    const errors = validateMonitoringForSubmit(monitoring, {
      assessmentOk: assessment.besaran != null,
      selera: assessment.seleraSnapshot,
      documentCount: monitoring.dokumens.length,
      baselineRespon: monitoring.risk.evaluasiRisiko?.responRisiko,
      responAlasan: monitoring.responAlasan,
    });
    if (errors.length > 0) {
      throw new DomainError("Data pemantauan belum lengkap.", 400, errors);
    }
    if (assessment.besaran == null || assessment.seleraSnapshot == null) {
      throw new DomainError(
        "Nilai atau selera risiko belum dapat dinilai. Finalisasi dibatalkan.",
        400
      );
    }

    const assessmentChanged =
      (monitoring.besaran != null &&
        monitoring.besaran !== assessment.besaran) ||
      (monitoring.seleraSnapshot != null &&
        monitoring.seleraSnapshot !== assessment.seleraSnapshot);
    if (assessmentChanged && !acknowledgeChanges) {
      throw new DomainError(
        "Matriks atau selera berubah sejak hasil diajukan. Tinjau hasil terbaru sebelum memfinalisasi.",
        409,
        {
          code: "ASSESSMENT_CHANGED",
          sebelumnya: {
            besaran: monitoring.besaran,
            selera: monitoring.seleraSnapshot,
          },
          terbaru: {
            besaran: assessment.besaran,
            selera: assessment.seleraSnapshot,
          },
        }
      );
    }

    const responFinal =
      monitoring.responRisiko ??
      monitoring.risk.evaluasiRisiko?.responRisiko ??
      null;

    const newerFinal = await tx.pemantauanRisiko.findFirst({
      where: {
        riskId: monitoring.riskId,
        status: PEMANTAUAN_STATUS.FINAL,
        id: { not: monitoring.id },
        OR: [
          { tahun: { gt: monitoring.tahun } },
          { tahun: monitoring.tahun, triwulan: { gt: monitoring.triwulan } },
        ],
      },
      select: { id: true },
    });
    const skippedEvaluasiUpdate = Boolean(newerFinal);

    const acuanAssessment = await resolveAssessmentFromDb(
      asAssessmentDb(tx),
      monitoring.risk.evaluasiRisiko?.residualLevelKemungkinanId,
      monitoring.risk.evaluasiRisiko?.residualLevelDampakId
    );
    const harapanAssessment = await resolveAssessmentFromDb(
      asAssessmentDb(tx),
      monitoring.risk.rencanaPenanganan?.targetResidualLevelKemungkinanId,
      monitoring.risk.rencanaPenanganan?.targetResidualLevelDampakId
    );

    // Snapshot acuan/harapan yang sudah tersimpan tidak dihitung ulang.
    const residualAcuan =
      monitoring.residualAcuan ?? acuanAssessment.besaran;
    const residualHarapan =
      monitoring.residualHarapan ?? harapanAssessment.besaran;

    const evaluasiSebelum = monitoring.risk.evaluasiRisiko
      ? {
          id: monitoring.risk.evaluasiRisiko.id,
          responRisiko: monitoring.risk.evaluasiRisiko.responRisiko,
          residualLevelKemungkinanId:
            monitoring.risk.evaluasiRisiko.residualLevelKemungkinanId,
          residualLevelDampakId:
            monitoring.risk.evaluasiRisiko.residualLevelDampakId,
          residualLevelRisikoId:
            monitoring.risk.evaluasiRisiko.residualLevelRisikoId,
        }
      : null;

    const matrixSnapshot = await buildMatrixSnapshot(tx as unknown as AnySettingDb);

    const claimed = await tx.pemantauanRisiko.updateMany({
      where: {
        id: monitoring.id,
        version: expectedVersion,
        status: PEMANTAUAN_STATUS.SUBMITTED,
      },
      data: {
        status: PEMANTAUAN_STATUS.FINAL,
        finalizedAt: new Date(),
        finalizedBy: actor.name || actor.email,
        version: { increment: 1 },
        besaran: assessment.besaran,
        levelRisikoNama: assessment.levelRisikoNama,
        levelRisikoWarna: assessment.levelRisikoWarna,
        kemungkinanLabel: assessment.kemungkinanLabel,
        dampakLabel: assessment.dampakLabel,
        kemungkinanSkala: assessment.kemungkinanSkala,
        dampakSkala: assessment.dampakSkala,
        seleraSnapshot: assessment.seleraSnapshot,
        residualAcuan,
        residualHarapan,
        responRisiko: responFinal,
        matriksSnapshot: matrixSnapshot as Prisma.InputJsonValue,
        evaluasiSebelum:
          monitoring.evaluasiSebelum ??
          (evaluasiSebelum
            ? (evaluasiSebelum as Prisma.InputJsonValue)
            : undefined),
      },
    });

    if (claimed.count === 0) {
      const current = await tx.pemantauanRisiko.findUnique({
        where: { id: monitoring.id },
        select: { id: true, status: true, version: true },
      });
      if (current?.status === PEMANTAUAN_STATUS.FINAL) {
        return {
          monitoring: current,
          followUpRiskId: monitoring.followUpRisk?.id ?? null,
          obligationId: null,
          alreadyFinal: true,
          skippedEvaluasiUpdate: false,
          reconciliationDecision: null,
        };
      }
      throw new DomainError(
        "Versi atau status pemantauan sudah berubah. Muat ulang sebelum memfinalisasi.",
        409
      );
    }

    if (monitoring.previousRevisionId) {
      await tx.pemantauanRisiko.updateMany({
        where: {
          id: monitoring.previousRevisionId,
          status: PEMANTAUAN_STATUS.FINAL,
        },
        data: { status: PEMANTAUAN_STATUS.SUPERSEDED },
      });
    }

    if (!skippedEvaluasiUpdate) {
      const residualData = {
        responRisiko: responFinal,
        residualLevelKemungkinanId: monitoring.levelKemungkinanId,
        residualLevelDampakId: monitoring.levelDampakId,
        residualLevelRisikoId: assessment.levelRisikoId,
      };
      if (monitoring.risk.evaluasiRisiko) {
        await tx.evaluasiRisiko.update({
          where: { identifikasiRisikoId: monitoring.riskId },
          data: residualData,
        });
      } else {
        await tx.evaluasiRisiko.create({
          data: {
            ...residualData,
            identifikasiRisikoId: monitoring.riskId,
          },
        });
      }
    }

    const trigger = requiresFollowUp(
      responFinal,
      assessment.besaran,
      assessment.seleraSnapshot
    );
    const isRevision = monitoring.previousRevisionId != null;
    const successor = await findSuccessor(tx, monitoring.riskId);
    let followUpRiskId: number | null = null;
    let obligationId: number | null = null;
    let reconciliationDecision: string | null = null;
    let reconciliationNote: string | null = null;

    if (isRevision && successor) {
      if (successorNeedsReconciliation(successor)) {
        if (!reconciliation?.note?.trim()) {
          throw new DomainError(
            "Rantai penerus sudah memiliki generasi yang disahkan. Finalisasi koreksi memerlukan keputusan rekonsiliasi admin.",
            409,
            {
              code: "RECONCILIATION_REQUIRED",
              successorId: successor.id,
              directSuccessorId: successor.directSuccessorId,
              successorStatus: successor.statusSiklus,
              chainDepth: successor.chainDepth,
              options: ["KEEP_ACTIVE_CHAIN", "MARK_FOR_REVIEW"],
            }
          );
        }
        if (reconciliation.decision === "CANCELLED") {
          throw new DomainError(
            "Rantai penerus yang sudah disahkan tidak dapat dibatalkan otomatis. Pilih pertahankan atau tandai untuk ditinjau.",
            400
          );
        }
        reconciliationDecision = reconciliation.decision;
        reconciliationNote = reconciliation.note.trim();
        // Tautkan ke penerus langsung, bukan tail, agar hubungan asal tetap benar.
        followUpRiskId = successor.directSuccessorId;
      } else if (trigger) {
        if (successor.statusSiklus === RISK_CYCLE.FOLLOW_UP_SUBMITTED) {
          const reopened = await tx.identifikasiRisiko.updateMany({
            where: {
              id: successor.id,
              statusSiklus: RISK_CYCLE.FOLLOW_UP_SUBMITTED,
            },
            data: {
              statusSiklus: RISK_CYCLE.FOLLOW_UP_DRAFT,
              version: { increment: 1 },
            },
          });
          if (reopened.count > 0) {
            await tx.kewajibanTindakLanjut.updateMany({
              where: {
                followUpRiskId: successor.id,
                status: { in: OPEN_OBLIGATION_STATUSES },
              },
              data: {
                status: KEWAJIBAN_STATUS.WAJIB,
                catatan:
                  "Koreksi final mengubah dasar penilaian. Draf lanjutan perlu ditinjau ulang.",
              },
            });
          }
          reconciliationDecision = "REOPENED_FOR_REVIEW";
          reconciliationNote =
            "Koreksi final memengaruhi dasar penilaian penerus; penerus dikembalikan ke draf.";
        } else {
          await tx.kewajibanTindakLanjut.updateMany({
            where: {
              followUpRiskId: successor.id,
              status: { in: OPEN_OBLIGATION_STATUSES },
            },
            data: {
              catatan:
                "Koreksi final telah disahkan. Tinjau kembali draf lanjutan sebelum diajukan.",
            },
          });
          reconciliationDecision = "REVIEW_DRAFT";
          reconciliationNote =
            "Koreksi final tidak menimpa isian tim; draf penerus wajib ditinjau.";
        }
        followUpRiskId = successor.id;
      } else {
        const reason =
          reconciliation?.note?.trim() ||
          "Koreksi final menunjukkan pemicu tindak lanjut tidak lagi berlaku.";
        await cancelSuccessor(tx, successor, reason, actor);
        reconciliationDecision = "CANCELLED";
        reconciliationNote = reason;
        followUpRiskId = successor.id;
      }
    } else if (trigger) {
      if (successor) {
        // Penerus dari periode lain masih terbuka: jangan membuat penerus
        // kedua dan jangan menganggap kewajiban lama selesai.
        const obligation = await tx.kewajibanTindakLanjut.findFirst({
          where: {
            followUpRiskId: successor.id,
            status: { in: OPEN_OBLIGATION_STATUSES },
          },
          include: {
            monitoring: {
              select: { id: true, tahun: true, triwulan: true },
            },
          },
        });
        if (
          successor.sourceMonitoring &&
          successor.sourceMonitoring.id !== monitoring.id
        ) {
          throw new DomainError(
            "Finalisasi akan membuat penerus kedua. Selesaikan kewajiban penerus yang masih terbuka terlebih dahulu.",
            409,
            {
              code: "OPEN_OBLIGATION",
              obligationId: obligation?.id ?? null,
              monitoringId: obligation?.monitoringId ?? null,
              followUpRiskId: successor.id,
              tahun: obligation?.monitoring.tahun ?? null,
              triwulan: obligation?.monitoring.triwulan ?? null,
            }
          );
        }
        followUpRiskId = successor.id;
        obligationId = obligation?.id ?? null;
      } else {
        const existingForThis = await tx.identifikasiRisiko.findUnique({
          where: { sourceMonitoringId: monitoring.id },
          select: { id: true },
        });
        if (existingForThis) {
          followUpRiskId = existingForThis.id;
        } else {
          // Satu risiko asal tidak boleh memiliki dua penerus terbuka dari
          // periode berbeda.
          const openOther = await tx.kewajibanTindakLanjut.findFirst({
            where: {
              riskId: monitoring.riskId,
              monitoringId: { not: monitoring.id },
              status: { in: OPEN_OBLIGATION_STATUSES },
            },
            include: {
              monitoring: {
                select: { id: true, tahun: true, triwulan: true },
              },
              followUpRisk: { select: { id: true, statusSiklus: true } },
            },
            orderBy: { createdAt: "asc" },
          });
          if (openOther) {
            throw new DomainError(
              "Finalisasi akan membuat penerus kedua, tetapi kewajiban periode sebelumnya masih terbuka. Selesaikan kewajiban tersebut terlebih dahulu.",
              409,
              {
                code: "OPEN_OBLIGATION",
                obligationId: openOther.id,
                monitoringId: openOther.monitoringId,
                followUpRiskId: openOther.followUpRiskId,
                tahun: openOther.monitoring.tahun,
                triwulan: openOther.monitoring.triwulan,
              }
            );
          }

          const target = nextPeriode({
            tahun: monitoring.tahun,
            triwulan: monitoring.triwulan,
          });
          const origin = monitoring.risk;
          const pengendalianUraian = buildPengendalianUraian(
            {
              statusPelaksanaan: monitoring.statusPelaksanaan,
              uraianPelaksanaan: monitoring.uraianPelaksanaan,
              realisasiOutput: monitoring.realisasiOutput,
              rtpSnapshot: monitoring.rtpSnapshot,
            },
            origin.rencanaPenanganan?.rencanaTidakPenanganan ?? null
          );

          const followUp = await tx.identifikasiRisiko.create({
            data: {
              risiko: origin.risiko,
              jenisRisikoId: origin.jenisRisikoId,
              sumberRisikoId: origin.sumberRisikoId,
              kategoriRisikoId: origin.kategoriRisikoId,
              areaDampakId: origin.areaDampakId,
              penyebab: origin.penyebab,
              dampak: origin.dampak,
              sasaranId: origin.sasaranId,
              kegiatanId: origin.kegiatanId,
              prosesBisnisId: origin.prosesBisnisId,
              unitKerjaId: origin.unitKerjaId,
              teamId: origin.teamId,
              tahun: target.tahun,
              // Risiko lanjutan langsung masuk register aktif setelah hasil
              // pemantauan final, tanpa antrean wajib atau persetujuan kedua.
              statusSiklus: RISK_CYCLE.ACTIVE,
              parentRiskId: origin.id,
              rootRiskId: origin.rootRiskId ?? origin.id,
              sourceMonitoringId: monitoring.id,
              followUpTahun: target.tahun,
              followUpTriwulan: target.triwulan,
            },
            select: { id: true },
          });

          // Tutup siklus risiko asal. Penerus langsung menjadi risiko aktif
          // untuk periode berikutnya dan tetap tertaut pada asalnya.
          await tx.identifikasiRisiko.updateMany({
            where: { id: origin.id, statusSiklus: RISK_CYCLE.ACTIVE },
            data: { statusSiklus: RISK_CYCLE.CONTINUED },
          });

          await tx.analisisRisiko.create({
            data: {
              identifikasiRisikoId: followUp.id,
              levelKemungkinanId: monitoring.levelKemungkinanId,
              levelDampakId: monitoring.levelDampakId,
              levelRisikoId: assessment.levelRisikoId,
              pengendalianUraian,
              pengendalianEfektivitas: monitoring.efektivitas,
            },
          });

          if (origin.rencanaPenanganan) {
            const rtp = origin.rencanaPenanganan;
            await tx.rencanaPenanganan.create({
              data: {
                identifikasiRisikoId: followUp.id,
                rencanaTidakPenanganan: rtp.rencanaTidakPenanganan,
                targetOutput: rtp.targetOutput,
                targetWaktu: rtp.targetWaktu,
                penanggungJawab: rtp.penanggungJawab,
                residualLevelKemungkinanId: rtp.residualLevelKemungkinanId,
                residualLevelDampakId: rtp.residualLevelDampakId,
                targetResidualLevelKemungkinanId:
                  rtp.targetResidualLevelKemungkinanId,
                targetResidualLevelDampakId: rtp.targetResidualLevelDampakId,
                dokumenPendukung: rtp.dokumenPendukung,
                jenisPenanganan: rtp.jenisPenanganan,
                alasanPenguatan: rtp.alasanPenguatan,
                keterjadiRisiko: rtp.keterjadiRisiko,
              },
            });
          }

          const obligation = await tx.kewajibanTindakLanjut.create({
            data: {
              monitoringId: monitoring.id,
              riskId: origin.id,
              followUpRiskId: followUp.id,
              teamId: origin.teamId,
              status: KEWAJIBAN_STATUS.SELESAI,
              resolution: "AUTO_CONTINUED",
              completedAt: new Date(),
              catatan: `Risiko diteruskan otomatis ke TW ${target.triwulan} ${target.tahun}; residual ${assessment.besaran} belum di bawah selera ${assessment.seleraSnapshot}.`,
            },
            select: { id: true },
          });

          followUpRiskId = followUp.id;
          obligationId = obligation.id;
        }
      }
    }

    if (reconciliationDecision) {
      await tx.pemantauanRisiko.update({
        where: { id: monitoring.id },
        data: {
          reconciliationDecision,
          reconciliationNote,
          reconciledBy: actor.name || actor.email,
          reconciledAt: new Date(),
        },
      });
    }

    const updatedMonitoring = await tx.pemantauanRisiko.findUnique({
      where: { id: monitoring.id },
    });

    return {
      monitoring: updatedMonitoring,
      followUpRiskId,
      obligationId,
      alreadyFinal: false,
      skippedEvaluasiUpdate,
      reconciliationDecision,
    };
  });
}

export interface ApproveFollowUpParams {
  riskId: number;
  expectedVersion: number;
  actor: Actor;
}

/**
 * Transisi atomik pengesahan penerus: klaim versi/status, kunci rantai, ubah
 * asal menjadi CONTINUED, dan selesaikan kewajiban. Tidak ada dua penerus
 * aktif karena seluruh pemeriksaan berada di transaksi yang sama.
 */
export async function approveFollowUp({
  riskId,
  expectedVersion,
  actor,
}: ApproveFollowUpParams) {
  return prisma.$transaction(async (tx) => {
    const risk = await tx.identifikasiRisiko.findUnique({
      where: { id: riskId },
      select: {
        id: true,
        version: true,
        statusSiklus: true,
        parentRiskId: true,
        sourceMonitoringId: true,
      },
    });
    if (!risk) throw new DomainError("Risiko lanjutan tidak ditemukan.", 404);
    if (
      risk.statusSiklus !== RISK_CYCLE.FOLLOW_UP_SUBMITTED ||
      risk.version !== expectedVersion
    ) {
      throw new DomainError(
        "Status atau versi lanjutan sudah berubah. Muat ulang sebelum mengesahkan.",
        409
      );
    }
    if (!risk.parentRiskId || !risk.sourceMonitoringId) {
      throw new DomainError(
        "Risiko lanjutan tidak memiliki sumber rantai yang sah.",
        409
      );
    }

    const anotherActive = await tx.identifikasiRisiko.findFirst({
      where: {
        parentRiskId: risk.parentRiskId,
        id: { not: riskId },
        statusSiklus: RISK_CYCLE.ACTIVE,
      },
      select: { id: true },
    });
    if (anotherActive) {
      throw new DomainError(
        "Sudah ada risiko aktif lain dari pemicu yang sama.",
        409
      );
    }

    const claimed = await tx.identifikasiRisiko.updateMany({
      where: {
        id: riskId,
        version: expectedVersion,
        statusSiklus: RISK_CYCLE.FOLLOW_UP_SUBMITTED,
      },
      data: {
        statusSiklus: RISK_CYCLE.ACTIVE,
        followUpApprovedAt: new Date(),
        followUpApprovedBy: actor.name || actor.email,
        version: { increment: 1 },
      },
    });
    if (claimed.count === 0) {
      throw new DomainError(
        "Status atau versi lanjutan sudah berubah. Muat ulang sebelum mengesahkan.",
        409
      );
    }

    const parentUpdated = await tx.identifikasiRisiko.updateMany({
      where: {
        id: risk.parentRiskId,
        statusSiklus: RISK_CYCLE.ACTIVE,
      },
      data: { statusSiklus: RISK_CYCLE.CONTINUED },
    });
    if (parentUpdated.count === 0) {
      throw new DomainError(
        "Risiko asal sudah tidak aktif. Pengesahan dibatalkan.",
        409
      );
    }

    await tx.kewajibanTindakLanjut.updateMany({
      where: { followUpRiskId: riskId },
      data: {
        status: KEWAJIBAN_STATUS.SELESAI,
        resolution: "APPROVED",
        completedAt: new Date(),
      },
    });

    return tx.identifikasiRisiko.findUniqueOrThrow({ where: { id: riskId } });
  });
}

export interface CancelObligationParams {
  monitoringId: number;
  correctionMonitoringId: number;
  reason: string;
  actor: Actor;
}

/**
 * Pembatalan kewajiban hanya sah melalui hasil koreksi final yang membuktikan
 * pemicu tidak lagi berlaku. Draf/penerus yang belum disahkan ditandai
 * CANCELLED; penerus aktif tidak diubah otomatis.
 */
export async function cancelObligationThroughCorrection({
  monitoringId,
  correctionMonitoringId,
  reason,
  actor,
}: CancelObligationParams) {
  if (!reason.trim()) {
    throw new DomainError("Catatan pembatalan wajib diisi.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const monitoring = await tx.pemantauanRisiko.findUnique({
      where: { id: monitoringId },
      include: { kewajiban: true },
    });
    if (!monitoring) throw new DomainError("Pemantauan tidak ditemukan.", 404);
    if (!monitoring.kewajiban) {
      throw new DomainError("Tidak ada kewajiban untuk pemantauan ini.", 404);
    }

    const correction = await tx.pemantauanRisiko.findUnique({
      where: { id: correctionMonitoringId },
      select: {
        id: true,
        riskId: true,
        tahun: true,
        triwulan: true,
        status: true,
        previousRevisionId: true,
        besaran: true,
        seleraSnapshot: true,
        responRisiko: true,
      },
    });
    if (!correction) {
      throw new DomainError("Hasil koreksi tidak ditemukan.", 404);
    }
    if (correction.status !== PEMANTAUAN_STATUS.FINAL) {
      throw new DomainError(
        "Pembatalan hanya sah melalui hasil koreksi yang sudah Final.",
        409
      );
    }
    if (
      correction.riskId !== monitoring.riskId ||
      correction.tahun !== monitoring.tahun ||
      correction.triwulan !== monitoring.triwulan
    ) {
      throw new DomainError(
        "Hasil koreksi bukan untuk risiko/periode yang sama.",
        400
      );
    }

    let ancestorId = correction.previousRevisionId;
    let isCorrectionOfTrigger = false;
    for (let depth = 0; depth < 50 && ancestorId; depth += 1) {
      if (ancestorId === monitoring.id) {
        isCorrectionOfTrigger = true;
        break;
      }
      const parent = await tx.pemantauanRisiko.findUnique({
        where: { id: ancestorId },
        select: { previousRevisionId: true },
      });
      ancestorId = parent?.previousRevisionId ?? null;
    }
    if (!isCorrectionOfTrigger) {
      throw new DomainError(
        "Hasil koreksi bukan revisi dari pemantauan pemicu.",
        409
      );
    }

    if (
      requiresFollowUp(
        correction.responRisiko,
        correction.besaran,
        correction.seleraSnapshot
      )
    ) {
      throw new DomainError(
        "Hasil koreksi masih memenuhi pemicu tindak lanjut, sehingga kewajiban tidak dapat dibatalkan.",
        409
      );
    }

    const followUp = monitoring.kewajiban.followUpRiskId
      ? await tx.identifikasiRisiko.findUnique({
          where: { id: monitoring.kewajiban.followUpRiskId },
          select: { id: true, statusSiklus: true },
        })
      : null;
    if (
      followUp &&
      followUp.statusSiklus !== RISK_CYCLE.FOLLOW_UP_DRAFT &&
      followUp.statusSiklus !== RISK_CYCLE.FOLLOW_UP_SUBMITTED
    ) {
      throw new DomainError(
        "Penerus sudah disahkan. Rekonsiliasi harus dilakukan eksplisit; pembatalan otomatis tidak diizinkan.",
        409
      );
    }

    if (followUp) {
      const cancelled = await tx.identifikasiRisiko.updateMany({
        where: {
          id: followUp.id,
          statusSiklus: {
            in: [RISK_CYCLE.FOLLOW_UP_DRAFT, RISK_CYCLE.FOLLOW_UP_SUBMITTED],
          },
        },
        data: {
          statusSiklus: RISK_CYCLE.FOLLOW_UP_CANCELLED,
          version: { increment: 1 },
        },
      });
      if (cancelled.count === 0) {
        throw new DomainError(
          "Status penerus sudah berubah. Muat ulang sebelum membatalkan.",
          409
        );
      }
    }

    const obligation = await tx.kewajibanTindakLanjut.updateMany({
      where: {
        id: monitoring.kewajiban.id,
        status: { in: OPEN_OBLIGATION_STATUSES },
      },
      data: {
        status: KEWAJIBAN_STATUS.DIBATALKAN,
        resolution: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: actor.name || actor.email,
        cancelReason: reason.trim(),
        catatan: `Dibatalkan melalui koreksi final #${correction.id}: ${reason.trim()}`,
      },
    });
    if (obligation.count === 0) {
      throw new DomainError(
        "Kewajiban sudah tidak terbuka. Muat ulang halaman.",
        409
      );
    }

    await tx.pemantauanRisiko.update({
      where: { id: correction.id },
      data: {
        reconciliationDecision: "CANCELLED",
        reconciliationNote: reason.trim(),
        reconciledBy: actor.name || actor.email,
        reconciledAt: new Date(),
      },
    });

    return tx.kewajibanTindakLanjut.findUniqueOrThrow({
      where: { id: monitoring.kewajiban.id },
    });
  });
}

export interface ObligationNotificationResult {
  sent: number;
}

const REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/** Best-effort setelah commit; kegagalan tidak membatalkan finalisasi. */
export async function notifyObligation(
  obligationId: number
): Promise<ObligationNotificationResult> {
  try {
    const obligation = await prisma.kewajibanTindakLanjut.findUnique({
      where: { id: obligationId },
      include: {
        risk: { select: { risiko: true, teamId: true } },
        monitoring: { select: { tahun: true, triwulan: true } },
        followUpRisk: { select: { id: true } },
      },
    });
    if (
      !obligation ||
      obligation.status === KEWAJIBAN_STATUS.SELESAI ||
      obligation.status === KEWAJIBAN_STATUS.DIBATALKAN
    ) {
      return { sent: 0 };
    }

    const recipientIds = new Set<number>();
    if (obligation.teamId != null) {
      const members = await prisma.userTeam.findMany({
        where: { teamId: obligation.teamId },
        select: { userId: true },
      });
      members.forEach((member) => recipientIds.add(member.userId));
    }
    const admins = await prisma.user.findMany({
      where: { role: { name: { equals: "admin", mode: "insensitive" } } },
      select: { id: true },
    });
    admins.forEach((admin) => recipientIds.add(admin.id));

    if (recipientIds.size === 0) return { sent: 0 };

    const bucket = Math.floor(
      (Date.now() - obligation.createdAt.getTime()) / REMINDER_INTERVAL_MS
    );

    const result = await prisma.notification.createMany({
      data: Array.from(recipientIds).map((userId) => ({
        userId,
        title: "Tindak Lanjut Wajib",
        body: `Risiko "${obligation.risk.risiko}" (TW ${obligation.monitoring.triwulan} ${obligation.monitoring.tahun}) memerlukan risiko lanjutan yang wajib dilengkapi.`,
        url: obligation.followUpRisk
          ? `/manajemen-risiko/risiko-lanjutan/${obligation.followUpRisk.id}`
          : "/pemantauan-risiko",
        isRead: false,
        dedupeKey: `obligation:${obligation.id}:${userId}:${bucket}`,
      })),
      skipDuplicates: true,
    });
    await prisma.kewajibanTindakLanjut.update({
      where: { id: obligation.id },
      data: { lastRemindedAt: new Date() },
    });
    return { sent: result.count };
  } catch (error) {
    console.error("notifyObligation failed:", error);
    return { sent: 0 };
  }
}
