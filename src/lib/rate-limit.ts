import Redis from "ioredis";
import { getErrorMessage } from "@/lib/errors";

type RateLimitState = {
  count: number;
  retryAfterSeconds: number;
};

type MemoryBucket = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = global as typeof global & {
  authRateLimitMemory?: Map<string, MemoryBucket>;
  authRateLimitRedis?: Redis | null;
};

function getMemoryStore() {
  if (!globalForRateLimit.authRateLimitMemory) {
    globalForRateLimit.authRateLimitMemory = new Map<string, MemoryBucket>();
  }

  return globalForRateLimit.authRateLimitMemory;
}

function getRedisClient() {
  if (globalForRateLimit.authRateLimitRedis !== undefined) {
    return globalForRateLimit.authRateLimitRedis;
  }

  try {
    const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
    client.on("error", (error) => {
      console.error("[RateLimit] Redis unavailable:", getErrorMessage(error));
    });
    globalForRateLimit.authRateLimitRedis = client;
  } catch (error) {
    console.error("[RateLimit] Failed to initialize Redis client:", getErrorMessage(error));
    globalForRateLimit.authRateLimitRedis = null;
  }

  return globalForRateLimit.authRateLimitRedis;
}

function readMemoryState(key: string) {
  const store = getMemoryStore();
  const bucket = store.get(key);

  if (!bucket) {
    return { count: 0, retryAfterSeconds: 0 };
  }

  if (bucket.resetAt <= Date.now()) {
    store.delete(key);
    return { count: 0, retryAfterSeconds: 0 };
  }

  return {
    count: bucket.count,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000)),
  };
}

function incrementMemoryState(key: string, windowSeconds: number): RateLimitState {
  const store = getMemoryStore();
  const current = readMemoryState(key);
  const existing = store.get(key);

  if (!existing || current.count === 0) {
    const next: MemoryBucket = {
      count: 1,
      resetAt: Date.now() + (windowSeconds * 1000),
    };
    store.set(key, next);
    return {
      count: next.count,
      retryAfterSeconds: windowSeconds,
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    count: existing.count,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - Date.now()) / 1000)),
  };
}

function resetMemoryState(key: string) {
  getMemoryStore().delete(key);
}

async function readRedisState(key: string): Promise<RateLimitState | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const result = await client.multi().get(key).ttl(key).exec();
    const count = Number(result?.[0]?.[1] ?? 0);
    const ttl = Number(result?.[1]?.[1] ?? -1);

    return {
      count,
      retryAfterSeconds: ttl > 0 ? ttl : 0,
    };
  } catch (error) {
    console.error("[RateLimit] Redis read failed:", getErrorMessage(error));
    return null;
  }
}

async function incrementRedisState(key: string, windowSeconds: number): Promise<RateLimitState | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const result = await client.multi().incr(key).ttl(key).exec();
    const count = Number(result?.[0]?.[1] ?? 0);
    let ttl = Number(result?.[1]?.[1] ?? -1);

    if (ttl < 0) {
      await client.expire(key, windowSeconds);
      ttl = windowSeconds;
    }

    return {
      count,
      retryAfterSeconds: ttl,
    };
  } catch (error) {
    console.error("[RateLimit] Redis increment failed:", getErrorMessage(error));
    return null;
  }
}

async function resetRedisState(key: string) {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    await client.del(key);
  } catch (error) {
    console.error("[RateLimit] Redis reset failed:", getErrorMessage(error));
  }
}

export async function getRateLimitState(key: string) {
  const redisState = await readRedisState(key);
  if (redisState) {
    return redisState;
  }

  return readMemoryState(key);
}

export async function incrementRateLimit(key: string, windowSeconds: number) {
  const redisState = await incrementRedisState(key, windowSeconds);
  if (redisState) {
    return redisState;
  }

  return incrementMemoryState(key, windowSeconds);
}

export async function resetRateLimit(key: string) {
  await resetRedisState(key);
  resetMemoryState(key);
}
