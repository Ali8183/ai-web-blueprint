import { NextResponse } from "next/server";
import { registerUser } from "@/server/auth/service";
import { toErrorResponse } from "@/server/errors";
import { assertCsrf, attachSetCookies, enforceAuthRateLimit, parseJsonBody } from "@/server/http";
import { registerSchema } from "@/server/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const rateLimitRes = await enforceAuthRateLimit(request, "auth:register", 12, 60_000);
    if (rateLimitRes) return rateLimitRes;

    const body = await parseJsonBody(request, registerSchema);
    const { context, setCookieHeaders } = await registerUser(body, request.headers);

    const response = NextResponse.json(context, { status: 201 });
    return attachSetCookies(response, setCookieHeaders);
  } catch (err) {
    return toErrorResponse(err);
  }
}
