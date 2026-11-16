import { NextResponse } from "next/server";
import { requireAuthenticatedContext } from "@/server/auth/service";
import { BadRequestError, toErrorResponse } from "@/server/errors";
import { assertCsrf, parseJsonBody } from "@/server/http";
import { createProject, listProjects } from "@/server/services/projects";
import { createProjectSchema, listProjectsQuerySchema } from "@/server/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ctx = await requireAuthenticatedContext(request.headers);
    const url = new URL(request.url);
    const query = listProjectsQuerySchema.parse({
      q: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      priority: url.searchParams.get("priority") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const result = await listProjects(ctx, query);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const ctx = await requireAuthenticatedContext(request.headers);
    const rawIdem = request.headers.get("idempotency-key");
    let idempotencyKey: string | undefined;
    if (rawIdem !== null) {
      const trimmed = rawIdem.trim();
      if (!trimmed || trimmed.length > 128 || /\s/.test(trimmed)) {
        throw new BadRequestError(
          "INVALID_IDEMPOTENCY_KEY",
          "Idempotency-Key must be 1-128 non-whitespace characters."
        );
      }
      idempotencyKey = trimmed;
    }

    const body = await parseJsonBody(request, createProjectSchema);
    const result = await createProject(ctx, body, { idempotencyKey });
    return NextResponse.json(
      { project: result.project, replayed: result.replayed },
      { status: result.statusCode }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
