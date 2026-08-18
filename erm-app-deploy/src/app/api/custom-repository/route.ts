import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/access-control";

export async function GET(request: NextRequest) {
  try {
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Enforce authorization check
    const isAllowed = await checkPermission("rencana-penanganan", "read", { ipAddress, userAgent });
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const tahunVal = searchParams.get("tahun");
    const category = searchParams.get("category") || "";

    // 1. Fetch manual repository uploads
    const manualDocs = await prisma.repositori.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch dynamic mitigation bukti dukung files
    const buktiDocs = await prisma.dokumenPendukung.findMany({
      include: {
        rencanaPenanganan: {
          include: {
            identifikasiRisiko: {
              select: {
                risiko: true,
                tahun: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Map manual docs to unified interface
    const manualMapped = manualDocs.map((d) => ({
      id: `manual-${d.id}`,
      title: d.title,
      url: d.url,
      category: d.category, // "pedoman" | "laporan"
      tahun: d.tahun,
      uploader: d.uploader,
      createdAt: d.createdAt,
    }));

    // 4. Map bukti dukung docs to unified interface
    const buktiMapped = buktiDocs.map((d) => ({
      id: `bukti-${d.id}`,
      title: d.title,
      url: d.url,
      category: "bukti_dukung",
      tahun: d.rencanaPenanganan?.identifikasiRisiko?.tahun ?? 2026,
      uploader: d.rencanaPenanganan?.penanggungJawab ?? "Tim Mitigasi",
      createdAt: d.createdAt,
      relatedRisk: d.rencanaPenanganan?.identifikasiRisiko?.risiko || "",
    }));

    // 5. Combine lists
    let combined = [...manualMapped, ...buktiMapped];

    // 6. Apply filter parameters
    if (tahunVal) {
      const yearInt = parseInt(tahunVal, 10);
      if (!isNaN(yearInt)) {
        combined = combined.filter((f) => f.tahun === yearInt);
      }
    }

    if (category) {
      combined = combined.filter((f) => f.category === category);
    }

    if (search) {
      combined = combined.filter(
        (f) =>
          f.title.toLowerCase().includes(search) ||
          f.uploader.toLowerCase().includes(search) ||
          ("relatedRisk" in f && String((f as any).relatedRisk).toLowerCase().includes(search))
      );
    }

    // Sort by creation date descending
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(combined);
  } catch (error: any) {
    console.error("Error in custom-repository GET:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
