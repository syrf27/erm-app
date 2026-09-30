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

    const validatedCreates = creates.map((item) => schemas.create.parse(item.data));
    const validatedUpdates = updates.map((item) => {
      if (!Number.isInteger(item.id) || Number(item.id) <= 0) {
        throw new Error("Each update row must include a valid id");
      }
      return { id: Number(item.id), data: schemas.update.parse(item.data) };
    });

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

    const result = await prisma.$transaction(async (tx) => {
      const txDelegate = (tx as any)[modelName];
      const created = [];
      const updated = [];
      for (const data of validatedCreates) {
        created.push(await txDelegate.create({ data }));
      }
      for (const item of validatedUpdates) {
        updated.push(await txDelegate.update({ where: { id: item.id }, data: item.data }));
      }
      return { created, updated };
    });

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
    console.error("API batch error:", error);
    return NextResponse.json({ error: "Batch save failed" }, { status: 500 });
  }
}
