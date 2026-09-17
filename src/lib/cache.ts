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
  "teams",
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
  "jenis-risiko",
  "kategori-risiko",
  "level-kemungkinan",
  "level-dampak",
  "level-risiko",
  "matriks-analisis-risiko",
];

const AUTH_RESOURCES = ["users", "roles", "permissions"];

export const REVALIDATE_CACHE_CONTROL =
  "private, no-cache, max-age=0, must-revalidate";

export function isReferenceResource(resource: string): boolean {
  return REFERENCE_RESOURCES.includes(resource);
}

export function shouldInvalidateDashboard(resource: string): boolean {
  return RISK_DATA_RESOURCES.includes(resource);
}

export function isAuthResource(resource: string): boolean {
  return AUTH_RESOURCES.includes(resource);
}

const memoryCache = new Map<string, { value: any; expiry: number }>();

export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // fall through to fetcher
    }
  } else if (process.env.NODE_ENV !== "production") {
    // In-memory caching is safe for the single local development process.
    // In production, separate serverless instances cannot invalidate each
    // other's memory, so bypass this cache when Redis is not configured.
    const now = Date.now();
    const cached = memoryCache.get(key);
    if (cached && cached.expiry > now) {
      return cached.value as T;
    }
  } else {
    return fetcher();
  }

  const data = await fetcher();

  if (redis) {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
    } catch {
      // non-critical
    }
  } else if (process.env.NODE_ENV !== "production") {
    // Cache in memory for warmed up serverless instances
    memoryCache.set(key, {
      value: data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  return data;
}

export async function delCache(key: string): Promise<void> {
  memoryCache.delete(key);
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // non-critical
  }
}

export async function delCacheByPattern(pattern: string): Promise<void> {
  // Clear matching keys from memory cache
  const regexPattern = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  const keys = Array.from(memoryCache.keys());
  for (const key of keys) {
    if (regexPattern.test(key)) {
      memoryCache.delete(key);
    }
  }

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

export async function invalidateResourceCache(resource: string): Promise<void> {
  const invalidations: Promise<void>[] = [
    // Covers current reference keys and any resource-scoped cache added later.
    delCacheByPattern(`ref:${resource}:*`),
    delCacheByPattern(`resource:${resource}:*`),
  ];

  if (shouldInvalidateDashboard(resource)) {
    invalidations.push(delCache("dashboard:stats"));
  }

  if (isAuthResource(resource)) {
    invalidations.push(
      delCacheByPattern("user:context:*"),
      delCacheByPattern("user:permissions:*"),
      delCacheByPattern("notification:user:*")
    );
  }

  await Promise.all(invalidations);
}
