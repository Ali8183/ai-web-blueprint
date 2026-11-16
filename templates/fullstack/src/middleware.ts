import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSecurityHeaders } from "@/server/security/headers";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const isProd = process.env.NODE_ENV === "production";
  for (const header of getSecurityHeaders(isProd)) {
    response.headers.set(header.key, header.value);
  }
  if (!response.headers.get("x-request-id")) {
    response.headers.set(
      "x-request-id",
      request.headers.get("x-request-id") || crypto.randomUUID()
    );
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
