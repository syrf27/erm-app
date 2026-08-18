import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/access-control";
import { logAudit } from "@/lib/audit-log";
import { generateAndStoreEmbedding } from "@/lib/embedding";
import {
  parseImportWorkbook,
  ACCEPTED_IMPORT_EXTENSIONS,
  normalizeEfektivitas,
  normalizeKeterjadian,
  normalizeRespons,
  type ParsedImportRow,
} from "@/lib/import-risiko-excel";
import {
  createIdentifikasiRisikoSchema,
  updateIdentifikasiRisikoSchema,
  createAnalisisRisikoSchema,
  updateAnalisisRisikoSchema,
  createEvaluasiRisikoSchema,
  updateEvaluasiRisikoSchema,
  createRencanaPenangananSchema,
  updateRencanaPenangananSchema,
} from "@/lib/validators";

interface RowResult {
  row: number;
  status: "created" | "updated" | "failed";
  risiko: string;
  error?: string;
}

function buildNameMap<T extends { id: number; nama: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = item.nama.trim().toLowerCase();
    if (!map.has(key)) map.set(key, item);
  }
  return map;
}

// Optional FK fields in the zod schemas accept being omitted but not null.
function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)
  );
}

export async function POST(request: NextRequest) {
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

    // ---------- read + parse the uploaded file ----------
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "File tidak ditemukan. Sertakan field 'file'." },
        { status: 400 }
      );
    }
    const fileName = file.name || "";
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith(".numbers")) {
      return NextResponse.json(
        {
          error:
            "File Numbers (.numbers) tidak didukung. Ekspor dulu ke Excel: File > Export To > Excel..., lalu unggah file .xlsx tersebut.",
        },
        { status: 400 }
      );
    }
    if (!ACCEPTED_IMPORT_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      return NextResponse.json(
        {
          error: `Format file tidak didukung. Gunakan: ${ACCEPTED_IMPORT_EXTENSIONS.join(", ")} (unduh dari tombol Unduh Template).`,
        },
        { status: 400 }
      );
    }

    const tahunDari = parseInt(String(formData.get("tahunDari") || "0"), 10);
    const defaultTahun =
      tahunDari >= 2020 && tahunDari <= 2030
        ? tahunDari
        : new Date().getFullYear();

    const buffer = Buffer.from(await (file as File).arrayBuffer());
    const { rows: parsedRows, error: parseError } = parseImportWorkbook(buffer);
    if (parseError) {
      return NextResponse.json({ error: parseError }, { status: 400 });
    }
    if (parsedRows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada baris data yang terbaca pada file." },
        { status: 400 }
      );
    }
    if (parsedRows.length > 500) {
      return NextResponse.json(
        { error: "Maksimal 500 baris per import." },
        { status: 400 }
      );
    }

    // ---------- permission pre-scan ----------
    const anyUpdate = parsedRows.some((r) => r.idSistem !== null);
    const rowHasAnalisis = (r: ParsedImportRow) =>
      !!(r.lvlKemungkinan || r.lvlDampak || r.pengendalian || r.efektivitas);
    const rowHasEvaluasi = (r: ParsedImportRow) => !!r.respon;
    const rowHasRencana = (r: ParsedImportRow) =>
      !!(
        r.rencanaPenanganan ||
        r.targetWaktu ||
        r.targetOutput ||
        r.penanggungJawab ||
        r.keterjadianRisiko ||
        r.realisasiWaktu ||
        r.realisasiOutput ||
        r.residualKemungkinan ||
        r.residualDampak ||
        r.kemungkinanResidualHarapan ||
        r.dampakResidualHarapan
      );

    const needed: { resource: string; action: string }[] = [
      { resource: "identifikasi-risiko", action: "create" },
    ];
    if (anyUpdate) needed.push({ resource: "identifikasi-risiko", action: "update" });
    const stageNeeds: [boolean, string][] = [
      [parsedRows.some(rowHasAnalisis), "analisis-risiko"],
      [parsedRows.some(rowHasEvaluasi), "evaluasi-risiko"],
      [parsedRows.some(rowHasRencana), "rencana-penanganan"],
    ];
    for (const [used, resource] of stageNeeds) {
      if (!used) continue;
      needed.push({ resource, action: "create" });
      if (anyUpdate) needed.push({ resource, action: "update" });
    }

    for (const { resource, action } of needed) {
      const isAllowed = await checkPermission(resource, action, {
        ipAddress,
        userAgent,
      });
      if (!isAllowed) {
        return NextResponse.json(
          {
            error: `Akses ditolak: butuh permission '${action}' pada '${resource}'.`,
          },
          { status: 403 }
        );
      }
    }

    // ---------- reference data ----------
    const [
      jenisRisikoList,
      sumberRisikoList,
      kategoriRisikoList,
      areaDampakList,
      sasaranList,
      kegiatanList,
      prosesBisnisList,
      levelKemungkinanList,
      levelDampakList,
      matriksList,
    ] = await Promise.all([
      prisma.jenisRisiko.findMany({ orderBy: { id: "asc" } }),
      prisma.sumberRisiko.findMany({ orderBy: { id: "asc" } }),
      prisma.kategoriRisiko.findMany({ orderBy: { id: "asc" } }),
      prisma.areaDampak.findMany({ orderBy: { id: "asc" } }),
      prisma.sasaran.findMany({ orderBy: { id: "asc" } }),
      prisma.kegiatan.findMany({ orderBy: { id: "asc" }, include: { sasaran: true } }),
      prisma.prosesBisnis.findMany({ orderBy: { id: "asc" }, include: { kegiatan: true } }),
      prisma.levelKemungkinan.findMany(),
      prisma.levelDampak.findMany(),
      prisma.matriksAnalisisRisiko.findMany(),
    ]);

    const jenisMap = buildNameMap(jenisRisikoList);
    const sumberMap = buildNameMap(sumberRisikoList);
    const kategoriMap = buildNameMap(kategoriRisikoList);
    const areaMap = buildNameMap(areaDampakList);
    const sasaranMap = buildNameMap(sasaranList);
    const kegiatanMap = buildNameMap(kegiatanList);
    const prosesMap = buildNameMap(prosesBisnisList);
    const lkMap = buildNameMap(levelKemungkinanList);
    const ldMap = buildNameMap(levelDampakList);
    const matriksByPair = new Map<string, number>(); // "lkId-ldId" -> levelRisikoId
    for (const m of matriksList) {
      matriksByPair.set(`${m.levelKemungkinanId}-${m.levelDampakId}`, m.levelRisikoId);
    }

    // ---------- per-row processing ----------
    const results: RowResult[] = [];
    const embeddingQueue: { id: number; text: string }[] = [];

    for (const row of parsedRows) {
      try {
        const isNew = row.idSistem === null;
        const result = await prisma.$transaction(async (tx) => {
          // --- resolve references (errors abort the row) ---
          const resolve = <T extends { id: number; nama: string }>(
            map: Map<string, T>, name: string, label: string, required: boolean
          ): T | null => {
            if (!name) {
              if (required && isNew) throw new Error(`${label} wajib diisi untuk baris baru`);
              return null;
            }
            const found = map.get(name.trim().toLowerCase());
            if (!found) throw new Error(`${label} '${name}' tidak ditemukan. Perbaiki ejaan atau tambahkan dulu datanya.`);
            return found;
          };

          const jenis = resolve(jenisMap, row.jenisRisiko, "Jenis Risiko", true);
          const sumber = resolve(sumberMap, row.sumberRisiko, "Sumber Risiko", true);
          const kategori = resolve(kategoriMap, row.kategoriRisiko, "Kategori Risiko", true);
          const area = resolve(areaMap, row.areaDampak, "Area Dampak", true);

          if (isNew && !row.risiko) {
            throw new Error("Kolom 'Risiko' wajib diisi untuk baris baru");
          }

          const sasaran = row.sasaran
            ? resolve(sasaranMap, row.sasaran, "Sasaran", false)
            : null;
          let kegiatan = row.kegiatan
            ? resolve(kegiatanMap, row.kegiatan, "Kegiatan", false)
            : null;
          let prosesBisnis = row.prosesBisnis
            ? resolve(prosesMap, row.prosesBisnis, "Proses Bisnis", false)
            : null;

          // Cascading fallback mirrors the grid's saveAll: derive a kegiatan
          // from the proses bisnis when omitted, and (for new rows only)
          // derive sasaran/unit kerja from the kegiatan chain.
          if (prosesBisnis && !kegiatan && prosesBisnis.kegiatanId) {
            kegiatan = kegiatanList.find((k) => k.id === prosesBisnis!.kegiatanId) ?? null;
          }

          // --- identifikasi create/update ---
          let identId: number;
          let identData: any;

          if (isNew) {
            const payload = {
              risiko: row.risiko,
              jenisRisikoId: jenis!.id,
              sumberRisikoId: sumber!.id,
              kategoriRisikoId: kategori!.id,
              areaDampakId: area!.id,
              penyebab: row.penyebab || null,
              dampak: row.dampak || null,
              sasaranId: sasaran?.id ?? kegiatan?.sasaranId ?? null,
              kegiatanId: kegiatan?.id ?? null,
              prosesBisnisId: prosesBisnis?.id ?? null,
              unitKerjaId: kegiatan?.unitKerjaId ?? null,
              tahun: defaultTahun,
            };
            const parsed = createIdentifikasiRisikoSchema.safeParse(stripNulls(payload));
            if (!parsed.success) {
              throw new Error(
                "Validasi gagal: " +
                  parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
              );
            }
            const created = await tx.identifikasiRisiko.create({ data: parsed.data });
            identId = created.id;
            identData = created;
          } else {
            const existing = await tx.identifikasiRisiko.findUnique({
              where: { id: row.idSistem! },
            });
            if (!existing) {
              throw new Error(`ID Sistem ${row.idSistem} tidak ditemukan`);
            }
            const patch: Record<string, unknown> = {};
            if (row.risiko) patch.risiko = row.risiko;
            if (jenis) patch.jenisRisikoId = jenis.id;
            if (sumber) patch.sumberRisikoId = sumber.id;
            if (kategori) patch.kategoriRisikoId = kategori.id;
            if (area) patch.areaDampakId = area.id;
            if (row.penyebab) patch.penyebab = row.penyebab;
            if (row.dampak) patch.dampak = row.dampak;
            if (sasaran) patch.sasaranId = sasaran.id;
            if (kegiatan) {
              patch.kegiatanId = kegiatan.id;
              if (kegiatan.unitKerjaId !== null) patch.unitKerjaId = kegiatan.unitKerjaId;
            }
            if (prosesBisnis) patch.prosesBisnisId = prosesBisnis.id;
            const parsed = updateIdentifikasiRisikoSchema.safeParse(patch);
            if (!parsed.success) {
              throw new Error(
                "Validasi gagal: " +
                  parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
              );
            }
            identData = await tx.identifikasiRisiko.update({
              where: { id: existing.id },
              data: parsed.data,
            });
            identId = existing.id;
          }

          // --- analisis (conditional) ---
          if (rowHasAnalisis(row)) {
            const existing = await tx.analisisRisiko.findUnique({
              where: { identifikasiRisikoId: identId },
            });
            const lk = row.lvlKemungkinan
              ? resolve(lkMap, row.lvlKemungkinan, "Lvl Kemungkinan", false)
              : null;
            const ld = row.lvlDampak
              ? resolve(ldMap, row.lvlDampak, "Lvl Dampak", false)
              : null;
            const efektivitas = row.efektivitas
              ? normalizeEfektivitas(row.efektivitas)
              : null;
            if (row.efektivitas && !efektivitas) {
              throw new Error(
                `Efektivitas '${row.efektivitas}' tidak valid (gunakan: efektif/cukup_efektif/kurang_efektif/tidak_efektif)`
              );
            }

            const finalLkId = lk?.id ?? existing?.levelKemungkinanId ?? null;
            const finalLdId = ld?.id ?? existing?.levelDampakId ?? null;
            const derivedLevelRisikoId =
              finalLkId && finalLdId
                ? matriksByPair.get(`${finalLkId}-${finalLdId}`) ?? null
                : null;

            if (existing) {
              const patch: Record<string, unknown> = {};
              if (lk) patch.levelKemungkinanId = lk.id;
              if (ld) patch.levelDampakId = ld.id;
              if (derivedLevelRisikoId) patch.levelRisikoId = derivedLevelRisikoId;
              if (row.pengendalian) patch.pengendalianUraian = row.pengendalian;
              if (efektivitas) patch.pengendalianEfektivitas = efektivitas;
              const parsed = updateAnalisisRisikoSchema.safeParse(patch);
              if (!parsed.success) {
                throw new Error("Validasi analisis gagal: " +
                  parsed.error.issues.map((i) => i.message).join("; "));
              }
              await tx.analisisRisiko.update({
                where: { id: existing.id },
                data: parsed.data,
              });
            } else {
              const payload = {
                identifikasiRisikoId: identId,
                levelKemungkinanId: lk?.id ?? null,
                levelDampakId: ld?.id ?? null,
                levelRisikoId: derivedLevelRisikoId,
                pengendalianUraian: row.pengendalian || null,
                pengendalianEfektivitas: efektivitas,
              };
              const parsed = createAnalisisRisikoSchema.safeParse(stripNulls(payload));
              if (!parsed.success) {
                throw new Error("Validasi analisis gagal: " +
                  parsed.error.issues.map((i) => i.message).join("; "));
              }
              await tx.analisisRisiko.create({ data: parsed.data });
            }
          }

          // --- evaluasi (conditional) ---
          if (rowHasEvaluasi(row)) {
            const respon = normalizeRespons(row.respon);
            if (!respon) {
              throw new Error(
                `Respons '${row.respon}' tidak valid (gunakan: Mengurangi/Mengalihkan/Menghindari/Menerima Risiko)`
              );
            }
            const existing = await tx.evaluasiRisiko.findUnique({
              where: { identifikasiRisikoId: identId },
            });
            if (existing) {
              const parsed = updateEvaluasiRisikoSchema.safeParse({ responRisiko: respon });
              if (!parsed.success) {
                throw new Error("Validasi evaluasi gagal");
              }
              await tx.evaluasiRisiko.update({
                where: { id: existing.id },
                data: parsed.data,
              });
            } else {
              const parsed = createEvaluasiRisikoSchema.safeParse({
                identifikasiRisikoId: identId,
                responRisiko: respon,
              });
              if (!parsed.success) {
                throw new Error("Validasi evaluasi gagal");
              }
              await tx.evaluasiRisiko.create({ data: parsed.data });
            }
          }

          // --- rencana penanganan (conditional) ---
          if (rowHasRencana(row)) {
            const existing = await tx.rencanaPenanganan.findUnique({
              where: { identifikasiRisikoId: identId },
            });

            const residualLkName = row.residualKemungkinan || row.kemungkinanResidualHarapan;
            const residualLdName = row.residualDampak || row.dampakResidualHarapan;
            const residualLk = residualLkName
              ? resolve(lkMap, residualLkName, "Level Kemungkinan (Residual)", false)
              : null;
            const residualLd = residualLdName
              ? resolve(ldMap, residualLdName, "Level Dampak (Residual)", false)
              : null;
            const keterjadian = row.keterjadianRisiko
              ? normalizeKeterjadian(row.keterjadianRisiko)
              : null;
            if (row.keterjadianRisiko && !keterjadian) {
              throw new Error("Keterjadian Risiko harus 'Terjadi' atau 'Tidak Terjadi'");
            }

            const patch: Record<string, unknown> = {};
            if (row.rencanaPenanganan) patch.rencanaTidakPenanganan = row.rencanaPenanganan;
            if (row.targetWaktu) patch.targetWaktu = row.targetWaktu;
            if (row.targetOutput) patch.targetOutput = row.targetOutput;
            if (row.penanggungJawab) patch.penanggungJawab = row.penanggungJawab;
            if (keterjadian) patch.keterjadiRisiko = keterjadian;
            if (row.realisasiWaktu) patch.realisasiWaktu = row.realisasiWaktu;
            if (row.realisasiOutput) patch.realisasiOutput = row.realisasiOutput;
            if (residualLk) patch.residualLevelKemungkinanId = residualLk.id;
            if (residualLd) patch.residualLevelDampakId = residualLd.id;

            if (existing) {
              const parsed = updateRencanaPenangananSchema.safeParse(patch);
              if (!parsed.success) {
                throw new Error("Validasi rencana penanganan gagal: " +
                  parsed.error.issues.map((i) => i.message).join("; "));
              }
              await tx.rencanaPenanganan.update({
                where: { id: existing.id },
                data: parsed.data,
              });
            } else {
              const payload = { identifikasiRisikoId: identId, ...patch };
              const parsed = createRencanaPenangananSchema.safeParse(payload);
              if (!parsed.success) {
                throw new Error("Validasi rencana penanganan gagal: " +
                  parsed.error.issues.map((i) => i.message).join("; "));
              }
              // persetujuan never imported; zod default sets "Draft"
              await tx.rencanaPenanganan.create({ data: parsed.data });
            }
          }

          return { identId, identData, isNew };
        });

        // Audit + embedding (outside the row transaction)
        const embeddingText = [
          result.identData.risiko,
          result.identData.penyebab,
          result.identData.dampak,
        ]
          .filter(Boolean)
          .join(". ");
        embeddingQueue.push({ id: result.identId, text: embeddingText });

        await logAudit({
          userId,
          userName,
          action: result.isNew ? "CREATE" : "UPDATE",
          resource: "IdentifikasiRisiko",
          resourceId: result.identId,
          details: { source: "excel-import", row: row.rowNumber },
          ipAddress,
          userAgent,
        });

        results.push({
          row: row.rowNumber,
          status: result.isNew ? "created" : "updated",
          risiko: result.identData.risiko,
        });
      } catch (error: any) {
        results.push({
          row: row.rowNumber,
          status: "failed",
          risiko: row.risiko || (row.idSistem !== null ? `ID ${row.idSistem}` : ""),
          error: error?.message?.toString() || "Unknown error",
        });
      }
    }

    // Fire-and-forget embeddings (same behavior as the single POST route)
    Promise.allSettled(
      embeddingQueue.map(({ id, text }) => generateAndStoreEmbedding(id, text))
    ).catch(() => {});

    const created = results.filter((r) => r.status === "created").length;
    const updated = results.filter((r) => r.status === "updated").length;
    const failed = results.filter((r) => r.status === "failed").length;

    await logAudit({
      userId,
      userName,
      action: "UPLOAD",
      resource: "IdentifikasiRisiko",
      details: {
        type: "excel-import",
        fileName,
        total: results.length,
        created,
        updated,
        failed,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      total: results.length,
      created,
      updated,
      failed,
      details: results,
    });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
