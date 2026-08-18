import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/embedding";
import { checkPermission } from "@/lib/access-control";

const SELECT_FIELDS = `
  SELECT
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

const FROM_JOINS = `
  FROM "IdentifikasiRisiko" ir
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
  const searchPattern = `%${searchText}%`;

  const hasTrgm = await prisma.$queryRaw<
    Array<{ exists: boolean }>
  >`SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') as exists`;

  if (hasTrgm?.[0]?.exists) {
    // Use parameterized query with pg_trgm similarity
    if (tahun) {
      const query = `
        ${SELECT_FIELDS},
        GREATEST(
          similarity(ir.risiko, $1),
          similarity(COALESCE(ir.penyebab, ''), $1),
          similarity(COALESCE(ir.dampak, ''), $1)
        ) AS similarity
        ${FROM_JOINS}
        WHERE ir.tahun = $2
          AND (
            similarity(ir.risiko, $1) > 0.05
            OR similarity(COALESCE(ir.penyebab, ''), $1) > 0.05
            OR similarity(COALESCE(ir.dampak, ''), $1) > 0.05
            OR ir.risiko ILIKE $3
            OR ir.penyebab ILIKE $3
            OR ir.dampak ILIKE $3
          )
        ORDER BY similarity DESC
        LIMIT $4
      `;
      const results = await prisma.$queryRawUnsafe(
        query,
        searchText,
        Number(tahun),
        searchPattern,
        safeLimit
      );
      return { results, method: "trgm" };
    } else {
      const query = `
        ${SELECT_FIELDS},
        GREATEST(
          similarity(ir.risiko, $1),
          similarity(COALESCE(ir.penyebab, ''), $1),
          similarity(COALESCE(ir.dampak, ''), $1)
        ) AS similarity
        ${FROM_JOINS}
        WHERE (
          similarity(ir.risiko, $1) > 0.05
          OR similarity(COALESCE(ir.penyebab, ''), $1) > 0.05
          OR similarity(COALESCE(ir.dampak, ''), $1) > 0.05
          OR ir.risiko ILIKE $2
          OR ir.penyebab ILIKE $2
          OR ir.dampak ILIKE $2
        )
        ORDER BY similarity DESC
        LIMIT $3
      `;
      const results = await prisma.$queryRawUnsafe(
        query,
        searchText,
        searchPattern,
        safeLimit
      );
      return { results, method: "trgm" };
    }
  }

  // Fallback to plain ILIKE without pg_trgm
  if (tahun) {
    const query = `
      ${SELECT_FIELDS},
      0::float AS similarity
      ${FROM_JOINS}
      WHERE (
        ir.risiko ILIKE $1
        OR ir.penyebab ILIKE $1
        OR ir.dampak ILIKE $1
      )
      AND ir.tahun = $2
      ORDER BY ir.id DESC
      LIMIT $3
    `;
    const results = await prisma.$queryRawUnsafe(
      query,
      searchPattern,
      Number(tahun),
      safeLimit
    );
    return { results, method: "text" };
  } else {
    const query = `
      ${SELECT_FIELDS},
      0::float AS similarity
      ${FROM_JOINS}
      WHERE (
        ir.risiko ILIKE $1
        OR ir.penyebab ILIKE $1
        OR ir.dampak ILIKE $1
      )
      ORDER BY ir.id DESC
      LIMIT $2
    `;
    const results = await prisma.$queryRawUnsafe(
      query,
      searchPattern,
      safeLimit
    );
    return { results, method: "text" };
  }
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

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const isAllowed = await checkPermission("identifikasi-risiko", "read", { ipAddress, userAgent });
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const hasPgvector = await prisma.$queryRaw<
      Array<{ exists: boolean }>
    >`SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists`;

    if (hasPgvector?.[0]?.exists) {
      try {
        const hasEmbeddings = await prisma.$queryRaw<
          Array<{ count: bigint }>
        >`SELECT COUNT(*) as count FROM risk_embeddings`;

        if (Number(hasEmbeddings[0].count) > 0) {
          const queryEmbedding = await generateEmbedding(searchText, "query");
          const queryVectorStr = `[${queryEmbedding.join(",")}]`;
          const safeLimit = Number(limit);

          let results: any[];
          if (tahun) {
            const query = `
              ${SELECT_FIELDS},
              1 - (re.embedding <=> $1::vector) AS similarity
              ${FROM_JOINS}
              JOIN risk_embeddings re ON re.identifikasi_risiko_id = ir.id
              WHERE ir.tahun = $2
              ORDER BY similarity DESC
              LIMIT $3
            `;
            results = await prisma.$queryRawUnsafe(query, queryVectorStr, Number(tahun), safeLimit);
          } else {
            const query = `
              ${SELECT_FIELDS},
              1 - (re.embedding <=> $1::vector) AS similarity
              ${FROM_JOINS}
              JOIN risk_embeddings re ON re.identifikasi_risiko_id = ir.id
              ORDER BY similarity DESC
              LIMIT $2
            `;
            results = await prisma.$queryRawUnsafe(query, queryVectorStr, safeLimit);
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
    console.error("Search error:", e);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}