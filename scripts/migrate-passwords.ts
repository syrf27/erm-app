import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password-utils";

async function main() {
  // Check current password format for known users
  const users = await prisma.$queryRawUnsafe(
    'SELECT id, email, password, length(password) as pwd_len FROM "User"'
  ) as Array<{ id: number; email: string; password: string; pwd_len: number }>;

  console.log("Current users:");
  for (const user of users) {
    console.log(`  ${user.email}: password length=${user.pwd_len}`);
  }

  // Find users with plaintext passwords (short, no salt:key format)
  const usersToMigrate = users.filter((u) => !u.password.includes(":"));

  console.log(`\nMigrating ${usersToMigrate.length} users to hashed passwords`);

  for (const user of usersToMigrate) {
    const hashedPassword = hashPassword(user.password);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    console.log(`  Updated: ${user.email}`);
  }

  // Also update seed file passwords for next time
  console.log("\nDone! Passwords are now hashed.");
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
