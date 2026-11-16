import crypto from "node:crypto";

const SENSITIVE_KEY_PATTERN =
  /^(password|passwordhash|currentpassword|newpassword|token|tokenhash|resettoken|verificationtoken|sessionsecret|secret|cookie|set-cookie|authorization|x-api-key|smtppass|smtp_pass)$/i;

const BEARER_OR_COOKIE_PATTERN =
  /(Bearer\s+[A-Za-z0-9\-._~+/]+=*|pusula\.session_token=[^;\s]+|pusula_session=[^;\s]+)/gi;

export function redactValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return value.replace(BEARER_OR_COOKIE_PATTERN, "[REDACTED]");
  }
  if (typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactValue(value.message, seen),
    };
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = redactValue(val, seen);
    }
  }
  return out;
}

export interface RequestLogger {
  requestId: string;
  info: (event: string, meta?: Record<string, unknown>) => void;
  warn: (event: string, meta?: Record<string, unknown>) => void;
  error: (event: string, meta?: Record<string, unknown>) => void;
}

export function createRequestLogger(requestId?: string): RequestLogger {
  const id = requestId || crypto.randomUUID();

  function emit(level: "info" | "warn" | "error", event: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "test" && process.env.LOG_IN_TESTS !== "1") {
      return;
    }
    const payload = {
      ts: new Date().toISOString(),
      level,
      requestId: id,
      event,
      ...(meta ? (redactValue(meta) as Record<string, unknown>) : {}),
    };
    const serialized = JSON.stringify(payload);
    if (level === "error") {
      console.error(serialized);
    } else if (level === "warn") {
      console.warn(serialized);
    } else {
      console.info(serialized);
    }
  }

  return {
    requestId: id,
    info: (event, meta) => emit("info", event, meta),
    warn: (event, meta) => emit("warn", event, meta),
    error: (event, meta) => emit("error", event, meta),
  };
}
