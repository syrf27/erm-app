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
  createLevelKemungkinanSchema,
  createLevelDampakSchema,
  createLevelRisikoSchema,
  createMatriksAnalisisRisikoSchema,
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    const model = resourceMap[resource];
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const isAllowed = await checkPermission(model || resource, "read", { ipAddress, userAgent });
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
        headers: { "x-total-count": String(cached.total) },
      });
    }

    const take = _end - _start;
    const [total, data] = await Promise.all([
      delegate.count(),
      delegate.findMany({
        skip: _start,
        take,
        orderBy: { [_sort]: _order },
        include,
      }),
    ]);

    return NextResponse.json(data, {
      headers: { "x-total-count": String(total) },
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
    const isAllowed = await checkPermission(model || resource, "create", { ipAddress, userAgent });
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
        case "selera-risiko":
        case "pemangku-kepentingan":
        case "peraturan-perundangan":
        case "faq":
          validatedData = createReferenceSchema.parse(body);
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
    const item = await delegate.create({ data: validatedData });

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

    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    console.error("API POST error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
