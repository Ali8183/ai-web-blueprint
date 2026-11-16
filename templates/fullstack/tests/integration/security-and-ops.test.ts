import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as devOutboxHandler } from "@/app/api/dev/outbox/route";
import { GET as healthHandler } from "@/app/api/health/route";
import { middleware } from "@/middleware";
import { type DatabaseBundle, setDbBundleForTests } from "@/server/db";
import { validateEnv } from "@/server/env";
import { redactValue } from "@/server/logger";
import { getSecurityHeaders } from "@/server/security/headers";
import { setupTestDatabase, teardownTestDatabase } from "./test-helpers";

describe("Production environment guard, security headers, outbox guard, health & logger", () => {
  let bundle: DatabaseBundle;

  beforeAll(async () => {
    bundle = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase(bundle);
  });

  it("refuses production startup on missing, short, or demo SESSION_SECRET and pglite:// fallback", () => {
    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@db.example.com:5432/app",
      })
    ).toThrow(/SESSION_SECRET/i);

    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@db.example.com:5432/app",
        SESSION_SECRET: "short-secret",
      })
    ).toThrow(/SESSION_SECRET/i);

    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@db.example.com:5432/app",
        SESSION_SECRET: "replace-with-at-least-32-chars-random-secret-before-running",
      })
    ).toThrow(/SESSION_SECRET/i);

    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        DATABASE_URL: "pglite://./.data/pgdata",
        SESSION_SECRET: "prod_9f8e7d6c5b4a39281716151413121110_strong",
      })
    ).toThrow(/pglite:\/\//i);

    const valid = validateEnv({
      NODE_ENV: "production",
      APP_URL: "https://pusula.example.com",
      DATABASE_URL: "postgresql://user:pass@db.example.com:5432/app",
      SESSION_SECRET: "prod_9f8e7d6c5b4a39281716151413121110_strong",
    });
    expect(valid.nodeEnv).toBe("production");
    expect(valid.appUrl).toBe("https://pusula.example.com");
  });

  it("emits hardened security headers without unsafe-eval in production and includes HSTS", () => {
    const prodHeaders = getSecurityHeaders(true);
    const map = new Map(prodHeaders.map((h) => [h.key, h.value]));

    const csp = map.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(map.get("X-Content-Type-Options")).toBe("nosniff");
    expect(map.get("X-Frame-Options")).toBe("DENY");
    expect(map.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(map.get("Permissions-Policy")).toContain("camera=()");
    expect(map.get("Strict-Transport-Security")).toContain("max-age=31536000");

    // Middleware attaches headers and request id
    const mwRes = middleware(new NextRequest("http://localhost:3000/"));
    expect(mwRes.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(mwRes.headers.get("X-Frame-Options")).toBe("DENY");
    expect(mwRes.headers.get("x-request-id")).toBeTruthy();
  });

  it("disables /api/dev/outbox with 404 in NODE_ENV=production", async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      const res = await devOutboxHandler(new Request("http://localhost:3000/api/dev/outbox"));
      expect(res.status).toBe(404);
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = prevNodeEnv;
    }
  });

  it("reports health 200 when DB is reachable and 503 without leaking secrets when DB fails", async () => {
    const okRes = await healthHandler();
    expect(okRes.status).toBe(200);
    const okBody = await okRes.json();
    expect(okBody.status).toBe("ok");
    expect(okBody.db).toBe("ok");

    // Simulate unreachable DB safely without mutating the healthy bundle
    setDbBundleForTests({
      kind: "pg",
      url: "postgresql://secret-user:super-secret-pass@127.0.0.1:1/bad",
      db: {
        execute: async () => {
          throw new Error("connect ECONNREFUSED postgresql://secret-user:super-secret-pass@127.0.0.1:1");
        },
      } as unknown as DatabaseBundle["db"],
    });

    try {
      const failRes = await healthHandler();
      expect(failRes.status).toBe(503);
      const rawText = await failRes.text();
      expect(rawText).not.toContain("super-secret-pass");
      expect(rawText).not.toContain("ECONNREFUSED");
    } finally {
      setDbBundleForTests(bundle);
    }
  });

  it("redacts passwords, tokens, and cookies in structured log payloads", () => {
    const sanitized = redactValue({
      email: "user@example.com",
      password: "MySecretPassword",
      token: "raw-reset-token",
      cookie: "pusula.session_token=abc.def",
      rawLine: "Cookie: pusula.session_token=abc.def; other=1",
      header: "Authorization: Bearer super-secret-jwt",
    }) as Record<string, unknown>;

    expect(sanitized.email).toBe("user@example.com");
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.token).toBe("[REDACTED]");
    expect(sanitized.cookie).toBe("[REDACTED]");
    expect(sanitized.rawLine).toBe("Cookie: [REDACTED]; other=1");
    expect(sanitized.header).toBe("Authorization: [REDACTED]");
  });
});
