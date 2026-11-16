import { z } from "zod";

const FORBIDDEN_MASS_ASSIGNMENT_KEYS = new Set([
  "role",
  "ownerId",
  "organizationId",
  "tenantId",
  "createdById",
  "userId",
  "emailVerified",
  "activeOrganizationId",
  "id",
]);

export function assertNoMassAssignmentKeys(body: unknown): void {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return;
  }
  const forbidden = Object.keys(body as Record<string, unknown>).filter((key) =>
    FORBIDDEN_MASS_ASSIGNMENT_KEYS.has(key)
  );
  if (forbidden.length > 0) {
    throw new z.ZodError([
      {
        code: "custom",
        path: forbidden,
        message: `Forbidden field(s) in request body: ${forbidden.join(", ")}`,
      },
    ]);
  }
}

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
    email: z.string().trim().email("Enter a valid email address.").max(160),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password is too long."),
    workspaceName: z.string().trim().min(2).max(80).optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address.").max(160),
    password: z.string().min(1, "Password is required.").max(128),
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    token: z.string().trim().min(10, "Invalid verification token.").max(256),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address.").max(160),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(10, "Invalid reset token.").max(256),
    password: z
      .string()
      .min(8, "New password must be at least 8 characters.")
      .max(128, "Password is too long."),
  })
  .strict();

export const switchOrganizationSchema = z
  .object({
    targetOrganizationId: z.string().trim().min(2).max(120),
  })
  .strict();

const disciplineEnum = z.enum(["architecture", "structural", "interior", "urban"]);
const statusEnum = z.enum(["planning", "active", "review", "archived"]);
const priorityEnum = z.enum(["low", "medium", "high", "critical"]);

const nullableDateSchema = z
  .union([z.string().trim().min(1).max(64), z.null()])
  .optional()
  .transform((val, ctx) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    const parsed = new Date(val);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid dueDate ISO date string.",
      });
      return z.NEVER;
    }
    return parsed;
  });

export const createProjectSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "Project code must be at least 2 characters.")
      .max(24, "Project code must be <= 24 characters.")
      .regex(/^[A-Za-z0-9-]+$/, "Project code may only contain letters, numbers, and hyphens."),
    title: z.string().trim().min(2, "Project title must be at least 2 characters.").max(140),
    clientName: z.string().trim().min(2, "Client name must be at least 2 characters.").max(120),
    discipline: disciplineEnum.default("architecture"),
    status: statusEnum.default("planning"),
    priority: priorityEnum.default("medium"),
    budgetCents: z.number().int().min(0).max(1_000_000_000).default(0),
    dueDate: nullableDateSchema.transform((v) => (v === undefined ? null : v)),
    summary: z.string().trim().max(1500).default(""),
  })
  .strict();

export const updateProjectSchema = z
  .object({
    version: z.number().int().min(1),
    code: z
      .string()
      .trim()
      .min(2)
      .max(24)
      .regex(/^[A-Za-z0-9-]+$/, "Project code may only contain letters, numbers, and hyphens.")
      .optional(),
    title: z.string().trim().min(2).max(140).optional(),
    clientName: z.string().trim().min(2).max(120).optional(),
    discipline: disciplineEnum.optional(),
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    budgetCents: z.number().int().min(0).max(1_000_000_000).optional(),
    dueDate: nullableDateSchema,
    summary: z.string().trim().max(1500).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.code !== undefined ||
      data.title !== undefined ||
      data.clientName !== undefined ||
      data.discipline !== undefined ||
      data.status !== undefined ||
      data.priority !== undefined ||
      data.budgetCents !== undefined ||
      data.dueDate !== undefined ||
      data.summary !== undefined,
    { message: "Provide at least one updatable field alongside version." }
  );

export const listProjectsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  sort: z
    .enum([
      "updatedAt_desc",
      "updatedAt_asc",
      "title_asc",
      "code_asc",
      "priority_desc",
      "dueDate_asc",
    ])
    .default("updatedAt_desc"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
