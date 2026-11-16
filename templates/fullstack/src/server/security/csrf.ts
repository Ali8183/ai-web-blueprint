import { getEnv } from "@/server/env";

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export interface CsrfCheckResult {
  ok: boolean;
  code?: "CSRF_ORIGIN_MISMATCH";
  reason?: string;
}

function safeParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function verifyCsrfOrigin(request: Request): CsrfCheckResult {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
    return { ok: true };
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite.toLowerCase() === "cross-site") {
    return {
      ok: false,
      code: "CSRF_ORIGIN_MISMATCH",
      reason: "Cross-site fetch metadata rejected.",
    };
  }

  const env = getEnv();
  const allowedOrigins = new Set<string>();
  const allowedHosts = new Set<string>();

  for (const trustedOrigin of env.trustedOrigins) {
    const parsed = safeParseUrl(trustedOrigin);
    if (parsed) {
      allowedOrigins.add(parsed.origin.toLowerCase());
      allowedHosts.add(parsed.host.toLowerCase());
    }
  }

  const hostHeader = request.headers.get("host");
  if (hostHeader !== null) {
    const normalizedHost = hostHeader.trim().toLowerCase();
    if (!normalizedHost || !allowedHosts.has(normalizedHost)) {
      return {
        ok: false,
        code: "CSRF_ORIGIN_MISMATCH",
        reason: "Host header does not match configured trusted origins.",
      };
    }
  }

  const originHeader = request.headers.get("origin");
  if (originHeader !== null) {
    if (originHeader === "null") {
      return {
        ok: false,
        code: "CSRF_ORIGIN_MISMATCH",
        reason: "Null Origin header rejected.",
      };
    }
    const parsedOrigin = safeParseUrl(originHeader);
    if (!parsedOrigin || !allowedOrigins.has(parsedOrigin.origin.toLowerCase())) {
      return {
        ok: false,
        code: "CSRF_ORIGIN_MISMATCH",
        reason: "Origin header does not match configured trusted origins.",
      };
    }
    return { ok: true };
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader !== null) {
    const parsedReferer = safeParseUrl(refererHeader);
    if (!parsedReferer || !allowedOrigins.has(parsedReferer.origin.toLowerCase())) {
      return {
        ok: false,
        code: "CSRF_ORIGIN_MISMATCH",
        reason: "Referer header does not match configured trusted origins.",
      };
    }
    return { ok: true };
  }

  if (request.headers.get("cookie")) {
    return {
      ok: false,
      code: "CSRF_ORIGIN_MISMATCH",
      reason: "Missing Origin or Referer header on cookie-authenticated mutation.",
    };
  }

  return { ok: true };
}
