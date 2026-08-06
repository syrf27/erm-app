import { prisma } from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "alfian@gmail.com" },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            }
          }
        }
      }
    }
  });

  if (!user) {
    console.log("User not found.");
    return;
  }

  console.log(`User: ${user.email}, Role: ${user.role?.name}`);
  const perms = user.role?.permissions.map(p => `${p.permission.resource}:${p.permission.action}`);
  console.log("Permissions:", perms);
  console.log("Has matriks-analisis-risiko:read?", perms?.includes("matriks-analisis-risiko:read"));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
