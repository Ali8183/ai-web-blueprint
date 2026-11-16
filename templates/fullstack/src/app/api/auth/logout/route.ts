import { NextResponse } from "next/server";
import { logoutUser } from "@/server/auth/service";
import { toErrorResponse } from "@/server/errors";
import { assertCsrf, attachSetCookies } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const { setCookieHeaders } = await logoutUser(request.headers);
    const response = NextResponse.json({ ok: true }, { status: 200 });
    return attachSetCookies(response, setCookieHeaders);
  } catch (err) {
    return toErrorResponse(err);
  }
}
