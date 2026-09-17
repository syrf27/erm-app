import "dotenv/config";

import { DEFAULT_AREA_DAMPAK } from "../prisma/area-dampak-data";
import { prisma } from "../src/lib/prisma";
import { invalidateResourceCache } from "../src/lib/cache";

async function main() {
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const item of DEFAULT_AREA_DAMPAK) {
    const current = await prisma.areaDampak.findFirst({
      where: {
        OR: [
          { kode: item.kode },
          { nama: { in: [...item.aliases], mode: "insensitive" } },
        ],
      },
    });

    if (current) {
      if (current.kode === item.kode && current.nama === item.nama) {
        unchanged += 1;
        continue;
      }

      await prisma.areaDampak.update({
        where: { id: current.id },
        data: { kode: item.kode, nama: item.nama },
      });
      updated += 1;
      continue;
    }

    await prisma.areaDampak.create({
      data: { kode: item.kode, nama: item.nama },
    });
    created += 1;
  }

  await invalidateResourceCache("area-dampak");
  console.log(
    `Area Dampak synchronized: ${created} created, ${updated} updated, ${unchanged} unchanged.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
