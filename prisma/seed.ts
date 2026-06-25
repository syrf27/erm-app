import { prisma } from "../src/lib/prisma";

async function main() {
  const jenisCount = await prisma.jenisRisiko.count();
  if (jenisCount === 0) {
    await prisma.jenisRisiko.createMany({
      data: [{ nama: "Positif" }, { nama: "Negatif" }],
    });
    console.log("Seeded JenisRisiko");
  }

  const sumberCount = await prisma.sumberRisiko.count();
  if (sumberCount === 0) {
    await prisma.sumberRisiko.createMany({
      data: [{ nama: "Internal" }, { nama: "Eksternal" }],
    });
    console.log("Seeded SumberRisiko");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
