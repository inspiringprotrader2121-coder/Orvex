import Redis from "ioredis";
import { getErrorMessage } from "@/lib/errors";

const globalForCache = global as typeof global & {
  orvexCacheRedis?: Redis | null;
};

function isRedisDisabledForBuild() {
  return process.env.NEXT_PHASE === "phase-production-build"
    || process.env.npm_lifecycle_event === "build";
}

export function getCacheRedisClient() {
  if (globalForCache.orvexCacheRedis !== undefined) {
    return globalForCache.orvexCacheRedis;
  }

  if (isRedisDisabledForBuild()) {
    globalForCache.orvexCacheRedis = null;
    return globalForCache.orvexCacheRedis;
  }

  try {
    const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
    client.on("error", (error) => {
      console.error("[Cache] Redis unavailable:", getErrorMessage(error));
    });
    globalForCache.orvexCacheRedis = client;
  } catch (error) {
    console.error("[Cache] Failed to initialize Redis client:", getErrorMessage(error));
    globalForCache.orvexCacheRedis = null;
  }

  return globalForCache.orvexCacheRedis;
}
