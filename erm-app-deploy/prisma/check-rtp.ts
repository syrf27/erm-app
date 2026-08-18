import { prisma } from "../src/lib/prisma";

async function main() {
  const rencana = await prisma.rencanaPenanganan.findMany({
    include: {
      identifikasiRisiko: true
    }
  });
  console.log(rencana.map(r => ({
    id: r.id,
    identId: r.identifikasiRisikoId,
    risiko: r.identifikasiRisiko.risiko,
    rencana: r.rencanaTidakPenanganan
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
