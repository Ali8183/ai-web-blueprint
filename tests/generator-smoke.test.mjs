import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "create-project.mjs");

function runGenerator(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function runNpmInDir(cwd, args, env) {
  const isWin = process.platform === "win32";
  return spawnSync(isWin ? "cmd.exe" : "npm", isWin ? ["/d", "/s", "/c", "npm", ...args] : args, {
    cwd,
    encoding: "utf8",
    env,
  });
}

test("create-project rejects invalid names and non-empty target without --force", () => {
  const badNameRes = runGenerator([
    "--name",
    "../BadName",
    "--target",
    path.join(os.tmpdir(), "wb-bad"),
  ]);
  assert.notEqual(badNameRes.status, 0);

  const nonEmptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "wb-nonempty-"));
  try {
    fs.writeFileSync(path.join(nonEmptyDir, "existing.txt"), "keep", "utf8");
    const nonEmptyRes = runGenerator(["--name", "valid-app", "--target", nonEmptyDir]);
    assert.notEqual(nonEmptyRes.status, 0);
    assert.match(nonEmptyRes.stderr, /not empty/i);
  } finally {
    fs.rmSync(nonEmptyDir, { recursive: true, force: true });
  }
});

test(
  "create-project generates valid project with manifest and passes install/migrate/build smoke flow",
  { timeout: 300000 },
  () => {
    const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), "wb-smoke-"));
    const targetDir = path.join(tempParent, "atlas-studio");
    try {
      const res = runGenerator(["--name", "atlas-studio", "--target", targetDir]);
      assert.equal(res.status, 0, `Generator failed:\n${res.stderr}\n${res.stdout}`);

      const manifestPath = path.join(targetDir, ".blueprint-manifest.json");
      assert.ok(fs.existsSync(manifestPath), "Missing .blueprint-manifest.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      assert.equal(manifest.blueprintVersion, "0.1.0");
      assert.equal(manifest.projectName, "atlas-studio");
      assert.ok(Array.isArray(manifest.managedFiles) && manifest.managedFiles.length > 0);
      assert.ok(manifest.checksums["package.json"]);

      const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf8"));
      assert.equal(pkg.name, "atlas-studio");

      // Excluded runtime artifacts must never be copied
      assert.equal(fs.existsSync(path.join(targetDir, "node_modules")), false);
      assert.equal(fs.existsSync(path.join(targetDir, ".next")), false);
      assert.equal(fs.existsSync(path.join(targetDir, ".data")), false);
      assert.equal(fs.existsSync(path.join(targetDir, ".env")), false);

      // Governance & CI files copied
      assert.ok(fs.existsSync(path.join(targetDir, ".env.example")));
      assert.ok(fs.existsSync(path.join(targetDir, "AGENTS.md")));
      assert.ok(fs.existsSync(path.join(targetDir, "standards", "security.md")));
      assert.ok(fs.existsSync(path.join(targetDir, ".github", "workflows", "ci.yml")));

      const smokeEnv = {
        ...process.env,
        NODE_ENV: "test",
        APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        DATABASE_URL: "pglite://./.data/smoke-pgdata",
        SESSION_SECRET: ["smoke", "local", "signing", "key", "2026"].join("-").padEnd(40, "0"), // gitleaks:allow
      };

      const installRes = runNpmInDir(targetDir, ["ci", "--prefer-offline"], smokeEnv);
      assert.equal(installRes.status, 0, `npm ci failed:\n${installRes.stderr}\n${installRes.stdout}`);

      const migrateRes = runNpmInDir(targetDir, ["run", "db:migrate"], smokeEnv);
      assert.equal(migrateRes.status, 0, `db:migrate failed:\n${migrateRes.stderr}\n${migrateRes.stdout}`);

      const buildRes = runNpmInDir(targetDir, ["run", "build"], {
        ...smokeEnv,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/smoke_build",
        SESSION_SECRET: ["smoke", "build", "signing", "key", "2026"].join("-").padEnd(44, "0"), // gitleaks:allow
      });
      assert.equal(buildRes.status, 0, `npm run build failed:\n${buildRes.stderr}\n${buildRes.stdout}`);
    } finally {
      fs.rmSync(tempParent, { recursive: true, force: true });
    }
  }
);
