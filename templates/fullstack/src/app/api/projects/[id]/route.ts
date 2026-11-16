import { NextResponse } from "next/server";
import { requireAuthenticatedContext } from "@/server/auth/service";
import { BadRequestError, toErrorResponse } from "@/server/errors";
import { assertCsrf, parseJsonBody } from "@/server/http";
import { deleteProject, getProjectById, updateProject } from "@/server/services/projects";
import { updateProjectSchema } from "@/server/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function resolveProjectId(context: RouteContext): Promise<string> {
  const { id } = await context.params;
  if (!id || id.length > 120) {
    throw new BadRequestError("INVALID_PROJECT_ID", "Invalid project identifier.");
  }
  return id;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const ctx = await requireAuthenticatedContext(request.headers);
    const projectId = await resolveProjectId(context);
    const project = await getProjectById(ctx, projectId);
    return NextResponse.json({ project }, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertCsrf(request);
    const ctx = await requireAuthenticatedContext(request.headers);
    const projectId = await resolveProjectId(context);
    const body = await parseJsonBody(request, updateProjectSchema);
    const project = await updateProject(ctx, projectId, body);
    return NextResponse.json({ project }, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertCsrf(request);
    const ctx = await requireAuthenticatedContext(request.headers);
    const projectId = await resolveProjectId(context);
    const result = await deleteProject(ctx, projectId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
