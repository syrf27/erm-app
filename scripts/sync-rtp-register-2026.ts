/**
 * Menyelaraskan empat RTP yang tercantum pada register risiko Pusdiklat 2026.
 *
 * Sumber: 20_SESTAMA_KK MR2026 - 26.csv, nomor 95, 125, 135, dan 160.
 * RTP dalam register tetap ditampilkan walaupun respons risikonya bukan
 * "mengurangi" atau nilai residualnya sudah tidak melewati ambang, karena
 * rencana tersebut adalah penetapan resmi pada register.
 *
 * Pratinjau: npx tsx scripts/sync-rtp-register-2026.ts
 * Terapkan:  npx tsx scripts/sync-rtp-register-2026.ts --apply
 */
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: path.resolve(process.cwd(), ".env.production") });

const APPLY = process.argv.includes("--apply");
const TAHUN = 2026;

type RtpSource = {
  nomor: number;
  risiko: string;
  rencanaTidakPenanganan: string;
  jenisPenanganan: "pencegahan" | "perbaikan";
  targetOutput: string;
  targetWaktu: string;
  penanggungJawab: string;
  prioritasRisiko: number;
  residualKemungkinanSkala: number;
  residualDampakSkala: number;
};

const RTP_REGISTER: RtpSource[] = [
  {
    nomor: 95,
    risiko: "Interpretasi literatur keliru pada saat Kajian Literature berkaitan dengan identifikasi kebutuhan pengembangan kompetensi pegawai",
    rencanaTidakPenanganan: "Kajian literatur dilakukan secara bersama dan dibahas secara berkelompok",
    jenisPenanganan: "pencegahan",
    targetOutput: "Terlaksananya diskusi kajian literatur secara bersama dalam bentuk rapat",
    targetWaktu: "Desember 2026",
    penanggungJawab: "Tim SDM",
    prioritasRisiko: 4,
    residualKemungkinanSkala: 2,
    residualDampakSkala: 2,
  },
  {
    nomor: 125,
    risiko: "Peserta tidak mengumpulkan laporan studi semesteran ke Pusdiklat",
    rencanaTidakPenanganan: "Mengintegrasikan GOJAGS Training dan GOJAGS Educ agar pelaporan peserta ada reward berupa JP",
    jenisPenanganan: "perbaikan",
    targetOutput: "Terkumpulnya laporan studi yang terkonversi menjadi JP per semester untuk peserta Tugas Belajar",
    targetWaktu: "Desember 2026",
    penanggungJawab: "Tim Tugas Belajar",
    prioritasRisiko: 3,
    residualKemungkinanSkala: 1,
    residualDampakSkala: 2,
  },
  {
    nomor: 135,
    risiko: "Informasi rencana jadwal yang tersaji dalam paket RUP yang diumumkan PA/KPA tidak benar (tidak mencerminkan rencana pelaksanaan yang sebenarnya) pada kegiatan Perencanaan",
    rencanaTidakPenanganan: "Penambahan template untuk Surat Tugas agar memudahkan peserta menyelesaikan administrasi di GOJAGS Training",
    jenisPenanganan: "pencegahan",
    targetOutput: "Fitur tambahan untuk unduh template Surat Tugas di GOJAGS Training",
    targetWaktu: "Desember 2026",
    penanggungJawab: "Pejabat Pembuat Komitmen",
    prioritasRisiko: 2,
    residualKemungkinanSkala: 2,
    residualDampakSkala: 3,
  },
  {
    nomor: 160,
    risiko: "Kurangnya kepedulian pegawai untuk memelihara barang/jasa yang dihasilkan pada kegiatan Pemeliharaan",
    rencanaTidakPenanganan: "Melakukan pengecekan minimal 1 semester sekali penggunaan BMN",
    jenisPenanganan: "pencegahan",
    targetOutput: "Laporan pengecekan",
    targetWaktu: "Juli 2026",
    penanggungJawab: "Rumah Tangga dan PTIP",
    prioritasRisiko: 1,
    residualKemungkinanSkala: 2,
    residualDampakSkala: 2,
  },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL tidak ditemukan di .env.production.");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const [unit, kemungkinan, dampak] = await Promise.all([
      prisma.unitKerja.findFirst({ where: { OR: [{ kode: "2600" }, { kode: "0026" }] } }),
      prisma.levelKemungkinan.findMany(),
      prisma.levelDampak.findMany(),
    ]);
    if (!unit) throw new Error("Unit Kerja Pusdiklat (0026/2600) tidak ditemukan.");

    const kemungkinanBySkala = new Map(kemungkinan.map((item) => [item.skala, item.id]));
    const dampakBySkala = new Map(dampak.map((item) => [item.skala, item.id]));

    const targets = await Promise.all(
      RTP_REGISTER.map(async (source) => {
        const identifikasi = await prisma.identifikasiRisiko.findFirst({
          where: { tahun: TAHUN, unitKerjaId: unit.id, risiko: source.risiko },
          select: { id: true },
        });
        if (!identifikasi) throw new Error(`Risiko nomor ${source.nomor} tidak ditemukan.`);
        return { source, identifikasiRisikoId: identifikasi.id };
      })
    );

    console.table(targets.map(({ source, identifikasiRisikoId }) => ({
      nomor: source.nomor,
      identifikasiRisikoId,
      rencana: source.rencanaTidakPenanganan,
      target: source.targetWaktu,
      pj: source.penanggungJawab,
    })));

    if (!APPLY) {
      console.log("PRATINJAU — tidak ada data yang diubah. Gunakan --apply untuk menerapkan.");
      return;
    }

    for (const { source, identifikasiRisikoId } of targets) {
      const residualLevelKemungkinanId = kemungkinanBySkala.get(source.residualKemungkinanSkala);
      const residualLevelDampakId = dampakBySkala.get(source.residualDampakSkala);
      if (!residualLevelKemungkinanId || !residualLevelDampakId) {
        throw new Error(`Level residual RTP untuk risiko nomor ${source.nomor} tidak ditemukan.`);
      }

      await prisma.$transaction([
        prisma.evaluasiRisiko.update({
          where: { identifikasiRisikoId },
          data: { prioritasRisiko: source.prioritasRisiko },
        }),
        prisma.rencanaPenanganan.upsert({
          where: { identifikasiRisikoId },
          create: {
            identifikasiRisikoId,
            rencanaTidakPenanganan: source.rencanaTidakPenanganan,
            jenisPenanganan: source.jenisPenanganan,
            targetOutput: source.targetOutput,
            targetWaktu: source.targetWaktu,
            penanggungJawab: source.penanggungJawab,
            residualLevelKemungkinanId,
            residualLevelDampakId,
          },
          update: {
            rencanaTidakPenanganan: source.rencanaTidakPenanganan,
            jenisPenanganan: source.jenisPenanganan,
            targetOutput: source.targetOutput,
            targetWaktu: source.targetWaktu,
            penanggungJawab: source.penanggungJawab,
            residualLevelKemungkinanId,
            residualLevelDampakId,
          },
        }),
      ]);
    }

    console.log(`Selesai: ${targets.length} RTP register tahun ${TAHUN} telah diselaraskan.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Sinkronisasi RTP gagal:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
