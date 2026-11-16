import Link from "next/link";
import { AuthFormShell } from "@/components/AuthFormShell";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const showDemoAccounts = process.env.NODE_ENV !== "production";

  return (
    <AuthFormShell
      eyebrow="Session Access"
      title="Sign in to Atölye Pusula"
      subtitle="Enter your studio credentials to open your project ledger."
      footer={
        <span>
          New studio team?{" "}
          <Link href="/register" className="font-semibold text-[var(--accent-text)] underline">
            Create an account and initial workspace
          </Link>
        </span>
      }
    >
      <LoginForm showDemoAccounts={showDemoAccounts} />
    </AuthFormShell>
  );
}
