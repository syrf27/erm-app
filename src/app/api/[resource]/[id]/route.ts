import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resourceMap } from "@/lib/resource-map";
import { logAudit } from "@/lib/audit-log";
import { cookies } from "next/headers";
import { checkPermission, checkRecordPermission, getUserPermissions, canGrantPermissions } from "@/lib/access-control";
import { generateAndStoreEmbedding } from "@/lib/embedding";
import {
  delCache,
  delCacheByPattern,
  isReferenceResource,
  shouldInvalidateDashboard,
  isAuthResource,
} from "@/lib/cache";
import {
  updateIdentifikasiRisikoSchema,
  updateSasaranSchema,
  updateKegiatanSchema,
  updateProsesBisnisSchema,
  updateUnitKerjaSchema,
  updateReferenceSchema,
  updateUserSchema,
  updateRoleSchema,
  updateAnalisisRisikoSchema,
  updateEvaluasiRisikoSchema,
  updateRencanaPenangananSchema,
  updateKRISchema,
} from "@/lib/validators";
import { ZodError } from "zod";

function getDelegate(resource: string) {
  const model = resourceMap[resource];
  if (!model) throw new Error(`Unknown resource: ${resource}`);
  const delegate = (prisma as any)[model];
  if (!delegate) throw new Error(`Prisma model not found: ${model}`);
  return delegate;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const { resource, id } = await params;
  const model = resourceMap[resource];
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const isAllowed = await checkRecordPermission(resource, "read", Number(id), { ipAddress, userAgent });
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
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const isAllowed = await checkRecordPermission(resource, "update", Number(id), { ipAddress, userAgent });
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const body = await request.json();
    let validatedData: any;

    try {
      switch (resource) {
        case "identifikasi-risiko":
          validatedData = updateIdentifikasiRisikoSchema.parse(body);
          break;
        case "sasaran":
          validatedData = updateSasaranSchema.parse(body);
          break;
        case "kegiatan":
          validatedData = updateKegiatanSchema.parse(body);
          break;
        case "proses-bisnis":
          validatedData = updateProsesBisnisSchema.parse(body);
          break;
        case "unit-kerja":
          validatedData = updateUnitKerjaSchema.parse(body);
          break;
        case "jenis-risiko":
        case "sumber-risiko":
        case "kategori-risiko":
        case "area-dampak":
        case "opsi-penanganan":
        case "kriteria-dampak":
        case "matriks-risiko":
        case "pemangku-kepentingan":
        case "peraturan-perundangan":
        case "faq":
          validatedData = updateReferenceSchema.parse(body);
          break;
        case "level-kemungkinan":
          validatedData = updateReferenceSchema.parse(body);
          break;
        case "level-dampak":
          validatedData = updateReferenceSchema.parse(body);
          break;
        case "level-risiko":
          validatedData = updateReferenceSchema.parse(body);
          break;
        case "matriks-analisis-risiko":
          validatedData = updateReferenceSchema.parse(body);
          break;
        case "kri":
          validatedData = updateKRISchema.parse(body);
          break;
        case "users":
          validatedData = updateUserSchema.parse(body);
          break;
        case "roles":
          validatedData = updateRoleSchema.parse(body);
          break;
        case "analisis-risiko":
          validatedData = updateAnalisisRisikoSchema.parse(body);
          break;
        case "evaluasi-risiko":
          validatedData = updateEvaluasiRisikoSchema.parse(body);
          break;
        case "rencana-penanganan":
          validatedData = updateRencanaPenangananSchema.parse(body);
          break;
        default:
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
        data: validatedData,
      });
    } else if (resource === "users") {
      // Custom update logic for users overrides and teams many-to-many
      const { permissions: overrides, teamIds, password: rawPassword, ...rest } = validatedData;
      
      // Validate permission hierarchy: admin can only grant permissions they themselves have
      if (overrides !== undefined && userId !== "anonymous") {
        const { canGrantPermissions } = await import("@/lib/access-control");
        const validation = await canGrantPermissions(userId, overrides);
        if (!validation.allowed) {
          return NextResponse.json(
            { error: "Cannot grant permissions you don't possess", invalidPermissions: validation.invalidPermissions },
            { status: 403 }
          );
        }
      }
      
      const updateData: any = { ...rest };
      
      if (rawPassword) {
        const { hashPassword } = await import("@/lib/password-utils");
        updateData.password = hashPassword(rawPassword);
      }

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

      if (teamIds !== undefined && Array.isArray(teamIds)) {
        updateData.teams = {
          deleteMany: {},
          create: teamIds.map((tId: number) => ({
            teamId: tId,
          })),
        };
      }
      
      item = await delegate.update({
        where: { id: Number(id) },
        data: updateData,
      });
    } else if (resource === "rencana-penanganan") {
      const { dokumenPendukungs, ...rest } = body;
      const validatedRtp = updateRencanaPenangananSchema.parse(rest);
      const updateData: any = { ...validatedRtp };
      if (dokumenPendukungs !== undefined && Array.isArray(dokumenPendukungs)) {
        updateData.dokumenPendukungs = {
          deleteMany: {},
          create: dokumenPendukungs.map((d: any) => ({
            title: d.title,
            url: d.url,
          })),
        };
      }
      item = await delegate.update({
        where: { id: Number(id) },
        data: updateData,
      });
    } else {
      item = await delegate.update({
        where: { id: Number(id) },
        data: validatedData,
      });
    }

    // Log audit
    await logAudit({
      userId,
      userName,
      action: "UPDATE",
      resource: resourceMap[resource] || resource,
      resourceId: Number(id),
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

    if (resource === "identifikasi-risiko" && (validatedData.risiko || validatedData.penyebab || validatedData.dampak)) {
      const embeddingText = [
        validatedData.risiko ?? item.risiko,
        validatedData.penyebab ?? item.penyebab,
        validatedData.dampak ?? item.dampak,
      ]
        .filter(Boolean)
        .join(". ");
      await generateAndStoreEmbedding(Number(id), embeddingText).catch((e) =>
        console.error("Embedding update failed for risk", id, e)
      );
    }

    if (resource === "rencana-penanganan" || resource === "pelaporan-risiko") {
      const { sendRtpPushNotification } = await import("@/lib/push-notification");
      sendRtpPushNotification(item.id).catch((e) =>
        console.error("Failed to send push notification on RTP update", e)
      );
    }

    return NextResponse.json(item);
  } catch (e: any) {
    console.error("API PATCH error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
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
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const isAllowed = await checkRecordPermission(resource, "delete", Number(id), { ipAddress, userAgent });
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

    return NextResponse.json(item);
  } catch (e: any) {
    console.error("API DELETE error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
