"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthFormShell } from "@/components/AuthFormShell";

function ResetPasswordFormInner() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") ?? "";
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const payload = (await response.json().catch(() => null)) as {
        reset?: boolean;
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setError(payload?.error?.message || "Reset token is invalid or has expired.");
        return;
      }

      setCompleted(true);
    } catch {
      setError("Network error while resetting password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) {
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="border border-[var(--forest)] bg-[var(--forest-soft)] px-4 py-3 text-sm text-[var(--forest)]"
        >
          Your password has been updated and all prior sessions were revoked.
        </div>
        <Link href="/login" className="btn-primary w-full">
          Sign in with your new password
        </Link>
      </div>
    );
  }

  return (
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
        <label htmlFor="reset-token" className="mb-1.5 block text-sm font-medium">
          Reset token
        </label>
        <input
          id="reset-token"
          name="token"
          type="text"
          required
          className="field-input font-mono-ledger text-xs"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="reset-password" className="mb-1.5 block text-sm font-medium">
          New password (8+ characters)
        </label>
        <input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "Updating password…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthFormShell
      eyebrow="Credential Recovery"
      title="Set a new password"
      subtitle="Enter your single-use token and choose a new password."
      footer={
        <span>
          Need a fresh token?{" "}
          <Link href="/forgot-password" className="font-semibold text-[var(--accent-text)] underline">
            Request password reset
          </Link>
        </span>
      }
    >
      <Suspense fallback={<p className="text-sm text-[var(--ink-muted)]">Loading reset form…</p>}>
        <ResetPasswordFormInner />
      </Suspense>
    </AuthFormShell>
  );
}
