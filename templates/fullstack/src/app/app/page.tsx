import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LedgerDashboard } from "@/components/LedgerDashboard";
import { getAuthenticatedContext } from "@/server/auth/service";
import { listProjects } from "@/server/services/projects";
import { listProjectsQuerySchema } from "@/server/validation";

export const dynamic = "force-dynamic";

type AppPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AppPage({ searchParams }: AppPageProps) {
  const ctx = await getAuthenticatedContext(await headers());
  if (!ctx) {
    redirect("/login");
  }

  const rawParams = await searchParams;
  const pick = (key: string) => {
    const val = rawParams[key];
    return Array.isArray(val) ? val[0] : val;
  };

  const parsed = listProjectsQuerySchema.safeParse({
    q: pick("q"),
    status: pick("status"),
    priority: pick("priority"),
    sort: pick("sort"),
    page: pick("page"),
    limit: pick("limit"),
  });

  const query = parsed.success
    ? parsed.data
    : {
        sort: "updatedAt_desc" as const,
        page: 1,
        limit: 12,
      };

  const initialProjects = await listProjects(ctx, query);

  return (
    <LedgerDashboard
      initialContext={ctx}
      initialProjects={initialProjects}
      initialFilters={{
        q: query.q ?? "",
        status: query.status ?? "",
        priority: query.priority ?? "",
        sort: query.sort,
        page: query.page,
      }}
    />
  );
}
