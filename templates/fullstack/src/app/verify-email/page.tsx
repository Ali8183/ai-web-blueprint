"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthFormShell } from "@/components/AuthFormShell";

interface VerifyResult {
  ok: boolean;
  message?: string;
}

const autoVerifyPromises = new Map<string, Promise<VerifyResult>>();

async function postVerifyToken(rawToken: string): Promise<VerifyResult> {
  const response = await fetch("/api/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: rawToken.trim() }),
  });

  const payload = (await response.json().catch(() => null)) as {
    verified?: boolean;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    return {
      ok: false,
      message: payload?.error?.message || "Verification token is invalid or expired.",
    };
  }
  return { ok: true };
}

function getOrStartAutoVerify(rawToken: string): Promise<VerifyResult> {
  const key = rawToken.trim();
  let existing = autoVerifyPromises.get(key);
  if (!existing) {
    existing = postVerifyToken(key);
    autoVerifyPromises.set(key, existing);
  }
  return existing;
}

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const queryToken = searchParams.get("token") ?? "";
  const [token, setToken] = useState(queryToken);
  const [status, setStatus] = useState<"idle" | "verifying" | "verified" | "error">(
    queryToken ? "verifying" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!queryToken) return;
    let cancelled = false;

    void getOrStartAutoVerify(queryToken)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setStatus("verified");
        } else {
          setStatus("error");
          setError(res.message ?? "Verification token is invalid or expired.");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        setError("Network error while verifying email.");
      });

    return () => {
      cancelled = true;
    };
  }, [queryToken]);

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setStatus("error");
      setError("Enter a verification token.");
      return;
    }

    setStatus("verifying");
    setError(null);
    try {
      const res = await postVerifyToken(trimmed);
      if (res.ok) {
        setStatus("verified");
      } else {
        setStatus("error");
        setError(res.message ?? "Verification token is invalid or expired.");
      }
    } catch {
      setStatus("error");
      setError("Network error while verifying email.");
    }
  }

  if (status === "verified") {
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="border border-[var(--forest)] bg-[var(--forest-soft)] px-4 py-3 text-sm text-[var(--forest)]"
        >
          Email verified successfully. Your studio account is confirmed.
        </div>
        <Link href="/app" className="btn-primary w-full">
          Continue to studio ledger
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleManualSubmit} className="space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          className="border border-[var(--danger)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm text-[var(--danger)]"
        >
          {error}
        </div>
      )}

      {status === "verifying" && (
        <div
          role="status"
          className="border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-3.5 py-2.5 text-sm text-[var(--ink-muted)]"
        >
          Verifying token…
        </div>
      )}

      <div>
        <label htmlFor="verify-token" className="mb-1.5 block text-sm font-medium">
          Verification token
        </label>
        <input
          id="verify-token"
          name="token"
          type="text"
          required
          className="field-input font-mono-ledger text-xs"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste verification token from your email"
        />
      </div>

      <button type="submit" disabled={status === "verifying"} className="btn-primary w-full">
        {status === "verifying" ? "Verifying…" : "Verify email address"}
      </button>
    </form>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthFormShell
      eyebrow="Email Confirmation"
      title="Verify your email address"
      subtitle="Submit the single-use verification token sent when your studio was created."
      footer={
        <span>
          Already signed in?{" "}
          <Link href="/app" className="font-semibold text-[var(--accent-text)] underline">
            Open studio ledger
          </Link>
        </span>
      }
    >
      <Suspense fallback={<p className="text-sm text-[var(--ink-muted)]">Loading verifier…</p>}>
        <VerifyEmailInner />
      </Suspense>
    </AuthFormShell>
  );
}
