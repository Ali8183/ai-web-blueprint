import type { Metadata } from "next";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Atölye Pusula — Studio Project Ledger",
    template: "%s | Atölye Pusula",
  },
  description:
    "Architectural and engineering studio project ledger with isolated multi-organization workspaces, role-based access control, and optimistic version tracking.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Atölye Pusula — Studio Project Ledger",
    description:
      "Swiss-editorial project ledger built for architectural and structural engineering studios.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
