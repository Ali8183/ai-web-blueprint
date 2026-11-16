import { applyMigrations, closeDb, getDbBundle } from "./index";

async function main() {
  const bundle = getDbBundle();
  console.log(`[db:migrate] Applying Drizzle migrations using ${bundle.kind} engine...`);
  await applyMigrations(bundle);
  console.log("[db:migrate] Migrations applied successfully.");
  await closeDb(bundle);
}

main().catch(async (err) => {
  console.error("[db:migrate] Migration failed:", err instanceof Error ? err.message : err);
  await closeDb().catch(() => {});
  process.exit(1);
});
