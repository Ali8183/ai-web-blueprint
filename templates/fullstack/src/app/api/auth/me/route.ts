import { NextResponse } from "next/server";
import { requireAuthenticatedContext } from "@/server/auth/service";
import { toErrorResponse } from "@/server/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const context = await requireAuthenticatedContext(request.headers);
    return NextResponse.json(context, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
