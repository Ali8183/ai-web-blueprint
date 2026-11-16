import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  activeOrganizationId: text("active_organization_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("session_user_id_idx").on(table.userId)]
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)]
);

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authTokens = pgTable(
  "auth_token",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("auth_token_user_purpose_idx").on(table.userId, table.purpose),
    check("auth_token_purpose_check", sql`${table.purpose} IN ('verify_email', 'reset_password')`),
  ]
);

export const organizations = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  studioCode: text("studio_code").notNull().default("AP"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  "membership",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("membership_org_user_unique").on(table.organizationId, table.userId),
    index("membership_user_id_idx").on(table.userId),
    check("membership_role_check", sql`${table.role} IN ('owner', 'editor', 'viewer')`),
  ]
);

export const projects = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    clientName: text("client_name").notNull(),
    discipline: text("discipline").notNull().default("architecture"),
    status: text("status").notNull().default("planning"),
    priority: text("priority").notNull().default("medium"),
    budgetCents: integer("budget_cents").notNull().default(0),
    dueDate: timestamp("due_date", { withTimezone: true }),
    summary: text("summary").notNull().default(""),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("project_org_code_unique").on(table.organizationId, table.code),
    index("project_org_updated_idx").on(table.organizationId, table.updatedAt),
    index("project_org_status_priority_idx").on(table.organizationId, table.status, table.priority),
    check(
      "project_discipline_check",
      sql`${table.discipline} IN ('architecture', 'structural', 'interior', 'urban')`
    ),
    check(
      "project_status_check",
      sql`${table.status} IN ('planning', 'active', 'review', 'archived')`
    ),
    check(
      "project_priority_check",
      sql`${table.priority} IN ('low', 'medium', 'high', 'critical')`
    ),
    check("project_budget_cents_check", sql`${table.budgetCents} >= 0`),
    check("project_version_check", sql`${table.version} >= 1`),
  ]
);

export const idempotencyKeys = pgTable(
  "idempotency_key",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: text("method").notNull(),
    path: text("path").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    statusCode: integer("status_code").notNull(),
    responseBody: text("response_body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idempotency_scope_unique").on(
      table.organizationId,
      table.userId,
      table.method,
      table.path,
      table.key
    ),
  ]
);

export const rateLimitBuckets = pgTable(
  "rate_limit_bucket",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("rate_limit_bucket_reset_at_idx").on(table.resetAt)]
);

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    status: text("status").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("email_outbox_status_next_idx").on(table.status, table.nextAttemptAt),
    check(
      "email_outbox_kind_check",
      sql`${table.kind} IN ('verify_email', 'reset_password')`
    ),
    check(
      "email_outbox_status_check",
      sql`${table.status} IN ('pending', 'retry_scheduled', 'sent', 'failed')`
    ),
  ]
);

export const schema = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
  users,
  sessions,
  accounts,
  verifications,
  authTokens,
  organizations,
  memberships,
  projects,
  idempotencyKeys,
  rateLimitBuckets,
  emailOutbox,
};

export type Role = "owner" | "editor" | "viewer";
export type ProjectDiscipline = "architecture" | "structural" | "interior" | "urban";
export type ProjectStatus = "planning" | "active" | "review" | "archived";
export type ProjectPriority = "low" | "medium" | "high" | "critical";
