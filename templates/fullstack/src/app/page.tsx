import { ArrowRight, Check, Lock, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { getAuthenticatedContext } from "@/server/auth/service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sessionCtx = await getAuthenticatedContext(await headers()).catch(() => null);

  return (
    <div className="min-h-screen bg-[var(--bg-paper)] text-[var(--ink-primary)]">
      <SiteHeader authenticated={Boolean(sessionCtx)} />

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="grid gap-10 border-b border-[var(--border-subtle)] pb-12 lg:grid-cols-12 lg:items-end">
          <div className="min-w-0 lg:col-span-8">
            <p className="font-mono-ledger mb-4 inline-block border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs uppercase tracking-[0.14em] text-[var(--forest)]">
              Studio Operations &amp; Technical Ledger · v0.1
            </p>
            <h1 className="font-editorial text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Every commission, structural phase, and studio boundary recorded in one plain ledger.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--ink-muted)] sm:text-lg">
              Atölye Pusula is an architectural and engineering project registry built around
              strict studio isolation, role-governed edits, and optimistic version control—without
              dashboard clutter.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {sessionCtx ? (
                <Link href="/app" className="btn-primary">
                  Open {sessionCtx.activeOrganization.name}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link href="/register" className="btn-primary">
                    Create studio workspace
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <Link href="/login" className="btn-secondary">
                    Sign in to existing studio
                  </Link>
                </>
              )}
            </div>
          </div>

          <aside
            aria-label="Ledger specification index"
            className="min-w-0 border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 lg:col-span-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <span className="font-mono-ledger text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                Sheet 01 · System Specs
              </span>
              <span className="font-mono-ledger text-xs text-[var(--forest)]">ACTIVE</span>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                <dt className="text-[var(--ink-muted)]">Tenant Boundary</dt>
                <dd className="font-mono-ledger font-medium">Organization ID</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                <dt className="text-[var(--ink-muted)]">Concurrency Guard</dt>
                <dd className="font-mono-ledger font-medium">Version + Idempotency</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border-subtle)] pb-2">
                <dt className="text-[var(--ink-muted)]">Budget Precision</dt>
                <dd className="font-mono-ledger font-medium">Integer Minor Units</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[var(--ink-muted)]">SQL Engines</dt>
                <dd className="font-mono-ledger font-medium">PostgreSQL / PGlite</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section
          id="architecture"
          className="grid gap-6 border-b border-[var(--border-subtle)] py-12 md:grid-cols-3"
        >
          <article className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
            <div className="mb-4 flex items-center gap-2 text-[var(--forest)]">
              <Lock size={18} aria-hidden="true" />
              <span className="font-mono-ledger text-xs uppercase tracking-[0.12em]">
                01 · Workspace Isolation
              </span>
            </div>
            <h2 className="font-editorial text-xl font-semibold">
              Server-derived studio scoping
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
              Every query filters on the active studio resolved from your verified session. Client
              payloads never set ownership, roles, or organization targets.
            </p>
          </article>

          <article className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
            <div className="mb-4 flex items-center gap-2 text-[var(--accent-text)]">
              <ShieldCheck size={18} aria-hidden="true" />
              <span className="font-mono-ledger text-xs uppercase tracking-[0.12em]">
                02 · Lost-Update Protection
              </span>
            </div>
            <h2 className="font-editorial text-xl font-semibold">
              Optimistic versions &amp; idempotent creates
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
              Stale edits fail with conflict status instead of silently overwriting a colleague&apos;s
              revision, and project codes stay unique inside each studio.
            </p>
          </article>

          <article className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
            <div className="mb-4 flex items-center gap-2 text-[var(--ink-primary)]">
              <Check size={18} aria-hidden="true" />
              <span className="font-mono-ledger text-xs uppercase tracking-[0.12em]">
                03 · Auditable Verification
              </span>
            </div>
            <h2 className="font-editorial text-xl font-semibold">
              Single-use hashed auth tokens
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
              Email verification and password resets use single-use SHA-256 hashed tokens and
              revoke active sessions immediately upon password reset.
            </p>
          </article>
        </section>

        <section id="roles" className="py-12">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="font-mono-ledger text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                Authorization Matrix
              </p>
              <h2 className="font-editorial mt-1 text-2xl font-semibold">
                Explicit role boundaries inside each studio
              </h2>
            </div>
            <Link href="/login" className="text-sm font-semibold text-[var(--accent-text)] underline">
              Inspect demo studios on sign-in
            </Link>
          </div>

          <div className="overflow-x-auto border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-band)]">
                  <th scope="col" className="px-2.5 py-2.5 font-mono-ledger text-xs uppercase tracking-wider sm:px-4 sm:py-3">
                    Role
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-mono-ledger text-xs uppercase tracking-wider sm:px-4 sm:py-3">
                    Read
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-mono-ledger text-xs uppercase tracking-wider sm:px-4 sm:py-3">
                    Create / Edit
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-mono-ledger text-xs uppercase tracking-wider sm:px-4 sm:py-3">
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th scope="row" className="px-2.5 py-2.5 font-mono-ledger font-semibold text-[var(--forest)] sm:px-4 sm:py-3">
                    owner
                  </th>
                  <td className="px-2.5 py-2.5 sm:px-4 sm:py-3">Allowed</td>
                  <td className="px-2.5 py-2.5 sm:px-4 sm:py-3">Allowed</td>
                  <td className="px-2.5 py-2.5 sm:px-4 sm:py-3">Allowed</td>
                </tr>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th scope="row" className="px-2.5 py-2.5 font-mono-ledger font-semibold sm:px-4 sm:py-3">
                    editor
                  </th>
                  <td className="px-2.5 py-2.5 sm:px-4 sm:py-3">Allowed</td>
                  <td className="px-2.5 py-2.5 sm:px-4 sm:py-3">Allowed</td>
                  <td className="px-2.5 py-2.5 text-[var(--danger)] sm:px-4 sm:py-3">Denied (403)</td>
                </tr>
                <tr>
                  <th scope="row" className="px-2.5 py-2.5 font-mono-ledger font-semibold text-[var(--ink-muted)] sm:px-4 sm:py-3">
                    viewer
                  </th>
                  <td className="px-2.5 py-2.5 sm:px-4 sm:py-3">Allowed</td>
                  <td className="px-2.5 py-2.5 text-[var(--danger)] sm:px-4 sm:py-3">Denied (403)</td>
                  <td className="px-2.5 py-2.5 text-[var(--danger)] sm:px-4 sm:py-3">Denied (403)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
