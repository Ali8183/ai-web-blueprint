import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function runNpm(args) {
  const isWin = process.platform === "win32";
  return spawnSync(isWin ? "cmd.exe" : "npm", isWin ? ["/d", "/s", "/c", "npm", ...args] : args, {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

const steps = [
  { label: "Environment Doctor", args: ["run", "doctor"] },
  { label: "Adapter Sync Check", args: ["run", "check:adapters"] },
  { label: "Repo & Generator Tests", args: ["run", "test:repo"] },
  { label: "Fullstack Lint", args: ["run", "fullstack:lint"] },
  { label: "Fullstack Typecheck", args: ["run", "fullstack:typecheck"] },
  { label: "Fullstack Integration Tests", args: ["run", "fullstack:test"] },
  { label: "Fullstack Production Build", args: ["run", "fullstack:build"] },
];

for (const step of steps) {
  console.log(`\n=== [${step.label}] ===`);
  const res = runNpm(step.args);
  if (res.status !== 0) {
    console.error(`\n[FAILED] ${step.label} exited with code ${res.status ?? 1}`);
    process.exit(res.status ?? 1);
  }
}

console.log("\nAll verification checks passed.");
