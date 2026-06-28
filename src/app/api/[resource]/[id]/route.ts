import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resourceMap } from "@/lib/resource-map";
import { logAudit } from "@/lib/audit-log";
import { cookies } from "next/headers";
import { checkPermission } from "@/lib/access-control";

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
  const model = resourceMap[resource];
  const isAllowed = await checkPermission(model || resource, "read");
  if (!isAllowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
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

    const { resource, id } = await params;
    const model = resourceMap[resource];
    const isAllowed = await checkPermission(model || resource, "update");
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const body = await request.json();
    const delegate = getDelegate(resource);
    let item;
    
    if (resource === "roles") {
      // Custom update logic for roles to map permissions array
      const { permissions: permIds, ...rest } = body;
      
      const updateData: any = { ...rest };
      if (permIds !== undefined) {
        updateData.permissions = {
          deleteMany: {},
          createMany: {
            data: permIds.map((pId: number) => ({
              permissionId: pId,
            })),
          },
        };
      }
      
      item = await delegate.update({
        where: { id: Number(id) },
        data: updateData,
      });
    } else if (resource === "users") {
      // Custom update logic for users overrides
      const { permissions: overrides, ...rest } = body;
      
      const updateData: any = { ...rest };
      if (overrides !== undefined) {
        updateData.permissions = {
          deleteMany: {},
          createMany: {
            data: overrides.map((o: { permissionId: number; value: string }) => ({
              permissionId: o.permissionId,
              value: o.value,
            })),
          },
        };
      }
      
      item = await delegate.update({
        where: { id: Number(id) },
        data: updateData,
      });
    } else {
      item = await delegate.update({
        where: { id: Number(id) },
        data: body,
      });
    }

    // Log audit
    await logAudit({
      userId,
      userName,
      action: "UPDATE",
      resource: resourceMap[resource] || resource,
      resourceId: id,
      details: body,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json(item);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
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

    const { resource, id } = await params;
    const model = resourceMap[resource];
    const isAllowed = await checkPermission(model || resource, "delete");
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const delegate = getDelegate(resource);
    const item = await delegate.delete({ where: { id: Number(id) } });

    // Log audit
    await logAudit({
      userId,
      userName,
      action: "DELETE",
      resource: resourceMap[resource] || resource,
      resourceId: id,
      details: item,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json(item);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
