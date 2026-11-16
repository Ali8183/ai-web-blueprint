import crypto from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import {
  applyMigrations,
  closeDb,
  createDatabaseBundle,
  type DatabaseBundle,
  setDbBundleForTests,
} from "@/server/db";
import { accounts, memberships, organizations, type Role, users } from "@/server/db/schema";
import { clearOutboxForTests } from "@/server/mail/mailer";
import { resetRateLimitsForTests } from "@/server/security/rate-limit";

export const TEST_APP_URL = "http://localhost:3000";

const LOCAL_TEST_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "postgres"]);

export interface SafeTestDatabaseCheckInput {
  nodeEnv: string | undefined;
  targetUrl: string;
  appDatabaseUrl?: string;
  allowRemoteTestDb?: boolean;
}

export function assertSafeTestDatabaseTarget(input: SafeTestDatabaseCheckInput): void {
  if (input.nodeEnv !== "test") {
    throw new Error(
      `[test-db-guard] Refusing destructive test database operation when NODE_ENV="${input.nodeEnv ?? ""}" (must be "test").`
    );
  }

  const target = input.targetUrl?.trim();
  if (!target) {
    throw new Error("[test-db-guard] Missing TEST_DATABASE_URL target.");
  }

  const appDb = input.appDatabaseUrl?.trim();
  if (appDb && appDb !== "pglite://memory" && appDb !== "pglite://memory://" && appDb === target) {
    throw new Error(
      `[test-db-guard] Refusing test operations because TEST_DATABASE_URL matches active DATABASE_URL ("${target}").`
    );
  }

  if (target.startsWith("pglite://")) {
    const rawPath = target.slice("pglite://".length).trim();
    if (
      rawPath === "memory" ||
      rawPath === "memory://" ||
      /(^|[\\/._-])(test|e2e)([\\/._-]|$)/i.test(rawPath)
    ) {
      return;
    }
    throw new Error(
      `[test-db-guard] Refusing non-test pglite path "${target}". Expected pglite://memory or a path containing "test" or "e2e".`
    );
  }

  if (target.startsWith("postgres://") || target.startsWith("postgresql://")) {
    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      throw new Error(`[test-db-guard] Invalid PostgreSQL TEST_DATABASE_URL: "${target}".`);
    }

    const hostname = parsed.hostname.toLowerCase();
    const dbName = parsed.pathname.replace(/^\/+/, "").toLowerCase();
    const options = parsed.searchParams.get("options")?.toLowerCase() ?? "";
    const schemaParam = parsed.searchParams.get("schema")?.toLowerCase() ?? "";

    if (hostname.includes("prod") || dbName.includes("prod")) {
      throw new Error(
        `[test-db-guard] Refusing PostgreSQL test target with "prod" in host or database name: "${hostname}/${dbName}".`
      );
    }

    const hasTestIdentifier =
      dbName.endsWith("_test") ||
      dbName.endsWith("-test") ||
      options.includes("test_") ||
      schemaParam.includes("test_");

    if (!hasTestIdentifier) {
      throw new Error(
        `[test-db-guard] PostgreSQL test database name "${dbName}" must end with "_test" or "-test" (or scope schema/options containing "test_").`
      );
    }

    if (!LOCAL_TEST_HOSTS.has(hostname) && !input.allowRemoteTestDb) {
      throw new Error(
        `[test-db-guard] Refusing remote PostgreSQL test host "${hostname}" without ALLOW_REMOTE_TEST_DB=true.`
      );
    }
    return;
  }

  throw new Error(`[test-db-guard] Unsupported TEST_DATABASE_URL protocol: "${target}".`);
}

export async function setupTestDatabase(): Promise<DatabaseBundle> {
  process.env.APP_URL = TEST_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = TEST_APP_URL;
  process.env.TRUSTED_ORIGINS = TEST_APP_URL;
  process.env.SESSION_SECRET =
    process.env.SESSION_SECRET ||
    ["vitest", "local", "signing", "key", "2026"].join("-").padEnd(44, "0"); // gitleaks:allow

  const targetUrl = process.env.TEST_DATABASE_URL?.trim() || "pglite://memory";

  assertSafeTestDatabaseTarget({
    nodeEnv: process.env.NODE_ENV,
    targetUrl,
    appDatabaseUrl: process.env.DATABASE_URL,
    allowRemoteTestDb: process.env.ALLOW_REMOTE_TEST_DB === "true",
  });

  const bundle = createDatabaseBundle(targetUrl);
  setDbBundleForTests(bundle);
  await applyMigrations(bundle);
  await resetTestDatabase(bundle);
  return bundle;
}

export async function resetTestDatabase(bundle: DatabaseBundle): Promise<void> {
  assertSafeTestDatabaseTarget({
    nodeEnv: process.env.NODE_ENV,
    targetUrl: bundle.url,
    appDatabaseUrl: process.env.DATABASE_URL,
    allowRemoteTestDb: process.env.ALLOW_REMOTE_TEST_DB === "true",
  });

  await bundle.db.execute(
    sql`TRUNCATE TABLE "email_outbox", "rate_limit_bucket", "idempotency_key", "project", "membership", "organization", "auth_token", "verification", "session", "account", "user" RESTART IDENTITY CASCADE`
  );
  clearOutboxForTests();
  await resetRateLimitsForTests();
}

export async function teardownTestDatabase(bundle: DatabaseBundle): Promise<void> {
  clearOutboxForTests();
  await resetRateLimitsForTests();
  await closeDb(bundle);
  setDbBundleForTests(undefined);
}

export function extractSessionCookieHeader(response: Response): string {
  const cookies = response.headers.getSetCookie();
  const pairs = cookies
    .map((raw) => raw.split(";")[0]?.trim())
    .filter((v): v is string => Boolean(v && !v.endsWith("=")));
  return pairs.join("; ");
}

export function jsonRequest(
  urlPath: string,
  options: {
    method?: string;
    body?: unknown;
    cookie?: string;
    origin?: string | null;
    host?: string | null;
    headers?: Record<string, string>;
  } = {}
): Request {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.cookie) {
    headers.set("Cookie", options.cookie);
  }
  if (options.origin !== null) {
    headers.set("Origin", options.origin ?? TEST_APP_URL);
  }
  if (options.host !== null) {
    headers.set("Host", options.host ?? "localhost:3000");
  }

  return new Request(`${TEST_APP_URL}${urlPath}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

export async function seedMemberInOrg(
  bundle: DatabaseBundle,
  params: {
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    email: string;
    name: string;
    password: string;
    role: Role;
  }
): Promise<{ userId: string; organizationId: string }> {
  const now = new Date();
  const userId = `usr_${crypto.randomUUID()}`;
  const passwordHash = await hashPassword(params.password);

  await bundle.db
    .insert(organizations)
    .values({
      id: params.organizationId,
      name: params.organizationName,
      slug: params.organizationSlug,
      studioCode: params.organizationName.slice(0, 2).toUpperCase(),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  await bundle.db.insert(users).values({
    id: userId,
    name: params.name,
    email: params.email.toLowerCase(),
    emailVerified: true,
    activeOrganizationId: params.organizationId,
    createdAt: now,
    updatedAt: now,
  });

  await bundle.db.insert(accounts).values({
    id: `acc_${crypto.randomUUID()}`,
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  await bundle.db.insert(memberships).values({
    id: `mem_${crypto.randomUUID()}`,
    organizationId: params.organizationId,
    userId,
    role: params.role,
    createdAt: now,
  });

  return { userId, organizationId: params.organizationId };
}
