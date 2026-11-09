/**
 * Import register risiko tahun 2026 dari format CSV sumber.
 *
 * Cakupan yang diimpor:
 * - Identifikasi Risiko
 * - Analisis Risiko Aktual dan Pengendalian yang Telah Dilaksanakan
 * - Risiko residual setelah pengendalian yang telah dilaksanakan dan Respon Risiko
 *
 * Risiko residual pada berkas sumber adalah kondisi setelah pengendalian
 * existing. Nilai ini menjadi dasar evaluasi terhadap selera risiko. Residual
 * setelah RTP direalisasikan tetap dicatat terpisah pada Pemantauan Risiko.
 *
 * Jalankan pratinjau (tanpa perubahan):
 *   npx tsx scripts/import-risk-register-2026.ts
 *
 * Terapkan ke database Supabase (.env.production):
 *   npx tsx scripts/import-risk-register-2026.ts --apply
 */
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ path: path.resolve(process.cwd(), ".env.production") });

const CSV_PATH = path.resolve(process.cwd(), "20_SESTAMA_KK MR2026 - 26.csv");
const TAHUN = 2026;
const APPLY = process.argv.includes("--apply");

type CsvRow = string[];
type Reference = { id: number; nama: string };

function parseCsv(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }

  if (value || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function key(value: string): string {
  return clean(value).toLocaleLowerCase("id-ID");
}

function parseScale(value: string): number | null {
  const match = clean(value).match(/^\[(\d+)]/);
  return match ? Number(match[1]) : null;
}

function normalizeEfektivitas(value: string): "efektif" | "kurang_efektif" | "tidak_efektif" | null {
  const normalized = key(value);
  if (normalized === "efektif") return "efektif";
  if (normalized === "kurang efektif") return "kurang_efektif";
  if (normalized === "tidak efektif") return "tidak_efektif";
  return null;
}

function normalizeRespon(value: string): "mengurangi" | "mentransfer" | "menghindari" | "menerima" | null {
  const normalized = key(value);
  if (normalized === "mengurangi risiko" || normalized === "mengurangi") return "mengurangi";
  if (normalized === "mengalihkan risiko" || normalized === "mentransfer") return "mentransfer";
  if (normalized === "menghindari risiko" || normalized === "menghindari") return "menghindari";
  if (normalized === "menerima risiko" || normalized === "menerima") return "menerima";
  return null;
}

function mapByName<T extends Reference>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [key(item.nama), item]));
}

function resolve<T extends Reference>(map: Map<string, T>, name: string, label: string): T {
  const found = map.get(key(name));
  if (!found) throw new Error(`${label} tidak ditemukan: '${clean(name)}'`);
  return found;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL tidak ditemukan di .env.production.");
  }
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`Berkas CSV tidak ditemukan: ${CSV_PATH}`);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const rows = parseCsv(fs.readFileSync(CSV_PATH, "utf8"))
      .slice(6)
      .filter((row) => clean(row[0]) !== "");

    if (rows.length === 0) throw new Error("Tidak ada baris risiko yang terbaca dari CSV.");

    const [
      jenisRisiko,
      sumberRisiko,
      kategoriRisiko,
      areaDampak,
      unitKerja,
      sasaran,
      kegiatan,
      prosesBisnis,
      levelKemungkinan,
      levelDampak,
      matriks,
    ] = await Promise.all([
      prisma.jenisRisiko.findMany(),
      prisma.sumberRisiko.findMany(),
      prisma.kategoriRisiko.findMany(),
      prisma.areaDampak.findMany(),
      prisma.unitKerja.findMany(),
      prisma.sasaran.findMany(),
      prisma.kegiatan.findMany(),
      prisma.prosesBisnis.findMany(),
      prisma.levelKemungkinan.findMany(),
      prisma.levelDampak.findMany(),
      prisma.matriksAnalisisRisiko.findMany(),
    ]);

    const missingKategori = [...new Set(rows.map((row) => clean(row[8])))].filter(
      (name) => name && !mapByName(kategoriRisiko).has(key(name))
    );
    const missingArea = [...new Set(rows.map((row) => clean(row[9])))].filter(
      (name) => name && !mapByName(areaDampak).has(key(name))
    );

    const areaCodes: Record<string, string> = {
      "penurunan reputasi": "D02",
      "sanksi pidana, perdata, dan/atau administratif": "D03",
      "gangguan terhadap layanan organisasi": "D05",
    };

    if (!APPLY) {
      console.log("PRATINJAU — tidak ada data yang diubah.");
      console.log(`Baris risiko CSV: ${rows.length}`);
      console.log(`Kategori yang akan ditambahkan: ${missingKategori.join(", ") || "tidak ada"}`);
      console.log(`Area dampak yang akan ditambahkan: ${missingArea.join(", ") || "tidak ada"}`);
      console.log("Gunakan --apply untuk menjalankan impor.");
      return;
    }

    for (const nama of missingKategori) {
      const created = await prisma.kategoriRisiko.create({ data: { nama } });
      kategoriRisiko.push(created);
    }
    for (const nama of missingArea) {
      const created = await prisma.areaDampak.create({
        data: { nama, kode: areaCodes[key(nama)] ?? null },
      });
      areaDampak.push(created);
    }

    const jenisMap = mapByName(jenisRisiko);
    const sumberMap = mapByName(sumberRisiko);
    const kategoriMap = mapByName(kategoriRisiko);
    const areaMap = mapByName(areaDampak);
    const sasaranMap = mapByName(sasaran);
    const kegiatanMap = mapByName(kegiatan);
    const prosesMap = mapByName(prosesBisnis);
    const kemungkinanByScale = new Map(levelKemungkinan.map((item) => [item.skala, item]));
    const dampakByScale = new Map(levelDampak.map((item) => [item.skala, item]));
    const matriksByPair = new Map(
      matriks.map((item) => [`${item.levelKemungkinanId}-${item.levelDampakId}`, item.levelRisikoId])
    );

    // Semua entri register adalah risiko negatif; kolom Jenis Risiko memang
    // tidak tersedia pada CSV sumber.
    const jenisNegatif = resolve(jenisMap, "Negatif", "Jenis Risiko");
    const unit = unitKerja.find((item) => item.kode.replace(/^0+/, "") === "26")
      ?? unitKerja.find((item) => key(item.nama) === key("Pusat Pendidikan dan Pelatihan"));
    if (!unit) throw new Error("Unit Kerja Pusat Pendidikan dan Pelatihan (kode 0026/2600) tidak ditemukan.");

    let createdCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
      const nomor = clean(row[0]);
      const risiko = clean(row[5]);
      const kemungkinan = kemungkinanByScale.get(parseScale(row[11]) ?? -1);
      const dampak = dampakByScale.get(parseScale(row[12]) ?? -1);
      const residualKemungkinan = kemungkinanByScale.get(parseScale(row[17]) ?? -1);
      const residualDampak = dampakByScale.get(parseScale(row[18]) ?? -1);
      const respon = normalizeRespon(row[22]);
      const efektivitas = normalizeEfektivitas(row[16]);

      if (!risiko) throw new Error(`Baris ${nomor}: Pernyataan Risiko kosong.`);
      if (!kemungkinan || !dampak) throw new Error(`Baris ${nomor}: Level Risiko Aktual tidak valid.`);
      if (!residualKemungkinan || !residualDampak) throw new Error(`Baris ${nomor}: Level Risiko Residual tidak valid.`);
      if (!respon) throw new Error(`Baris ${nomor}: Respon Risiko '${clean(row[22])}' tidak valid.`);
      if (clean(row[16]) && !efektivitas) throw new Error(`Baris ${nomor}: Keefektifan '${clean(row[16])}' tidak valid.`);

      const sumber = resolve(sumberMap, row[10], "Sumber Risiko");
      const kategori = resolve(kategoriMap, row[8], "Kategori Risiko");
      const area = resolve(areaMap, row[9], "Area Dampak");
      const sasaranItem = resolve(sasaranMap, row[2], "Sasaran");
      const kegiatanItem = resolve(kegiatanMap, row[3], "Kegiatan");
      const prosesItem = resolve(prosesMap, row[4], "Proses Bisnis");
      const levelRisikoId = matriksByPair.get(`${kemungkinan.id}-${dampak.id}`);
      const residualLevelRisikoId = matriksByPair.get(`${residualKemungkinan.id}-${residualDampak.id}`);
      if (!levelRisikoId) throw new Error(`Baris ${nomor}: kombinasi matriks risiko aktual tidak ditemukan.`);
      if (!residualLevelRisikoId) throw new Error(`Baris ${nomor}: kombinasi matriks risiko residual tidak ditemukan.`);

      await prisma.$transaction(async (tx) => {
        const match = {
          tahun: TAHUN,
          risiko,
          unitKerjaId: unit.id,
          sasaranId: sasaranItem.id,
          kegiatanId: kegiatanItem.id,
          prosesBisnisId: prosesItem.id,
        };
        const existing = await tx.identifikasiRisiko.findFirst({ where: match });
        const identificationData = {
          risiko,
          jenisRisikoId: jenisNegatif.id,
          sumberRisikoId: sumber.id,
          kategoriRisikoId: kategori.id,
          areaDampakId: area.id,
          penyebab: clean(row[6]) || null,
          dampak: clean(row[7]) || null,
          unitKerjaId: unit.id,
          sasaranId: sasaranItem.id,
          kegiatanId: kegiatanItem.id,
          prosesBisnisId: prosesItem.id,
          tahun: TAHUN,
        };
        const identification = existing
          ? await tx.identifikasiRisiko.update({ where: { id: existing.id }, data: identificationData })
          : await tx.identifikasiRisiko.create({ data: identificationData });

        const analysisData = {
          levelKemungkinanId: kemungkinan.id,
          levelDampakId: dampak.id,
          levelRisikoId,
          pengendalianUraian: clean(row[15]) || null,
          pengendalianEfektivitas: efektivitas,
        };
        await tx.analisisRisiko.upsert({
          where: { identifikasiRisikoId: identification.id },
          create: { identifikasiRisikoId: identification.id, ...analysisData },
          update: analysisData,
        });

        await tx.evaluasiRisiko.upsert({
          where: { identifikasiRisikoId: identification.id },
          create: {
            identifikasiRisikoId: identification.id,
            responRisiko: respon,
            residualLevelKemungkinanId: residualKemungkinan.id,
            residualLevelDampakId: residualDampak.id,
            residualLevelRisikoId,
            prioritasRisiko: null,
          },
          update: {
            responRisiko: respon,
            residualLevelKemungkinanId: residualKemungkinan.id,
            residualLevelDampakId: residualDampak.id,
            residualLevelRisikoId,
            prioritasRisiko: null,
          },
        });

        if (existing) updatedCount += 1;
        else createdCount += 1;
      });
    }

    console.log(`Selesai: ${createdCount} risiko baru, ${updatedCount} risiko diperbarui.`);
    console.log("Tahap yang diisi: Identifikasi Risiko, Analisis Risiko, Pengendalian, dan Respon Risiko.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Import gagal:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
