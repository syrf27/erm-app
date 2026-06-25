import { prisma } from "../src/lib/prisma";

async function main() {
  // 1. Seed JenisRisiko
  const jenisCount = await prisma.jenisRisiko.count();
  if (jenisCount === 0) {
    await prisma.jenisRisiko.createMany({
      data: [{ nama: "Positif" }, { nama: "Negatif" }],
    });
    console.log("Seeded JenisRisiko");
  }

  // 2. Seed SumberRisiko
  const sumberCount = await prisma.sumberRisiko.count();
  if (sumberCount === 0) {
    await prisma.sumberRisiko.createMany({
      data: [{ nama: "Internal" }, { nama: "Eksternal" }],
    });
    console.log("Seeded SumberRisiko");
  }

  // 3. Seed LevelRisiko
  const levelRisikoData = [
    { id: 1, nama: "Sangat Rendah", rentang: "1 - 5", tindakan: "Tidak diperlukan Tindakan", warna: "Biru" },
    { id: 2, nama: "Rendah", rentang: "6 - 10", tindakan: "Diambil tindakan jika diperlukan", warna: "Hijau" },
    { id: 3, nama: "Sedang", rentang: "11 - 14", tindakan: "Diambil tindakan jika sumber daya tersedia", warna: "Kuning" },
    { id: 4, nama: "Tinggi", rentang: "15 - 19", tindakan: "Diperlukan tindakan untuk mengelola risiko", warna: "Jingga" },
    { id: 5, nama: "Sangat Tinggi", rentang: "20 - 25", tindakan: "Diperlukan tindakan segera untuk mengelola risiko", warna: "Merah" },
  ];

  for (const item of levelRisikoData) {
    await prisma.levelRisiko.upsert({
      where: { id: item.id },
      update: {
        nama: item.nama,
        rentang: item.rentang,
        tindakan: item.tindakan,
        warna: item.warna,
      },
      create: {
        id: item.id,
        nama: item.nama,
        rentang: item.rentang,
        tindakan: item.tindakan,
        warna: item.warna,
      },
    });
  }
  console.log("Seeded LevelRisiko");

  // 4. Seed LevelKemungkinan (1-5)
  const levelKemungkinanData = [
    { id: 1, nama: "Hampir Tidak Terjadi", skala: 1 },
    { id: 2, nama: "Jarang Terjadi", skala: 2 },
    { id: 3, nama: "Kadang Terjadi", skala: 3 },
    { id: 4, nama: "Sering Terjadi", skala: 4 },
    { id: 5, nama: "Hampir Pasti Terjadi", skala: 5 },
  ];

  for (const item of levelKemungkinanData) {
    await prisma.levelKemungkinan.upsert({
      where: { id: item.id },
      update: { nama: item.nama, skala: item.skala },
      create: { id: item.id, nama: item.nama, skala: item.skala },
    });
  }
  console.log("Seeded LevelKemungkinan");

  // 5. Seed LevelDampak (1-5)
  const levelDampakData = [
    { id: 1, nama: "Tidak Signifikan", skala: 1 },
    { id: 2, nama: "Minor", skala: 2 },
    { id: 3, nama: "Moderat", skala: 3 },
    { id: 4, nama: "Signifikan", skala: 4 },
    { id: 5, nama: "Sangat Signifikan", skala: 5 },
  ];

  for (const item of levelDampakData) {
    await prisma.levelDampak.upsert({
      where: { id: item.id },
      update: { nama: item.nama, skala: item.skala },
      create: { id: item.id, nama: item.nama, skala: item.skala },
    });
  }
  console.log("Seeded LevelDampak");

  // 6. Seed MatriksAnalisisRisiko (25 cells)
  const matrix = {
    5: { 1: 9, 2: 15, 3: 18, 4: 23, 5: 25 },
    4: { 1: 6, 2: 12, 3: 16, 4: 19, 5: 24 },
    3: { 1: 4, 2: 10, 3: 14, 4: 17, 5: 22 },
    2: { 1: 2, 2: 7, 3: 11, 4: 13, 5: 21 },
    1: { 1: 1, 2: 3, 3: 5, 4: 8, 5: 20 }
  };

  const getLevelRisikoId = (besaran: number) => {
    if (besaran >= 1 && besaran <= 5) return 1; // Sangat Rendah
    if (besaran >= 6 && besaran <= 10) return 2; // Rendah
    if (besaran >= 11 && besaran <= 14) return 3; // Sedang
    if (besaran >= 15 && besaran <= 19) return 4; // Tinggi
    return 5; // Sangat Tinggi
  };

  let matrixId = 1;
  for (const lkSkala of [1, 2, 3, 4, 5]) {
    for (const ldSkala of [1, 2, 3, 4, 5]) {
      const besaran = (matrix as any)[lkSkala][ldSkala];
      const levelRisikoId = getLevelRisikoId(besaran);

      // Find db IDs for lk and ld
      const lkDb = await prisma.levelKemungkinan.findFirst({ where: { skala: lkSkala } });
      const ldDb = await prisma.levelDampak.findFirst({ where: { skala: ldSkala } });

      if (lkDb && ldDb) {
        await (prisma as any).matriksAnalisisRisiko.upsert({
          where: { id: matrixId },
          update: {
            levelKemungkinanId: lkDb.id,
            levelDampakId: ldDb.id,
            besaran,
            levelRisikoId,
          },
          create: {
            id: matrixId,
            levelKemungkinanId: lkDb.id,
            levelDampakId: ldDb.id,
            besaran,
            levelRisikoId,
          },
        });
        matrixId++;
      }
    }
  }
  console.log("Seeded MatriksAnalisisRisiko");

  // 7. Seed AreaDampak / KriteriaDampak Kategori
  const areaDampakData = [
    { nama: "Penurunan Reputasi" },
    { nama: "Gangguan Terhadap Layanan Organisasi" },
    { nama: "Kecelakaan Kerja" },
    { nama: "Sanksi Pidana, Perdata, dan /atau Administratif" },
    { nama: "Fraud" }
  ];

  for (const item of areaDampakData) {
    const existing = await prisma.areaDampak.findFirst({ where: { nama: item.nama } });
    if (!existing) {
      await prisma.areaDampak.create({ data: item });
    }
  }
  console.log("Seeded AreaDampak");

  // 8. Seed KategoriRisiko
  const kategoriRisikoData = [
    { nama: "Penurunan Reputasi" },
    { nama: "Gangguan Terhadap Layanan Organisasi" },
    { nama: "Kecelakaan Kerja" },
    { nama: "Sanksi Pidana, Perdata, dan /atau Administratif" },
    { nama: "Fraud" }
  ];

  for (const item of kategoriRisikoData) {
    const existing = await prisma.kategoriRisiko.findFirst({ where: { nama: item.nama } });
    if (!existing) {
      await prisma.kategoriRisiko.create({ data: item });
    }
  }
  console.log("Seeded KategoriRisiko");

  // 9. Seed KriteriaDampak
  const kriteriaDampakData = [
    { nama: "Penurunan Reputasi", deskripsi: "Dampak terhadap citra dan reputasi instansi/perusahaan" },
    { nama: "Gangguan Terhadap Layanan Organisasi", deskripsi: "Dampak operasional pada kelancaran layanan" },
    { nama: "Kecelakaan Kerja", deskripsi: "Dampak terhadap keselamatan dan kesehatan pekerja" },
    { nama: "Sanksi Pidana, Perdata, dan /atau Administratif", deskripsi: "Dampak hukum akibat pelanggaran regulasi" },
    { nama: "Fraud", deskripsi: "Dampak finansial dan reputasional akibat tindakan kecurangan" }
  ];

  for (const item of kriteriaDampakData) {
    const existing = await prisma.kriteriaDampak.findFirst({ where: { nama: item.nama } });
    if (!existing) {
      await prisma.kriteriaDampak.create({ data: item });
    }
  }
  console.log("Seeded KriteriaDampak");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
