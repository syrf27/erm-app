import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/access-control";
import { REVALIDATE_CACHE_CONTROL } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const isAllowed = await checkPermission("pelaporan-risiko", "read", {
      ipAddress,
      userAgent,
    });

    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tahunDari = Number(searchParams.get("tahun_gte") ?? 0);
    const tahunSampai = Number(searchParams.get("tahun_lte") ?? 9999);

    const [risks, matrix] = await Promise.all([
      prisma.identifikasiRisiko.findMany({
        where: {
          tahun: {
            gte: Number.isFinite(tahunDari) ? tahunDari : 0,
            lte: Number.isFinite(tahunSampai) ? tahunSampai : 9999,
          },
        },
        orderBy: { id: "asc" },
        include: {
          sasaran: { select: { id: true, nama: true } },
          kegiatan: { select: { id: true, nama: true } },
          prosesBisnis: { select: { id: true, nama: true } },
          sumberRisiko: { select: { id: true, nama: true } },
          kategoriRisiko: { select: { id: true, nama: true } },
          areaDampak: { select: { id: true, nama: true } },
          team: { select: { id: true, nama: true } },
          analisisRisiko: {
            include: {
              levelKemungkinan: true,
              levelDampak: true,
            },
          },
          evaluasiRisiko: {
            include: {
              residualLevelKemungkinan: true,
              residualLevelDampak: true,
            },
          },
          rencanaPenanganan: {
            include: {
              residualLevelKemungkinan: true,
              residualLevelDampak: true,
            },
          },
        },
      }),
      prisma.matriksAnalisisRisiko.findMany({
        include: {
          levelRisiko: { select: { id: true, nama: true, warna: true } },
        },
      }),
    ]);

    const matrixByPair = new Map(
      matrix.map((item) => [
        `${item.levelKemungkinanId}:${item.levelDampakId}`,
        item,
      ])
    );

    const data = risks.map((risk) => {
      const actualLikelihood = risk.analisisRisiko?.levelKemungkinan ?? null;
      const actualImpact = risk.analisisRisiko?.levelDampak ?? null;
      const actualMatrix =
        actualLikelihood && actualImpact
          ? matrixByPair.get(`${actualLikelihood.id}:${actualImpact.id}`) ?? null
          : null;

      // Evaluasi Risiko is the source of truth for residual risk. Values on
      // RencanaPenanganan are retained only as a legacy fallback.
      const evaluationHasResidual = Boolean(
        risk.evaluasiRisiko?.residualLevelKemungkinanId &&
          risk.evaluasiRisiko?.residualLevelDampakId
      );
      const residualLikelihood = evaluationHasResidual
        ? risk.evaluasiRisiko?.residualLevelKemungkinan ?? null
        : risk.rencanaPenanganan?.residualLevelKemungkinan ?? null;
      const residualImpact = evaluationHasResidual
        ? risk.evaluasiRisiko?.residualLevelDampak ?? null
        : risk.rencanaPenanganan?.residualLevelDampak ?? null;
      const residualMatrix =
        residualLikelihood && residualImpact
          ? matrixByPair.get(`${residualLikelihood.id}:${residualImpact.id}`) ?? null
          : null;

      return {
        ...risk,
        computedRisk: {
          actual: {
            likelihood: actualLikelihood,
            impact: actualImpact,
            besaran: actualMatrix?.besaran ?? 0,
            level: actualMatrix?.levelRisiko ?? null,
          },
          residual: {
            source: evaluationHasResidual ? "evaluasi" : "rencana-legacy",
            likelihood: residualLikelihood,
            impact: residualImpact,
            besaran: residualMatrix?.besaran ?? 0,
            level: residualMatrix?.levelRisiko ?? null,
          },
        },
      };
    });

    return NextResponse.json(data, {
      headers: {
        "x-total-count": String(data.length),
        "Cache-Control": REVALIDATE_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error("Custom pelaporan risiko API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
