"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function BrandMark() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="1" y="1" width="22" height="22" stroke="#141413" strokeWidth="1.5" />
      <line x1="12" y1="3" x2="12" y2="21" stroke="#D8D4CA" strokeWidth="1" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="#D8D4CA" strokeWidth="1" />
      <polygon points="12,4.5 16,12 12,19.5 8,12" stroke="#141413" strokeWidth="1.3" fill="none" />
      <polygon points="12,4.5 14.5,12 12,12" fill="#C84B31" />
    </svg>
  );
}

export function SiteHeader({ authenticated = false }: { authenticated?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-paper)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-3 text-[var(--ink-primary)] no-underline"
        >
          <BrandMark />
          <span className="flex flex-col leading-tight">
            <span className="font-editorial text-lg font-semibold tracking-tight">
              Atölye Pusula
            </span>
            <span className="font-mono-ledger text-[11px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              Compass Ledger
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-3 md:flex">
          <Link
            href="/#architecture"
            className="px-3 py-2 text-sm font-medium text-[var(--ink-muted)] no-underline hover:text-[var(--ink-primary)]"
          >
            Ledger Model
          </Link>
          <Link
            href="/#roles"
            className="px-3 py-2 text-sm font-medium text-[var(--ink-muted)] no-underline hover:text-[var(--ink-primary)]"
          >
            Role Matrix
          </Link>
          {authenticated ? (
            <Link href="/app" className="btn-primary">
              Open Studio Ledger
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary">
                Create studio
              </Link>
            </>
          )}
        </nav>

        <button
          type="button"
          className="btn-secondary md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-drawer"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          <span>Menu</span>
        </button>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav-drawer"
          aria-label="Mobile Navigation"
          className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-4 md:hidden"
        >
          <div className="flex flex-col gap-3">
            <Link
              href="/#architecture"
              onClick={() => setMobileOpen(false)}
              className="py-2 text-sm font-medium text-[var(--ink-primary)] no-underline"
            >
              Ledger Model
            </Link>
            <Link
              href="/#roles"
              onClick={() => setMobileOpen(false)}
              className="py-2 text-sm font-medium text-[var(--ink-primary)] no-underline"
            >
              Role Matrix
            </Link>
            {authenticated ? (
              <Link
                href="/app"
                className="btn-primary w-full"
                onClick={() => setMobileOpen(false)}
              >
                Open Studio Ledger
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn-secondary w-full"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="btn-primary w-full"
                  onClick={() => setMobileOpen(false)}
                >
                  Create studio
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
