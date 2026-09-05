import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/access-control";
import { generateEmbedding } from "@/lib/embedding";

type RepositorySearchMethod = "browse" | "semantic" | "text";

interface UnifiedRepositoryDocument {
  id: string;
  title: string;
  url: string;
  category: string;
  tahun: number;
  uploader: string;
  summary: string | null;
  createdAt: Date;
  relatedRisk?: string;
  similarity?: number;
  searchMethod?: RepositorySearchMethod;
  matchReason?: string;
  matchScore?: number;
  extractedText?: string | null;
}

function stripSearchOnlyFields(doc: UnifiedRepositoryDocument, searchMethod?: RepositorySearchMethod) {
  const { extractedText, ...publicDoc } = doc;
  return {
    ...publicDoc,
    searchMethod: publicDoc.searchMethod ?? searchMethod,
  };
}

function applyRepositoryFilters(
  docs: UnifiedRepositoryDocument[],
  tahunVal: string | null,
  category: string
) {
  let filteredDocs = docs;

  if (tahunVal) {
    const yearInt = parseInt(tahunVal, 10);
    if (!isNaN(yearInt)) {
      filteredDocs = filteredDocs.filter((f) => f.tahun === yearInt);
    }
  }

  if (category) {
    filteredDocs = filteredDocs.filter((f) => f.category === category);
  }

  return filteredDocs;
}

function createSnippet(value: string | null | undefined, search: string) {
  if (!value) return "";
  const compactValue = value.replace(/\s+/g, " ").trim();
  const lowerValue = compactValue.toLowerCase();
  const firstTerm = search
    .toLowerCase()
    .split(/\s+/)
    .find(Boolean);
  const matchIndex = firstTerm ? lowerValue.indexOf(firstTerm) : -1;
  const start = matchIndex > 40 ? matchIndex - 40 : 0;
  const snippet = compactValue.slice(start, start + 150);
  return `${start > 0 ? "..." : ""}${snippet}${start + 150 < compactValue.length ? "..." : ""}`;
}

function getTextMatchReason(doc: UnifiedRepositoryDocument, search: string) {
  const matchedFields: string[] = [];

  if (doc.title.toLowerCase().includes(search)) matchedFields.push("judul dokumen");
  if (doc.uploader.toLowerCase().includes(search)) matchedFields.push("uploader");
  if (doc.relatedRisk?.toLowerCase().includes(search)) matchedFields.push("risiko terkait");
  if (doc.summary?.toLowerCase().includes(search)) matchedFields.push("ringkasan AI");
  if (doc.extractedText?.toLowerCase().includes(search)) matchedFields.push("isi dokumen");

  if (matchedFields.length > 0) {
    const source = matchedFields.slice(0, 3).join(", ");
    const snippet = createSnippet(doc.summary || doc.extractedText || doc.relatedRisk, search);
    return snippet ? `Cocok pada ${source}: "${snippet}"` : `Cocok pada ${source}.`;
  }

  return "Cocok dengan kata kunci pada metadata dokumen.";
}

function withSemanticReasons(docs: UnifiedRepositoryDocument[]) {
  return docs.map((doc) => {
    const score = Math.max(0, Math.min(100, Math.round(Number(doc.similarity ?? 0) * 100)));
    const basis = doc.summary
      ? "ringkasan AI"
      : doc.relatedRisk
      ? "risiko terkait"
      : "isi dokumen yang sudah diindeks";
    const snippet = createSnippet(doc.summary || doc.relatedRisk, "");

    return {
      ...doc,
      searchMethod: "semantic" as const,
      matchScore: score,
      matchReason: snippet
        ? `Direkomendasikan karena makna pencarian mirip dengan ${basis}: "${snippet}"`
        : `Direkomendasikan karena makna pencarian mirip dengan ${basis}.`,
    };
  });
}

function doTextSearch(docs: UnifiedRepositoryDocument[], search: string) {
  if (!search) return docs;
  const terms = search
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  return docs.reduce<UnifiedRepositoryDocument[]>((results, doc) => {
    const haystack = [
      doc.title,
      doc.uploader,
      doc.relatedRisk,
      doc.summary,
      doc.extractedText,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (terms.every((term) => haystack.includes(term))) {
      results.push({
        ...doc,
        searchMethod: "text",
        matchScore: undefined,
        matchReason: getTextMatchReason(doc, search),
      });
    }

    return results;
  }, []);
}

async function canUseDocumentSemanticSearch() {
  const [hasPgvector, hasTable] = await Promise.all([
    prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') as exists
    `,
    prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'document_embeddings'
      ) as exists
    `,
  ]);

  if (!hasPgvector?.[0]?.exists || !hasTable?.[0]?.exists) return false;

  const embeddingCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM document_embeddings
  `;

  return Number(embeddingCount?.[0]?.count ?? 0) > 0;
}

async function findDocumentsBySemanticSearch(
  search: string,
  tahunVal: string | null,
  category: string
): Promise<UnifiedRepositoryDocument[]> {
  const queryEmbedding = await generateEmbedding(search, "query");
  const queryVector = `[${queryEmbedding.join(",")}]`;
  const conditions: string[] = [];
  const params: unknown[] = [queryVector];

  if (tahunVal) {
    const yearInt = parseInt(tahunVal, 10);
    if (!isNaN(yearInt)) {
      params.push(yearInt);
      conditions.push(`tahun = $${params.length}`);
    }
  }

  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return prisma.$queryRawUnsafe<UnifiedRepositoryDocument[]>(
    `
      SELECT *
      FROM (
        SELECT
          CONCAT('manual-', r.id) AS id,
          r.title,
          r.url,
          r.category,
          r.tahun,
          r.uploader,
          r.summary,
          r."createdAt",
          NULL::text AS "relatedRisk",
          1 - (de.embedding <=> $1::vector) AS similarity
        FROM "Repositori" r
        JOIN document_embeddings de
          ON de.document_type = 'manual'
          AND de.document_id = r.id

        UNION ALL

        SELECT
          CONCAT('bukti-', d.id) AS id,
          d.title,
          d.url,
          'bukti_dukung' AS category,
          COALESCE(ir.tahun, 2026) AS tahun,
          COALESCE(rp."penanggungJawab", 'Tim Mitigasi') AS uploader,
          d.summary,
          d."createdAt",
          COALESCE(ir.risiko, '') AS "relatedRisk",
          1 - (de.embedding <=> $1::vector) AS similarity
        FROM "DokumenPendukung" d
        JOIN "RencanaPenanganan" rp ON rp.id = d."rencanaPenangananId"
        LEFT JOIN "IdentifikasiRisiko" ir ON ir.id = rp."identifikasiRisikoId"
        JOIN document_embeddings de
          ON de.document_type = 'bukti'
          AND de.document_id = d.id
      ) docs
      ${whereClause}
      ORDER BY similarity DESC, "createdAt" DESC
      LIMIT 50
    `,
    ...params
  );
}

export async function GET(request: NextRequest) {
  try {
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Enforce authorization check for repositori resource
    const isAllowed = await checkPermission("repositori", "read", { ipAddress, userAgent });
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const tahunVal = searchParams.get("tahun");
    const category = searchParams.get("category") || "";

    let searchMethod: RepositorySearchMethod = "browse";

    if (search) {
      try {
        if (await canUseDocumentSemanticSearch()) {
          const semanticDocs = await findDocumentsBySemanticSearch(search, tahunVal, category);
          if (semanticDocs.length > 0) {
            searchMethod = "semantic";
            return NextResponse.json(withSemanticReasons(semanticDocs).map((doc) => stripSearchOnlyFields(doc, searchMethod)), {
              headers: { "x-repository-search-method": searchMethod },
            });
          }
        }
      } catch (semanticError: any) {
        console.error("Repository semantic search failed, falling back to text search:", semanticError?.message);
      }
    }

    // 1. Fetch manual repository uploads
    const manualDocs = await prisma.repositori.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch dynamic mitigation bukti dukung files
    const buktiDocs = await prisma.dokumenPendukung.findMany({
      include: {
        rencanaPenanganan: {
          include: {
            identifikasiRisiko: {
              select: {
                risiko: true,
                tahun: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Map manual docs to unified interface
    const manualMapped: UnifiedRepositoryDocument[] = manualDocs.map((d) => ({
      id: `manual-${d.id}`,
      title: d.title,
      url: d.url,
      category: d.category, // "pedoman" | "laporan"
      tahun: d.tahun,
      uploader: d.uploader,
      summary: d.summary,
      extractedText: d.extractedText,
      createdAt: d.createdAt,
    }));

    // 4. Map bukti dukung docs to unified interface
    const buktiMapped: UnifiedRepositoryDocument[] = buktiDocs.map((d) => ({
      id: `bukti-${d.id}`,
      title: d.title,
      url: d.url,
      category: "bukti_dukung",
      tahun: d.rencanaPenanganan?.identifikasiRisiko?.tahun ?? 2026,
      uploader: d.rencanaPenanganan?.penanggungJawab ?? "Tim Mitigasi",
      summary: d.summary,
      extractedText: d.extractedText,
      createdAt: d.createdAt,
      relatedRisk: d.rencanaPenanganan?.identifikasiRisiko?.risiko || "",
    }));

    // 5. Combine lists
    let combined: UnifiedRepositoryDocument[] = [...manualMapped, ...buktiMapped];

    // 6. Apply filter parameters
    combined = applyRepositoryFilters(combined, tahunVal, category);

    if (search) {
      searchMethod = "text";
      combined = doTextSearch(combined, search);
    }

    // Sort by creation date descending
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(combined.map((doc) => stripSearchOnlyFields(doc, searchMethod)), {
      headers: { "x-repository-search-method": searchMethod },
    });
  } catch (error: any) {
    console.error("Error in custom-repository GET:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
