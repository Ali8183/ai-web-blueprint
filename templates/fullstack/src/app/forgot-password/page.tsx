"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthFormShell } from "@/components/AuthFormShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatusMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setError(payload?.error?.message || "Could not queue password reset.");
        return;
      }

      setStatusMessage(
        payload?.message ||
          "If an account exists for that email, password reset instructions have been queued."
      );
    } catch {
      setError("Network error while requesting password reset.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      eyebrow="Credential Recovery"
      title="Request password reset"
      subtitle="Single-use reset tokens expire after 30 minutes and revoke active sessions upon completion."
      footer={
        <span>
          Remembered your password?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent-text)] underline">
            Return to sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="border border-[var(--danger)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm text-[var(--danger)]"
          >
            {error}
          </div>
        )}

        {statusMessage && (
          <div
            role="status"
            className="border border-[var(--forest)] bg-[var(--forest-soft)] px-3.5 py-2.5 text-sm text-[var(--forest)]"
          >
            {statusMessage}
          </div>
        )}

        <div>
          <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium">
            Account email
          </label>
          <input
            id="forgot-email"
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

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Sending reset link…" : "Send reset instructions"}
        </button>
      </form>
    </AuthFormShell>
  );
}
