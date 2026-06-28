import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resourceMap, includeMap } from "@/lib/resource-map";
import { logAudit } from "@/lib/audit-log";
import { cookies } from "next/headers";
import { checkPermission } from "@/lib/access-control";

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
    const isAllowed = await checkPermission(model || resource, "read");
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);

    const ids = searchParams.getAll("id");
    if (ids.length > 0) {
      const delegate = getDelegate(resource);
      const data = await delegate.findMany({
        where: { id: { in: ids.map(Number) } },
      });
      return NextResponse.json(data);
    }

    const _start = parseInt(searchParams.get("_start") ?? "0");
    const _end = parseInt(searchParams.get("_end") ?? "10");
    const _sort = searchParams.get("_sort") ?? "id";
    const _order = searchParams.get("_order") ?? "asc";
    const take = _end - _start;

    const delegate = getDelegate(resource);
    const include = includeMap[resource];
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
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
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
    const isAllowed = await checkPermission(model || resource, "create");
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const body = await request.json();
    const delegate = getDelegate(resource);
    const item = await delegate.create({ data: body });

    // Log audit
    await logAudit({
      userId,
      userName,
      action: "CREATE",
      resource: resourceMap[resource] || resource,
      resourceId: item.id,
      details: body,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
