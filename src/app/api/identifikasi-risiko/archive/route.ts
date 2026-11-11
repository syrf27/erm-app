import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { checkPermission, getAuthUserContext } from "@/lib/access-control";
import { logAudit } from "@/lib/audit-log";
import { invalidateResourceCache } from "@/lib/cache";
import { deleteFile } from "@/lib/storage";

// Pengelolaan arsip risiko. Arsip adalah mekanisme penghapusan standar:
// data turunan tetap tersimpan dan dapat dipulihkan. Hapus permanen hanya
// untuk Admin dan bersifat irreversible.
export async function GET(request: NextRequest) {
  try {
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const isAllowed = await checkPermission("identifikasi-risiko", "read", { ipAddress, userAgent });
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const rawId = searchParams.get("id");

    // Tanpa parameter id, endpoint ini menjadi sumber daftar arsip. Daftar
    // dipisahkan dari endpoint generik agar risiko aktif dan arsip tidak dapat
    // tertukar akibat serialisasi filter pada data provider di client.
    if (!rawId) {
      const start = Math.max(0, Number(searchParams.get("_start")) || 0);
      const end = Math.max(start + 1, Number(searchParams.get("_end")) || start + 1000);
      const rawTahunDari = searchParams.get("tahun_gte");
      const rawTahunSampai = searchParams.get("tahun_lte");
      const tahunDari = rawTahunDari === null ? Number.NaN : Number(rawTahunDari);
      const tahunSampai = rawTahunSampai === null ? Number.NaN : Number(rawTahunSampai);
      const where: Prisma.IdentifikasiRisikoWhereInput = {
        archivedAt: { not: null },
        ...(Number.isFinite(tahunDari) || Number.isFinite(tahunSampai)
          ? {
              tahun: {
                ...(Number.isFinite(tahunDari) ? { gte: tahunDari } : {}),
                ...(Number.isFinite(tahunSampai) ? { lte: tahunSampai } : {}),
              },
            }
          : {}),
      };

      const [risks, total] = await Promise.all([
        prisma.identifikasiRisiko.findMany({
          where,
          skip: start,
          take: end - start,
          orderBy: [{ archivedAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            risiko: true,
            tahun: true,
            archivedAt: true,
            archivedBy: true,
            archiveReason: true,
            team: { select: { id: true, nama: true, ketuaTim: true } },
          },
        }),
        prisma.identifikasiRisiko.count({ where }),
      ]);

      return NextResponse.json(risks, {
        headers: {
          "x-total-count": String(total),
          "Cache-Control": "private, no-store",
        },
      });
    }

    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Parameter id tidak valid" }, { status: 400 });
    }

    const risk = await prisma.identifikasiRisiko.findUnique({
      where: { id },
      select: {
        id: true,
        risiko: true,
        tahun: true,
        archivedAt: true,
        archivedBy: true,
        archiveReason: true,
        team: { select: { id: true, nama: true, ketuaTim: true } },
        analisisRisiko: { select: { id: true } },
        evaluasiRisiko: { select: { id: true } },
        rencanaPenanganan: {
          select: {
            id: true,
            dokumenPendukung: true,
            dokumenPendukungs: { select: { id: true, title: true, url: true } },
            reminderLogs: { select: { id: true } },
          },
        },
        kris: { select: { id: true } },
      },
    });

    if (!risk) {
      return NextResponse.json({ error: "Risiko tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      id: risk.id,
      risiko: risk.risiko,
      tahun: risk.tahun,
      team: risk.team,
      archivedAt: risk.archivedAt,
      archivedBy: risk.archivedBy,
      archiveReason: risk.archiveReason,
      hasAnalisis: Boolean(risk.analisisRisiko),
      hasEvaluasi: Boolean(risk.evaluasiRisiko),
      hasRencana: Boolean(risk.rencanaPenanganan),
      kriCount: risk.kris.length,
      dokumenCount: risk.rencanaPenanganan
        ? risk.rencanaPenanganan.dokumenPendukungs.length +
          (risk.rencanaPenanganan.dokumenPendukung ? 1 : 0)
        : 0,
      reminderCount: risk.rencanaPenanganan?.reminderLogs.length ?? 0,
    });
  } catch (e: any) {
    console.error("Archive preview error:", e);
    return NextResponse.json({ error: "Gagal memuat pratinjau risiko" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");
    let userId = "unknown";
    let userName = "Unknown";
    if (auth?.value) {
      try {
        const parsed = JSON.parse(auth.value);
        userId = parsed.email || "unknown";
        userName = parsed.name || "Unknown";
      } catch {}
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const id = Number(body?.id);
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Parameter id tidak valid" }, { status: 400 });
    }

    const isAllowed = await checkPermission("identifikasi-risiko", "delete", { ipAddress, userAgent });
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (action === "archive" || action === "permanent-delete") {
      if (!reason) {
        return NextResponse.json({ error: "Alasan wajib diisi" }, { status: 400 });
      }
    }

    const risk = await prisma.identifikasiRisiko.findUnique({
      where: { id },
      select: {
        id: true,
        risiko: true,
        tahun: true,
        archivedAt: true,
        archivedBy: true,
        archiveReason: true,
        team: { select: { nama: true } },
        analisisRisiko: { select: { id: true } },
        evaluasiRisiko: { select: { id: true } },
        rencanaPenanganan: {
          select: {
            id: true,
            dokumenPendukung: true,
            dokumenPendukungs: { select: { id: true, title: true, url: true } },
            reminderLogs: { select: { id: true } },
          },
        },
        kris: { select: { id: true } },
      },
    });

    if (!risk) {
      return NextResponse.json({ error: "Risiko tidak ditemukan" }, { status: 404 });
    }

    if (action === "archive") {
      if (risk.archivedAt) {
        return NextResponse.json({ error: "Risiko sudah diarsipkan" }, { status: 400 });
      }

      const updated = await prisma.identifikasiRisiko.update({
        where: { id },
        data: {
          archivedAt: new Date(),
          archivedBy: userName,
          archiveReason: reason,
        },
      });

      await logAudit({
        userId,
        userName,
        action: "ARCHIVE",
        resource: "IdentifikasiRisiko",
        resourceId: id,
        details: {
          risiko: risk.risiko,
          tahun: risk.tahun,
          alasan: reason,
          turunan: {
            analisis: Boolean(risk.analisisRisiko),
            evaluasi: Boolean(risk.evaluasiRisiko),
            rencanaPenanganan: Boolean(risk.rencanaPenanganan),
            kri: risk.kris.length,
          },
        },
        ipAddress,
        userAgent,
      });
      await invalidateResourceCache("identifikasi-risiko");

      return NextResponse.json(updated);
    }

    if (action === "restore") {
      if (!risk.archivedAt) {
        return NextResponse.json({ error: "Risiko tidak sedang diarsipkan" }, { status: 400 });
      }

      const updated = await prisma.identifikasiRisiko.update({
        where: { id },
        data: {
          archivedAt: null,
          archivedBy: null,
          archiveReason: null,
        },
      });

      await logAudit({
        userId,
        userName,
        action: "RESTORE",
        resource: "IdentifikasiRisiko",
        resourceId: id,
        details: { risiko: risk.risiko, tahun: risk.tahun },
        ipAddress,
        userAgent,
      });
      await invalidateResourceCache("identifikasi-risiko");

      return NextResponse.json(updated);
    }

    if (action === "permanent-delete") {
      // Hapus permanen hanya untuk Admin dan wajib diverifikasi ulang di server.
      const userContext = await getAuthUserContext();
      if (userContext?.roleName?.toLowerCase() !== "admin") {
        return NextResponse.json(
          { error: "Hanya Admin yang dapat menghapus permanen" },
          { status: 403 }
        );
      }

      const confirmId = String(body?.confirmId ?? "").trim();
      if (confirmId !== String(id)) {
        return NextResponse.json(
          { error: "Konfirmasi ID risiko tidak cocok" },
          { status: 400 }
        );
      }

      if (!risk.archivedAt) {
        return NextResponse.json(
          { error: "Hapus permanen hanya untuk risiko yang sudah diarsipkan" },
          { status: 400 }
        );
      }

      // Kumpulkan file dan id dokumen sebelum data turunan dihapus di dalam
      // transaksi. File lokal/Blob dibersihkan setelah transaksi berhasil.
      const dokumenIds = (risk.rencanaPenanganan?.dokumenPendukungs ?? []).map((d) => d.id);
      const fileUrls = Array.from(new Set([
        ...(risk.rencanaPenanganan?.dokumenPendukungs ?? []).map((d) => d.url),
        ...(risk.rencanaPenanganan?.dokumenPendukung
          ? [risk.rencanaPenanganan.dokumenPendukung]
          : []),
      ]));

      const snapshot = {
        risiko: risk.risiko,
        tahun: risk.tahun,
        team: risk.team?.nama ?? null,
        archivedAt: risk.archivedAt,
        archivedBy: risk.archivedBy,
        alasanArsip: risk.archiveReason,
        alasanHapusPermanen: reason,
        turunan: {
          analisis: risk.analisisRisiko?.id ?? null,
          evaluasi: risk.evaluasiRisiko?.id ?? null,
          rencanaPenanganan: risk.rencanaPenanganan?.id ?? null,
          kri: risk.kris.map((k) => k.id),
          dokumenPendukung: dokumenIds,
          reminderLogs: risk.rencanaPenanganan?.reminderLogs.map((log) => log.id) ?? [],
        },
      };

      // Tabel embedding dibuat terpisah (opsional). Periksa keberadaannya
      // agar penghapusan permanen tidak gagal bila tabel belum tersedia.
      const tableExists = async (name: string) => {
        try {
          const res = await prisma.$queryRaw<Array<{ exists: boolean }>>`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = ${name}
            ) as exists`;
          return Boolean(res?.[0]?.exists);
        } catch {
          return false;
        }
      };
      const hasRiskEmbeddings = await tableExists("risk_embeddings");
      const hasDocumentEmbeddings = dokumenIds.length > 0 && (await tableExists("document_embeddings"));

      // Gunakan batch transaction non-interaktif. Seluruh query sudah diketahui
      // di awal sehingga kita tidak menahan koneksi sambil menunggu query satu
      // per satu (pola interactive transaction sebelumnya rawan P2028).
      const operations: Prisma.PrismaPromise<unknown>[] = [
        prisma.kri.deleteMany({ where: { identifikasiRisikoId: id } }),
        prisma.analisisRisiko.deleteMany({ where: { identifikasiRisikoId: id } }),
        prisma.evaluasiRisiko.deleteMany({ where: { identifikasiRisikoId: id } }),
        // DokumenPendukung dan ReminderLog ikut terhapus via onDelete Cascade.
        prisma.rencanaPenanganan.deleteMany({ where: { identifikasiRisikoId: id } }),
      ];
      if (hasRiskEmbeddings) {
        operations.push(
          prisma.$executeRaw`DELETE FROM risk_embeddings WHERE identifikasi_risiko_id = ${id}`
        );
      }
      if (hasDocumentEmbeddings) {
        const idList = Prisma.join(dokumenIds);
        operations.push(
          prisma.$executeRaw`DELETE FROM document_embeddings WHERE document_type = 'bukti' AND document_id IN (${idList})`
        );
      }
      operations.push(prisma.identifikasiRisiko.delete({ where: { id } }));
      await prisma.$transaction(operations);

      await logAudit({
        userId,
        userName,
        action: "PERMANENT_DELETE",
        resource: "IdentifikasiRisiko",
        resourceId: id,
        details: { snapshot, alasan: reason },
        ipAddress,
        userAgent,
      });
      await invalidateResourceCache("identifikasi-risiko");

      // Bersihkan file terkait setelah transaksi database berhasil (best effort).
      for (const url of fileUrls) {
        try {
          await deleteFile(url);
        } catch (e: any) {
          console.error("Gagal menghapus file", url, e);
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (e: any) {
    console.error("Archive action error:", e);
    return NextResponse.json({ error: "Gagal memproses permintaan" }, { status: 500 });
  }
}
