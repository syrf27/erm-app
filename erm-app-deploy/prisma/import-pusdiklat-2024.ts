import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { risks, SASARAN, KEGIATAN } from "./data-pusdiklat-2024";

const TAHUN = 2024;

async function main() {
  // ---- 1. Reference lookups ----
  const unitKerja = await prisma.unitKerja.findUnique({ where: { kode: "2600" } });
  if (!unitKerja) throw new Error("UnitKerja Pusdiklat (2600) tidak ditemukan");

  const jenisNegatif = await prisma.jenisRisiko.findUnique({ where: { nama: "Negatif" } });
  if (!jenisNegatif) throw new Error("JenisRisiko 'Negatif' tidak ditemukan");

  const sumberMap = new Map<string, number>();
  for (const s of ["Internal", "Eksternal"]) {
    const rec = await prisma.sumberRisiko.findUnique({ where: { nama: s } });
    if (!rec) throw new Error(`SumberRisiko '${s}' tidak ditemukan`);
    sumberMap.set(s, rec.id);
  }

  const kemungkinanMap = new Map<string, number>();
  for (const k of await prisma.levelKemungkinan.findMany()) kemungkinanMap.set(k.nama, k.id);
  const dampakMap = new Map<string, number>();
  for (const d of await prisma.levelDampak.findMany()) dampakMap.set(d.nama, d.id);
  const levelRisikoMap = new Map<string, number>();
  for (const lr of await prisma.levelRisiko.findMany()) levelRisikoMap.set(lr.nama, lr.id);

  // Kategori & Area Dampak: ensure the 3 needed categories exist
  const kategoriNeeded = ["Risiko Operasional", "Risiko Kepatuhan", "Risiko Kebijakan"];
  const kategoriMap = new Map<string, number>();
  const areaMap = new Map<string, number>();
  for (const nama of kategoriNeeded) {
    let k = await prisma.kategoriRisiko.findFirst({ where: { nama } });
    if (!k) k = await prisma.kategoriRisiko.create({ data: { nama } });
    kategoriMap.set(nama, k.id);
    let a = await prisma.areaDampak.findFirst({ where: { nama } });
    if (!a) a = await prisma.areaDampak.create({ data: { nama, deskripsi: "Area dampak sesuai kategori risiko pada Kertas Kerja MR 2024" } });
    areaMap.set(nama, a.id);
  }
  const kategoriByShort: Record<string, string> = {
    Operasional: "Risiko Operasional",
    Kepatuhan: "Risiko Kepatuhan",
    Kebijakan: "Risiko Kebijakan",
  };

  // ---- 2. Context: Sasaran, Kegiatan, ProsesBisnis ----
  let sasaran = await prisma.sasaran.findFirst({ where: { nama: SASARAN } });
  if (!sasaran) {
    sasaran = await prisma.sasaran.create({
      data: { nama: SASARAN, deskripsi: "Sasaran strategis Pusdiklat BPS pada Kertas Kerja Manajemen Risiko 2024", unitKerjaId: unitKerja.id },
    });
  }

  let kegiatan = await prisma.kegiatan.findFirst({ where: { nama: KEGIATAN } });
  if (!kegiatan) {
    kegiatan = await prisma.kegiatan.create({
      data: { nama: KEGIATAN, unitKerjaId: unitKerja.id, sasaranId: sasaran.id },
    });
  }

  const prosesByNo = new Map<number, number>();
  const stepNos = Array.from(new Set(risks.map((r) => r.no)));
  for (const no of stepNos) {
    const nama = `Proses ${no}: ${risks.find((r) => r.no === no)!.step}`;
    let pb = await prisma.prosesBisnis.findFirst({ where: { nama } });
    if (!pb) {
      pb = await prisma.prosesBisnis.create({
        data: { nama, deskripsi: `Tahapan kegiatan ${no} dari Kertas Kerja Manajemen Risiko Pusdiklat 2024`, kegiatanId: kegiatan.id },
      });
    }
    prosesByNo.set(no, pb.id);
  }

  // ---- 3. Validation ----
  const errors: string[] = [];
  for (let i = 0; i < risks.length; i++) {
    const r = risks[i];
    if (!kemungkinanMap.has(r.kemungkinan)) errors.push(`[${i}] kemungkinan "${r.kemungkinan}"`);
    if (!dampakMap.has(r.levelDampak)) errors.push(`[${i}] levelDampak "${r.levelDampak}"`);
    if (!levelRisikoMap.has(r.levelRisiko)) errors.push(`[${i}] levelRisiko "${r.levelRisiko}"`);
    if (!sumberMap.has(r.sumber)) errors.push(`[${i}] sumber "${r.sumber}"`);
  }
  if (errors.length > 0) {
    throw new Error("Data tidak valid terhadap referensi:\n" + errors.join("\n"));
  }

  // ---- 4. Upsert risks ----
  let created = 0, skipped = 0;
  for (const r of risks) {
    const existing = await prisma.identifikasiRisiko.findFirst({
      where: { risiko: r.risiko, tahun: TAHUN },
    });
    if (existing) { skipped++; continue; }

    const kategoriId = kategoriMap.get(kategoriByShort[r.kategori])!;
    const ident = await prisma.identifikasiRisiko.create({
      data: {
        tahun: TAHUN,
        risiko: r.risiko,
        penyebab: r.penyebab,
        dampak: r.dampak,
        jenisRisikoId: jenisNegatif.id,
        sumberRisikoId: sumberMap.get(r.sumber)!,
        kategoriRisikoId: kategoriId,
        areaDampakId: areaMap.get(kategoriByShort[r.kategori])!,
        sasaranId: sasaran.id,
        kegiatanId: kegiatan.id,
        prosesBisnisId: prosesByNo.get(r.no)!,
        unitKerjaId: unitKerja.id,
      },
    });

    await prisma.analisisRisiko.create({
      data: {
        identifikasiRisikoId: ident.id,
        levelKemungkinanId: kemungkinanMap.get(r.kemungkinan)!,
        levelDampakId: dampakMap.get(r.levelDampak)!,
        levelRisikoId: levelRisikoMap.get(r.levelRisiko)!,
        pengendalianUraian: r.pengendalian,
        pengendalianEfektivitas: r.efektivitas,
      },
    });

    if (r.respon) {
      await prisma.evaluasiRisiko.create({
        data: { identifikasiRisikoId: ident.id, responRisiko: r.respon },
      });
    }
    created++;
  }

  console.log(`Selesai. Baru: ${created}, Sudah ada (dilewati): ${skipped}, Total dataset: ${risks.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());