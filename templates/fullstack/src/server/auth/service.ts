import crypto from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { type AppDatabase, getDb } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import {
  accounts,
  authTokens,
  memberships,
  organizations,
  type Role,
  sessions,
  users,
} from "@/server/db/schema";
import { getEnv } from "@/server/env";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from "@/server/errors";
import {
  type OutboxMessage,
  sendPasswordResetEmail,
  sendVerificationEmail,
  verifySmtpReadiness,
} from "@/server/mail/mailer";
import { getAuth } from "./auth";

export interface PublicUserDto {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  activeOrganizationId: string | null;
  createdAt: string;
}

export interface OrganizationMembershipDto {
  id: string;
  name: string;
  slug: string;
  studioCode: string;
  role: Role;
}

export interface EmailDeliverySummary {
  status: OutboxMessage["status"];
  smtpDelivered: boolean;
  persistedInQueue: boolean;
}

export interface AuthenticatedContext {
  user: PublicUserDto;
  activeOrganization: OrganizationMembershipDto;
  organizations: OrganizationMembershipDto[];
  role: Role;
  sessionId: string;
  emailDelivery?: EmailDeliverySummary;
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function slugifyWorkspace(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base || "studio"}-${suffix}`;
}

function deriveStudioCode(input: string): string {
  const letters = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
  return letters.length >= 2 ? letters : "AP";
}

function toPublicUserDto(row: typeof users.$inferSelect): PublicUserDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    activeOrganizationId: row.activeOrganizationId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function loadUserOrganizations(
  db: AppDatabase,
  userId: string
): Promise<OrganizationMembershipDto[]> {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      studioCode: organizations.studioCode,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, userId));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    studioCode: row.studioCode,
    role: row.role as Role,
  }));
}

async function resolveActiveContextForUser(
  db: AppDatabase,
  userId: string,
  sessionId: string
): Promise<AuthenticatedContext> {
  const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRow) {
    throw new UnauthorizedError("UNAUTHENTICATED", "Authentication required.");
  }

  const orgs = await loadUserOrganizations(db, userId);
  if (orgs.length === 0) {
    throw new ForbiddenError("NO_WORKSPACE_MEMBERSHIP", "No workspace membership found.");
  }

  const active = orgs.find((o) => o.id === userRow.activeOrganizationId) ?? orgs[0]!;
  if (userRow.activeOrganizationId !== active.id) {
    await db
      .update(users)
      .set({ activeOrganizationId: active.id, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  return {
    user: {
      ...toPublicUserDto(userRow),
      activeOrganizationId: active.id,
    },
    activeOrganization: active,
    organizations: orgs,
    role: active.role,
    sessionId,
  };
}

export async function registerUser(
  input: {
    name: string;
    email: string;
    password: string;
    workspaceName?: string;
  },
  requestHeaders?: Headers,
  db: AppDatabase = getDb()
): Promise<{
  context: AuthenticatedContext;
  setCookieHeaders: string[];
}> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const workspaceName = (input.workspaceName?.trim() || `${name} Studio`).slice(0, 80);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    throw new ConflictError("EMAIL_IN_USE", "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  const userId = `usr_${crypto.randomUUID()}`;
  const accountId = `acc_${crypto.randomUUID()}`;
  const orgId = `org_${crypto.randomUUID()}`;
  const membershipId = `mem_${crypto.randomUUID()}`;
  const rawVerifyToken = crypto.randomBytes(32).toString("hex");
  const verifyTokenHash = sha256Hex(rawVerifyToken);
  const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        name,
        email,
        emailVerified: false,
        activeOrganizationId: orgId,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(accounts).values({
        id: accountId,
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(organizations).values({
        id: orgId,
        name: workspaceName,
        slug: slugifyWorkspace(workspaceName),
        studioCode: deriveStudioCode(workspaceName),
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(memberships).values({
        id: membershipId,
        organizationId: orgId,
        userId,
        role: "owner",
        createdAt: now,
      });

      await tx.insert(authTokens).values({
        id: `tok_${crypto.randomUUID()}`,
        userId,
        purpose: "verify_email",
        tokenHash: verifyTokenHash,
        expiresAt: verifyExpiresAt,
        createdAt: now,
      });
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ConflictError("EMAIL_IN_USE", "An account with this email already exists.");
    }
    throw err;
  }

  let deliveryResult: OutboxMessage;
  try {
    deliveryResult = await sendVerificationEmail({ to: email, name, token: rawVerifyToken }, db);
  } catch (err) {
    // Clean up newly provisioned tenant/user records when required email delivery fails
    await db.transaction(async (tx) => {
      await tx.delete(organizations).where(eq(organizations.id, orgId));
      await tx.delete(users).where(eq(users.id, userId));
    });
    throw err;
  }

  const auth = getAuth(db);
  const signInResponse = await auth.api.signInEmail({
    body: { email, password: input.password },
    headers: requestHeaders ?? new Headers(),
    asResponse: true,
  });

  if (!signInResponse.ok) {
    throw new UnauthorizedError("SESSION_ISSUE_FAILED", "Could not initialize session.");
  }

  const setCookieHeaders = signInResponse.headers.getSetCookie();
  const sessionData = await auth.api.getSession({
    headers: new Headers({
      cookie: setCookieHeaders.map((c) => c.split(";")[0]).join("; "),
    }),
  });

  const context = await resolveActiveContextForUser(
    db,
    userId,
    sessionData?.session?.id ?? ""
  );

  return {
    context: {
      ...context,
      emailDelivery: {
        status: deliveryResult.status,
        smtpDelivered: deliveryResult.smtpDelivered,
        persistedInQueue: deliveryResult.persistedInQueue,
      },
    },
    setCookieHeaders,
  };
}

export async function loginUser(
  input: { email: string; password: string },
  requestHeaders?: Headers,
  db: AppDatabase = getDb()
): Promise<{
  context: AuthenticatedContext;
  setCookieHeaders: string[];
}> {
  const email = input.email.trim().toLowerCase();
  const auth = getAuth(db);

  let signInResponse: Response;
  try {
    signInResponse = await auth.api.signInEmail({
      body: { email, password: input.password },
      headers: requestHeaders ?? new Headers(),
      asResponse: true,
    });
  } catch {
    throw new UnauthorizedError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  if (!signInResponse.ok) {
    throw new UnauthorizedError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const setCookieHeaders = signInResponse.headers.getSetCookie();
  const cookieString = setCookieHeaders.map((c) => c.split(";")[0]).join("; ");
  const sessionData = await auth.api.getSession({
    headers: new Headers({ cookie: cookieString }),
  });

  if (!sessionData?.user || !sessionData?.session) {
    throw new UnauthorizedError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const context = await resolveActiveContextForUser(
    db,
    sessionData.user.id,
    sessionData.session.id
  );
  return { context, setCookieHeaders };
}

export async function logoutUser(
  requestHeaders: Headers,
  db: AppDatabase = getDb()
): Promise<{ setCookieHeaders: string[] }> {
  const auth = getAuth(db);
  const existingSession = await auth.api.getSession({ headers: requestHeaders });
  if (existingSession?.session?.id) {
    await db.delete(sessions).where(eq(sessions.id, existingSession.session.id));
  }
  const signOutResponse = await auth.api.signOut({
    headers: requestHeaders,
    asResponse: true,
  });
  const cookies = signOutResponse.headers.getSetCookie();
  return {
    setCookieHeaders:
      cookies.length > 0
        ? cookies
        : ["pusula.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax"],
  };
}

export async function getAuthenticatedContext(
  requestHeaders: Headers,
  db: AppDatabase = getDb()
): Promise<AuthenticatedContext | null> {
  const auth = getAuth(db);
  const sessionData = await auth.api.getSession({ headers: requestHeaders });
  if (!sessionData?.user || !sessionData?.session) {
    return null;
  }
  return resolveActiveContextForUser(db, sessionData.user.id, sessionData.session.id);
}

export async function requireAuthenticatedContext(
  requestHeaders: Headers,
  db: AppDatabase = getDb()
): Promise<AuthenticatedContext> {
  const ctx = await getAuthenticatedContext(requestHeaders, db);
  if (!ctx) {
    throw new UnauthorizedError("UNAUTHENTICATED", "Authentication required.");
  }
  return ctx;
}

export async function verifyEmailToken(
  rawToken: string,
  db: AppDatabase = getDb()
): Promise<{ verified: true }> {
  const trimmed = rawToken.trim();
  if (!trimmed) {
    throw new BadRequestError("INVALID_TOKEN", "Verification token is required.");
  }
  const tokenHash = sha256Hex(trimmed);
  const now = new Date();

  await db.transaction(async (tx) => {
    const claimed = await tx
      .update(authTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(authTokens.tokenHash, tokenHash),
          eq(authTokens.purpose, "verify_email"),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, now)
        )
      )
      .returning();

    const row = claimed[0];
    if (!row) {
      throw new BadRequestError(
        "INVALID_OR_EXPIRED_TOKEN",
        "Verification token is invalid or has expired."
      );
    }

    await tx
      .update(users)
      .set({ emailVerified: true, updatedAt: now })
      .where(eq(users.id, row.userId));
  });

  return { verified: true };
}

export async function requestPasswordReset(
  rawEmail: string,
  db: AppDatabase = getDb()
): Promise<{ ok: true; message: string }> {
  const env = getEnv();
  if (env.nodeEnv === "production" && !env.smtpAllowDeferredQueueInProd) {
    await verifySmtpReadiness(env);
  }

  const email = rawEmail.trim().toLowerCase();
  const [userRow] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (userRow) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256Hex(rawToken);
    const tokenId = `tok_${crypto.randomUUID()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30m TTL

    await db.transaction(async (tx) => {
      await tx
        .update(authTokens)
        .set({ usedAt: now })
        .where(
          and(
            eq(authTokens.userId, userRow.id),
            eq(authTokens.purpose, "reset_password"),
            isNull(authTokens.usedAt)
          )
        );

      await tx.insert(authTokens).values({
        id: tokenId,
        userId: userRow.id,
        purpose: "reset_password",
        tokenHash,
        expiresAt,
        createdAt: now,
      });
    });

    try {
      await sendPasswordResetEmail(
        {
          to: userRow.email,
          name: userRow.name,
          token: rawToken,
        },
        db
      );
    } catch (err) {
      await db.delete(authTokens).where(eq(authTokens.id, tokenId));
      throw err;
    }
  }

  return {
    ok: true,
    message:
      env.nodeEnv === "production" && !env.smtpAllowDeferredQueueInProd
        ? "If an account exists for that email, password reset instructions have been sent."
        : "If an account exists for that email, password reset instructions have been processed.",
  };
}

export async function confirmPasswordReset(
  input: { token: string; password: string },
  db: AppDatabase = getDb()
): Promise<{ reset: true }> {
  const trimmedToken = input.token.trim();
  if (!trimmedToken) {
    throw new BadRequestError("INVALID_TOKEN", "Reset token is required.");
  }
  const tokenHash = sha256Hex(trimmedToken);
  const newPasswordHash = await hashPassword(input.password);
  const now = new Date();

  await db.transaction(async (tx) => {
    const claimed = await tx
      .update(authTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(authTokens.tokenHash, tokenHash),
          eq(authTokens.purpose, "reset_password"),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, now)
        )
      )
      .returning();

    const row = claimed[0];
    if (!row) {
      throw new BadRequestError(
        "INVALID_OR_EXPIRED_TOKEN",
        "Password reset token is invalid or has expired."
      );
    }

    const updatedAccount = await tx
      .update(accounts)
      .set({ password: newPasswordHash, updatedAt: now })
      .where(and(eq(accounts.userId, row.userId), eq(accounts.providerId, "credential")))
      .returning({ id: accounts.id });

    if (updatedAccount.length === 0) {
      await tx.insert(accounts).values({
        id: `acc_${crypto.randomUUID()}`,
        accountId: row.userId,
        providerId: "credential",
        userId: row.userId,
        password: newPasswordHash,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Revoke every active session for this user on password reset
    await tx.delete(sessions).where(eq(sessions.userId, row.userId));
    await tx
      .update(users)
      .set({ updatedAt: sql`NOW()` })
      .where(eq(users.id, row.userId));
  });

  return { reset: true };
}
