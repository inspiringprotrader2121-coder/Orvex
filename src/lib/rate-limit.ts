import Redis from "ioredis";
import { pool } from "@/lib/db";
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

function isRedisDisabledForBuild() {
  return process.env.NEXT_PHASE === "phase-production-build"
    || process.env.npm_lifecycle_event === "build";
}

function getMemoryStore() {
  if (!globalForRateLimit.authRateLimitMemory) {
    globalForRateLimit.authRateLimitMemory = new Map<string, MemoryBucket>();
  }

  return globalForRateLimit.authRateLimitMemory;
}

function canUseMemoryFallback() {
  return process.env.NODE_ENV !== "production" || isRedisDisabledForBuild();
}

function getRedisClient() {
  if (globalForRateLimit.authRateLimitRedis !== undefined) {
    return globalForRateLimit.authRateLimitRedis;
  }

  if (isRedisDisabledForBuild()) {
    globalForRateLimit.authRateLimitRedis = null;
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

async function readDatabaseState(key: string): Promise<RateLimitState | null> {
  if (isRedisDisabledForBuild()) {
    return null;
  }

  try {
    const { rows } = await pool.query<{
      count: number;
      expiresAt: Date;
    }>(`
      select
        count,
        expires_at as "expiresAt"
      from rate_limit_counters
      where key = $1
    `, [key]);

    const row = rows[0];
    if (!row) {
      return { count: 0, retryAfterSeconds: 0 };
    }

    const retryAfterSeconds = Math.max(0, Math.ceil((new Date(row.expiresAt).getTime() - Date.now()) / 1000));

    if (retryAfterSeconds <= 0) {
      await resetDatabaseState(key);
      return { count: 0, retryAfterSeconds: 0 };
    }

    return {
      count: Number(row.count ?? 0),
      retryAfterSeconds,
    };
  } catch (error) {
    console.error("[RateLimit] Database read failed:", getErrorMessage(error));
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

async function incrementDatabaseState(key: string, windowSeconds: number): Promise<RateLimitState | null> {
  if (isRedisDisabledForBuild()) {
    return null;
  }

  try {
    const { rows } = await pool.query<{
      count: number;
      expiresAt: Date;
    }>(`
      insert into rate_limit_counters (key, count, expires_at, updated_at)
      values ($1, 1, now() + ($2 * interval '1 second'), now())
      on conflict (key)
      do update set
        count = case
          when rate_limit_counters.expires_at <= now() then 1
          else rate_limit_counters.count + 1
        end,
        expires_at = case
          when rate_limit_counters.expires_at <= now() then now() + ($2 * interval '1 second')
          else rate_limit_counters.expires_at
        end,
        updated_at = now()
      returning
        count,
        expires_at as "expiresAt"
    `, [key, windowSeconds]);

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      count: Number(row.count ?? 0),
      retryAfterSeconds: Math.max(1, Math.ceil((new Date(row.expiresAt).getTime() - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error("[RateLimit] Database increment failed:", getErrorMessage(error));
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

async function resetDatabaseState(key: string) {
  if (isRedisDisabledForBuild()) {
    return;
  }

  try {
    await pool.query("delete from rate_limit_counters where key = $1", [key]);
  } catch (error) {
    console.error("[RateLimit] Database reset failed:", getErrorMessage(error));
  }
}

export async function getRateLimitState(key: string) {
  const redisState = await readRedisState(key);
  if (redisState) {
    return redisState;
  }

  const databaseState = await readDatabaseState(key);
  if (databaseState) {
    return databaseState;
  }

  if (canUseMemoryFallback()) {
    return readMemoryState(key);
  }

  return { count: 0, retryAfterSeconds: 0 };
}

export async function incrementRateLimit(key: string, windowSeconds: number) {
  const redisState = await incrementRedisState(key, windowSeconds);
  if (redisState) {
    return redisState;
  }

  const databaseState = await incrementDatabaseState(key, windowSeconds);
  if (databaseState) {
    return databaseState;
  }

  if (canUseMemoryFallback()) {
    return incrementMemoryState(key, windowSeconds);
  }

  return { count: 1, retryAfterSeconds: windowSeconds };
}

export async function resetRateLimit(key: string) {
  await resetRedisState(key);
  await resetDatabaseState(key);

  if (canUseMemoryFallback()) {
    resetMemoryState(key);
  }
}
