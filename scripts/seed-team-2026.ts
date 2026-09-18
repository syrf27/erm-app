import { config } from "dotenv";
import { TEAM_2026_DATA } from "../prisma/team-2026-data";

config({ path: process.env.DOTENV_CONFIG_PATH || ".env.local" });
config({ path: ".env" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { invalidateResourceCache } = await import("../src/lib/cache");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.identifikasiRisiko.updateMany({
        where: { teamId: { not: null } },
        data: { teamId: null },
      });
      await tx.userTeam.deleteMany({});
      await tx.team.deleteMany({});
      await tx.team.createMany({
        data: TEAM_2026_DATA.map((team) => ({ ...team })),
      });
    });

    await invalidateResourceCache("teams");

    console.log(`Seeded ${TEAM_2026_DATA.length} tim kerja for 2026.`);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
