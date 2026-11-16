import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as createProjectHandler } from "@/app/api/projects/route";
import { requestPasswordReset } from "@/server/auth/service";
import type { AppDatabase, DatabaseBundle } from "@/server/db";
import {
  authTokens,
  emailOutbox,
  memberships,
  organizations,
  rateLimitBuckets,
  users,
} from "@/server/db/schema";
import { validateEnv } from "@/server/env";
import { redactValue } from "@/server/logger";
import {
  buildSmtpTransportConfig,
  processEmailOutboxRetries,
  setSmtpSenderForTests,
} from "@/server/mail/mailer";
import { verifyCsrfOrigin } from "@/server/security/csrf";
import {
  checkRateLimit,
  getClientIp,
  PostgresRateLimitStore,
  resetRateLimitsForTests,
} from "@/server/security/rate-limit";
import {
  assertSafeTestDatabaseTarget,
  extractSessionCookieHeader,
  jsonRequest,
  resetTestDatabase,
  seedMemberInOrg,
  setupTestDatabase,
  teardownTestDatabase,
} from "./test-helpers";

function makeTestSigningKey(tag: string): string {
  return ["unit", tag, "signing", "key", "2026"].join("-").padEnd(44, "0"); // gitleaks:allow
}

function setNodeEnv(val: string | undefined): void {
  const mutableEnv = process.env as Record<string, string | undefined>;
  if (val === undefined) {
    delete mutableEnv.NODE_ENV;
  } else {
    mutableEnv.NODE_ENV = val;
  }
}

describe("Security & reliability hardening regression suite", () => {
  let bundle: DatabaseBundle;
  const envSnapshot: Record<string, string | undefined> = {};
  const trackedKeys = [
    "NODE_ENV",
    "APP_URL",
    "NEXT_PUBLIC_APP_URL",
    "TRUSTED_ORIGINS",
    "TRUST_PROXY",
    "RATE_LIMIT_DRIVER",
    "ALLOW_SINGLE_INSTANCE_MEMORY_RATE_LIMIT",
    "DATABASE_URL",
    "TEST_DATABASE_URL",
    "SESSION_SECRET",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_SECURE",
    "SMTP_REQUIRE_TLS",
    "ALLOW_PROD_DEFERRED_EMAIL_QUEUE",
  ];

  beforeAll(async () => {
    for (const key of trackedKeys) {
      envSnapshot[key] = process.env[key];
    }
    bundle = await setupTestDatabase();
  });

  beforeEach(async () => {
    for (const key of trackedKeys) {
      if (key === "NODE_ENV") {
        setNodeEnv("test");
      } else if (envSnapshot[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = envSnapshot[key];
      }
    }
    setNodeEnv("test");
    process.env.APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.TRUSTED_ORIGINS = "http://localhost:3000";
    process.env.SESSION_SECRET = makeTestSigningKey("vitest");
    setSmtpSenderForTests(undefined);
    await resetTestDatabase(bundle);
  });

  afterEach(() => {
    setSmtpSenderForTests(undefined);
  });

  afterAll(async () => {
    for (const key of trackedKeys) {
      if (key === "NODE_ENV") {
        setNodeEnv(envSnapshot[key]);
      } else if (envSnapshot[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = envSnapshot[key];
      }
    }
    await teardownTestDatabase(bundle);
  });

  describe("1. Test database safety guard", () => {
    it("rejects non-test NODE_ENV, dev/prod DB targets, and matching DATABASE_URL without SQL execution", () => {
      expect(() =>
        assertSafeTestDatabaseTarget({
          nodeEnv: "development",
          targetUrl: "pglite://memory",
        })
      ).toThrow(/\[test-db-guard\]/);

      expect(() =>
        assertSafeTestDatabaseTarget({
          nodeEnv: "production",
          targetUrl: "postgresql://user:pass@127.0.0.1:5432/app_test",
        })
      ).toThrow(/\[test-db-guard\]/);

      expect(() =>
        assertSafeTestDatabaseTarget({
          nodeEnv: "test",
          targetUrl: "pglite://./.data/pgdata",
        })
      ).toThrow(/\[test-db-guard\]/);

      expect(() =>
        assertSafeTestDatabaseTarget({
          nodeEnv: "test",
          targetUrl: "postgresql://user:pass@127.0.0.1:5432/pusula_test",
          appDatabaseUrl: "postgresql://user:pass@127.0.0.1:5432/pusula_test",
        })
      ).toThrow(/matches active DATABASE_URL/);

      expect(() =>
        assertSafeTestDatabaseTarget({
          nodeEnv: "test",
          targetUrl: "postgresql://user:pass@127.0.0.1:5432/pusula_dev",
        })
      ).toThrow(/_test/);

      expect(() =>
        assertSafeTestDatabaseTarget({
          nodeEnv: "test",
          targetUrl: "postgresql://user:pass@prod-db.internal:5432/pusula_test",
        })
      ).toThrow(/prod/);

      expect(() =>
        assertSafeTestDatabaseTarget({
          nodeEnv: "test",
          targetUrl: "postgresql://user:pass@db.example.com:5432/pusula_test",
          allowRemoteTestDb: false,
        })
      ).toThrow(/remote/i);

      expect(() =>
        assertSafeTestDatabaseTarget({
          nodeEnv: "test",
          targetUrl: "postgresql://user:pass@127.0.0.1:5432/pusula_test",
          appDatabaseUrl: "postgresql://user:pass@127.0.0.1:5432/pusula_dev",
        })
      ).not.toThrow();

      expect(() =>
        assertSafeTestDatabaseTarget({
          nodeEnv: "test",
          targetUrl: "pglite://./.data/e2e-pgdata",
        })
      ).not.toThrow();
    });

    it("aborts resetTestDatabase before executing any SQL when NODE_ENV or target URL is unsafe", async () => {
      const executeSpy = vi.fn();
      const makeSpyBundle = (url: string): DatabaseBundle => ({
        kind: url.startsWith("pglite://") ? "pglite" : "pg",
        url,
        db: { execute: executeSpy } as unknown as AppDatabase,
      });

      try {
        setNodeEnv("production");
        await expect(resetTestDatabase(makeSpyBundle("pglite://memory"))).rejects.toThrow(
          /\[test-db-guard\]/
        );

        setNodeEnv("development");
        await expect(
          resetTestDatabase(makeSpyBundle("postgresql://user:pass@127.0.0.1:5432/pusula_test"))
        ).rejects.toThrow(/\[test-db-guard\]/);
      } finally {
        setNodeEnv("test");
      }

      await expect(resetTestDatabase(makeSpyBundle("pglite://./.data/pgdata"))).rejects.toThrow(
        /\[test-db-guard\]/
      );
      await expect(
        resetTestDatabase(makeSpyBundle("postgresql://user:pass@127.0.0.1:5432/pusula_dev"))
      ).rejects.toThrow(/\[test-db-guard\]/);

      expect(executeSpy).not.toHaveBeenCalled();
    });

    it("ignores DATABASE_URL fallback when TEST_DATABASE_URL is unset", async () => {
      process.env.DATABASE_URL = "pglite://./.data/pgdata";
      delete process.env.TEST_DATABASE_URL;
      const isolatedBundle = await setupTestDatabase();
      try {
        expect(isolatedBundle.url).toBe("pglite://memory");
      } finally {
        await teardownTestDatabase(isolatedBundle);
        bundle = await setupTestDatabase();
      }
    });
  });

  describe("2. Trusted proxy IP extraction & Postgres rate limiter", () => {
    it("extracts client IP strictly according to TRUST_PROXY mode and ignores spoofed headers", () => {
      const spoofedReq = new Request("http://localhost:3000/api/auth/login", {
        headers: {
          "x-forwarded-for": "198.51.100.1, 203.0.113.9",
          "x-real-ip": "198.51.100.2",
          "cf-connecting-ip": "198.51.100.3",
          "fly-client-ip": "198.51.100.4",
        },
      });

      const noneEnv = validateEnv({ NODE_ENV: "test" });
      expect(getClientIp(spoofedReq, noneEnv)).toBe("untrusted-proxy-direct");

      const cfEnv = validateEnv({ NODE_ENV: "test", TRUST_PROXY: "cloudflare" });
      expect(getClientIp(spoofedReq, cfEnv)).toBe("198.51.100.3");

      const flyEnv = validateEnv({ NODE_ENV: "test", TRUST_PROXY: "fly" });
      expect(getClientIp(spoofedReq, flyEnv)).toBe("198.51.100.4");

      const hops1Env = validateEnv({ NODE_ENV: "test", TRUST_PROXY: "hops:1" });
      expect(getClientIp(spoofedReq, hops1Env)).toBe("203.0.113.9");

      const hops2Env = validateEnv({ NODE_ENV: "test", TRUST_PROXY: "hops:2" });
      expect(getClientIp(spoofedReq, hops2Env)).toBe("198.51.100.1");

      const invalidIpReq = new Request("http://localhost:3000/api/auth/login", {
        headers: { "cf-connecting-ip": "not-an-ip", "x-forwarded-for": "evil-ip, 10.0.0.5" },
      });
      expect(getClientIp(invalidIpReq, cfEnv)).toBe("untrusted-proxy-direct");
      expect(getClientIp(invalidIpReq, hops1Env)).toBe("10.0.0.5");

      expect(() => validateEnv({ NODE_ENV: "test", TRUST_PROXY: "all" })).toThrow(/TRUST_PROXY/);
      expect(() => validateEnv({ NODE_ENV: "test", TRUST_PROXY: "hops:0" })).toThrow(
        /TRUST_PROXY/
      );
    });

    it("prevents rotating X-Forwarded-For spoofing from bypassing 429 when TRUST_PROXY=none", async () => {
      let finalRes: Response | undefined;
      for (let i = 0; i < 16; i += 1) {
        finalRes = await loginHandler(
          jsonRequest("/api/auth/login", {
            method: "POST",
            headers: { "x-forwarded-for": `198.51.100.${i + 10}` },
            body: { email: "nobody@studio.test", password: "BadPassword!123" },
          })
        );
      }
      expect(finalRes?.status).toBe(429);
    });

    it("enforces RATE_LIMIT_DRIVER=postgres atomic buckets and blocks memory driver in production", async () => {
      expect(() =>
        validateEnv({
          NODE_ENV: "production",
          DATABASE_URL: "postgresql://user:pass@db.example.com:5432/app",
          SESSION_SECRET: makeTestSigningKey("prod-ratelimit"),
          RATE_LIMIT_DRIVER: "memory",
        })
      ).toThrow(/RATE_LIMIT_DRIVER=memory/);

      const prodOptIn = validateEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@db.example.com:5432/app",
        SESSION_SECRET: makeTestSigningKey("prod-env"),
        RATE_LIMIT_DRIVER: "memory",
        ALLOW_SINGLE_INSTANCE_MEMORY_RATE_LIMIT: "true",
      });
      expect(prodOptIn.rateLimitDriver).toBe("memory");

      process.env.RATE_LIMIT_DRIVER = "postgres";
      const store = new PostgresRateLimitStore(() => bundle.db);
      const r1 = await checkRateLimit("auth:pg-test", "203.0.113.5", {
        limit: 2,
        windowMs: 60_000,
        store,
      });
      const r2 = await checkRateLimit("auth:pg-test", "203.0.113.5", {
        limit: 2,
        windowMs: 60_000,
        store,
      });
      const r3 = await checkRateLimit("auth:pg-test", "203.0.113.5", {
        limit: 2,
        windowMs: 60_000,
        store,
      });

      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);
      expect(r3.allowed).toBe(false);
      expect(r3.retryAfterSeconds).toBeGreaterThanOrEqual(1);

      const dbBuckets = await bundle.db.select().from(rateLimitBuckets);
      expect(dbBuckets).toHaveLength(1);
      expect(dbBuckets[0]?.count).toBe(3);

      // Expired bucket resets count atomically to 1
      const expired = await store.increment("auth:pg-exp", 1000, Date.now() - 5000);
      expect(expired.count).toBe(1);
      const resetAfterExpiry = await store.increment("auth:pg-exp", 1000, Date.now());
      expect(resetAfterExpiry.count).toBe(1);
    });

    it("routes loginHandler through RATE_LIMIT_DRIVER=postgres and clears buckets on resetRateLimitsForTests()", async () => {
      process.env.RATE_LIMIT_DRIVER = "postgres";

      let lastRes: Response | undefined;
      for (let i = 0; i < 16; i += 1) {
        lastRes = await loginHandler(
          jsonRequest("/api/auth/login", {
            method: "POST",
            body: { email: "nobody@studio.test", password: "BadPassword!123" },
          })
        );
      }
      expect(lastRes?.status).toBe(429);
      expect(lastRes?.headers.get("Retry-After")).toBeTruthy();

      const bucketsBeforeReset = await bundle.db.select().from(rateLimitBuckets);
      expect(bucketsBeforeReset).toHaveLength(1);
      expect(bucketsBeforeReset[0]?.key).toBe("auth:login:untrusted-proxy-direct");
      expect(bucketsBeforeReset[0]?.count).toBe(16);

      await resetRateLimitsForTests();
      const bucketsAfterReset = await bundle.db.select().from(rateLimitBuckets);
      expect(bucketsAfterReset).toHaveLength(0);
    });
  });

  describe("3. Exact-origin CSRF trust boundary", () => {
    it("rejects spoofed Host, untrusted request.url, and wrong protocol on Origin/Referer", async () => {
      await seedMemberInOrg(bundle, {
        organizationId: "org_csrf",
        organizationName: "CSRF Studio",
        organizationSlug: "csrf-studio",
        email: "csrf@studio.test",
        name: "CSRF Owner",
        password: "Password!2026",
        role: "owner",
      });
      const loginRes = await loginHandler(
        jsonRequest("/api/auth/login", {
          method: "POST",
          body: { email: "csrf@studio.test", password: "Password!2026" },
        })
      );
      const cookie = extractSessionCookieHeader(loginRes);

      // Spoofed Host header rejected even if Origin looks like localhost:3000
      const spoofedHostRes = await createProjectHandler(
        jsonRequest("/api/projects", {
          method: "POST",
          cookie,
          host: "spoofed.attacker.example",
          origin: "http://localhost:3000",
          body: { code: "CS-1", title: "Blocked", clientName: "Client" },
        })
      );
      expect(spoofedHostRes.status).toBe(403);
      expect((await spoofedHostRes.json()).error.code).toBe("CSRF_ORIGIN_MISMATCH");

      // Spoofed request.url host does NOT self-authorize untrusted Origin/Host
      const spoofedUrlReq = new Request("https://spoofed-url.attacker.example/api/projects", {
        method: "POST",
        headers: {
          Host: "spoofed-url.attacker.example",
          Origin: "https://spoofed-url.attacker.example",
        },
      });
      expect(verifyCsrfOrigin(spoofedUrlReq).ok).toBe(false);

      // Scheme mismatch in non-prod (https vs http://localhost:3000) rejected
      const wrongSchemeOriginReq = new Request("http://localhost:3000/api/projects", {
        method: "POST",
        headers: {
          Host: "localhost:3000",
          Origin: "https://localhost:3000",
          Cookie: cookie,
        },
      });
      expect(verifyCsrfOrigin(wrongSchemeOriginReq).ok).toBe(false);

      const wrongSchemeRefererReq = new Request("http://localhost:3000/api/projects", {
        method: "POST",
        headers: {
          Host: "localhost:3000",
          Referer: "https://localhost:3000/app",
          Cookie: cookie,
        },
      });
      expect(verifyCsrfOrigin(wrongSchemeRefererReq).ok).toBe(false);

      // Explicit TRUSTED_ORIGINS entry accepted when Host & Origin match
      process.env.TRUSTED_ORIGINS = "https://studio.example.com:8443";
      const trustedReq = new Request("http://localhost:3000/api/projects", {
        method: "POST",
        headers: {
          Host: "studio.example.com:8443",
          Origin: "https://studio.example.com:8443",
          Cookie: cookie,
        },
      });
      expect(verifyCsrfOrigin(trustedReq).ok).toBe(true);
    });
  });

  describe("4. Production SMTP auth/TLS, fail-closed 503 & durable outbox retries", () => {
    it("validates SMTP auth/TLS env config and redacts smtpPass", () => {
      expect(() =>
        validateEnv({
          NODE_ENV: "production",
          DATABASE_URL: "postgresql://user:pass@db.example.com:5432/app",
          SESSION_SECRET: makeTestSigningKey("prod-ratelimit"),
          SMTP_USER: "mailer@example.com",
        })
      ).toThrow(/SMTP_USER and SMTP_PASS/);

      const prodEnv = validateEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@db.example.com:5432/app",
        SESSION_SECRET: makeTestSigningKey("prod-env"),
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "465",
        SMTP_USER: "apikey",
        SMTP_PASS: "super-secret-smtp-password",
      });

      expect(prodEnv.smtpSecure).toBe(true);
      expect(prodEnv.smtpRequireTls).toBe(true);
      const transport = buildSmtpTransportConfig(prodEnv);
      expect(transport.auth).toEqual({ user: "apikey", pass: "super-secret-smtp-password" });
      expect(transport.secure).toBe(true);
      expect(transport.requireTLS).toBe(true);

      const redacted = redactValue({
        smtpPass: "super-secret-smtp-password",
        smtp_pass: "another-secret",
      }) as Record<string, unknown>;
      expect(redacted.smtpPass).toBe("[REDACTED]");
      expect(redacted.smtp_pass).toBe("[REDACTED]");
    });

    it("fails closed (503) in production on register & forgot-password when SMTP fails without deferred queue", async () => {
      await seedMemberInOrg(bundle, {
        organizationId: "org_mail",
        organizationName: "Mail Studio",
        organizationSlug: "mail-studio",
        email: "known@studio.test",
        name: "Known User",
        password: "Password!2026",
        role: "owner",
      });

      setNodeEnv("production");
      process.env.DATABASE_URL = "postgresql://user:pass@127.0.0.1:5432/pusula_test";
      process.env.SESSION_SECRET = makeTestSigningKey("prod-mail");
      process.env.RATE_LIMIT_DRIVER = "postgres";
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "apikey";
      process.env.SMTP_PASS = "secret-pass";
      process.env.ALLOW_PROD_DEFERRED_EMAIL_QUEUE = "false";

      setSmtpSenderForTests({
        send: async () => {
          throw new Error("SMTP connection refused");
        },
        verify: async () => {
          throw new Error("SMTP verify failed");
        },
      });

      const regRes = await registerHandler(
        jsonRequest("/api/auth/register", {
          method: "POST",
          body: {
            name: "Orphan Guard",
            workspaceName: "Orphan Studio",
            email: "orphan@studio.test",
            password: "StrongPassword!2026",
          },
        })
      );
      expect(regRes.status).toBe(503);
      expect((await regRes.json()).error.code).toBe("EMAIL_DELIVERY_UNAVAILABLE");

      // Register cleaned up newly created user/org on 503
      const orphanUsers = await bundle.db
        .select()
        .from(users)
        .where(eq(users.email, "orphan@studio.test"));
      expect(orphanUsers).toHaveLength(0);
      const allOrgs = await bundle.db.select().from(organizations);
      expect(allOrgs.map((o) => o.id)).toEqual(["org_mail"]);
      const allMemberships = await bundle.db.select().from(memberships);
      expect(allMemberships).toHaveLength(1);

      // Forgot-password returns identical 503 on BOTH known & unknown emails when SMTP readiness fails
      const forgotKnownRes = await forgotPasswordHandler(
        jsonRequest("/api/auth/forgot-password", {
          method: "POST",
          body: { email: "known@studio.test" },
        })
      );
      const forgotUnknownRes = await forgotPasswordHandler(
        jsonRequest("/api/auth/forgot-password", {
          method: "POST",
          body: { email: "unknown@studio.test" },
        })
      );
      expect(forgotKnownRes.status).toBe(503);
      expect(forgotUnknownRes.status).toBe(503);

      // Mid-send failure (verify passes, send fails) rolls back auth_token row
      setSmtpSenderForTests({
        verify: async () => {},
        send: async () => {
          throw new Error("Mid-send 421 error");
        },
      });
      await expect(requestPasswordReset("known@studio.test", bundle.db)).rejects.toThrow(
        /Unable to deliver email/
      );
      const tokensAfterRollback = await bundle.db.select().from(authTokens);
      expect(tokensAfterRollback).toHaveLength(0);
    });

    it("persists retry_scheduled outbox rows when deferred queue is allowed and recovers via processEmailOutboxRetries", async () => {
      setNodeEnv("production");
      process.env.DATABASE_URL = "postgresql://user:pass@127.0.0.1:5432/pusula_test";
      process.env.SESSION_SECRET = makeTestSigningKey("prod-mail");
      process.env.RATE_LIMIT_DRIVER = "postgres";
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.ALLOW_PROD_DEFERRED_EMAIL_QUEUE = "true";

      setSmtpSenderForTests(async () => {
        throw new Error("Transient 451 SMTP timeout");
      });

      const regRes = await registerHandler(
        jsonRequest("/api/auth/register", {
          method: "POST",
          body: {
            name: "Queued User",
            workspaceName: "Queued Studio",
            email: "queued@studio.test",
            password: "StrongPassword!2026",
          },
        })
      );
      expect(regRes.status).toBe(201);
      const regBody = await regRes.json();
      expect(regBody.emailDelivery).toEqual({
        status: "queued_for_retry",
        smtpDelivered: false,
        persistedInQueue: true,
      });

      const queuedRows = await bundle.db.select().from(emailOutbox);
      expect(queuedRows).toHaveLength(1);
      expect(queuedRows[0]?.status).toBe("retry_scheduled");
      expect(queuedRows[0]?.attempts).toBe(2);
      expect(queuedRows[0]?.lastError).toContain("Transient 451");

      // Make row due now and recover SMTP
      await bundle.db
        .update(emailOutbox)
        .set({ nextAttemptAt: new Date(Date.now() - 1000) })
        .where(eq(emailOutbox.id, queuedRows[0]!.id));

      const deliveredTo: string[] = [];
      setSmtpSenderForTests(async (payload) => {
        deliveredTo.push(payload.to);
      });

      const retryRes = await processEmailOutboxRetries(bundle.db);
      expect(retryRes).toEqual({ processed: 1, sent: 1, rescheduled: 0, failed: 0 });
      expect(deliveredTo).toEqual(["queued@studio.test"]);

      const updatedRows = await bundle.db.select().from(emailOutbox);
      expect(updatedRows[0]?.status).toBe("sent");
      expect(updatedRows[0]?.attempts).toBe(3);
      expect(updatedRows[0]?.sentAt).toBeInstanceOf(Date);
    });
  });
});
