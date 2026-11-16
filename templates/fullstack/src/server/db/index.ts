import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import { getEnv } from "@/server/env";
import { schema } from "./schema";

export type AppDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface DatabaseBundle {
  kind: "pglite" | "pg";
  url: string;
  db: AppDatabase;
  pglite?: PGlite;
  pool?: Pool;
}

const globalForDb = globalThis as typeof globalThis & {
  __pusulaDbBundle?: DatabaseBundle;
  __pusulaTestDbOverride?: DatabaseBundle;
};

function resolvePgliteTarget(databaseUrl: string): string {
  const raw = databaseUrl.slice("pglite://".length).trim();
  if (!raw || raw === "memory" || raw === "memory://") {
    return "memory://";
  }
  const absDir = path.resolve(process.cwd(), raw);
  fs.mkdirSync(absDir, { recursive: true });
  return absDir;
}

export function createDatabaseBundle(databaseUrl: string): DatabaseBundle {
  if (databaseUrl.startsWith("pglite://")) {
    const target = resolvePgliteTarget(databaseUrl);
    const client = new PGlite(target);
    const db = drizzlePglite(client, { schema }) as unknown as AppDatabase;
    return { kind: "pglite", url: databaseUrl, db, pglite: client };
  }

  if (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://")) {
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    const db = drizzlePg(pool, { schema }) as unknown as AppDatabase;
    return { kind: "pg", url: databaseUrl, db, pool };
  }

  throw new Error(
    "Unsupported DATABASE_URL protocol. Expected postgresql://, postgres://, or pglite://."
  );
}

export function getDbBundle(): DatabaseBundle {
  if (globalForDb.__pusulaTestDbOverride) {
    return globalForDb.__pusulaTestDbOverride;
  }

  const env = getEnv();
  if (globalForDb.__pusulaDbBundle && globalForDb.__pusulaDbBundle.url === env.databaseUrl) {
    return globalForDb.__pusulaDbBundle;
  }

  const bundle = createDatabaseBundle(env.databaseUrl);
  globalForDb.__pusulaDbBundle = bundle;
  return bundle;
}

export function getDb(): AppDatabase {
  return getDbBundle().db;
}

export function setDbBundleForTests(bundle: DatabaseBundle | undefined): void {
  globalForDb.__pusulaTestDbOverride = bundle;
}

export async function applyMigrations(
  bundle: DatabaseBundle = getDbBundle(),
  migrationsFolder = path.resolve(process.cwd(), "drizzle")
): Promise<void> {
  if (bundle.kind === "pglite") {
    await migratePglite(bundle.db as unknown as PgliteDatabase<typeof schema>, {
      migrationsFolder,
    });
  } else {
    await migratePg(bundle.db as unknown as Parameters<typeof migratePg>[0], {
      migrationsFolder,
    });
  }
}

export async function pingDb(bundle: DatabaseBundle = getDbBundle()): Promise<boolean> {
  await bundle.db.execute(sql`SELECT 1`);
  return true;
}

export async function closeDb(bundle?: DatabaseBundle): Promise<void> {
  const target = bundle ?? globalForDb.__pusulaTestDbOverride ?? globalForDb.__pusulaDbBundle;
  if (!target) return;
  if (target.pglite) {
    await target.pglite.close();
  }
  if (target.pool) {
    await target.pool.end();
  }
  if (globalForDb.__pusulaDbBundle === target) {
    globalForDb.__pusulaDbBundle = undefined;
  }
  if (globalForDb.__pusulaTestDbOverride === target) {
    globalForDb.__pusulaTestDbOverride = undefined;
  }
}
