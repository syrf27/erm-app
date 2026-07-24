import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/embedding";

const SELECT_FIELDS = `SELECT
  ir.id,
  ir.risiko,
  ir.penyebab,
  ir.dampak,
  ir.tahun,
  ir."jenisRisikoId" as jenis_risiko_id,
  jr.nama as jenis_risiko_nama,
  ir."sumberRisikoId" as sumber_risiko_id,
  sr.nama as sumber_risiko_nama,
  ir."kategoriRisikoId" as kategori_risiko_id,
  kr.nama as kategori_risiko_nama,
  ir."areaDampakId" as area_dampak_id,
  ad.nama as area_dampak_nama,
  ir."sasaranId" as sasaran_id,
  s.nama as sasaran_nama,
  ir."kegiatanId" as kegiatan_id,
  k.nama as kegiatan_nama,
  ir."prosesBisnisId" as proses_bisnis_id,
  pb.nama as proses_bisnis_nama,
  ir."unitKerjaId" as unit_kerja_id,
  uk.nama as unit_kerja_nama`;

const FROM_JOINS = `FROM "IdentifikasiRisiko" ir
  LEFT JOIN "JenisRisiko" jr ON jr.id = ir."jenisRisikoId"
  LEFT JOIN "SumberRisiko" sr ON sr.id = ir."sumberRisikoId"
  LEFT JOIN "KategoriRisiko" kr ON kr.id = ir."kategoriRisikoId"
  LEFT JOIN "AreaDampak" ad ON ad.id = ir."areaDampakId"
  LEFT JOIN "Sasaran" s ON s.id = ir."sasaranId"
  LEFT JOIN "Kegiatan" k ON k.id = ir."kegiatanId"
  LEFT JOIN "ProsesBisnis" pb ON pb.id = ir."prosesBisnisId"
  LEFT JOIN "UnitKerja" uk ON uk.id = ir."unitKerjaId"`;

async function doTextSearch(
  searchText: string,
  tahun: number | undefined,
  limit: number
) {
  const safeLimit = Number(limit);

  const hasTrgm = await prisma.$queryRaw<
    Array<{ exists: boolean }>
  >`SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') as exists`;

  if (hasTrgm?.[0]?.exists) {
    const escaped = searchText.replace(/'/g, "''");
    let results: any[];
    if (tahun) {
      results = await prisma.$queryRawUnsafe(`
        ${SELECT_FIELDS},
        GREATEST(
          similarity(ir.risiko, '${escaped}'),
          similarity(COALESCE(ir.penyebab, ''), '${escaped}'),
          similarity(COALESCE(ir.dampak, ''), '${escaped}')
        ) AS similarity
        ${FROM_JOINS}
        WHERE ir.tahun = ${Number(tahun)}
          AND (
            similarity(ir.risiko, '${escaped}') > 0.05
            OR similarity(COALESCE(ir.penyebab, ''), '${escaped}') > 0.05
            OR similarity(COALESCE(ir.dampak, ''), '${escaped}') > 0.05
            OR ir.risiko ILIKE '%${escaped}%'
            OR ir.penyebab ILIKE '%${escaped}%'
            OR ir.dampak ILIKE '%${escaped}%'
          )
        ORDER BY similarity DESC
        LIMIT ${safeLimit}
      `) as any[];
    } else {
      results = await prisma.$queryRawUnsafe(`
        ${SELECT_FIELDS},
        GREATEST(
          similarity(ir.risiko, '${escaped}'),
          similarity(COALESCE(ir.penyebab, ''), '${escaped}'),
          similarity(COALESCE(ir.dampak, ''), '${escaped}')
        ) AS similarity
        ${FROM_JOINS}
        WHERE (
          similarity(ir.risiko, '${escaped}') > 0.05
          OR similarity(COALESCE(ir.penyebab, ''), '${escaped}') > 0.05
          OR similarity(COALESCE(ir.dampak, ''), '${escaped}') > 0.05
          OR ir.risiko ILIKE '%${escaped}%'
          OR ir.penyebab ILIKE '%${escaped}%'
          OR ir.dampak ILIKE '%${escaped}%'
        )
        ORDER BY similarity DESC
        LIMIT ${safeLimit}
      `) as any[];
    }
    return { results, method: "trgm" };
  }

  const escapedText = searchText.replace(/'/g, "''");
  let results: any[];
  if (tahun) {
    results = await prisma.$queryRawUnsafe(`
      ${SELECT_FIELDS},
      0::float AS similarity
      ${FROM_JOINS}
      WHERE (
        ir.risiko ILIKE '%${escapedText}%'
        OR ir.penyebab ILIKE '%${escapedText}%'
        OR ir.dampak ILIKE '%${escapedText}%'
      )
      AND ir.tahun = ${Number(tahun)}
      ORDER BY ir.id DESC
      LIMIT ${safeLimit}
    `) as any[];
  } else {
    results = await prisma.$queryRawUnsafe(`
      ${SELECT_FIELDS},
      0::float AS similarity
      ${FROM_JOINS}
      WHERE (
        ir.risiko ILIKE '%${escapedText}%'
        OR ir.penyebab ILIKE '%${escapedText}%'
        OR ir.dampak ILIKE '%${escapedText}%'
      )
      ORDER BY ir.id DESC
      LIMIT ${safeLimit}
    `) as any[];
  }
  return { results, method: "text" };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 20, tahun } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const searchText = query.trim();

    const hasPgvector = await prisma.$queryRaw<
      Array<{ exists: boolean }>
    >`SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists`;

    if (hasPgvector?.[0]?.exists) {
      try {
        const hasEmbeddings = await prisma.$queryRaw<
          Array<{ count: bigint }>
        >`SELECT COUNT(*) as count FROM risk_embeddings`;

        if (Number(hasEmbeddings[0].count) > 0) {
          const queryEmbedding = await generateEmbedding(searchText);
          const queryVectorStr = `[${queryEmbedding.join(",")}]`;
          const safeLimit = Number(limit);

          let results: any[];
          if (tahun) {
            results = await prisma.$queryRawUnsafe(`
              ${SELECT_FIELDS},
              1 - (re.embedding <=> '${queryVectorStr}'::vector) AS similarity
              ${FROM_JOINS}
              JOIN risk_embeddings re ON re.identifikasi_risiko_id = ir.id
              WHERE ir.tahun = ${Number(tahun)}
              ORDER BY similarity DESC
              LIMIT ${safeLimit}
            `) as any[];
          } else {
            results = await prisma.$queryRawUnsafe(`
              ${SELECT_FIELDS},
              1 - (re.embedding <=> '${queryVectorStr}'::vector) AS similarity
              ${FROM_JOINS}
              JOIN risk_embeddings re ON re.identifikasi_risiko_id = ir.id
              ORDER BY similarity DESC
              LIMIT ${safeLimit}
            `) as any[];
          }

          return NextResponse.json({ results, method: "semantic" });
        }
      } catch (e: any) {
        console.error("Semantic search failed, falling back:", e.message);
      }
    }

    const textResult = await doTextSearch(searchText, tahun, limit);
    return NextResponse.json(textResult);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Search failed" },
      { status: 500 }
    );
  }
}
