import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function runCommand(cmd, args) {
  try {
    const useCmdShim = process.platform === "win32" && cmd === "npm";
    const executable = useCmdShim ? "cmd.exe" : cmd;
    const finalArgs = useCmdShim ? ["/d", "/s", "/c", cmd, ...args] : args;
    const out = execFileSync(executable, finalArgs, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output: out.trim() };
  } catch (err) {
    return {
      ok: false,
      output: err instanceof Error ? err.message : String(err),
    };
  }
}

function parseMajor(versionString) {
  const match = versionString.match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

const results = [];
let hasError = false;

// 1. Node.js >= 20
const nodeMajor = parseMajor(process.version);
if (nodeMajor >= 20) {
  results.push({ status: "PASS", label: "Node.js", detail: `${process.version} (>= 20 required)` });
} else {
  hasError = true;
  results.push({
    status: "FAIL",
    label: "Node.js",
    detail: `${process.version} found; Node.js >= 20 LTS is required. Install from https://nodejs.org/ or via fnm/nvm.`,
  });
}

// 2. npm
const npmRes = runCommand("npm", ["-v"]);
if (npmRes.ok && npmRes.output) {
  results.push({ status: "PASS", label: "npm", detail: `v${npmRes.output}` });
} else {
  hasError = true;
  results.push({
    status: "FAIL",
    label: "npm",
    detail: "npm not found in PATH. Reinstall Node.js LTS from https://nodejs.org/.",
  });
}

// 3. Git
const gitRes = runCommand("git", ["--version"]);
if (gitRes.ok && gitRes.output) {
  results.push({ status: "PASS", label: "Git", detail: gitRes.output });
} else {
  hasError = true;
  results.push({
    status: "FAIL",
    label: "Git",
    detail: "Git not found in PATH. Install from https://git-scm.com/downloads.",
  });
}

// 4. Optional Docker
const dockerRes = runCommand("docker", ["--version"]);
if (dockerRes.ok && dockerRes.output) {
  results.push({ status: "PASS", label: "Docker (optional)", detail: dockerRes.output });
} else {
  results.push({
    status: "INFO",
    label: "Docker (optional)",
    detail:
      "Not installed. templates/fullstack works without Docker using embedded real PostgreSQL (DATABASE_URL=pglite://./.data/pgdata).",
  });
}

// 5. Optional psql
const psqlRes = runCommand("psql", ["--version"]);
if (psqlRes.ok && psqlRes.output) {
  results.push({ status: "PASS", label: "PostgreSQL CLI (optional)", detail: psqlRes.output });
} else {
  results.push({
    status: "INFO",
    label: "PostgreSQL CLI (optional)",
    detail: "Not installed. Optional when using PGlite or Docker postgres:16-alpine.",
  });
}

// 6. Fullstack template .env & node_modules status
const fullstackDir = path.join(repoRoot, "templates", "fullstack");
const envExamplePath = path.join(fullstackDir, ".env.example");
const envPath = path.join(fullstackDir, ".env");
const fullstackNodeModules = path.join(fullstackDir, "node_modules");

if (fs.existsSync(envPath)) {
  results.push({ status: "PASS", label: "templates/fullstack/.env", detail: "Present" });
} else if (fs.existsSync(envExamplePath)) {
  results.push({
    status: "WARN",
    label: "templates/fullstack/.env",
    detail:
      "Missing (.env.example exists). Copy it before running dev server: Copy-Item templates/fullstack/.env.example templates/fullstack/.env (PowerShell) or cp templates/fullstack/.env.example templates/fullstack/.env (bash).",
  });
} else {
  hasError = true;
  results.push({
    status: "FAIL",
    label: "templates/fullstack/.env.example",
    detail: "Missing templates/fullstack/.env.example.",
  });
}

if (fs.existsSync(fullstackNodeModules)) {
  results.push({ status: "PASS", label: "templates/fullstack/node_modules", detail: "Installed" });
} else {
  results.push({
    status: "WARN",
    label: "templates/fullstack/node_modules",
    detail: "Not installed yet. Run: npm run fullstack:install",
  });
}

console.log("=== Web Blueprint Doctor ===");
for (const r of results) {
  console.log(`[${r.status}] ${r.label}: ${r.detail}`);
}

if (hasError) {
  console.error("\nDoctor found blocking environment issues. Resolve FAIL items above and re-run `npm run doctor`.");
  process.exit(1);
}

console.log("\nEnvironment check complete.");
