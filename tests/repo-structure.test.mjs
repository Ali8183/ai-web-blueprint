import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "package.json",
  ".gitignore",
  "README.md",
  "README.tr.md",
  "AGENTS.md",
  "BOOTSTRAP_PROMPT.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "docs/references.md",
  "docs/architecture-decisions.md",
  "docs/usage.md",
  "docs/upgrading.md",
  "docs/deployment.md",
  "docs/privacy-and-data.md",
  "docs/performance-report.md",
  "docs/design-review.md",
  "standards/product-discovery.md",
  "standards/architecture-and-stack.md",
  "standards/design-system.md",
  "standards/frontend.md",
  "standards/backend.md",
  "standards/database.md",
  "standards/security.md",
  "standards/testing-and-ops.md",
  "presets/static-site.md",
  "presets/fullstack-web-app.md",
  "presets/existing-project.md",
  "presets/python-fastapi-ai.md",
  "project/brief.template.md",
  "project/acceptance-criteria.template.md",
  "project/decisions.template.md",
  "project/tasks.template.md",
  "project/traceability-matrix.template.md",
  "examples/briefs/01-photographer-portfolio.md",
  "examples/briefs/02-local-business-booking.md",
  "examples/briefs/03-team-management-dashboard.md",
  "adapters/README.md",
  "adapters/antigravity.md",
  "adapters/codex.md",
  "adapters/claude-code.md",
  "adapters/cursor.md",
  "adapters/copilot.md",
  ".agents/rules/core-guardrails.md",
  ".agents/skills/scope-and-brief/SKILL.md",
  ".agents/skills/design-direction-and-review/SKILL.md",
  ".agents/skills/feature-end-to-end/SKILL.md",
  ".agents/skills/security-audit/SKILL.md",
  ".agents/skills/release-readiness/SKILL.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".cursor/rules/00-core-blueprint.mdc",
  ".cursor/rules/10-security-and-db.mdc",
  ".cursor/rules/20-ui-and-design.mdc",
  ".github/copilot-instructions.md",
  ".github/instructions/security.instructions.md",
  ".github/instructions/ui-design.instructions.md",
  ".github/workflows/ci.yml",
  ".github/dependabot.yml",
  "scripts/doctor.mjs",
  "scripts/create-project.mjs",
  "scripts/sync-adapters.mjs",
  "scripts/verify-all.mjs",
  "templates/fullstack/package.json",
  "templates/fullstack/package-lock.json",
  "templates/fullstack/.env.example",
  "templates/fullstack/docker-compose.yml",
  "templates/fullstack/drizzle.config.ts",
  "templates/fullstack/next.config.ts",
];

test("all required blueprint repository files exist and are non-empty", () => {
  const missingOrEmpty = [];
  for (const relPath of REQUIRED_FILES) {
    const absPath = path.join(repoRoot, relPath);
    if (!fs.existsSync(absPath)) {
      missingOrEmpty.push(`${relPath} (missing)`);
      continue;
    }
    const stat = fs.statSync(absPath);
    if (!stat.isFile() || stat.size === 0) {
      missingOrEmpty.push(`${relPath} (empty)`);
    }
  }
  assert.deepEqual(missingOrEmpty, [], `Missing or empty files:\n${missingOrEmpty.join("\n")}`);
});

test("AGENTS.md respects <= 150 line budget", () => {
  const agentsPath = path.join(repoRoot, "AGENTS.md");
  const content = fs.readFileSync(agentsPath, "utf8");
  const lines = content.split(/\r?\n/);
  assert.ok(lines.length <= 150, `AGENTS.md must be <= 150 lines, found ${lines.length}`);
});

test("root package.json exposes required orchestration scripts", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  for (const scriptName of [
    "doctor",
    "check:adapters",
    "test:repo",
    "create:project",
    "fullstack:lint",
    "fullstack:typecheck",
    "fullstack:test",
    "fullstack:build",
    "verify",
  ]) {
    assert.ok(pkg.scripts?.[scriptName], `Missing root script: ${scriptName}`);
  }
});

test("templates/fullstack/.env.example contains no real secrets", () => {
  const envExample = fs.readFileSync(
    path.join(repoRoot, "templates", "fullstack", ".env.example"),
    "utf8"
  );
  assert.match(envExample, /SESSION_SECRET=replace-with/i);
  assert.match(envExample, /DATABASE_URL=pglite:\/\//);
});
