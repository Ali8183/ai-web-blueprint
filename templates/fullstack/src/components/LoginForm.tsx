"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DEMO_ACCOUNTS = [
  { label: "Kuzey Owner", email: "owner@atolyekuzey.local", role: "owner" },
  { label: "Kuzey Editor", email: "editor@atolyekuzey.local", role: "editor" },
  { label: "Kuzey Viewer", email: "viewer@atolyekuzey.local", role: "viewer" },
  { label: "Güney Owner", email: "owner@studyoguney.local", role: "owner" },
];

export function LoginForm({ showDemoAccounts }: { showDemoAccounts: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setError(payload?.error?.message || "Invalid email or password.");
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setError("Network error while signing in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="border border-[var(--danger)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm text-[var(--danger)]"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium">
            Studio email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="architect@studio.com"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="login-password" className="block text-sm font-medium">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-[var(--accent-text)] underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Signing in…" : "Sign in to studio"}
        </button>
      </form>

      {showDemoAccounts && (
        <section
          aria-label="Development demo accounts"
          className="border border-[var(--border-subtle)] bg-[var(--bg-paper)] p-3.5"
        >
          <p className="font-mono-ledger text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
            Dev Seed Quick-Fill (Disabled in Production)
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acct) => (
              <button
                key={acct.email}
                type="button"
                className="btn-secondary min-h-9 px-2.5 py-1.5 text-xs"
                onClick={() => {
                  setEmail(acct.email);
                  setPassword("PusulaDemo!2026");
                  setError(null);
                }}
              >
                {acct.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            Run <code className="font-mono-ledger">npm run db:seed</code> locally to populate these
            seeded workspaces.
          </p>
        </section>
      )}
    </div>
  );
}
