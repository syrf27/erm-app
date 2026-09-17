import "dotenv/config";

import { DEFAULT_PROSES_BISNIS } from "../prisma/proses-bisnis-data";
import { prisma } from "../src/lib/prisma";
import { invalidateResourceCache } from "../src/lib/cache";

async function main() {
  let created = 0;
  let existing = 0;

  for (const nama of DEFAULT_PROSES_BISNIS) {
    const current = await prisma.prosesBisnis.findFirst({
      where: { nama },
      select: { id: true },
    });

    if (current) {
      existing += 1;
      continue;
    }

    await prisma.prosesBisnis.create({ data: { nama } });
    created += 1;
  }

  await invalidateResourceCache("proses-bisnis");

  console.log(
    `Proses Bisnis synchronized: ${created} created, ${existing} already existed.`
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
