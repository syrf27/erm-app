import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import {
  checkPermission,
  getAuthUserContext,
  isAdminRole,
} from "@/lib/access-control";
import { invalidateResourceCache } from "@/lib/cache";
import { logAudit } from "@/lib/audit-log";
import {
  createAnalisisRisikoSchema,
  createEvaluasiRisikoSchema,
  createIdentifikasiRisikoSchema,
  createRencanaPenangananSchema,
} from "@/lib/validators";
import {
  createRiskRegister,
  DomainError,
  type RiskRegisterInput,
} from "@/lib/risk-register-service";

// POST /api/risk-register
// Body: { identifikasi, analisis?, evaluasi?, rencana? }
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthUserContext();
    if (!ctx) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const permissionContext = { ipAddress, userAgent };

    if (!await checkPermission("identifikasi-risiko", "create", permissionContext)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { identifikasi, analisis, evaluasi, rencana } = body ?? {};
    if (!identifikasi) {
      return NextResponse.json(
        { error: "Data identifikasi wajib diisi" },
        { status: 400 }
      );
    }

    // Izin diperiksa untuk setiap tahap yang benar-benar dibuat.
    if (analisis && !await checkPermission("analisis-risiko", "create", permissionContext)) {
      return NextResponse.json(
        { error: "Tidak memiliki izin membuat analisis risiko." },
        { status: 403 }
      );
    }
    if (evaluasi && !await checkPermission("evaluasi-risiko", "create", permissionContext)) {
      return NextResponse.json(
        { error: "Tidak memiliki izin membuat evaluasi risiko." },
        { status: 403 }
      );
    }
    if (rencana && !await checkPermission("rencana-penanganan", "create", permissionContext)) {
      return NextResponse.json(
        { error: "Tidak memiliki izin membuat rencana penanganan." },
        { status: 403 }
      );
    }

    let input: RiskRegisterInput;
    try {
      const vIdent = createIdentifikasiRisikoSchema.parse(identifikasi);
      input = {
        identifikasi: vIdent,
        analisis: analisis
          ? createAnalisisRisikoSchema
              .omit({ identifikasiRisikoId: true })
              .parse(analisis)
          : null,
        evaluasi: evaluasi
          ? createEvaluasiRisikoSchema
              .omit({ identifikasiRisikoId: true })
              .parse(evaluasi)
          : null,
        rencana: rencana
          ? createRencanaPenangananSchema
              .omit({ identifikasiRisikoId: true })
              .parse(rencana)
          : null,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      throw error;
    }

    if (!isAdminRole(ctx.roleName)) {
      if (ctx.teamIds.length === 0) {
        return NextResponse.json(
          { error: "Akun belum memiliki Tim Kerja. Hubungi administrator." },
          { status: 403 }
        );
      }
      const requestedTeamId = Number(input.identifikasi.teamId);
      if (requestedTeamId && !ctx.teamIds.includes(requestedTeamId)) {
        return NextResponse.json(
          { error: "Tim Kerja tidak sesuai dengan akun." },
          { status: 403 }
        );
      }
      if (!requestedTeamId && ctx.teamIds.length > 1) {
        return NextResponse.json(
          { error: "Pilih Tim Kerja untuk risiko ini." },
          { status: 400 }
        );
      }
      input.identifikasi.teamId = requestedTeamId || ctx.teamIds[0];
    }

    const actor = await getActor();
    const result = await prisma.$transaction(async (tx) =>
      createRiskRegister(tx, input)
    );

    await logAudit({
      userId: actor?.email ?? "unknown",
      userName: actor?.name ?? "Unknown",
      action: "CREATE",
      resource: "RiskRegister",
      resourceId: result.identifikasi.id,
      details: {
        tahapan: {
          analisis: Boolean(result.analisis),
          evaluasi: Boolean(result.evaluasi),
          rencana: Boolean(result.rencana),
        },
        teamId: result.identifikasi.teamId,
      },
      ipAddress,
      userAgent,
    });

    await invalidateResourceCache("identifikasi-risiko");
    await invalidateResourceCache("analisis-risiko");
    await invalidateResourceCache("evaluasi-risiko");
    await invalidateResourceCache("rencana-penanganan");

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status }
      );
    }
    console.error("API risk-register POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getActor() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("auth");
  if (!auth?.value) return null;
  try {
    const parsed = JSON.parse(auth.value);
    if (!parsed.email) return null;
    return { email: String(parsed.email), name: String(parsed.name ?? parsed.email) };
  } catch {
    return null;
  }
}
