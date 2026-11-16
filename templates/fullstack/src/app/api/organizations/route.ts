import { NextResponse } from "next/server";
import { requireAuthenticatedContext } from "@/server/auth/service";
import { toErrorResponse } from "@/server/errors";
import { listUserOrganizations } from "@/server/services/organizations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ctx = await requireAuthenticatedContext(request.headers);
    const result = await listUserOrganizations(ctx);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
