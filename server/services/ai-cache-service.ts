import { createHash } from "node:crypto";
import type { ZodTypeAny } from "zod";
import { getCacheRedisClient } from "@/lib/cache";

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === "string") {
    return JSON.stringify(value.trim().toLowerCase());
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(String(value));
}

export class AiCacheService {
  static buildKey(namespace: string, payload: unknown) {
    const digest = createHash("sha256").update(stableSerialize(payload)).digest("hex");
    return `ai:${namespace}:${digest}`;
  }

  static async getParsed<TSchema extends ZodTypeAny>(key: string, schema: TSchema): Promise<TSchema["_output"] | null> {
    const client = getCacheRedisClient();
    const rawValue = await client?.get(key);

    if (!rawValue) {
      return null;
    }

    const parsedJson = JSON.parse(rawValue) as unknown;
    return schema.parse(parsedJson);
  }

  static async setJson(key: string, payload: unknown, ttlSeconds: number) {
    const client = getCacheRedisClient();
    await client?.set(key, JSON.stringify(payload), "EX", ttlSeconds);
  }
}
