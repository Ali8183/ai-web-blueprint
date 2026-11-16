import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL?.trim() || "pglite://./.data/pgdata";
const isPglite = databaseUrl.startsWith("pglite://");

export default defineConfig(
  isPglite
    ? {
        schema: "./src/server/db/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        driver: "pglite",
        dbCredentials: {
          url:
            databaseUrl === "pglite://memory"
              ? ":memory:"
              : databaseUrl.slice("pglite://".length),
        },
      }
    : {
        schema: "./src/server/db/schema.ts",
        out: "./drizzle",
        dialect: "postgresql",
        dbCredentials: {
          url: databaseUrl,
        },
      }
);
