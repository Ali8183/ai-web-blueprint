import crypto from "node:crypto";
import { and, asc, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import { type AuthenticatedContext } from "@/server/auth/service";
import { type AppDatabase, getDb } from "@/server/db";
import { isUniqueViolation } from "@/server/db/errors";
import {
  idempotencyKeys,
  type ProjectDiscipline,
  type ProjectPriority,
  projects,
  type ProjectStatus,
} from "@/server/db/schema";
import { ConflictError, ForbiddenError, NotFoundError } from "@/server/errors";

export interface ProjectDto {
  id: string;
  organizationId: string;
  code: string;
  title: string;
  clientName: string;
  discipline: ProjectDiscipline;
  status: ProjectStatus;
  priority: ProjectPriority;
  budgetCents: number;
  dueDate: string | null;
  summary: string;
  createdById: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListProjectsParams {
  q?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  sort: "updatedAt_desc" | "updatedAt_asc" | "title_asc" | "code_asc" | "priority_desc" | "dueDate_asc";
  page: number;
  limit: number;
}

export interface ListProjectsResult {
  items: ProjectDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  organizationId: string;
}

function toProjectDto(row: typeof projects.$inferSelect): ProjectDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    title: row.title,
    clientName: row.clientName,
    discipline: row.discipline as ProjectDiscipline,
    status: row.status as ProjectStatus,
    priority: row.priority as ProjectPriority,
    budgetCents: row.budgetCents,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    summary: row.summary,
    createdById: row.createdById,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function escapeIlikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export function assertCanWriteProject(ctx: AuthenticatedContext): void {
  if (ctx.role !== "owner" && ctx.role !== "editor") {
    throw new ForbiddenError(
      "INSUFFICIENT_ROLE",
      "Your role in this studio is read-only."
    );
  }
}

export function assertCanDeleteProject(ctx: AuthenticatedContext): void {
  if (ctx.role !== "owner") {
    throw new ForbiddenError(
      "INSUFFICIENT_ROLE",
      "Only studio owners can delete projects."
    );
  }
}

export async function listProjects(
  ctx: AuthenticatedContext,
  params: ListProjectsParams,
  db: AppDatabase = getDb()
): Promise<ListProjectsResult> {
  const orgId = ctx.activeOrganization.id;
  const filters: SQL[] = [eq(projects.organizationId, orgId)];

  if (params.status) {
    filters.push(eq(projects.status, params.status));
  }
  if (params.priority) {
    filters.push(eq(projects.priority, params.priority));
  }
  if (params.q && params.q.trim().length > 0) {
    const pattern = `%${escapeIlikePattern(params.q.trim())}%`;
    filters.push(
      or(
        ilike(projects.code, pattern),
        ilike(projects.title, pattern),
        ilike(projects.clientName, pattern),
        ilike(projects.summary, pattern)
      )!
    );
  }

  const whereClause = and(...filters);

  const countRows = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(projects)
    .where(whereClause);
  const total = countRows[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  const offset = (params.page - 1) * params.limit;

  const priorityOrderExpr = sql`CASE ${projects.priority}
    WHEN 'critical' THEN 4
    WHEN 'high' THEN 3
    WHEN 'medium' THEN 2
    ELSE 1
  END`;

  const orderByClauses = (() => {
    switch (params.sort) {
      case "updatedAt_asc":
        return [asc(projects.updatedAt), asc(projects.id)];
      case "title_asc":
        return [asc(projects.title), asc(projects.id)];
      case "code_asc":
        return [asc(projects.code), asc(projects.id)];
      case "priority_desc":
        return [desc(priorityOrderExpr), desc(projects.updatedAt), asc(projects.id)];
      case "dueDate_asc":
        return [sql`${projects.dueDate} ASC NULLS LAST`, asc(projects.id)];
      case "updatedAt_desc":
      default:
        return [desc(projects.updatedAt), asc(projects.id)];
    }
  })();

  const rows = await db
    .select()
    .from(projects)
    .where(whereClause)
    .orderBy(...orderByClauses)
    .limit(params.limit)
    .offset(offset);

  return {
    items: rows.map(toProjectDto),
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
    },
    organizationId: orgId,
  };
}

export async function getProjectById(
  ctx: AuthenticatedContext,
  projectId: string,
  db: AppDatabase = getDb()
): Promise<ProjectDto> {
  const [row] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, ctx.activeOrganization.id)
      )
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("PROJECT_NOT_FOUND", "Project was not found in your active studio.");
  }

  return toProjectDto(row);
}

export async function createProject(
  ctx: AuthenticatedContext,
  input: {
    code: string;
    title: string;
    clientName: string;
    discipline: ProjectDiscipline;
    status: ProjectStatus;
    priority: ProjectPriority;
    budgetCents: number;
    dueDate: Date | null;
    summary: string;
  },
  options: { idempotencyKey?: string } = {},
  db: AppDatabase = getDb()
): Promise<{ project: ProjectDto; statusCode: 200 | 201; replayed: boolean }> {
  assertCanWriteProject(ctx);

  const normalizedCode = input.code.trim().toUpperCase();
  const orgId = ctx.activeOrganization.id;
  const userId = ctx.user.id;
  const requestHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        code: normalizedCode,
        title: input.title,
        clientName: input.clientName,
        discipline: input.discipline,
        status: input.status,
        priority: input.priority,
        budgetCents: input.budgetCents,
        dueDate: input.dueDate ? input.dueDate.toISOString() : null,
        summary: input.summary,
      })
    )
    .digest("hex");

  try {
    return await db.transaction(async (tx) => {
      if (options.idempotencyKey) {
        const [existingIdem] = await tx
          .select()
          .from(idempotencyKeys)
          .where(
            and(
              eq(idempotencyKeys.organizationId, orgId),
              eq(idempotencyKeys.userId, userId),
              eq(idempotencyKeys.method, "POST"),
              eq(idempotencyKeys.path, "/api/projects"),
              eq(idempotencyKeys.key, options.idempotencyKey)
            )
          )
          .limit(1);

        if (existingIdem) {
          if (existingIdem.requestHash !== requestHash) {
            throw new ConflictError(
              "IDEMPOTENCY_KEY_MISMATCH",
              "Idempotency-Key cannot be reused with a different request payload."
            );
          }
          const parsed = JSON.parse(existingIdem.responseBody) as { project: ProjectDto };
          return {
            project: parsed.project,
            statusCode: 200,
            replayed: true,
          };
        }
      }

      const now = new Date();
      const projectId = `prj_${crypto.randomUUID()}`;

      const [inserted] = await tx
        .insert(projects)
        .values({
          id: projectId,
          organizationId: orgId,
          code: normalizedCode,
          title: input.title.trim(),
          clientName: input.clientName.trim(),
          discipline: input.discipline,
          status: input.status,
          priority: input.priority,
          budgetCents: input.budgetCents,
          dueDate: input.dueDate,
          summary: input.summary.trim(),
          createdById: userId,
          version: 1,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const dto = toProjectDto(inserted!);

      if (options.idempotencyKey) {
        await tx.insert(idempotencyKeys).values({
          id: `idm_${crypto.randomUUID()}`,
          organizationId: orgId,
          userId,
          method: "POST",
          path: "/api/projects",
          key: options.idempotencyKey,
          requestHash,
          statusCode: 201,
          responseBody: JSON.stringify({ project: dto }),
          createdAt: now,
        });
      }

      return {
        project: dto,
        statusCode: 201,
        replayed: false,
      };
    });
  } catch (err) {
    if (err instanceof ConflictError) {
      throw err;
    }
    if (options.idempotencyKey && isUniqueViolation(err, "idempotency_scope_unique")) {
      const [raced] = await db
        .select()
        .from(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.organizationId, orgId),
            eq(idempotencyKeys.userId, userId),
            eq(idempotencyKeys.method, "POST"),
            eq(idempotencyKeys.path, "/api/projects"),
            eq(idempotencyKeys.key, options.idempotencyKey)
          )
        )
        .limit(1);
      if (raced && raced.requestHash === requestHash) {
        const parsed = JSON.parse(raced.responseBody) as { project: ProjectDto };
        return { project: parsed.project, statusCode: 200, replayed: true };
      }
    }
    if (isUniqueViolation(err)) {
      throw new ConflictError(
        "PROJECT_CODE_EXISTS",
        `Project code "${normalizedCode}" already exists in this studio.`
      );
    }
    throw err;
  }
}

export async function updateProject(
  ctx: AuthenticatedContext,
  projectId: string,
  input: {
    version: number;
    code?: string;
    title?: string;
    clientName?: string;
    discipline?: ProjectDiscipline;
    status?: ProjectStatus;
    priority?: ProjectPriority;
    budgetCents?: number;
    dueDate?: Date | null;
    summary?: string;
  },
  db: AppDatabase = getDb()
): Promise<ProjectDto> {
  assertCanWriteProject(ctx);

  const orgId = ctx.activeOrganization.id;
  const now = new Date();

  const patchValues: Partial<typeof projects.$inferInsert> = {
    updatedAt: now,
    version: input.version + 1,
  };

  if (input.code !== undefined) patchValues.code = input.code.trim().toUpperCase();
  if (input.title !== undefined) patchValues.title = input.title.trim();
  if (input.clientName !== undefined) patchValues.clientName = input.clientName.trim();
  if (input.discipline !== undefined) patchValues.discipline = input.discipline;
  if (input.status !== undefined) patchValues.status = input.status;
  if (input.priority !== undefined) patchValues.priority = input.priority;
  if (input.budgetCents !== undefined) patchValues.budgetCents = input.budgetCents;
  if (input.dueDate !== undefined) patchValues.dueDate = input.dueDate;
  if (input.summary !== undefined) patchValues.summary = input.summary.trim();

  try {
    const updated = await db
      .update(projects)
      .set(patchValues)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, orgId),
          eq(projects.version, input.version)
        )
      )
      .returning();

    if (updated[0]) {
      return toProjectDto(updated[0]);
    }
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ConflictError(
        "PROJECT_CODE_EXISTS",
        `Project code "${patchValues.code}" already exists in this studio.`
      );
    }
    throw err;
  }

  const [existingInOrg] = await db
    .select({ id: projects.id, version: projects.version })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, orgId)))
    .limit(1);

  if (!existingInOrg) {
    throw new NotFoundError("PROJECT_NOT_FOUND", "Project was not found in your active studio.");
  }

  throw new ConflictError(
    "VERSION_CONFLICT",
    `Project was modified by another request (expected version ${input.version}, current version ${existingInOrg.version}). Reload and retry.`
  );
}

export async function deleteProject(
  ctx: AuthenticatedContext,
  projectId: string,
  db: AppDatabase = getDb()
): Promise<{ deleted: true; id: string }> {
  assertCanDeleteProject(ctx);

  const deleted = await db
    .delete(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, ctx.activeOrganization.id)
      )
    )
    .returning({ id: projects.id });

  if (!deleted[0]) {
    throw new NotFoundError("PROJECT_NOT_FOUND", "Project was not found in your active studio.");
  }

  return { deleted: true, id: deleted[0].id };
}
