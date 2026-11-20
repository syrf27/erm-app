import "dotenv/config";
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum dikonfigurasi untuk koneksi database.");
}

// Pass a plain configuration object instead of a pg.Pool instance. In a
// standalone build, the adapter and application can resolve different copies
// of `pg`; an external Pool then fails the adapter's instanceof check and is
// incorrectly treated as connection options.
const databaseConfig = {
  connectionString,
  max: 1, // Only open 1 connection per serverless function instance to prevent connection exhaustion
  idleTimeoutMillis: 5000, // Close idle connections quickly
  connectionTimeoutMillis: 5000, // Fail fast if database is unreachable
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(databaseConfig),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
