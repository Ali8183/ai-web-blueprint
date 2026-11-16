import type { NextConfig } from "next";
import { getSecurityHeaders } from "./src/server/security/headers";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg", "nodemailer"],
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: getSecurityHeaders(isProd),
      },
    ];
  },
};

export default nextConfig;
