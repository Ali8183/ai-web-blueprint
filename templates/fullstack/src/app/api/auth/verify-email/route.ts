import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/server/auth/service";
import { toErrorResponse } from "@/server/errors";
import { assertCsrf, enforceAuthRateLimit, parseJsonBody } from "@/server/http";
import { verifyEmailSchema } from "@/server/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const rateLimitRes = await enforceAuthRateLimit(request, "auth:verify-email", 15, 60_000);
    if (rateLimitRes) return rateLimitRes;

    const body = await parseJsonBody(request, verifyEmailSchema);
    const result = await verifyEmailToken(body.token);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
