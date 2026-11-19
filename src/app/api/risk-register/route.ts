import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/access-control";
import {
  createIdentifikasiRisikoSchema,
  createAnalisisRisikoSchema,
  createEvaluasiRisikoSchema,
  createRencanaPenangananSchema,
} from "@/lib/validators";
import { ZodError } from "zod";

// POST /api/risk-register
// Body: { identifikasi, analisis?, evaluasi?, rencana? }
// Creates all in one transaction to avoid orphan rows.
export async function POST(request: NextRequest) {
  try {
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const isAllowed = await checkPermission("identifikasi-risiko", "create", {
      ipAddress,
      userAgent,
    });
    if (!isAllowed) {
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

    let vIdent: any;
    let vAnalisis: any = null;
    let vEvaluasi: any = null;
    let vRencana: any = null;

    try {
      vIdent = createIdentifikasiRisikoSchema.parse(identifikasi);
      if (analisis) {
        // strip identifikasiRisikoId if client sent dummy
        const { identifikasiRisikoId: _drop, ...rest } = analisis;
        vAnalisis = createAnalisisRisikoSchema
          .omit({ identifikasiRisikoId: true })
          .parse(rest);
      }
      if (evaluasi) {
        const { identifikasiRisikoId: _drop2, ...rest } = evaluasi;
        vEvaluasi = createEvaluasiRisikoSchema
          .omit({ identifikasiRisikoId: true })
          .parse(rest);
      }
      if (rencana) {
        const { identifikasiRisikoId: _drop3, ...rest } = rencana;
        vRencana = createRencanaPenangananSchema
          .omit({ identifikasiRisikoId: true })
          .parse(rest);
      }
    } catch (e) {
      if (e instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: e.flatten().fieldErrors },
          { status: 400 }
        );
      }
      throw e;
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const createdIdent = await tx.identifikasiRisiko.create({
        data: vIdent,
      });
      const identId = createdIdent.id;

      let createdAnalisis = null;
      let createdEvaluasi = null;
      let createdRencana = null;

      if (vAnalisis) {
        createdAnalisis = await tx.analisisRisiko.create({
          data: { ...vAnalisis, identifikasiRisikoId: identId },
        });
      }
      if (vEvaluasi) {
        createdEvaluasi = await tx.evaluasiRisiko.create({
          data: { ...vEvaluasi, identifikasiRisikoId: identId },
        });
      }
      if (vRencana) {
        // only create RTP if at least one meaningful field filled
        const hasContent =
          vRencana.rencanaTidakPenanganan ||
          vRencana.targetOutput ||
          vRencana.targetWaktu ||
          vRencana.penanggungJawab ||
          vRencana.residualLevelKemungkinanId ||
          vRencana.residualLevelDampakId;
        if (hasContent) {
          createdRencana = await tx.rencanaPenanganan.create({
            data: { ...vRencana, identifikasiRisikoId: identId },
          });
        }
      }

      return {
        identifikasi: createdIdent,
        analisis: createdAnalisis,
        evaluasi: createdEvaluasi,
        rencana: createdRencana,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    console.error("API risk-register POST error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
