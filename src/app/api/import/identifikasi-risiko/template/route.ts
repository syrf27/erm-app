import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/access-control";
import { logAudit } from "@/lib/audit-log";
import {
  buildImportTemplateWorkbook,
  type ReferenceNames,
  type TemplateRowData,
} from "@/lib/import-risiko-excel";

export async function GET(request: NextRequest) {
  try {
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");
    let userId = "anonymous";
    let userName = "Anonymous";
    if (auth?.value) {
      try {
        const parsed = JSON.parse(auth.value);
        userId = parsed.email || "anonymous";
        userName = parsed.name || "Anonymous";
      } catch {}
    }

    const isAllowed = await checkPermission("identifikasi-risiko", "read", {
      ipAddress,
      userAgent,
    });
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tahunDari = parseInt(searchParams.get("tahunDari") || "0", 10) || new Date().getFullYear();
    const tahunSampai =
      parseInt(searchParams.get("tahunSampai") || "0", 10) || tahunDari;

    // Existing risk data for the selected year window (mirrors the pelaporan export assembly)
    const [records, matriksList] = await Promise.all([
      prisma.identifikasiRisiko.findMany({
        where: { tahun: { gte: tahunDari, lte: tahunSampai } },
        orderBy: { id: "asc" },
        include: {
          sasaran: true,
          kegiatan: true,
          prosesBisnis: true,
          jenisRisiko: true,
          sumberRisiko: true,
          kategoriRisiko: true,
          areaDampak: true,
          analisisRisiko: {
            include: { levelKemungkinan: true, levelDampak: true, levelRisiko: true },
          },
          evaluasiRisiko: true,
          rencanaPenanganan: {
            include: {
              residualLevelKemungkinan: true,
              residualLevelDampak: true,
              dokumenPendukungs: { select: { id: true } },
            },
          },
        },
      }),
      prisma.matriksAnalisisRisiko.findMany({ include: { levelRisiko: true } }),
    ]);

    const lookupMatriks = (lkId: number | null, ldId: number | null) =>
      matriksList.find(
        (m) => m.levelKemungkinanId === lkId && m.levelDampakId === ldId
      ) ?? null;

    const rows: TemplateRowData[] = records.map((r) => {
      const an = r.analisisRisiko;
      const rp = r.rencanaPenanganan;
      const matriksAktual = an
        ? lookupMatriks(an.levelKemungkinanId, an.levelDampakId)
        : null;
      const matriksResidual = rp
        ? lookupMatriks(rp.residualLevelKemungkinanId, rp.residualLevelDampakId)
        : null;
      return {
        id: r.id,
        sasaran: r.sasaran?.nama ?? "",
        kegiatan: r.kegiatan?.nama ?? "",
        prosesBisnis: r.prosesBisnis?.nama ?? "",
        risiko: r.risiko,
        penyebab: r.penyebab ?? "",
        dampak: r.dampak ?? "",
        kategoriRisiko: r.kategoriRisiko?.nama ?? "",
        areaDampak: r.areaDampak?.nama ?? "",
        sumberRisiko: r.sumberRisiko?.nama ?? "",
        jenisRisiko: r.jenisRisiko?.nama ?? "",
        lvlKemungkinan: an?.levelKemungkinan?.nama ?? "",
        lvlDampak: an?.levelDampak?.nama ?? "",
        besaranAktual:
          matriksAktual?.besaran ??
          (an?.levelKemungkinan && an?.levelDampak
            ? an.levelKemungkinan.skala * an.levelDampak.skala
            : 0),
        levelAktual: matriksAktual?.levelRisiko?.nama ?? "",
        pengendalian: an?.pengendalianUraian ?? "",
        efektivitas: an?.pengendalianEfektivitas ?? "",
        residualKemungkinan: rp?.residualLevelKemungkinan?.nama ?? "",
        residualDampak: rp?.residualLevelDampak?.nama ?? "",
        besaranResidual: matriksResidual?.besaran ?? 0,
        levelResidual: matriksResidual?.levelRisiko?.nama ?? "",
        respon: r.evaluasiRisiko?.responRisiko ?? "",
        rencanaPenanganan: rp?.rencanaTidakPenanganan ?? "",
        targetWaktu: rp?.targetWaktu ?? "",
        targetOutput: rp?.targetOutput ?? "",
        penanggungJawab: rp?.penanggungJawab ?? "",
        keterjadianRisiko: rp?.keterjadiRisiko ?? "",
        realisasiWaktu: rp?.realisasiWaktu ?? "",
        realisasiOutput: rp?.realisasiOutput ?? "",
        dokumenPendukung:
          rp && rp.dokumenPendukungs.length > 0 ? "Ada Dokumen" : "",
        persetujuan: rp?.persetujuan ?? "Draft",
        disetujuiOleh: rp?.disetujuiOleh ?? "",
      };
    });

    const [
      jenisRisiko,
      sumberRisiko,
      kategoriRisiko,
      areaDampak,
      sasaran,
      kegiatan,
      prosesBisnis,
      levelKemungkinan,
      levelDampak,
    ] = await Promise.all([
      prisma.jenisRisiko.findMany({ orderBy: { nama: "asc" } }),
      prisma.sumberRisiko.findMany({ orderBy: { nama: "asc" } }),
      prisma.kategoriRisiko.findMany({ orderBy: { nama: "asc" } }),
      prisma.areaDampak.findMany({ orderBy: { nama: "asc" } }),
      prisma.sasaran.findMany({ orderBy: { nama: "asc" } }),
      prisma.kegiatan.findMany({ orderBy: { nama: "asc" } }),
      prisma.prosesBisnis.findMany({ orderBy: { nama: "asc" } }),
      prisma.levelKemungkinan.findMany({ orderBy: { skala: "asc" } }),
      prisma.levelDampak.findMany({ orderBy: { skala: "asc" } }),
    ]);

    const refs: ReferenceNames = {
      jenisRisiko: jenisRisiko.map((x) => x.nama),
      sumberRisiko: sumberRisiko.map((x) => x.nama),
      kategoriRisiko: kategoriRisiko.map((x) => x.nama),
      areaDampak: areaDampak.map((x) => x.nama),
      sasaran: sasaran.map((x) => x.nama),
      kegiatan: kegiatan.map((x) => x.nama),
      prosesBisnis: prosesBisnis.map((x) => x.nama),
      levelKemungkinan: levelKemungkinan.map((x) => x.nama),
      levelDampak: levelDampak.map((x) => x.nama),
    };

    const tahunLabel =
      tahunDari === tahunSampai ? `${tahunDari}` : `${tahunDari}-${tahunSampai}`;
    const workbook = buildImportTemplateWorkbook(rows, refs, tahunLabel);
    const buffer = await workbook.xlsx.writeBuffer();

    await logAudit({
      userId,
      userName,
      action: "DOWNLOAD",
      resource: "IdentifikasiRisiko",
      details: {
        type: "import-template",
        tahunDari,
        tahunSampai,
        rows: rows.length,
      },
      ipAddress,
      userAgent,
    });

    const fileName = `Template_Import_Identifikasi_Risiko_${tahunLabel}.xlsx`;
    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Template download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
