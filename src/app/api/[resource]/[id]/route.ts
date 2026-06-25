import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resourceMap } from "@/lib/resource-map";

function getDelegate(resource: string) {
  const model = resourceMap[resource];
  if (!model) throw new Error(`Unknown resource: ${resource}`);
  const delegate = (prisma as any)[model];
  if (!delegate) throw new Error(`Prisma model not found: ${model}`);
  return delegate;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await params;
  const delegate = getDelegate(resource);
  const item = await delegate.findUnique({ where: { id: Number(id) } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await params;
  const body = await request.json();
  const delegate = getDelegate(resource);
  const item = await delegate.update({
    where: { id: Number(id) },
    data: body,
  });
  return NextResponse.json(item);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await params;
  const delegate = getDelegate(resource);
  const item = await delegate.delete({ where: { id: Number(id) } });
  return NextResponse.json(item);
}
