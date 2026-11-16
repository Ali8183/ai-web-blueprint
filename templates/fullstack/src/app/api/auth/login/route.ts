import { NextResponse } from "next/server";
import { loginUser } from "@/server/auth/service";
import { toErrorResponse } from "@/server/errors";
import { assertCsrf, attachSetCookies, enforceAuthRateLimit, parseJsonBody } from "@/server/http";
import { loginSchema } from "@/server/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const rateLimitRes = await enforceAuthRateLimit(request, "auth:login", 15, 60_000);
    if (rateLimitRes) return rateLimitRes;

    const body = await parseJsonBody(request, loginSchema);
    const { context, setCookieHeaders } = await loginUser(body, request.headers);

    const response = NextResponse.json(context, { status: 200 });
    return attachSetCookies(response, setCookieHeaders);
  } catch (err) {
    return toErrorResponse(err);
  }
}
