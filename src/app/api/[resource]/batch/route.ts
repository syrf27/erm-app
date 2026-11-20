import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { resourceMap } from "@/lib/resource-map";
import { checkPermission } from "@/lib/access-control";
import { logAudit } from "@/lib/audit-log";
import { invalidateResourceCache } from "@/lib/cache";
import { generateAndStoreEmbedding } from "@/lib/embedding";
import {
  createIdentifikasiRisikoSchema,
  updateIdentifikasiRisikoSchema,
  createAnalisisRisikoSchema,
  updateAnalisisRisikoSchema,
  createEvaluasiRisikoSchema,
  updateEvaluasiRisikoSchema,
  createRencanaPenangananSchema,
  updateRencanaPenangananSchema,
} from "@/lib/validators";
import { RISK_LINKED_RESOURCES, referencesArchivedRisk } from "@/lib/risk-archive";
import { canAccessRiskIds, getAuthUserContext, isAdminRole } from "@/lib/access-control";
import {
  assertResidualMutable,
  touchesResidual,
} from "@/lib/pemantauan-integrity";
import { DomainError } from "@/lib/domain-error";

const batchSchemas = {
  "identifikasi-risiko": {
    create: createIdentifikasiRisikoSchema,
    update: updateIdentifikasiRisikoSchema,
  },
  "analisis-risiko": {
    create: createAnalisisRisikoSchema,
    update: updateAnalisisRisikoSchema,
  },
  "evaluasi-risiko": {
    create: createEvaluasiRisikoSchema,
    update: updateEvaluasiRisikoSchema,
  },
  "rencana-penanganan": {
    create: createRencanaPenangananSchema,
    update: updateRencanaPenangananSchema,
  },
} as const;

type BatchItem = { id?: number; data: Record<string, unknown> };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    const schemas = batchSchemas[resource as keyof typeof batchSchemas];
    const modelName = resourceMap[resource];
    if (!schemas || !modelName) {
      return NextResponse.json({ error: "Batch resource is not supported" }, { status: 404 });
    }

    const body = await request.json();
    const creates = Array.isArray(body?.creates) ? body.creates as BatchItem[] : [];
    const updates = Array.isArray(body?.updates) ? body.updates as BatchItem[] : [];
    if (creates.length + updates.length === 0 || creates.length + updates.length > 200) {
      return NextResponse.json(
        { error: "Batch must contain between 1 and 200 rows" },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const [canCreate, canUpdate] = await Promise.all([
      creates.length ? checkPermission(resource, "create", { ipAddress, userAgent }) : Promise.resolve(true),
      updates.length ? checkPermission(resource, "update", { ipAddress, userAgent }) : Promise.resolve(true),
    ]);
    if (!canCreate || !canUpdate) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const authContext = await getAuthUserContext();
    if (!authContext) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const validatedCreates = creates.map((item) => schemas.create.parse(item.data));
    const validatedUpdates = updates.map((item) => {
      if (!Number.isInteger(item.id) || Number(item.id) <= 0) {
        throw new Error("Each update row must include a valid id");
      }
      return { id: Number(item.id), data: schemas.update.parse(item.data) };
    });

    if (resource === "identifikasi-risiko" && !isAdminRole(authContext.roleName)) {
      if (authContext.teamIds.length === 0) {
        return NextResponse.json({ error: "Akun belum memiliki Tim Kerja. Hubungi administrator." }, { status: 403 });
      }
      for (const data of validatedCreates as any[]) {
        const requestedTeamId = Number(data.teamId);
        if (requestedTeamId && !authContext.teamIds.includes(requestedTeamId)) {
          return NextResponse.json({ error: "Tim Kerja tidak sesuai dengan akun." }, { status: 403 });
        }
        if (!requestedTeamId && authContext.teamIds.length > 1) {
          return NextResponse.json({ error: "Pilih Tim Kerja untuk setiap risiko baru." }, { status: 400 });
        }
        data.teamId = requestedTeamId || authContext.teamIds[0];
      }
      for (const item of validatedUpdates as any[]) {
        if (item.data.teamId && !authContext.teamIds.includes(Number(item.data.teamId))) {
          return NextResponse.json({ error: "Risiko tidak dapat dipindahkan ke Tim Kerja lain." }, { status: 403 });
        }
      }
    }

    const scopedRiskIds: number[] = [];
    if (resource === "identifikasi-risiko") {
      scopedRiskIds.push(...validatedUpdates.map((item) => item.id));
    } else if (RISK_LINKED_RESOURCES.has(resource)) {
      scopedRiskIds.push(...validatedCreates.map((data: any) => Number(data.identifikasiRisikoId)));
      if (validatedUpdates.length) {
        const delegate = (prisma as any)[modelName];
        const linked = await delegate.findMany({ where: { id: { in: validatedUpdates.map((item) => item.id) } }, select: { identifikasiRisikoId: true } });
        scopedRiskIds.push(...linked.map((item: any) => Number(item.identifikasiRisikoId)));
      }
    }
    if (!await canAccessRiskIds(authContext, scopedRiskIds)) {
      return NextResponse.json({ error: "Batch memuat risiko di luar Tim Kerja Anda." }, { status: 403 });
    }

    if (resource === "identifikasi-risiko" || RISK_LINKED_RESOURCES.has(resource)) {
      const createRiskIds = RISK_LINKED_RESOURCES.has(resource)
        ? validatedCreates.map((data: any) => Number(data.identifikasiRisikoId))
        : [];
      const hasArchivedRisk = await referencesArchivedRisk(resource, {
        riskIds: createRiskIds,
        recordIds: validatedUpdates.map((item) => item.id),
      });
      if (hasArchivedRisk) {
        return NextResponse.json(
          { error: "Batch memuat risiko yang sedang diarsipkan. Pulihkan risiko sebelum mengubah datanya." },
          { status: 409 }
        );
      }
    }

    const cookieStore = await cookies();
    let userId = "anonymous";
    let userName = "Anonymous";
    const auth = cookieStore.get("auth");
    if (auth?.value) {
      try {
        const parsed = JSON.parse(auth.value);
        userId = parsed.email || userId;
        userName = parsed.name || userName;
      } catch {
        // Permission validation already rejects invalid authentication.
      }
    }

    // Penyimpanan satu lembar dapat berisi hingga 200 baris. Koneksi Supabase
    // membutuhkan lebih dari timeout bawaan Prisma (5 detik), sehingga timeout
    // transaksi harus ditetapkan secara eksplisit untuk batch besar.
    const result = await prisma.$transaction(
      async (tx) => {
        const txDelegate = (tx as any)[modelName];
        const created = [];
        const updated = [];
        for (const data of validatedCreates) {
          if (resource === "evaluasi-risiko") {
            await assertResidualMutable(
              tx as never,
              Number((data as { identifikasiRisikoId?: number }).identifikasiRisikoId)
            );
          }
          created.push(await txDelegate.create({ data }));
        }
        for (const item of validatedUpdates) {
          if (resource === "evaluasi-risiko" && touchesResidual(item.data)) {
            const existing = await tx.evaluasiRisiko.findUnique({
              where: { id: item.id },
              select: { identifikasiRisikoId: true },
            });
            if (existing) {
              await assertResidualMutable(tx as never, existing.identifikasiRisikoId);
            }
          }
          updated.push(
            await txDelegate.update({ where: { id: item.id }, data: item.data })
          );
        }
        return { created, updated };
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      }
    );

    await logAudit({
      userId,
      userName,
      action: "UPDATE",
      resource: modelName,
      resourceId: result.updated[0]?.id ?? result.created[0]?.id,
      details: { created: result.created.length, updated: result.updated.length },
      ipAddress,
      userAgent,
    });
    await invalidateResourceCache(resource);

    if (resource === "identifikasi-risiko") {
      await Promise.all(
        result.created.map((item: any, index: number) => {
          const data = validatedCreates[index] as any;
          const embeddingText = [data.risiko, data.penyebab, data.dampak]
            .filter(Boolean)
            .join(". ");
          return generateAndStoreEmbedding(item.id, embeddingText).catch((error) =>
            console.error("Batch embedding generation failed", item.id, error)
          );
        })
      );
    }

    if (resource === "rencana-penanganan") {
      const { sendRtpPushNotification } = await import("@/lib/push-notification");
      await Promise.all(
        result.created.map((item: any) =>
          sendRtpPushNotification(item.id).catch((error) =>
            console.error("Batch RTP notification failed", item.id, error)
          )
        )
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    if (error instanceof DomainError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status }
      );
    }
    console.error("API batch error:", error);
    return NextResponse.json({ error: "Batch save failed" }, { status: 500 });
  }
}
