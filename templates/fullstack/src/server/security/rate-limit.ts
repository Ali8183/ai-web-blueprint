import net from "node:net";
import { sql } from "drizzle-orm";
import { type AppDatabase, getDb } from "@/server/db";
import { rateLimitBuckets } from "@/server/db/schema";
import { type AppEnv, getEnv } from "@/server/env";

/**
 * Pluggable Rate Limit Store abstraction.
 *
 * `PostgresRateLimitStore` provides atomic multi-instance persistence backed by `rate_limit_bucket`
 * and is the mandatory production default (`RATE_LIMIT_DRIVER=postgres`).
 * `InMemoryRateLimitStore` is intended only for local dev, unit tests, or explicitly opted-in
 * single-instance deployments (`ALLOW_SINGLE_INSTANCE_MEMORY_RATE_LIMIT=true`).
 */
export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number, now?: number): Promise<RateLimitEntry>;
  clear(): Promise<void>;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, RateLimitEntry>();
  private readonly maxEntries: number;

  constructor(maxEntries = 10_000) {
    this.maxEntries = maxEntries;
  }

  async increment(key: string, windowMs: number, now = Date.now()): Promise<RateLimitEntry> {
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      if (this.buckets.size >= this.maxEntries) {
        this.pruneExpired(now);
        if (this.buckets.size >= this.maxEntries) {
          const oldestKey = this.buckets.keys().next().value;
          if (oldestKey !== undefined) {
            this.buckets.delete(oldestKey);
          }
        }
      }
      const created: RateLimitEntry = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, created);
      return created;
    }

    const updated: RateLimitEntry = { count: existing.count + 1, resetAt: existing.resetAt };
    this.buckets.set(key, updated);
    return updated;
  }

  async clear(): Promise<void> {
    this.buckets.clear();
  }

  private pruneExpired(now: number): void {
    for (const [k, entry] of this.buckets.entries()) {
      if (entry.resetAt <= now) {
        this.buckets.delete(k);
      }
    }
  }
}

export class PostgresRateLimitStore implements RateLimitStore {
  private readonly resolveDb: () => AppDatabase;

  constructor(resolveDb: () => AppDatabase = getDb) {
    this.resolveDb = resolveDb;
  }

  async increment(key: string, windowMs: number, now = Date.now()): Promise<RateLimitEntry> {
    const db = this.resolveDb();
    const nowIso = new Date(now).toISOString();
    const nextResetIso = new Date(now + windowMs).toISOString();

    const result = await db.execute(sql`
      INSERT INTO "rate_limit_bucket" ("key", "count", "reset_at")
      VALUES (${key}, 1, ${nextResetIso}::timestamptz)
      ON CONFLICT ("key") DO UPDATE
      SET
        "count" = CASE
          WHEN "rate_limit_bucket"."reset_at" <= ${nowIso}::timestamptz THEN 1
          ELSE "rate_limit_bucket"."count" + 1
        END,
        "reset_at" = CASE
          WHEN "rate_limit_bucket"."reset_at" <= ${nowIso}::timestamptz THEN ${nextResetIso}::timestamptz
          ELSE "rate_limit_bucket"."reset_at"
        END
      RETURNING "count", "reset_at"
    `);

    const rows =
      (Array.isArray(result)
        ? result
        : (result as { rows?: Array<Record<string, unknown>> }).rows) ?? [];
    const row = rows[0];
    if (!row) {
      throw new Error("PostgresRateLimitStore failed to return bucket state.");
    }

    const rawResetAt = row.reset_at ?? row.resetAt;
    const resetAtMs =
      rawResetAt instanceof Date
        ? rawResetAt.getTime()
        : new Date(String(rawResetAt)).getTime();

    return {
      count: Number(row.count),
      resetAt: resetAtMs,
    };
  }

  async clear(): Promise<void> {
    const db = this.resolveDb();
    await db.delete(rateLimitBuckets);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  store?: RateLimitStore;
}

const defaultMemoryStore = new InMemoryRateLimitStore();
const defaultPostgresStore = new PostgresRateLimitStore();

export const UNTRUSTED_PROXY_DIRECT = "untrusted-proxy-direct";

export function getClientIp(request: Request, env: AppEnv = getEnv()): string {
  switch (env.trustedProxyMode) {
    case "cloudflare": {
      const cfIp = request.headers.get("cf-connecting-ip")?.trim();
      return cfIp && net.isIP(cfIp) !== 0 ? cfIp : UNTRUSTED_PROXY_DIRECT;
    }
    case "fly": {
      const flyIp = request.headers.get("fly-client-ip")?.trim();
      return flyIp && net.isIP(flyIp) !== 0 ? flyIp : UNTRUSTED_PROXY_DIRECT;
    }
    case "hops": {
      const forwarded = request.headers.get("x-forwarded-for");
      if (!forwarded) {
        return UNTRUSTED_PROXY_DIRECT;
      }
      const ips = forwarded
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0 && net.isIP(part) !== 0);
      if (ips.length === 0) {
        return UNTRUSTED_PROXY_DIRECT;
      }
      const index = Math.max(0, ips.length - env.trustedProxyHops);
      return ips[index] ?? UNTRUSTED_PROXY_DIRECT;
    }
    case "none":
    default:
      return UNTRUSTED_PROXY_DIRECT;
  }
}

export function getRateLimitStore(env: AppEnv = getEnv()): RateLimitStore {
  return env.rateLimitDriver === "postgres" ? defaultPostgresStore : defaultMemoryStore;
}

export async function checkRateLimit(
  scope: string,
  identifier: string,
  options: RateLimiterOptions
): Promise<RateLimitResult> {
  const store = options.store ?? getRateLimitStore();
  const now = Date.now();
  const key = `${scope}:${identifier}`;
  const entry = await store.increment(key, options.windowMs, now);
  const remaining = Math.max(0, options.limit - entry.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

  return {
    allowed: entry.count <= options.limit,
    limit: options.limit,
    remaining,
    retryAfterSeconds,
  };
}

export async function resetRateLimitsForTests(): Promise<void> {
  await defaultMemoryStore.clear();
  try {
    const env = getEnv();
    if (env.rateLimitDriver === "postgres") {
      await defaultPostgresStore.clear();
    }
  } catch {
    // Ignore when DB is not initialized yet during pure unit tests
  }
}
