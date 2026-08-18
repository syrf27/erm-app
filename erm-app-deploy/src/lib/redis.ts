import "dotenv/config";
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const REDIS_URL = process.env.REDIS_URL;

export const redis = REDIS_URL
  ? (globalForRedis.redis ??
      new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        retryStrategy: null,
        lazyConnect: true,
      }))
  : null;

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}
