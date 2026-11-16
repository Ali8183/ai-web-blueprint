export type TrustedProxyMode = "none" | "cloudflare" | "fly" | "hops";
export type RateLimitDriver = "postgres" | "memory";

export interface AppEnv {
  nodeEnv: "development" | "test" | "production";
  appUrl: string;
  trustedOrigins: string[];
  trustedProxyMode: TrustedProxyMode;
  trustedProxyHops: number;
  rateLimitDriver: RateLimitDriver;
  allowSingleInstanceMemoryRateLimit: boolean;
  databaseUrl: string;
  sessionSecret: string;
  smtpHost: string;
  smtpPort: number;
  smtpFrom: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure: boolean;
  smtpRequireTls: boolean;
  smtpAllowDeferredQueueInProd: boolean;
  mailOutboxFile: string;
}

const WEAK_SECRET_PATTERNS = [
  /^replace-with/i,
  /changeme/i,
  /placeholder/i,
  /^dev[-_]?secret/i,
  /^test[-_]?secret/i,
  /^demo[-_]?secret/i,
  /^e2e[-_]?playwright/i,
  /^secret/i,
  /^password/i,
  /^(.)\1{11,}$/,
];

const DEFAULT_DEV_DATABASE_URL = "pglite://./.data/pgdata";
const DEFAULT_DEV_SECRET = "dev-only-insecure-secret-do-not-use-in-production-32chars";

export function isWeakSessionSecret(secret: string | undefined): boolean {
  if (!secret || secret.trim().length < 32) {
    return true;
  }
  const trimmed = secret.trim();
  return WEAK_SECRET_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function normalizeOriginUrl(rawUrl: string, label: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error(`[env] Invalid ${label} URL: "${rawUrl}".`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`[env] ${label} must use http:// or https:// protocol.`);
  }
  return parsed.origin.toLowerCase();
}

function parseTrustedOrigins(appUrlOrigin: string, rawTrustedOrigins?: string): string[] {
  const seen = new Set<string>([appUrlOrigin]);
  if (rawTrustedOrigins && rawTrustedOrigins.trim()) {
    for (const part of rawTrustedOrigins.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      seen.add(normalizeOriginUrl(trimmed, "TRUSTED_ORIGINS"));
    }
  }
  return Array.from(seen);
}

function parseTrustProxy(rawTrustProxy?: string): {
  mode: TrustedProxyMode;
  hops: number;
} {
  const value = (rawTrustProxy ?? "none").trim().toLowerCase();
  if (!value || value === "none") {
    return { mode: "none", hops: 0 };
  }
  if (value === "cloudflare") {
    return { mode: "cloudflare", hops: 1 };
  }
  if (value === "fly") {
    return { mode: "fly", hops: 1 };
  }
  const hopsMatch = value.match(/^hops:([1-9]\d*)$/);
  if (hopsMatch) {
    const hops = Number.parseInt(hopsMatch[1]!, 10);
    if (hops >= 1 && hops <= 20) {
      return { mode: "hops", hops };
    }
  }
  throw new Error(
    `[env] Invalid TRUST_PROXY "${rawTrustProxy}". Expected "none", "cloudflare", "fly", or "hops:<1..20>".`
  );
}

function parseRateLimitDriver(
  rawDriver: string | undefined,
  nodeEnv: AppEnv["nodeEnv"],
  allowMemoryInProd: boolean,
  isBuildPhase: boolean
): RateLimitDriver {
  const defaultDriver: RateLimitDriver = nodeEnv === "production" ? "postgres" : "memory";
  const value = (rawDriver?.trim().toLowerCase() || defaultDriver) as string;
  if (value !== "postgres" && value !== "memory") {
    throw new Error(
      `[env] Invalid RATE_LIMIT_DRIVER "${rawDriver}". Expected "postgres" or "memory".`
    );
  }
  if (nodeEnv === "production" && !isBuildPhase && value === "memory" && !allowMemoryInProd) {
    throw new Error(
      "[env] Production startup blocked: RATE_LIMIT_DRIVER=memory is unsafe for multi-instance production unless ALLOW_SINGLE_INSTANCE_MEMORY_RATE_LIMIT=true."
    );
  }
  return value;
}

function parseOptionalBoolean(rawValue: string | undefined, defaultValue: boolean, label: string): boolean {
  if (rawValue === undefined || rawValue.trim() === "") {
    return defaultValue;
  }
  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error(`[env] Invalid ${label} "${rawValue}". Expected "true" or "false".`);
}

export function validateEnv(
  rawEnv: Record<string, string | undefined> = process.env,
  options: { allowBuildPhase?: boolean } = {}
): AppEnv {
  const rawNodeEnv = rawEnv.NODE_ENV ?? "development";
  const nodeEnv: AppEnv["nodeEnv"] =
    rawNodeEnv === "production" || rawNodeEnv === "test" ? rawNodeEnv : "development";

  const isBuildPhase =
    Boolean(options.allowBuildPhase) && rawEnv.NEXT_PHASE === "phase-production-build";

  const rawAppUrl = (rawEnv.APP_URL || rawEnv.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
  const appUrl = normalizeOriginUrl(rawAppUrl, "APP_URL");
  const trustedOrigins = parseTrustedOrigins(appUrl, rawEnv.TRUSTED_ORIGINS);
  const trustProxy = parseTrustProxy(rawEnv.TRUST_PROXY);

  const allowSingleInstanceMemoryRateLimit =
    rawEnv.ALLOW_SINGLE_INSTANCE_MEMORY_RATE_LIMIT === "true";
  const rateLimitDriver = parseRateLimitDriver(
    rawEnv.RATE_LIMIT_DRIVER,
    nodeEnv,
    allowSingleInstanceMemoryRateLimit,
    isBuildPhase
  );

  const smtpHost = rawEnv.SMTP_HOST?.trim() || "127.0.0.1";
  const parsedSmtpPort = Number.parseInt(rawEnv.SMTP_PORT || "1025", 10);
  const smtpPort = Number.isFinite(parsedSmtpPort) && parsedSmtpPort > 0 ? parsedSmtpPort : 1025;
  const smtpFrom = rawEnv.SMTP_FROM || "Atolye Pusula <noreply@atolye-pusula.local>";

  const smtpUser = rawEnv.SMTP_USER?.trim() || undefined;
  const smtpPass = rawEnv.SMTP_PASS || undefined;
  if (Boolean(smtpUser) !== Boolean(smtpPass)) {
    throw new Error(
      "[env] Invalid SMTP configuration: SMTP_USER and SMTP_PASS must either both be set or both be omitted."
    );
  }

  const smtpSecure = parseOptionalBoolean(rawEnv.SMTP_SECURE, smtpPort === 465, "SMTP_SECURE");
  const smtpRequireTls = parseOptionalBoolean(
    rawEnv.SMTP_REQUIRE_TLS,
    nodeEnv === "production",
    "SMTP_REQUIRE_TLS"
  );
  const smtpAllowDeferredQueueInProd = rawEnv.ALLOW_PROD_DEFERRED_EMAIL_QUEUE === "true";
  const mailOutboxFile = rawEnv.MAIL_OUTBOX_FILE || ".data/mailpit-outbox.json";

  if (nodeEnv === "production" && !isBuildPhase) {
    const databaseUrl = rawEnv.DATABASE_URL?.trim();
    if (!databaseUrl) {
      throw new Error(
        "[env] Production startup blocked: DATABASE_URL is required and cannot fall back to embedded PGlite."
      );
    }
    if (databaseUrl.startsWith("pglite://")) {
      throw new Error(
        "[env] Production startup blocked: DATABASE_URL cannot use embedded pglite:// fallback in production. Provide a postgresql:// connection string."
      );
    }
    if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
      throw new Error(
        "[env] Production startup blocked: DATABASE_URL must start with postgresql:// or postgres://."
      );
    }

    const sessionSecret = rawEnv.SESSION_SECRET?.trim();
    if (isWeakSessionSecret(sessionSecret)) {
      throw new Error(
        "[env] Production startup blocked: SESSION_SECRET must be at least 32 characters and must not match demo or placeholder values."
      );
    }

    return {
      nodeEnv,
      appUrl,
      trustedOrigins,
      trustedProxyMode: trustProxy.mode,
      trustedProxyHops: trustProxy.hops,
      rateLimitDriver,
      allowSingleInstanceMemoryRateLimit,
      databaseUrl,
      sessionSecret: sessionSecret!,
      smtpHost,
      smtpPort,
      smtpFrom,
      smtpUser,
      smtpPass,
      smtpSecure,
      smtpRequireTls,
      smtpAllowDeferredQueueInProd,
      mailOutboxFile,
    };
  }

  const databaseUrl = rawEnv.DATABASE_URL?.trim() || DEFAULT_DEV_DATABASE_URL;
  const sessionSecret = rawEnv.SESSION_SECRET?.trim() || DEFAULT_DEV_SECRET;

  return {
    nodeEnv,
    appUrl,
    trustedOrigins,
    trustedProxyMode: trustProxy.mode,
    trustedProxyHops: trustProxy.hops,
    rateLimitDriver,
    allowSingleInstanceMemoryRateLimit,
    databaseUrl,
    sessionSecret,
    smtpHost,
    smtpPort,
    smtpFrom,
    smtpUser,
    smtpPass,
    smtpSecure,
    smtpRequireTls,
    smtpAllowDeferredQueueInProd,
    mailOutboxFile,
  };
}

export function getEnv(): AppEnv {
  return validateEnv(process.env, { allowBuildPhase: true });
}
