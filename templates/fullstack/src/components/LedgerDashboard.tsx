"use client";

import { LogOut, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthenticatedContext } from "@/server/auth/service";
import type { ListProjectsResult, ProjectDto } from "@/server/services/projects";
import { DeleteProjectModal } from "./DeleteProjectModal";
import { ProjectModal } from "./ProjectModal";
import { BrandMark } from "./SiteHeader";

interface LedgerDashboardProps {
  initialContext: AuthenticatedContext;
  initialProjects: ListProjectsResult;
  initialFilters: {
    q: string;
    status: string;
    priority: string;
    sort: string;
    page: number;
  };
}

function formatBudget(cents: number): string {
  const whole = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(whole);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function statusPillClasses(status: ProjectDto["status"]): string {
  switch (status) {
    case "active":
      return "border-[var(--forest)] bg-[var(--forest-soft)] text-[var(--forest)]";
    case "review":
      return "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]";
    case "archived":
      return "border-[var(--border-subtle)] bg-[var(--bg-band)] text-[var(--ink-muted)]";
    case "planning":
    default:
      return "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)]";
  }
}

export function LedgerDashboard({
  initialContext,
  initialProjects,
  initialFilters,
}: LedgerDashboardProps) {
  const router = useRouter();
  const [context, setContext] = useState(initialContext);
  const [projectsResult, setProjectsResult] = useState(initialProjects);
  const [q, setQ] = useState(initialFilters.q);
  const [status, setStatus] = useState(initialFilters.status);
  const [priority, setPriority] = useState(initialFilters.priority);
  const [sort, setSort] = useState(initialFilters.sort);
  const [page, setPage] = useState(initialFilters.page);

  const [loading, setLoading] = useState(false);
  const [switchingOrg, setSwitchingOrg] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [modalState, setModalState] = useState<
    | { kind: "closed" }
    | { kind: "create" }
    | { kind: "edit"; project: ProjectDto }
    | { kind: "delete"; project: ProjectDto }
  >({ kind: "closed" });

  const abortRef = useRef<AbortController | null>(null);
  const isFirstRender = useRef(true);

  const canWrite = context.role === "owner" || context.role === "editor";
  const canDelete = context.role === "owner";

  const fetchProjects = useCallback(
    async (params: {
      q: string;
      status: string;
      priority: string;
      sort: string;
      page: number;
    }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      const sp = new URLSearchParams();
      if (params.q.trim()) sp.set("q", params.q.trim());
      if (params.status) sp.set("status", params.status);
      if (params.priority) sp.set("priority", params.priority);
      if (params.sort && params.sort !== "updatedAt_desc") sp.set("sort", params.sort);
      if (params.page > 1) sp.set("page", String(params.page));

      const urlString = sp.toString();
      router.replace(urlString ? `/app?${urlString}` : "/app", { scroll: false });

      try {
        const res = await fetch(`/api/projects?${sp.toString()}`, {
          signal: controller.signal,
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = (await res.json().catch(() => null)) as
          | (ListProjectsResult & { error?: { message?: string } })
          | null;

        if (!res.ok || !data?.items) {
          setError(data?.error?.message || "Could not load studio projects.");
          return;
        }
        setProjectsResult(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setError("Network error while loading studio projects.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void fetchProjects({ q, status, priority, sort, page });
    }, 180);
    return () => clearTimeout(timer);
  }, [q, status, priority, sort, page, fetchProjects]);

  async function handleSwitchOrganization(targetOrganizationId: string) {
    setSwitchingOrg(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetOrganizationId }),
      });
      const data = (await res.json().catch(() => null)) as {
        activeOrganization?: AuthenticatedContext["activeOrganization"];
        organizations?: AuthenticatedContext["organizations"];
        error?: { message?: string };
      } | null;

      if (!res.ok || !data?.activeOrganization || !data?.organizations) {
        setError(data?.error?.message || "Could not switch studio workspace.");
        return;
      }

      setContext((prev) => ({
        ...prev,
        activeOrganization: data.activeOrganization!,
        organizations: data.organizations!,
        role: data.activeOrganization!.role,
      }));
      setPage(1);
      setNotice(`Switched studio workspace to ${data.activeOrganization.name}.`);
      await fetchProjects({ q, status, priority, sort, page: 1 });
    } catch {
      setError("Network error while switching studio workspace.");
    } finally {
      setSwitchingOrg(false);
    }
  }

  async function handleLogout() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const hasActiveFilters = Boolean(q.trim() || status || priority);

  return (
    <div className="min-h-screen bg-[var(--bg-paper)] text-[var(--ink-primary)]">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-[var(--ink-primary)] no-underline"
            >
              <BrandMark />
              <span className="font-editorial text-lg font-semibold">Atölye Pusula</span>
            </Link>
            <span className="hidden text-[var(--border-strong)] sm:inline">/</span>
            <span className="font-mono-ledger hidden rounded-[2px] border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-2 py-0.5 text-xs uppercase tracking-wider sm:inline-block">
              {context.activeOrganization.studioCode}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="org-switcher" className="sr-only">
                Active studio workspace
              </label>
              <select
                id="org-switcher"
                aria-label="Active studio workspace"
                disabled={switchingOrg}
                value={context.activeOrganization.id}
                onChange={(e) => void handleSwitchOrganization(e.target.value)}
                className="field-input min-h-9 w-auto py-1 text-sm"
              >
                {context.organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.role})
                  </option>
                ))}
              </select>
            </div>

            <span className="font-mono-ledger border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-2.5 py-1 text-xs uppercase">
              Role: {context.role}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="btn-secondary min-h-9 px-3 py-1.5 text-sm"
            >
              <LogOut size={15} aria-hidden="true" />
              <span>{signingOut ? "Signing out…" : "Sign out"}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {!context.user.emailVerified && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]"
          >
            <span>
              Email verification pending for{" "}
              <strong className="font-mono-ledger">{context.user.email}</strong>.
            </span>
            <Link href="/verify-email" className="font-semibold text-[var(--ink-primary)] underline">
              Verify email token
            </Link>
          </div>
        )}

        {context.role === "viewer" && (
          <div
            role="status"
            className="border border-[var(--border-strong)] bg-[var(--bg-band)] px-4 py-3 text-sm text-[var(--ink-primary)]"
          >
            Read-only viewer access for <strong>{context.activeOrganization.name}</strong>. Creating,
            editing, and deleting projects are disabled for your membership role.
          </div>
        )}

        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
          <div className="min-w-0">
            <p className="font-mono-ledger text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              Studio Project Ledger · {context.user.email}
            </p>
            <h1 className="font-editorial mt-1 break-words text-3xl font-semibold">
              {context.activeOrganization.name}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!canWrite}
              title={
                canWrite
                  ? "Create a new studio project"
                  : "Viewer role is read-only and cannot create projects"
              }
              onClick={() => setModalState({ kind: "create" })}
              className="btn-primary"
            >
              <Plus size={16} aria-hidden="true" />
              <span>New project</span>
            </button>
          </div>
        </section>

        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="border border-[var(--forest)] bg-[var(--forest-soft)] px-4 py-3 text-sm text-[var(--forest)]"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void fetchProjects({ q, status, priority, sort, page })}
              className="btn-secondary min-h-9 px-3 py-1 text-xs"
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <section
          aria-label="Filter and sort studio projects"
          className="grid gap-3 border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:grid-cols-2 lg:grid-cols-12"
        >
          <div className="lg:col-span-5">
            <label htmlFor="search-q" className="mb-1 block text-xs font-medium text-[var(--ink-muted)]">
              Search code, title, or client
            </label>
            <div className="relative">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
              />
              <input
                id="search-q"
                type="search"
                className="field-input pl-9"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search e.g. AK-101, Maritime, Timber…"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="filter-status" className="mb-1 block text-xs font-medium text-[var(--ink-muted)]">
              Status
            </label>
            <select
              id="filter-status"
              className="field-input"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="review">Review</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="filter-priority" className="mb-1 block text-xs font-medium text-[var(--ink-muted)]">
              Priority
            </label>
            <select
              id="filter-priority"
              className="field-input"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="lg:col-span-3">
            <label htmlFor="sort-order" className="mb-1 block text-xs font-medium text-[var(--ink-muted)]">
              Sort ledger
            </label>
            <select
              id="sort-order"
              className="field-input"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="updatedAt_desc">Recently updated</option>
              <option value="updatedAt_asc">Oldest updated</option>
              <option value="code_asc">Code (A–Z)</option>
              <option value="title_asc">Title (A–Z)</option>
              <option value="priority_desc">Highest priority</option>
              <option value="dueDate_asc">Nearest milestone</option>
            </select>
          </div>
        </section>

        <section aria-label="Studio projects ledger">
          {loading ? (
            <div
              aria-busy="true"
              aria-label="Loading studio projects"
              className="space-y-3 border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
            >
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="h-14 animate-pulse border border-[var(--border-subtle)] bg-[var(--bg-band)]"
                />
              ))}
            </div>
          ) : projectsResult.items.length === 0 ? (
            <div className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-10 text-center">
              <p className="font-editorial text-xl font-semibold">
                {hasActiveFilters
                  ? "No projects match your current filters"
                  : "This studio ledger has no projects yet"}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                {hasActiveFilters
                  ? "Adjust or clear the active search query and status filters to view all studio entries."
                  : canWrite
                    ? "Create the first commission entry to start tracking phase status and budget."
                    : "Ask a studio owner or editor to add the first project entry."}
              </p>
              <div className="mt-5 flex justify-center gap-3">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setQ("");
                      setStatus("");
                      setPriority("");
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </button>
                ) : (
                  canWrite && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setModalState({ kind: "create" })}
                    >
                      <Plus size={16} aria-hidden="true" />
                      <span>Create first project</span>
                    </button>
                  )
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop tabular ledger */}
              <div className="hidden overflow-x-auto border border-[var(--border-subtle)] bg-[var(--bg-surface)] lg:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-band)]">
                      <th scope="col" className="px-4 py-3 font-mono-ledger text-xs uppercase tracking-wider">
                        Code
                      </th>
                      <th scope="col" className="px-4 py-3 font-mono-ledger text-xs uppercase tracking-wider">
                        Project &amp; Client
                      </th>
                      <th scope="col" className="px-4 py-3 font-mono-ledger text-xs uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 font-mono-ledger text-xs uppercase tracking-wider">
                        Priority
                      </th>
                      <th scope="col" className="px-4 py-3 font-mono-ledger text-xs uppercase tracking-wider">
                        Fee
                      </th>
                      <th scope="col" className="px-4 py-3 font-mono-ledger text-xs uppercase tracking-wider">
                        Milestone
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-mono-ledger text-xs uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectsResult.items.map((proj) => (
                      <tr
                        key={proj.id}
                        className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--bg-paper)]"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5 align-top font-mono-ledger font-semibold">
                          <div>{proj.code}</div>
                          <div className="text-[11px] font-normal text-[var(--ink-muted)]">
                            v{proj.version}
                          </div>
                        </td>
                        <td className="max-w-xs px-4 py-3.5 align-top">
                          <div className="break-words font-semibold text-[var(--ink-primary)]">
                            {proj.title}
                          </div>
                          <div className="mt-0.5 break-words text-xs text-[var(--ink-muted)]">
                            {proj.clientName} · {proj.discipline}
                          </div>
                          {proj.summary && (
                            <p className="mt-1 line-clamp-2 break-words text-xs text-[var(--ink-muted)]">
                              {proj.summary}
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 align-top">
                          <span
                            className={`font-mono-ledger inline-block border px-2 py-0.5 text-xs uppercase ${statusPillClasses(
                              proj.status
                            )}`}
                          >
                            {proj.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 align-top font-mono-ledger text-xs uppercase">
                          {proj.priority}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 align-top font-mono-ledger">
                          {formatBudget(proj.budgetCents)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 align-top font-mono-ledger text-xs text-[var(--ink-muted)]">
                          {formatDate(proj.dueDate)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right align-top">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!canWrite}
                              onClick={() => setModalState({ kind: "edit", project: proj })}
                              aria-label={`Edit ${proj.code}`}
                              title={canWrite ? `Edit ${proj.code}` : "Viewer role is read-only"}
                              className="btn-secondary min-h-9 px-2.5 py-1 text-xs"
                            >
                              <Pencil size={14} aria-hidden="true" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              disabled={!canDelete}
                              onClick={() => setModalState({ kind: "delete", project: proj })}
                              aria-label={`Delete ${proj.code}`}
                              title={
                                canDelete
                                  ? `Delete ${proj.code}`
                                  : "Only studio owners can delete projects"
                              }
                              className="btn-secondary min-h-9 px-2.5 py-1 text-xs text-[var(--danger)]"
                            >
                              <Trash2 size={14} aria-hidden="true" />
                              <span className="sr-only sm:not-sr-only">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile & tablet responsive card stack (< 1024px) */}
              <div className="space-y-3 lg:hidden">
                {projectsResult.items.map((proj) => (
                  <article
                    key={proj.id}
                    className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono-ledger text-sm font-semibold">
                        {proj.code} · v{proj.version}
                      </span>
                      <span
                        className={`font-mono-ledger border px-2 py-0.5 text-xs uppercase ${statusPillClasses(
                          proj.status
                        )}`}
                      >
                        {proj.status}
                      </span>
                    </div>
                    <h2 className="mt-2 break-words text-base font-semibold">{proj.title}</h2>
                    <p className="mt-0.5 break-words text-xs text-[var(--ink-muted)]">
                      {proj.clientName} · {proj.discipline} · {proj.priority}
                    </p>
                    {proj.summary && (
                      <p className="mt-2 break-words text-xs text-[var(--ink-muted)]">
                        {proj.summary}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs">
                      <span className="font-mono-ledger">
                        {formatBudget(proj.budgetCents)} · {formatDate(proj.dueDate)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!canWrite}
                          onClick={() => setModalState({ kind: "edit", project: proj })}
                          aria-label={`Edit ${proj.code}`}
                          title={canWrite ? `Edit ${proj.code}` : "Viewer role is read-only"}
                          className="btn-secondary min-h-9 px-3 py-1 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={!canDelete}
                          onClick={() => setModalState({ kind: "delete", project: proj })}
                          aria-label={`Delete ${proj.code}`}
                          title={
                            canDelete
                              ? `Delete ${proj.code}`
                              : "Only studio owners can delete projects"
                          }
                          className="btn-secondary min-h-9 px-3 py-1 text-xs text-[var(--danger)]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {projectsResult.pagination.total > 0 && (
            <nav
              aria-label="Ledger pagination"
              className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-sm"
            >
              <span className="font-mono-ledger text-xs text-[var(--ink-muted)]">
                Showing page {projectsResult.pagination.page} of{" "}
                {projectsResult.pagination.totalPages} ({projectsResult.pagination.total} entries)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn-secondary min-h-9 px-3 py-1 text-xs"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= projectsResult.pagination.totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-secondary min-h-9 px-3 py-1 text-xs"
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </section>
      </main>

      {(modalState.kind === "create" || modalState.kind === "edit") && (
        <ProjectModal
          mode={modalState.kind}
          project={modalState.kind === "edit" ? modalState.project : undefined}
          studioCode={context.activeOrganization.studioCode}
          onClose={() => setModalState({ kind: "closed" })}
          onSaved={(savedProject, action) => {
            setModalState({ kind: "closed" });
            setNotice(
              action === "created"
                ? `Project ${savedProject.code} created.`
                : `Project ${savedProject.code} updated to v${savedProject.version}.`
            );
            void fetchProjects({ q, status, priority, sort, page });
          }}
        />
      )}

      {modalState.kind === "delete" && (
        <DeleteProjectModal
          project={modalState.project}
          onClose={() => setModalState({ kind: "closed" })}
          onDeleted={(_id, code) => {
            setModalState({ kind: "closed" });
            setNotice(`Project ${code} deleted from studio ledger.`);
            void fetchProjects({ q, status, priority, sort, page });
          }}
        />
      )}
    </div>
  );
}
