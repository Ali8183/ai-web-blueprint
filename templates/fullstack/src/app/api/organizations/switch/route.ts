import { NextResponse } from "next/server";
import { requireAuthenticatedContext } from "@/server/auth/service";
import { toErrorResponse } from "@/server/errors";
import { assertCsrf, parseJsonBody } from "@/server/http";
import { switchActiveOrganization } from "@/server/services/organizations";
import { switchOrganizationSchema } from "@/server/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const ctx = await requireAuthenticatedContext(request.headers);
    const body = await parseJsonBody(request, switchOrganizationSchema);
    const result = await switchActiveOrganization(ctx, body.targetOrganizationId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
