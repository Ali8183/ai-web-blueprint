import { NextResponse } from "next/server";
import { ZodType } from "zod";
import { ForbiddenError } from "@/server/errors";
import { verifyCsrfOrigin } from "@/server/security/csrf";
import { checkRateLimit, getClientIp } from "@/server/security/rate-limit";
import { assertNoMassAssignmentKeys } from "@/server/validation";

export function assertCsrf(request: Request): void {
  const res = verifyCsrfOrigin(request);
  if (!res.ok) {
    throw new ForbiddenError(
      res.code ?? "CSRF_ORIGIN_MISMATCH",
      res.reason ?? "Cross-origin request rejected."
    );
  }
}

export async function enforceAuthRateLimit(
  request: Request,
  scope: string,
  limit = 15,
  windowMs = 60_000
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const result = await checkRateLimit(scope, ip, { limit, windowMs });
  if (result.allowed) {
    return null;
  }
  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many authentication requests. Please wait before retrying.",
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const raw = (await request.json()) as unknown;
  assertNoMassAssignmentKeys(raw);
  return schema.parse(raw);
}

export function attachSetCookies(response: NextResponse, cookies: string[]): NextResponse {
  for (const cookie of cookies) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
}
