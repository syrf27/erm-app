import { redis } from "./redis";

const REFERENCE_RESOURCES = [
  "sasaran",
  "proses-bisnis",
  "pemangku-kepentingan",
  "peraturan-perundangan",
  "jenis-risiko",
  "sumber-risiko",
  "kategori-risiko",
  "area-dampak",
  "level-kemungkinan",
  "level-dampak",
  "level-risiko",
  "opsi-penanganan",
  "kriteria-kemungkinan",
  "kriteria-dampak",
  "matriks-risiko",
  "unit-kerja",
  "kegiatan",
  "matriks-analisis-risiko",
];

const RISK_DATA_RESOURCES = [
  "identifikasi-risiko",
  "analisis-risiko",
  "evaluasi-risiko",
  "rencana-penanganan",
  "pelaporan-risiko",
  "kri",
  "sasaran",
  "proses-bisnis",
];

const AUTH_RESOURCES = ["users", "roles", "permissions"];

export function isReferenceResource(resource: string): boolean {
  return REFERENCE_RESOURCES.includes(resource);
}

export function shouldInvalidateDashboard(resource: string): boolean {
  return RISK_DATA_RESOURCES.includes(resource);
}

export function isAuthResource(resource: string): boolean {
  return AUTH_RESOURCES.includes(resource);
}

export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  if (!redis) return fetcher();

  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // fall through to fetcher
  }

  const data = await fetcher();

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch {
    // non-critical
  }

  return data;
}

export async function delCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // non-critical
  }
}

export async function delCacheByPattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // non-critical
  }
}
