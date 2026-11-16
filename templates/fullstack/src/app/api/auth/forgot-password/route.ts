import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/server/auth/service";
import { toErrorResponse } from "@/server/errors";
import { assertCsrf, enforceAuthRateLimit, parseJsonBody } from "@/server/http";
import { forgotPasswordSchema } from "@/server/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const rateLimitRes = await enforceAuthRateLimit(request, "auth:forgot-password", 10, 60_000);
    if (rateLimitRes) return rateLimitRes;

    const body = await parseJsonBody(request, forgotPasswordSchema);
    const result = await requestPasswordReset(body.email);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
