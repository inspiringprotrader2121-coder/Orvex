import type { ConnectionOptions } from "bullmq";

export function getRedisConnection(): ConnectionOptions {
  const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");
  const database = Number(redisUrl.pathname.replace("/", "") || "0");

  return {
    db: Number.isNaN(database) ? 0 : database,
    host: redisUrl.hostname,
    maxRetriesPerRequest: null,
    password: redisUrl.password || undefined,
    port: redisUrl.port ? Number(redisUrl.port) : 6379,
    tls: redisUrl.protocol === "rediss:" ? {} : undefined,
    username: redisUrl.username || undefined,
  };
}
