import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  canAccessRiskIds,
  checkPermission,
  getAuthUserContext,
  isAdminRole,
  mergeRiskTeamWhere,
  shouldScopeRiskByTeam,
} from "@/lib/access-control";
import { invalidateResourceCache } from "@/lib/cache";
import { logAudit } from "@/lib/audit-log";
import { isSafeAppUrl } from "@/lib/safe-url";
import {
  assessRisk,
  currentPeriode,
  isValidPeriode,
  periodeKey,
  quarterBounds,
  resolveAssessmentFromDb,
  resolveSeleraFromDb,
  type MatrixEntry,
} from "@/lib/risk-assessment";
import { buildMonitoringSnapshot } from "@/lib/pemantauan-service";
import { getMonitoringStartPeriode } from "@/lib/pemantauan-integrity";
import { KEWAJIBAN_STATUS, PEMANTAUAN_STATUS, RISK_CYCLE } from "@/lib/risk-cycle";
import { createPemantauanSchema } from "@/lib/validators";

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
  const monitoring = await checkPermission("pemantauan-risiko", "read");
  if (monitoring) return true;
  return checkPermission("rencana-penanganan", "read");
}

async function canWriteMonitoring() {
  const monitoring = await checkPermission("pemantauan-risiko", "update");
  if (monitoring) return true;
  return checkPermission("rencana-penanganan", "update");
}

export async function GET(request: NextRequest) {
  try {
    if (!await canReadMonitoring()) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const ctx = await getAuthUserContext();
    if (!ctx) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const fallback = currentPeriode();
    const tahun = Number(searchParams.get("tahun")) || fallback.tahun;
    const triwulanParam = searchParams.get("triwulan");
    const allQuarters = triwulanParam === "all";
    const triwulan = allQuarters
      ? null
      : Number(triwulanParam) || fallback.triwulan;
    if (
      !allQuarters &&
      (triwulan == null || !isValidPeriode(tahun, triwulan))
    ) {
      return NextResponse.json({ error: "Periode tidak valid" }, { status: 400 });
    }

    const mode = searchParams.get("mode") === "history" ? "history" : "active";
    const periodEnd = allQuarters || triwulan == null
      ? null
      : quarterBounds(tahun, triwulan).endExclusive;
    const riskWhere = mergeRiskTeamWhere(
      "identifikasi-risiko",
      allQuarters
        ? {
            ...(mode === "history"
              ? {}
              : {
                  archivedAt: null,
                  statusSiklus: RISK_CYCLE.ACTIVE,
                }),
            pemantauans: {
              some: {
                tahun,
                ...(mode === "history"
                  ? {
                      status: {
                        in: [
                          PEMANTAUAN_STATUS.FINAL,
                          PEMANTAUAN_STATUS.SUPERSEDED,
                        ],
                      },
                    }
                  : {}),
              },
            },
          }
        : mode === "history"
        ? {
            // Riwayat tetap menampilkan risiko Continued/arsip yang memiliki
            // hasil pada periode tersebut, tanpa menjadikannya kewajiban aktif.
            pemantauans: {
              some: {
                tahun,
                triwulan: triwulan ?? fallback.triwulan,
                status: {
                  in: [
                    PEMANTAUAN_STATUS.FINAL,
                    PEMANTAUAN_STATUS.SUPERSEDED,
                  ],
                },
              },
            },
          }
        : {
            archivedAt: null,
            statusSiklus: RISK_CYCLE.ACTIVE,
            tahun: { lte: tahun },
            ...(periodEnd ? { createdAt: { lt: periodEnd } } : {}),
            ...(periodEnd
              ? { rencanaPenanganan: { is: { createdAt: { lt: periodEnd } } } }
              : {}),
          },
      ctx
    );

    const [risks, matrixRows, obligations] = await Promise.all([
      prisma.identifikasiRisiko.findMany({
        where: riskWhere,
        orderBy: [{ tahun: "asc" }, { id: "asc" }],
        include: {
          team: { select: { id: true, nama: true } },
          evaluasiRisiko: {
            select: {
              id: true,
              responRisiko: true,
              residualLevelKemungkinanId: true,
              residualLevelDampakId: true,
              residualLevelKemungkinan: { select: { nama: true } },
              residualLevelDampak: { select: { nama: true } },
            },
          },
          rencanaPenanganan: {
            select: {
              id: true,
              rencanaTidakPenanganan: true,
              targetOutput: true,
              targetWaktu: true,
              penanggungJawab: true,
              targetResidualLevelKemungkinanId: true,
              targetResidualLevelDampakId: true,
            },
          },
          analisisRisiko: {
            select: {
              levelKemungkinan: { select: { nama: true } },
              levelDampak: { select: { nama: true } },
            },
          },
          pemantauans: {
            where: {
              tahun,
              ...(allQuarters ? {} : { triwulan: triwulan! }),
              ...(allQuarters && mode === "history"
                ? {
                    status: {
                      in: [
                        PEMANTAUAN_STATUS.FINAL,
                        PEMANTAUAN_STATUS.SUPERSEDED,
                      ],
                    },
                  }
                : {}),
            },
            orderBy: [
              { triwulan: "desc" },
              { revision: "desc" },
              { id: "desc" },
            ],
            ...(allQuarters ? {} : { take: 1 }),
            include: {
              dokumens: true,
              kewajiban: true,
            },
          },
          kewajibanSebagaiAsal: {
            where: {
              status: {
                notIn: [
                  KEWAJIBAN_STATUS.SELESAI,
                  KEWAJIBAN_STATUS.DIBATALKAN,
                ],
              },
            },
            include: {
              monitoring: { select: { tahun: true, triwulan: true } },
              followUpRisk: { select: { id: true, statusSiklus: true } },
            },
          },
        },
      }),
      prisma.matriksAnalisisRisiko.findMany({
        select: {
          levelKemungkinanId: true,
          levelDampakId: true,
          besaran: true,
          levelRisikoId: true,
          levelRisiko: { select: { nama: true, warna: true } },
        },
      }),
      prisma.kewajibanTindakLanjut.findMany({
        where: {
          status: {
            notIn: [KEWAJIBAN_STATUS.SELESAI, KEWAJIBAN_STATUS.DIBATALKAN],
          },
          ...(shouldScopeRiskByTeam(ctx)
            ? { teamId: { in: ctx.teamIds } }
            : {}),
        },
        include: {
          risk: { select: { id: true, risiko: true, teamId: true } },
          monitoring: { select: { id: true, tahun: true, triwulan: true } },
          followUpRisk: { select: { id: true, statusSiklus: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const matrix = matrixRows as MatrixEntry[];
    const rows = risks.flatMap((risk) => {
      const monitoringRecords = allQuarters
        ? Array.from(
            risk.pemantauans.reduce((byQuarter, monitoring) => {
              const previous = byQuarter.get(monitoring.triwulan);
              if (
                !previous ||
                monitoring.revision > previous.revision ||
                (monitoring.revision === previous.revision && monitoring.id > previous.id)
              ) {
                byQuarter.set(monitoring.triwulan, monitoring);
              }
              return byQuarter;
            }, new Map<number, (typeof risk.pemantauans)[number]>()).values()
          )
        : [risk.pemantauans[0] ?? null];

      return monitoringRecords.map((latest) => {
      const acuan = risk.evaluasiRisiko
        ? assessRisk(
            matrix,
            risk.evaluasiRisiko.residualLevelKemungkinanId,
            risk.evaluasiRisiko.residualLevelDampakId
          )
        : null;
      const harapan = risk.rencanaPenanganan
        ? assessRisk(
            matrix,
            risk.rencanaPenanganan.targetResidualLevelKemungkinanId,
            risk.rencanaPenanganan.targetResidualLevelDampakId
          )
        : null;

      return {
        riskId: risk.id,
        risiko: risk.risiko,
        team: risk.team,
        teamLabel:
          risk.team?.nama ?? risk.rencanaPenanganan?.penanggungJawab ?? null,
        tahun: risk.tahun,
        statusSiklus: risk.statusSiklus,
        parentRiskId: risk.parentRiskId,
        rootRiskId: risk.rootRiskId,
        rtp: risk.rencanaPenanganan
          ? {
              id: risk.rencanaPenanganan.id,
              uraian: risk.rencanaPenanganan.rencanaTidakPenanganan,
              targetOutput: risk.rencanaPenanganan.targetOutput,
              targetWaktu: risk.rencanaPenanganan.targetWaktu,
              penanggungJawab: risk.rencanaPenanganan.penanggungJawab,
            }
          : null,
        responEvaluasi: risk.evaluasiRisiko?.responRisiko ?? null,
        // Hasil final/historis selalu memakai snapshot tersimpan.
        residualAcuan: {
          besaran: latest?.residualAcuan ?? acuan?.besaran ?? null,
          level: latest ? latest.levelRisikoNama : acuan?.level ?? null,
          warna: latest ? latest.levelRisikoWarna : acuan?.warna ?? null,
        },
        residualHarapan: {
          besaran: latest?.residualHarapan ?? harapan?.besaran ?? null,
          level: harapan?.level ?? null,
          warna: harapan?.warna ?? null,
        },
        monitoring: latest,
        triwulan: latest?.triwulan ?? triwulan,
        statusPemantauan: latest?.status ?? "BELUM_DIISI",
        kewajibanTerbuka: risk.kewajibanSebagaiAsal,
        archivedAt: risk.archivedAt,
        isHistorical:
          mode === "history" ||
          String(risk.statusSiklus) === RISK_CYCLE.CONTINUED,
      };
      });
    });

    const counts = {
      totalWajibPantau: rows.length,
      belumDiisi: rows.filter((row) => row.statusPemantauan === "BELUM_DIISI").length,
      menungguValidasi: rows.filter(
        (row) => row.statusPemantauan === PEMANTAUAN_STATUS.SUBMITTED
      ).length,
      kembali: rows.filter(
        (row) => row.statusPemantauan === PEMANTAUAN_STATUS.RETURNED
      ).length,
      final: rows.filter(
        (row) => row.statusPemantauan === PEMANTAUAN_STATUS.FINAL
      ).length,
      tindakLanjutWajib: obligations.length,
    };

    const mulaiPeriode = await getMonitoringStartPeriode(prisma as never);
    return NextResponse.json({
      periode: { tahun, triwulan: allQuarters ? null : triwulan, semuaTriwulan: allQuarters },
      mode,
      rows,
      obligations,
      counts,
      mulaiPeriode,
    });
  } catch (error) {
    console.error("pemantauan GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await canWriteMonitoring()) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const ctx = await getAuthUserContext();
    const actor = await getActor();
    if (!ctx || !actor) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    let input;
    try {
      input = createPemantauanSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      throw error;
    }

    if (!isValidPeriode(input.tahun, input.triwulan)) {
      return NextResponse.json({ error: "Periode tidak valid" }, { status: 400 });
    }
    if (!isAdminRole(ctx.roleName)) {
      if (ctx.teamIds.length === 0) {
        return NextResponse.json(
          { error: "Akun belum memiliki Tim Kerja." },
          { status: 403 }
        );
      }
      const start = await getMonitoringStartPeriode(prisma as never);
      if (periodeKey(input.tahun, input.triwulan) < periodeKey(start.tahun, start.triwulan)) {
        return NextResponse.json(
          { error: "Periode sebelum penerapan fitur tidak dapat dibuat." },
          { status: 400 }
        );
      }
    }

    if (!await canAccessRiskIds(ctx, [input.riskId])) {
      return NextResponse.json(
        { error: "Risiko berada di luar Tim Kerja Anda." },
        { status: 403 }
      );
    }

    const risk = await prisma.identifikasiRisiko.findUnique({
      where: { id: input.riskId },
      include: {
        evaluasiRisiko: true,
        rencanaPenanganan: true,
      },
    });
    if (!risk || risk.archivedAt) {
      return NextResponse.json({ error: "Risiko tidak ditemukan" }, { status: 404 });
    }
    if (risk.statusSiklus !== RISK_CYCLE.ACTIVE) {
      return NextResponse.json(
        { error: "Risiko tidak berada pada siklus aktif." },
        { status: 409 }
      );
    }
    if (!risk.rencanaPenanganan) {
      return NextResponse.json(
        { error: "Risiko belum memiliki RTP sehingga tidak dapat dipantau." },
        { status: 400 }
      );
    }

    const existing = await prisma.pemantauanRisiko.findFirst({
      where: {
        riskId: input.riskId,
        tahun: input.tahun,
        triwulan: input.triwulan,
      },
      orderBy: { revision: "desc" },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: "Pemantauan periode ini sudah ada. Muat ulang untuk mengedit.",
          monitoringId: existing.id,
        },
        { status: 409 }
      );
    }

    const unsafeDoc = (input.dokumens ?? []).find((doc) => !isSafeAppUrl(doc.url));
    if (unsafeDoc) {
      return NextResponse.json(
        { error: "Tautan dokumen harus menggunakan http://, https://, atau path internal aplikasi." },
        { status: 400 }
      );
    }

    const snapshot = await buildMonitoringSnapshot(prisma as never, {
      levelKemungkinanId: input.levelKemungkinanId,
      levelDampakId: input.levelDampakId,
      kategoriRisikoId: risk.kategoriRisikoId,
    });
    const acuan = risk.evaluasiRisiko
      ? await resolveAssessmentFromDb(
          prisma as never,
          risk.evaluasiRisiko.residualLevelKemungkinanId,
          risk.evaluasiRisiko.residualLevelDampakId
        )
      : null;
    const harapan = risk.rencanaPenanganan
      ? await resolveAssessmentFromDb(
          prisma as never,
          risk.rencanaPenanganan.targetResidualLevelKemungkinanId,
          risk.rencanaPenanganan.targetResidualLevelDampakId
        )
      : null;
    const selera = await resolveSeleraFromDb(prisma as never, risk.kategoriRisikoId);
    const { levelRisikoId: _levelRisikoId, ...snapshotData } = snapshot;

    const created = await prisma.pemantauanRisiko.create({
      data: {
        riskId: input.riskId,
        tahun: input.tahun,
        triwulan: input.triwulan,
        status: PEMANTAUAN_STATUS.DRAFT,
        revision: 1,
        createdBy: actor.name || actor.email,
        rtpId: risk.rencanaPenanganan.id,
        rtpSnapshot: {
          id: risk.rencanaPenanganan.id,
          uraian: risk.rencanaPenanganan.rencanaTidakPenanganan,
          targetOutput: risk.rencanaPenanganan.targetOutput,
          targetWaktu: risk.rencanaPenanganan.targetWaktu,
          penanggungJawab: risk.rencanaPenanganan.penanggungJawab,
        } as Prisma.InputJsonValue,
        targetOutput: input.targetOutput ?? risk.rencanaPenanganan.targetOutput,
        targetWaktu: input.targetWaktu ?? risk.rencanaPenanganan.targetWaktu,
        penanggungJawab:
          input.penanggungJawab ?? risk.rencanaPenanganan.penanggungJawab,
        statusPelaksanaan: input.statusPelaksanaan ?? null,
        uraianPelaksanaan: input.uraianPelaksanaan ?? null,
        pekerjaanTertunda: input.pekerjaanTertunda ?? null,
        realisasiWaktu: input.realisasiWaktu ?? null,
        realisasiOutput: input.realisasiOutput ?? null,
        keterjadianRisiko: input.keterjadianRisiko ?? null,
        efektivitas: input.efektivitas ?? null,
        catatanEfektivitas: input.catatanEfektivitas ?? null,
        levelKemungkinanId: input.levelKemungkinanId ?? null,
        levelDampakId: input.levelDampakId ?? null,
        ...snapshotData,
        residualAcuan: acuan?.besaran ?? null,
        residualHarapan: harapan?.besaran ?? null,
        seleraSnapshot: selera,
        responRisiko:
          input.responRisiko ?? risk.evaluasiRisiko?.responRisiko ?? null,
        responAlasan: input.responAlasan ?? null,
        dokumens: input.dokumens?.length
          ? {
              create: input.dokumens.map((doc) => ({
                title: doc.title,
                url: doc.url,
                uploadedBy: actor.name || actor.email,
              })),
            }
          : undefined,
      },
      include: { dokumens: true },
    });

    await logAudit({
      userId: actor.email,
      userName: actor.name,
      action: "CREATE",
      resource: "PemantauanRisiko",
      resourceId: created.id,
      details: {
        riskId: risk.id,
        tahun: input.tahun,
        triwulan: input.triwulan,
        status: created.status,
      },
    });
    await invalidateResourceCache("pemantauan-risiko");
    await invalidateResourceCache("identifikasi-risiko");

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("pemantauan POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
