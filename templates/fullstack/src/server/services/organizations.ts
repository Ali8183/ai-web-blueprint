import { and, eq } from "drizzle-orm";
import {
  type AuthenticatedContext,
  loadUserOrganizations,
  type OrganizationMembershipDto,
} from "@/server/auth/service";
import { type AppDatabase, getDb } from "@/server/db";
import { memberships, users } from "@/server/db/schema";
import { ForbiddenError } from "@/server/errors";

export async function listUserOrganizations(
  ctx: AuthenticatedContext,
  db: AppDatabase = getDb()
): Promise<{
  activeOrganizationId: string;
  organizations: OrganizationMembershipDto[];
}> {
  const organizations = await loadUserOrganizations(db, ctx.user.id);
  return {
    activeOrganizationId: ctx.activeOrganization.id,
    organizations,
  };
}

export async function switchActiveOrganization(
  ctx: AuthenticatedContext,
  organizationId: string,
  db: AppDatabase = getDb()
): Promise<{
  activeOrganization: OrganizationMembershipDto;
  organizations: OrganizationMembershipDto[];
}> {
  const [membershipRow] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, ctx.user.id),
        eq(memberships.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!membershipRow) {
    throw new ForbiddenError(
      "ORGANIZATION_ACCESS_DENIED",
      "You are not a member of the requested organization."
    );
  }

  await db
    .update(users)
    .set({ activeOrganizationId: organizationId, updatedAt: new Date() })
    .where(eq(users.id, ctx.user.id));

  const organizations = await loadUserOrganizations(db, ctx.user.id);
  const activeOrganization = organizations.find((o) => o.id === organizationId);
  if (!activeOrganization) {
    throw new ForbiddenError(
      "ORGANIZATION_ACCESS_DENIED",
      "You are not a member of the requested organization."
    );
  }

  return { activeOrganization, organizations };
}
