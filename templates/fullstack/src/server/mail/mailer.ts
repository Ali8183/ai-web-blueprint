import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { and, asc, eq, inArray, lt, lte } from "drizzle-orm";
import nodemailer from "nodemailer";
import { type AppDatabase, getDb } from "@/server/db";
import { emailOutbox } from "@/server/db/schema";
import { type AppEnv, getEnv } from "@/server/env";
import { ServiceUnavailableError } from "@/server/errors";
import { createRequestLogger } from "@/server/logger";

export interface OutboxMessage {
  id: string;
  kind: "verify_email" | "reset_password";
  to: string;
  subject: string;
  text: string;
  token: string;
  actionUrl: string;
  sentAt: string;
  smtpDelivered: boolean;
  status: "sent" | "queued_for_retry" | "retry_scheduled" | "dev_outbox" | "failed";
  persistedInQueue: boolean;
}

export interface SmtpTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export interface SmtpSendPayload {
  from: string;
  to: string;
  subject: string;
  text: string;
  transportConfig: SmtpTransportConfig;
}

export type SmtpSender =
  | ((payload: SmtpSendPayload) => Promise<void>)
  | {
      send: (payload: SmtpSendPayload) => Promise<void>;
      verify?: () => Promise<void>;
    };

const globalForOutbox = globalThis as typeof globalThis & {
  __pusulaMemoryOutbox?: OutboxMessage[];
  __pusulaSmtpSender?: SmtpSender;
};

export function setSmtpSenderForTests(sender?: SmtpSender): void {
  globalForOutbox.__pusulaSmtpSender = sender;
}

export function buildSmtpTransportConfig(env: AppEnv = getEnv()): SmtpTransportConfig {
  return {
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    requireTLS: env.smtpRequireTls,
    ...(env.smtpUser && env.smtpPass
      ? {
          auth: {
            user: env.smtpUser,
            pass: env.smtpPass,
          },
        }
      : {}),
  };
}

function getOutboxFilePath(): string {
  const env = getEnv();
  return path.resolve(process.cwd(), env.mailOutboxFile);
}

function readOutboxFile(filePath: string): OutboxMessage[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxMessage[]) : [];
  } catch {
    return [];
  }
}

function appendDevOutboxRecord(entry: OutboxMessage): boolean {
  const env = getEnv();
  if (env.nodeEnv === "production") {
    return false;
  }

  const mem = (globalForOutbox.__pusulaMemoryOutbox ??= []);
  mem.push(entry);
  if (mem.length > 200) {
    mem.splice(0, mem.length - 200);
  }

  try {
    const filePath = getOutboxFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const existing = readOutboxFile(filePath);
    existing.push(entry);
    const trimmed = existing.slice(-200);
    fs.writeFileSync(filePath, `${JSON.stringify(trimmed, null, 2)}\n`, "utf8");
    return true;
  } catch {
    return true; // Still recorded in process memory outbox
  }
}

export function listOutboxMessages(emailFilter?: string): OutboxMessage[] {
  const env = getEnv();
  if (env.nodeEnv === "production") {
    return [];
  }

  const filePath = getOutboxFilePath();
  const fromFile = readOutboxFile(filePath);
  const fromMemory = globalForOutbox.__pusulaMemoryOutbox ?? [];

  const mergedById = new Map<string, OutboxMessage>();
  for (const item of [...fromFile, ...fromMemory]) {
    mergedById.set(item.id, item);
  }

  const all = Array.from(mergedById.values()).sort((a, b) =>
    a.sentAt.localeCompare(b.sentAt)
  );
  if (!emailFilter) {
    return all;
  }
  const normalized = emailFilter.trim().toLowerCase();
  return all.filter((m) => m.to.toLowerCase() === normalized);
}

export function clearOutboxForTests(): void {
  globalForOutbox.__pusulaMemoryOutbox = [];
  globalForOutbox.__pusulaSmtpSender = undefined;
  try {
    const filePath = getOutboxFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // ignore cleanup failure
  }
}

function createNodemailerTransport(transportConfig: SmtpTransportConfig) {
  return nodemailer.createTransport({
    host: transportConfig.host,
    port: transportConfig.port,
    secure: transportConfig.secure,
    requireTLS: transportConfig.requireTLS,
    auth: transportConfig.auth,
    connectionTimeout: 2500,
    greetingTimeout: 2500,
    socketTimeout: 3500,
  });
}

async function invokeSmtpSend(params: {
  to: string;
  subject: string;
  text: string;
  env: AppEnv;
}): Promise<void> {
  const transportConfig = buildSmtpTransportConfig(params.env);
  const payload: SmtpSendPayload = {
    from: params.env.smtpFrom,
    to: params.to,
    subject: params.subject,
    text: params.text,
    transportConfig,
  };

  const customSender = globalForOutbox.__pusulaSmtpSender;
  if (customSender) {
    if (typeof customSender === "function") {
      await customSender(payload);
    } else {
      await customSender.send(payload);
    }
    return;
  }

  const transporter = createNodemailerTransport(transportConfig);
  await transporter.sendMail({
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
}

export async function verifySmtpReadiness(env: AppEnv = getEnv()): Promise<void> {
  const customSender = globalForOutbox.__pusulaSmtpSender;
  if (customSender) {
    if (typeof customSender !== "function" && customSender.verify) {
      try {
        await customSender.verify();
      } catch (err) {
        const log = createRequestLogger();
        log.error("smtp_readiness_check_failed", {
          smtpHost: env.smtpHost,
          smtpPort: env.smtpPort,
          error: err instanceof Error ? err.message : String(err),
        });
        throw new ServiceUnavailableError(
          "EMAIL_DELIVERY_UNAVAILABLE",
          "Email delivery service is currently unavailable."
        );
      }
    }
    return;
  }

  const transportConfig = buildSmtpTransportConfig(env);
  const transporter = createNodemailerTransport(transportConfig);
  try {
    await transporter.verify();
  } catch (err) {
    const log = createRequestLogger();
    log.error("smtp_readiness_check_failed", {
      smtpHost: env.smtpHost,
      smtpPort: env.smtpPort,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new ServiceUnavailableError(
      "EMAIL_DELIVERY_UNAVAILABLE",
      "Email delivery service is currently unavailable."
    );
  }
}

async function deliverEmail(params: {
  kind: "verify_email" | "reset_password";
  to: string;
  subject: string;
  text: string;
  token: string;
  actionUrl: string;
  db?: AppDatabase;
  strictSmtp?: boolean;
}): Promise<OutboxMessage> {
  const env = getEnv();
  const db = params.db ?? getDb();
  const id = `eml_${crypto.randomUUID()}`;
  const now = new Date();

  let persistedInQueue = false;
  try {
    await db.insert(emailOutbox).values({
      id,
      kind: params.kind,
      recipient: params.to,
      subject: params.subject,
      bodyText: params.text,
      status: "pending",
      attempts: 0,
      maxAttempts: 3,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });
    persistedInQueue = true;
  } catch (err) {
    const log = createRequestLogger();
    log.error("email_outbox_persist_failed", {
      kind: params.kind,
      recipient: params.to,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const shouldAttemptSmtp =
    env.nodeEnv === "production" ||
    Boolean(globalForOutbox.__pusulaSmtpSender) ||
    Boolean(process.env.SMTP_HOST?.trim()) ||
    Boolean(params.strictSmtp);

  let smtpDelivered = false;
  let attempts = 0;
  let lastErrorMessage: string | null = null;

  if (shouldAttemptSmtp) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      attempts = attempt;
      try {
        await invokeSmtpSend({
          to: params.to,
          subject: params.subject,
          text: params.text,
          env,
        });
        smtpDelivered = true;
        lastErrorMessage = null;
        break;
      } catch (err) {
        lastErrorMessage = err instanceof Error ? err.message : String(err);
      }
    }
  }

  if (smtpDelivered) {
    const sentAt = new Date();
    if (persistedInQueue) {
      await db
        .update(emailOutbox)
        .set({
          status: "sent",
          attempts,
          lastError: null,
          sentAt,
          updatedAt: sentAt,
        })
        .where(eq(emailOutbox.id, id));
    }

    const record: OutboxMessage = {
      id,
      kind: params.kind,
      to: params.to,
      subject: params.subject,
      text: params.text,
      token: params.token,
      actionUrl: params.actionUrl,
      sentAt: sentAt.toISOString(),
      smtpDelivered: true,
      status: "sent",
      persistedInQueue,
    };
    if (env.nodeEnv !== "production") {
      appendDevOutboxRecord(record);
    }
    return record;
  }

  if (shouldAttemptSmtp && lastErrorMessage) {
    const log = createRequestLogger();
    log.error("smtp_delivery_failed", {
      emailId: id,
      kind: params.kind,
      recipient: params.to,
      attempts,
      error: lastErrorMessage,
    });
  }

  if (env.nodeEnv === "production") {
    if (env.smtpAllowDeferredQueueInProd && persistedInQueue) {
      const nextAttemptAt = new Date(Date.now() + 60_000);
      await db
        .update(emailOutbox)
        .set({
          status: "retry_scheduled",
          attempts,
          lastError: lastErrorMessage ?? "SMTP unavailable",
          nextAttemptAt,
          updatedAt: new Date(),
        })
        .where(eq(emailOutbox.id, id));

      return {
        id,
        kind: params.kind,
        to: params.to,
        subject: params.subject,
        text: params.text,
        token: params.token,
        actionUrl: params.actionUrl,
        sentAt: now.toISOString(),
        smtpDelivered: false,
        status: "queued_for_retry",
        persistedInQueue: true,
      };
    }

    if (persistedInQueue) {
      await db
        .update(emailOutbox)
        .set({
          status: "failed",
          attempts,
          lastError: lastErrorMessage ?? "SMTP unavailable",
          updatedAt: new Date(),
        })
        .where(eq(emailOutbox.id, id));
    }

    throw new ServiceUnavailableError(
      "EMAIL_DELIVERY_UNAVAILABLE",
      "Unable to deliver email through SMTP and deferred queue is disabled."
    );
  }

  if (persistedInQueue) {
    await db
      .update(emailOutbox)
      .set({
        status: "retry_scheduled",
        attempts,
        lastError: lastErrorMessage,
        nextAttemptAt: new Date(Date.now() + 60_000),
        updatedAt: new Date(),
      })
      .where(eq(emailOutbox.id, id));
  }

  const draftRecord: OutboxMessage = {
    id,
    kind: params.kind,
    to: params.to,
    subject: params.subject,
    text: params.text,
    token: params.token,
    actionUrl: params.actionUrl,
    sentAt: now.toISOString(),
    smtpDelivered: false,
    status: persistedInQueue ? "retry_scheduled" : "dev_outbox",
    persistedInQueue,
  };
  const devRecorded = appendDevOutboxRecord(draftRecord);

  if (params.strictSmtp || (!persistedInQueue && !devRecorded)) {
    throw new ServiceUnavailableError(
      "EMAIL_DELIVERY_UNAVAILABLE",
      "Unable to deliver email or persist local outbox record."
    );
  }

  return draftRecord;
}

export async function processEmailOutboxRetries(
  db: AppDatabase = getDb()
): Promise<{ processed: number; sent: number; rescheduled: number; failed: number }> {
  const env = getEnv();
  const now = new Date();
  const dueRows = await db
    .select()
    .from(emailOutbox)
    .where(
      and(
        inArray(emailOutbox.status, ["pending", "retry_scheduled"]),
        lte(emailOutbox.nextAttemptAt, now),
        lt(emailOutbox.attempts, emailOutbox.maxAttempts)
      )
    )
    .orderBy(asc(emailOutbox.nextAttemptAt))
    .limit(25);

  let sent = 0;
  let rescheduled = 0;
  let failed = 0;

  for (const row of dueRows) {
    const nextAttempts = row.attempts + 1;
    try {
      await invokeSmtpSend({
        to: row.recipient,
        subject: row.subject,
        text: row.bodyText,
        env,
      });

      const sentAt = new Date();
      await db
        .update(emailOutbox)
        .set({
          status: "sent",
          attempts: nextAttempts,
          lastError: null,
          sentAt,
          updatedAt: sentAt,
        })
        .where(eq(emailOutbox.id, row.id));
      sent += 1;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const exhausted = nextAttempts >= row.maxAttempts;
      const newStatus = exhausted ? "failed" : "retry_scheduled";
      const nextAttemptAt = new Date(Date.now() + nextAttempts * 60_000);

      const log = createRequestLogger();
      log.error("smtp_retry_failed", {
        emailId: row.id,
        kind: row.kind,
        recipient: row.recipient,
        attempts: nextAttempts,
        status: newStatus,
        error: errorMessage,
      });

      await db
        .update(emailOutbox)
        .set({
          status: newStatus,
          attempts: nextAttempts,
          lastError: errorMessage,
          nextAttemptAt,
          updatedAt: new Date(),
        })
        .where(eq(emailOutbox.id, row.id));

      if (exhausted) {
        failed += 1;
      } else {
        rescheduled += 1;
      }
    }
  }

  return {
    processed: dueRows.length,
    sent,
    rescheduled,
    failed,
  };
}

export async function sendVerificationEmail(
  params: {
    to: string;
    name: string;
    token: string;
    strictSmtp?: boolean;
  },
  db: AppDatabase = getDb()
): Promise<OutboxMessage> {
  const env = getEnv();
  const actionUrl = `${env.appUrl}/verify-email?token=${encodeURIComponent(params.token)}`;
  const subject = "Verify your Atölye Pusula email";
  const text = [
    `Hello ${params.name},`,
    "",
    "Verify your Atölye Pusula studio ledger email using the link below:",
    actionUrl,
    "",
    `Verification token: ${params.token}`,
    "",
    "This token expires in 24 hours and can only be used once.",
  ].join("\n");

  return deliverEmail({
    kind: "verify_email",
    to: params.to,
    subject,
    text,
    token: params.token,
    actionUrl,
    db,
    strictSmtp: params.strictSmtp,
  });
}

export async function sendPasswordResetEmail(
  params: {
    to: string;
    name: string;
    token: string;
    strictSmtp?: boolean;
  },
  db: AppDatabase = getDb()
): Promise<OutboxMessage> {
  const env = getEnv();
  const actionUrl = `${env.appUrl}/reset-password?token=${encodeURIComponent(params.token)}`;
  const subject = "Reset your Atölye Pusula password";
  const text = [
    `Hello ${params.name},`,
    "",
    "A password reset was requested for your Atölye Pusula account.",
    "Use the link below within 30 minutes (single-use):",
    actionUrl,
    "",
    `Reset token: ${params.token}`,
    "",
    "If you did not request this, you can safely ignore this message.",
  ].join("\n");

  return deliverEmail({
    kind: "reset_password",
    to: params.to,
    subject,
    text,
    token: params.token,
    actionUrl,
    db,
    strictSmtp: params.strictSmtp,
  });
}
