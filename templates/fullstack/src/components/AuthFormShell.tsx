import Link from "next/link";
import { BrandMark } from "./SiteHeader";

export function AuthFormShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-paper)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-3 text-[var(--ink-primary)] no-underline"
        >
          <BrandMark />
          <span className="font-editorial text-lg font-semibold">Atölye Pusula</span>
        </Link>

        <main
          id="main-content"
          className="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8"
        >
          <p className="font-mono-ledger text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {eyebrow}
          </p>
          <h1 className="font-editorial mt-2 text-2xl font-semibold text-[var(--ink-primary)]">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)]">{subtitle}</p>

          <div className="mt-6">{children}</div>

          {footer && (
            <div className="mt-6 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--ink-muted)]">
              {footer}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
