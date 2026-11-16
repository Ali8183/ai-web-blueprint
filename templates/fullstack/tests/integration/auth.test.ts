import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as logoutHandler } from "@/app/api/auth/logout/route";
import { GET as meHandler } from "@/app/api/auth/me/route";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as resetPasswordHandler } from "@/app/api/auth/reset-password/route";
import { POST as verifyEmailHandler } from "@/app/api/auth/verify-email/route";
import { GET as devOutboxHandler } from "@/app/api/dev/outbox/route";
import { sha256Hex } from "@/server/auth/service";
import type { DatabaseBundle } from "@/server/db";
import { authTokens, memberships, organizations, sessions, users } from "@/server/db/schema";
import {
  extractSessionCookieHeader,
  jsonRequest,
  resetTestDatabase,
  setupTestDatabase,
  teardownTestDatabase,
} from "./test-helpers";

describe("Authentication, email verification, password reset & rate limiting", () => {
  let bundle: DatabaseBundle;

  beforeAll(async () => {
    bundle = await setupTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase(bundle);
  });

  afterAll(async () => {
    await teardownTestDatabase(bundle);
  });

  it("registers user + initial workspace + owner membership atomically and queues verification email", async () => {
    const regRes = await registerHandler(
      jsonRequest("/api/auth/register", {
        method: "POST",
        body: {
          name: "Leyla Kaya",
          workspaceName: "Atölye Bosphorus",
          email: "leyla@bosphorus.test",
          password: "StudioPassword!2026",
        },
      })
    );

    expect(regRes.status).toBe(201);
    const body = await regRes.json();
    expect(body.user.email).toBe("leyla@bosphorus.test");
    expect(body.user.emailVerified).toBe(false);
    expect(body.activeOrganization.name).toBe("Atölye Bosphorus");
    expect(body.role).toBe("owner");

    const cookie = extractSessionCookieHeader(regRes);
    expect(cookie).toContain("pusula.session_token=");

    const dbOrgs = await bundle.db.select().from(organizations);
    const dbMemberships = await bundle.db.select().from(memberships);
    expect(dbOrgs).toHaveLength(1);
    expect(dbMemberships).toHaveLength(1);
    expect(dbMemberships[0]?.role).toBe("owner");

    // Inspect dev outbox & verify email token
    const outboxRes = await devOutboxHandler(
      jsonRequest("/api/dev/outbox?email=leyla@bosphorus.test")
    );
    expect(outboxRes.status).toBe(200);
    const outboxData = await outboxRes.json();
    expect(outboxData.messages).toHaveLength(1);
    const verifyToken = outboxData.messages[0].token as string;
    expect(verifyToken.length).toBeGreaterThan(20);

    // Ensure token in DB is hashed, never plaintext
    const storedTokens = await bundle.db.select().from(authTokens);
    expect(storedTokens).toHaveLength(1);
    expect(storedTokens[0]?.tokenHash).not.toBe(verifyToken);
    expect(storedTokens[0]?.tokenHash).toBe(sha256Hex(verifyToken));

    // Verify email once -> succeeds
    const verifyRes = await verifyEmailHandler(
      jsonRequest("/api/auth/verify-email", {
        method: "POST",
        body: { token: verifyToken },
      })
    );
    expect(verifyRes.status).toBe(200);

    // Check /api/auth/me reflects emailVerified = true
    const meRes = await meHandler(jsonRequest("/api/auth/me", { cookie }));
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.user.emailVerified).toBe(true);

    // Replaying verify token -> rejected 400
    const replayRes = await verifyEmailHandler(
      jsonRequest("/api/auth/verify-email", {
        method: "POST",
        body: { token: verifyToken },
      })
    );
    expect(replayRes.status).toBe(400);
  });

  it("returns identical generic error on wrong password and unknown email, and invalidates session on logout", async () => {
    await registerHandler(
      jsonRequest("/api/auth/register", {
        method: "POST",
        body: {
          name: "Mert Demir",
          email: "mert@studio.test",
          password: "CorrectPassword!99",
        },
      })
    );

    const wrongPassRes = await loginHandler(
      jsonRequest("/api/auth/login", {
        method: "POST",
        body: { email: "mert@studio.test", password: "WrongPassword!00" },
      })
    );
    const unknownEmailRes = await loginHandler(
      jsonRequest("/api/auth/login", {
        method: "POST",
        body: { email: "nobody@studio.test", password: "WrongPassword!00" },
      })
    );

    expect(wrongPassRes.status).toBe(401);
    expect(unknownEmailRes.status).toBe(401);
    const wrongPassJson = await wrongPassRes.json();
    const unknownEmailJson = await unknownEmailRes.json();
    expect(wrongPassJson.error.code).toBe("INVALID_CREDENTIALS");
    expect(unknownEmailJson.error.code).toBe("INVALID_CREDENTIALS");
    expect(wrongPassJson.error.message).toBe(unknownEmailJson.error.message);

    // Valid login
    const validLoginRes = await loginHandler(
      jsonRequest("/api/auth/login", {
        method: "POST",
        body: { email: "mert@studio.test", password: "CorrectPassword!99" },
      })
    );
    expect(validLoginRes.status).toBe(200);
    const cookie = extractSessionCookieHeader(validLoginRes);

    // Session works before logout
    const meBefore = await meHandler(jsonRequest("/api/auth/me", { cookie }));
    expect(meBefore.status).toBe(200);

    // Logout deletes server session and clears cookie
    const logoutRes = await logoutHandler(
      jsonRequest("/api/auth/logout", { method: "POST", cookie })
    );
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.headers.get("set-cookie")).toContain("Max-Age=0");

    // Reusing old cookie after logout fails with 401
    const meAfter = await meHandler(jsonRequest("/api/auth/me", { cookie }));
    expect(meAfter.status).toBe(401);
  });

  it("rejects expired/replayed reset tokens and revokes all active sessions on password reset", async () => {
    const regRes = await registerHandler(
      jsonRequest("/api/auth/register", {
        method: "POST",
        body: {
          name: "Aylin Ak",
          email: "aylin@studio.test",
          password: "InitialPassword!2026",
        },
      })
    );
    const sessionCookieA = extractSessionCookieHeader(regRes);

    const secondLoginRes = await loginHandler(
      jsonRequest("/api/auth/login", {
        method: "POST",
        body: { email: "aylin@studio.test", password: "InitialPassword!2026" },
      })
    );
    const sessionCookieB = extractSessionCookieHeader(secondLoginRes);

    const [userRow] = await bundle.db
      .select()
      .from(users)
      .where(eq(users.email, "aylin@studio.test"));
    expect(userRow).toBeDefined();

    // Insert an expired reset token directly and verify rejection
    const expiredRawToken = "expired-reset-token-1234567890";
    await bundle.db.insert(authTokens).values({
      id: `tok_${crypto.randomUUID()}`,
      userId: userRow!.id,
      purpose: "reset_password",
      tokenHash: sha256Hex(expiredRawToken),
      expiresAt: new Date(Date.now() - 60_000),
    });

    const expiredResetRes = await resetPasswordHandler(
      jsonRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: expiredRawToken, password: "NewStrongPassword!2026" },
      })
    );
    expect(expiredResetRes.status).toBe(400);

    // Trigger valid forgot-password request
    const forgotRes = await forgotPasswordHandler(
      jsonRequest("/api/auth/forgot-password", {
        method: "POST",
        body: { email: "aylin@studio.test" },
      })
    );
    expect(forgotRes.status).toBe(200);

    const outboxRes = await devOutboxHandler(
      jsonRequest("/api/dev/outbox?email=aylin@studio.test")
    );
    const outboxData = await outboxRes.json();
    const resetMsg = outboxData.messages.find(
      (m: { kind: string }) => m.kind === "reset_password"
    );
    expect(resetMsg).toBeDefined();

    // Confirm password reset
    const resetRes = await resetPasswordHandler(
      jsonRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: resetMsg.token, password: "UpdatedPassword!2026" },
      })
    );
    expect(resetRes.status).toBe(200);

    // ALL active user sessions must be revoked
    const remainingSessions = await bundle.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userRow!.id));
    expect(remainingSessions).toHaveLength(0);

    const meA = await meHandler(jsonRequest("/api/auth/me", { cookie: sessionCookieA }));
    const meB = await meHandler(jsonRequest("/api/auth/me", { cookie: sessionCookieB }));
    expect(meA.status).toBe(401);
    expect(meB.status).toBe(401);

    // Replaying reset token fails
    const replayResetRes = await resetPasswordHandler(
      jsonRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token: resetMsg.token, password: "AnotherPassword!2026" },
      })
    );
    expect(replayResetRes.status).toBe(400);

    // Old password fails, new password succeeds
    const oldPassLogin = await loginHandler(
      jsonRequest("/api/auth/login", {
        method: "POST",
        body: { email: "aylin@studio.test", password: "InitialPassword!2026" },
      })
    );
    expect(oldPassLogin.status).toBe(401);

    const newPassLogin = await loginHandler(
      jsonRequest("/api/auth/login", {
        method: "POST",
        body: { email: "aylin@studio.test", password: "UpdatedPassword!2026" },
      })
    );
    expect(newPassLogin.status).toBe(200);
  });

  it("enforces rate limit on auth endpoints with 429 and Retry-After header", async () => {
    let lastRes: Response | undefined;
    for (let i = 0; i < 16; i += 1) {
      lastRes = await loginHandler(
        jsonRequest("/api/auth/login", {
          method: "POST",
          headers: { "x-forwarded-for": "203.0.113.42" },
          body: { email: "nonexistent@studio.test", password: "BadPassword!123" },
        })
      );
    }

    expect(lastRes?.status).toBe(429);
    expect(Number(lastRes?.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    const body = await lastRes?.json();
    expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });
});
