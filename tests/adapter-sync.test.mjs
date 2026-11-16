import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildAdapterFiles, syncAdapters } from "../scripts/sync-adapters.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const syncScriptPath = path.join(repoRoot, "scripts", "sync-adapters.mjs");

test("repo adapter files match scripts/sync-adapters.mjs --check", () => {
  const result = syncAdapters({ rootDir: repoRoot, check: true });
  assert.equal(result.ok, true, `Drifted adapters: ${result.drifted.join(", ")}`);
  assert.equal(result.total, 8);

  const cliOutput = execFileSync(process.execPath, [syncScriptPath, "--check"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.match(cliOutput, /Adapter sync check passed \(8\/8 up to date\)/);
});

test("Cursor .mdc and GitHub .instructions.md files contain valid frontmatter", () => {
  const files = buildAdapterFiles();
  const byPath = new Map(files.map((item) => [item.relPath, item.content]));

  for (const mdcPath of [
    ".cursor/rules/00-core-blueprint.mdc",
    ".cursor/rules/10-security-and-db.mdc",
    ".cursor/rules/20-ui-and-design.mdc",
  ]) {
    const content = byPath.get(mdcPath);
    assert.ok(content, `Missing ${mdcPath}`);
    assert.match(content, /^---\r?\ndescription: .+\r?\n/);
    assert.match(content, /\r?\nalwaysApply: (true|false)\r?\n---/);
  }

  for (const instrPath of [
    ".github/instructions/security.instructions.md",
    ".github/instructions/ui-design.instructions.md",
  ]) {
    const content = byPath.get(instrPath);
    assert.ok(content, `Missing ${instrPath}`);
    assert.match(content, /^---\r?\ndescription: .+\r?\napplyTo: '.+'\r?\n---/);
  }

  const gemini = byPath.get("GEMINI.md");
  assert.ok(gemini);
  assert.doesNotMatch(gemini, /^---\r?\n/);
});

test("Antigravity rules stay under 24 KB and skills follow SKILL.md frontmatter contract", () => {
  const coreRulePath = path.join(repoRoot, ".agents", "rules", "core-guardrails.md");
  const stat = fs.statSync(coreRulePath);
  assert.ok(stat.size > 0 && stat.size < 24_000, `core-guardrails.md size=${stat.size}`);

  const expectedSkills = [
    "scope-and-brief",
    "design-direction-and-review",
    "feature-end-to-end",
    "security-audit",
    "release-readiness",
  ];

  for (const skillName of expectedSkills) {
    const skillPath = path.join(repoRoot, ".agents", "skills", skillName, "SKILL.md");
    const content = fs.readFileSync(skillPath, "utf8");
    assert.match(content, new RegExp(`^---\\r?\\nname: ${skillName}\\r?\\ndescription:`));
    assert.match(content, /## Trigger Purpose/);
    assert.match(content, /## Steps/);
    assert.match(content, /## Verification Method/);
  }
});

test("sync-adapters --check detects missing and modified adapter drift with non-zero exit", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "adapter-sync-test-"));
  try {
    execFileSync(process.execPath, [syncScriptPath, "--root", tempRoot], {
      encoding: "utf8",
    });

    const cleanResult = syncAdapters({ rootDir: tempRoot, check: true });
    assert.equal(cleanResult.ok, true);

    const targetClaude = path.join(tempRoot, "CLAUDE.md");
    fs.appendFileSync(targetClaude, "\n# Manual Drift\n", "utf8");

    const missingTarget = path.join(tempRoot, "GEMINI.md");
    fs.unlinkSync(missingTarget);

    let failed = false;
    try {
      execFileSync(process.execPath, [syncScriptPath, "--check", "--root", tempRoot], {
        encoding: "utf8",
        stdio: "pipe",
      });
    } catch (err) {
      failed = true;
      assert.equal(err.status, 1);
      const stderr = String(err.stderr ?? "");
      assert.match(stderr, /CLAUDE\.md \(out of sync\)/);
      assert.match(stderr, /GEMINI\.md \(missing\)/);
    }
    assert.equal(failed, true, "Expected --check to exit non-zero on drift");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
