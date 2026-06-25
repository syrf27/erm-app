import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resourceMap, includeMap } from "@/lib/resource-map";

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
    const { resource } = await params;
    const body = await request.json();
    const delegate = getDelegate(resource);
    const item = await delegate.create({ data: body });
    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
