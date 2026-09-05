import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resourceMap, includeMap } from "@/lib/resource-map";
import { logAudit } from "@/lib/audit-log";
import { cookies } from "next/headers";
import { checkPermission } from "@/lib/access-control";
import { generateAndStoreEmbedding } from "@/lib/embedding";
import {
  getOrSet,
  delCache,
  delCacheByPattern,
  isReferenceResource,
  shouldInvalidateDashboard,
  isAuthResource,
} from "@/lib/cache";
import {
  createIdentifikasiRisikoSchema,
  createSasaranSchema,
  createKegiatanSchema,
  createProsesBisnisSchema,
  createUnitKerjaSchema,
  createReferenceSchema,
  createFaqSchema,
  createLevelKemungkinanSchema,
  createLevelDampakSchema,
  createLevelRisikoSchema,
  createMatriksAnalisisRisikoSchema,
  createSeleraRisikoSchema,
  createSeleraRisikoGlobalSchema,
  createKRISchema,
  createUserSchema,
  createRoleSchema,
  createPermissionSchema,
  createAnalisisRisikoSchema,
  createEvaluasiRisikoSchema,
  createRencanaPenangananSchema,
  createAuditLogSchema,
} from "@/lib/validators";
import { ZodError } from "zod";

// Force recompile to load updated resource map
function getDelegate(resource: string) {
  const model = resourceMap[resource];
  if (!model) throw new Error(`Unknown resource: ${resource}`);
  const delegate = (prisma as any)[model];
  if (!delegate) throw new Error(`Prisma model not found: ${model}`);
  return delegate;
}

function getCacheHeaders(resource: string) {
  if (isReferenceResource(resource)) {
    return {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
    };
  }

  return {
    "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;

    if (resource === "custom-pemantauan-risiko") {
      const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";
      const isAllowed = await checkPermission("rencana-penanganan", "read", { ipAddress, userAgent });
      if (!isAllowed) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      const { searchParams } = new URL(request.url);
      const tahunDari = parseInt(searchParams.get("tahunDari") || "0", 10);
      const tahunSampai = parseInt(searchParams.get("tahunSampai") || "9999", 10);

      const allRisksForYear = await prisma.identifikasiRisiko.findMany({
        where: {
          tahun: {
            gte: tahunDari,
            lte: tahunSampai,
          },
        },
        include: {
          analisisRisiko: {
            include: {
              levelRisiko: true,
              levelKemungkinan: true,
              levelDampak: true,
            },
          },
          evaluasiRisiko: true,
          rencanaPenanganan: {
            include: {
              dokumenPendukungs: true,
            },
          },
        },
      });

      // Calculate besaran inheren (lk.skala * ld.skala) for sorting
      const scoredRisks = allRisksForYear.map((r) => {
        const lkSkala = r.analisisRisiko?.levelKemungkinan?.skala ?? 0;
        const ldSkala = r.analisisRisiko?.levelDampak?.skala ?? 0;
        const besaran = lkSkala * ldSkala;
        return {
          risk: r,
          besaran,
          areaDampakId: r.areaDampakId,
          kategoriRisikoId: r.kategoriRisikoId,
          id: r.id,
        };
      });

      // Sort according to Guidebook rules
      scoredRisks.sort((a, b) => {
        if (b.besaran !== a.besaran) return b.besaran - a.besaran;
        if (b.areaDampakId !== a.areaDampakId) return b.areaDampakId - a.areaDampakId;
        if (b.kategoriRisikoId !== a.kategoriRisikoId) return b.kategoriRisikoId - a.kategoriRisikoId;
        return b.id - a.id;
      });

      // Assign global priority ranks
      const rankedRisks = scoredRisks.map((item, index) => {
        return {
          ...item.risk,
          priorityRank: index + 1,
        };
      });

      // Filter only those that require mitigation (respon: mengurangi)
      const filteredRisks = rankedRisks.filter((r) => {
        const respon = r.evaluasiRisiko?.responRisiko;
        return respon === "mengurangi" || respon === "Mengurangi Risiko";
      });

      return NextResponse.json(filteredRisks);
    }

    const model = resourceMap[resource];
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const isAllowed = await checkPermission(resource, "read", { ipAddress, userAgent });
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);

    const ids = searchParams.getAll("id");
    if (ids.length > 0) {
      const delegate = getDelegate(resource);
      if (isReferenceResource(resource)) {
        const cacheKey = `ref:${resource}:ids:${[...ids].sort().join(",")}`;
        const data = await getOrSet(
          cacheKey,
          () =>
            delegate.findMany({
              where: { id: { in: ids.map(Number) } },
            }),
          3600
        );
        return NextResponse.json(data);
      }
      const data = await delegate.findMany({
        where: { id: { in: ids.map(Number) } },
      });
      return NextResponse.json(data);
    }

    const _start = parseInt(searchParams.get("_start") ?? "0");
    const _end = parseInt(searchParams.get("_end") ?? "10");
    const _sort = searchParams.get("_sort") ?? "id";
    const _order = searchParams.get("_order") ?? "asc";

    const delegate = getDelegate(resource);
    const include = includeMap[resource];

    if (isReferenceResource(resource)) {
      const cacheKey = `ref:${resource}:list`;
      const cached = await getOrSet(
        cacheKey,
        async () => {
          const [total, data] = await Promise.all([
            delegate.count(),
            delegate.findMany({
              orderBy: { [_sort]: _order },
              include,
            }),
          ]);
          return { data, total };
        },
        3600
      );
      return NextResponse.json(cached.data.slice(_start, _end), {
        headers: {
          "x-total-count": String(cached.total),
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      });
    }

    // Build where clause from searchParams filters
    const where: any = {};
    const paramsArray = Array.from(searchParams.entries());
    for (const [key, value] of paramsArray) {
      if (key.startsWith("_") || key === "id") continue;

      if (key.endsWith("_gte")) {
        const field = key.slice(0, -4);
        where[field] = { ...where[field], gte: isNaN(Number(value)) ? value : Number(value) };
      } else if (key.endsWith("_lte")) {
        const field = key.slice(0, -4);
        where[field] = { ...where[field], lte: isNaN(Number(value)) ? value : Number(value) };
      } else if (key.endsWith("_ne")) {
        const field = key.slice(0, -3);
        where[field] = { ...where[field], not: isNaN(Number(value)) ? value : Number(value) };
      } else if (key.endsWith("_like")) {
        const field = key.slice(0, -5);
        where[field] = { ...where[field], contains: value, mode: "insensitive" };
      } else {
        // Exact match
        where[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }

    const take = _end - _start;
    const shouldSkipExactCount =
      searchParams.get("_skipCount") === "true" || take >= 1000;

    const data = await delegate.findMany({
      where,
      skip: _start,
      take,
      orderBy: { [_sort]: _order },
      include,
    });

    const total = shouldSkipExactCount
      ? _start + data.length
      : await delegate.count({ where });

    return NextResponse.json(data, {
      headers: {
        "x-total-count": String(total),
        ...getCacheHeaders(resource),
      },
    });
  } catch (e: any) {
    console.error("API error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
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

    const { resource } = await params;
    const model = resourceMap[resource];
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const isAllowed = await checkPermission(resource, "create", { ipAddress, userAgent });
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Validate input with Zod
    const body = await request.json();
    let validatedData: any;

    try {
      switch (resource) {
        case "identifikasi-risiko":
          validatedData = createIdentifikasiRisikoSchema.parse(body);
          break;
        case "sasaran":
          validatedData = createSasaranSchema.parse(body);
          break;
        case "kegiatan":
          validatedData = createKegiatanSchema.parse(body);
          break;
        case "proses-bisnis":
          validatedData = createProsesBisnisSchema.parse(body);
          break;
        case "unit-kerja":
          validatedData = createUnitKerjaSchema.parse(body);
          break;
        case "jenis-risiko":
        case "sumber-risiko":
        case "kategori-risiko":
        case "area-dampak":
        case "level-risiko":
        case "opsi-penanganan":
        case "kriteria-dampak":
        case "pemangku-kepentingan":
        case "peraturan-perundangan":
          validatedData = createReferenceSchema.parse(body);
          break;
        case "matriks-risiko":
          validatedData = createSeleraRisikoSchema.parse(body);
          break;
        case "faq":
          validatedData = createFaqSchema.parse(body);
          break;
        case "level-kemungkinan":
          validatedData = createLevelKemungkinanSchema.parse(body);
          break;
        case "level-dampak":
          validatedData = createLevelDampakSchema.parse(body);
          break;
        case "level-risiko":
          validatedData = createLevelRisikoSchema.parse(body);
          break;
        case "matriks-analisis-risiko":
          validatedData = createMatriksAnalisisRisikoSchema.parse(body);
          break;
        case "selera-risiko":
          validatedData = createSeleraRisikoGlobalSchema.parse(body);
          break;
        case "kri":
          validatedData = createKRISchema.parse(body);
          break;
        case "users":
          validatedData = createUserSchema.parse(body);
          break;
        case "roles":
          validatedData = createRoleSchema.parse(body);
          break;
        case "permissions":
          validatedData = createPermissionSchema.parse(body);
          break;
        case "analisis-risiko":
          validatedData = createAnalisisRisikoSchema.parse(body);
          break;
        case "evaluasi-risiko":
          validatedData = createEvaluasiRisikoSchema.parse(body);
          break;
        case "rencana-penanganan":
          validatedData = createRencanaPenangananSchema.parse(body);
          break;
        case "audit-logs":
          validatedData = createAuditLogSchema.parse(body);
          break;
        default:
          // For unknown resources, just sanitize but don't validate strictly
          validatedData = body;
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      throw error;
    }

    const delegate = getDelegate(resource);
    let item;
    if (resource === "users") {
      const { teamIds, password: rawPassword, ...rest } = validatedData;
      const { hashPassword } = await import("@/lib/password-utils");
      const hashedPassword = hashPassword(rawPassword);
      const createData: any = {
        ...rest,
        password: hashedPassword,
      };
      if (teamIds && Array.isArray(teamIds)) {
        createData.teams = {
          create: teamIds.map((tId: number) => ({
            teamId: tId,
          })),
        };
      }
      item = await delegate.create({ data: createData });
    } else if (resource === "rencana-penanganan") {
      const { dokumenPendukungs, ...rest } = body;
      const validatedRtp = createRencanaPenangananSchema.parse(rest);
      const createData: any = { ...validatedRtp };
      if (dokumenPendukungs && Array.isArray(dokumenPendukungs)) {
        createData.dokumenPendukungs = {
          create: dokumenPendukungs.map((d: any) => ({
            title: d.title,
            url: d.url,
          })),
        };
      }
      item = await delegate.create({ data: createData });
    } else {
      item = await delegate.create({ data: validatedData });
    }

    // Log audit
    await logAudit({
      userId,
      userName,
      action: "CREATE",
      resource: resourceMap[resource] || resource,
      resourceId: item.id,
      details: validatedData,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    // Invalidate cache
    if (isReferenceResource(resource)) {
      await delCache(`ref:${resource}:list`);
    }
    if (shouldInvalidateDashboard(resource)) {
      await delCache("dashboard:stats");
    }
    if (isAuthResource(resource)) {
      await delCacheByPattern("user:permissions:*");
    }

    if (resource === "identifikasi-risiko" && (validatedData as any).risiko) {
      const embeddingText = [validatedData.risiko, validatedData.penyebab, validatedData.dampak]
        .filter(Boolean)
        .join(". ");
      await generateAndStoreEmbedding(item.id, embeddingText).catch((e) =>
        console.error("Embedding generation failed for risk", item.id, e)
      );
    }

    if (resource === "rencana-penanganan") {
      const { sendRtpPushNotification } = await import("@/lib/push-notification");
      sendRtpPushNotification(item.id).catch((e) =>
        console.error("Failed to send push notification on RTP creation", e)
      );
    }

    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    console.error("API POST error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
