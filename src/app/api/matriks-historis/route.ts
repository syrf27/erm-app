import { NextRequest, NextResponse } from "next/server";
import {
  checkPermission,
  getAuthUserContext,
  shouldScopeRiskByTeam,
} from "@/lib/access-control";
import { prisma } from "@/lib/prisma";
import { currentPeriode } from "@/lib/risk-assessment";
import { PEMANTAUAN_STATUS } from "@/lib/risk-cycle";
import {
  matrixConfigHash,
  type MatrixSnapshotConfig,
} from "@/lib/matrix-snapshot";

type MatrixSnapshotShape = MatrixSnapshotConfig;

export async function GET(request: NextRequest) {
  try {
    const allowed =
      (await checkPermission("matriks-analisis-risiko", "read")) ||
      (await checkPermission("identifikasi-risiko", "read"));
    if (!allowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const ctx = await getAuthUserContext();
    if (!ctx) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const fallback = currentPeriode();
    const tahun = Number(searchParams.get("tahun")) || fallback.tahun;
    const triwulan = Number(searchParams.get("triwulan")) || fallback.triwulan;

    const monitorings = await prisma.pemantauanRisiko.findMany({
      where: {
        status: PEMANTAUAN_STATUS.FINAL,
        tahun,
        triwulan,
        ...(shouldScopeRiskByTeam(ctx)
          ? { risk: { teamId: { in: ctx.teamIds } } }
          : {}),
      },
      orderBy: { riskId: "asc" },
      select: {
        id: true,
        riskId: true,
        besaran: true,
        levelRisikoNama: true,
        levelRisikoWarna: true,
        kemungkinanLabel: true,
        dampakLabel: true,
        kemungkinanSkala: true,
        dampakSkala: true,
        matriksSnapshot: true,
        risk: { select: { risiko: true } },
      },
    });

    const snapshots = monitorings
      .map((item) => item.matriksSnapshot as MatrixSnapshotShape | null)
      .filter((item): item is MatrixSnapshotShape =>
        Boolean(item && Array.isArray(item.matriks))
      );
    const snapshot = snapshots[0] ?? null;
    // Bandingkan isi konfigurasi, bukan waktu snapshot. Dua finalisasi pada
    // waktu berbeda dengan matriks identik bukan perubahan konfigurasi.
    const snapshotVersions = new Set(
      snapshots.map((item) => matrixConfigHash(item))
    );

    return NextResponse.json({
      tahun,
      triwulan,
      konfigurasi: snapshot,
      versiKonfigurasi: snapshotVersions.size,
      catatan: !snapshot
        ? "Snapshot konfigurasi matriks tidak tersedia untuk periode ini. Posisi hasil tetap ditampilkan dari snapshot hasil; latar matriks tidak direkayasa."
        : snapshotVersions.size > 1
        ? "Konfigurasi matriks berubah dalam periode ini. Latar memakai snapshot finalisasi pertama; nilai tiap hasil tetap berasal dari snapshot penyimpanannya masing-masing."
        : null,
      rows: monitorings.map((item) => ({
        monitoringId: item.id,
        riskId: item.riskId,
        risiko: item.risk.risiko,
        besaran: item.besaran,
        level: item.levelRisikoNama,
        warna: item.levelRisikoWarna,
        kemungkinan: item.kemungkinanLabel,
        dampak: item.dampakLabel,
        kemungkinanSkala: item.kemungkinanSkala,
        dampakSkala: item.dampakSkala,
        snapshotTersedia: Boolean(item.matriksSnapshot),
      })),
    });
  } catch (error) {
    console.error("matriks historis error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
