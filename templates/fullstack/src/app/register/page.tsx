"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthFormShell } from "@/components/AuthFormShell";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          ...(workspaceName.trim() ? { workspaceName: workspaceName.trim() } : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setError(payload?.error?.message || "Could not create studio account.");
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setError("Network error while creating account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      eyebrow="Studio Onboarding"
      title="Create studio & owner account"
      subtitle="Creates your user account, initial workspace, and owner role in one transaction."
      footer={
        <span>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent-text)] underline">
            Sign in
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

        <div>
          <label htmlFor="register-name" className="mb-1.5 block text-sm font-medium">
            Full name
          </label>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Leyla Kaya"
          />
        </div>

        <div>
          <label htmlFor="register-workspace" className="mb-1.5 block text-sm font-medium">
            Studio / workspace name
          </label>
          <input
            id="register-workspace"
            name="workspaceName"
            type="text"
            className="field-input"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Atölye Kuzey"
          />
        </div>

        <div>
          <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium">
            Work email
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="leyla@atolye.example"
          />
        </div>

        <div>
          <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium">
            Password (8+ characters)
          </label>
          <input
            id="register-password"
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
          {submitting ? "Creating studio…" : "Create studio workspace"}
        </button>
      </form>
    </AuthFormShell>
  );
}
