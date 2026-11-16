---
name: release-readiness
description: >-
  Use this skill before merging, tagging, or deploying to run all repository, adapter,
  generator smoke, lint, typecheck, database migration, integration, E2E, and health checks
  and produce a strictly truthful verification report separating run vs unrun checks.
---

# Release Readiness

## Trigger Purpose
Activate as the final verification gate before declaring work ready for merge, release, or production deployment. Prevents reporting assumed, stale, or partially skipped checks as full passes.

## Inputs
- [standards/testing-and-ops.md](../../../standards/testing-and-ops.md)
- [docs/deployment.md](../../../docs/deployment.md) and [project/traceability-matrix.template.md](../../../project/traceability-matrix.template.md)
- Root `package.json` orchestration scripts

## Steps
1. Run environment and adapter parity checks from repository root:
   - `npm run doctor`
   - `npm run check:adapters`
   - `npm run test:repo` (covers structure, adapter sync, and clean-temp `create-project.mjs` smoke flow)
2. Run full-stack application verification (after final edits):
   - `npm run fullstack:lint`
   - `npm run fullstack:typecheck`
   - `npm run fullstack:test` (Vitest integration tests against real migrations)
   - `npm run fullstack:build`
   - `npm run fullstack:e2e` (Playwright E2E + `@axe-core/playwright` + responsive screenshots)
3. Inspect key operational readiness artifacts:
   - Confirm `/api/health` checks DB connectivity without leaking secrets/stack traces.
   - Confirm `robots.txt` and `sitemap.xml` match public/private route policy without treating `robots.txt` as access control.
   - Confirm `templates/fullstack/.env.example` contains placeholders only and no secrets were committed.
   - Confirm `docs/deployment.md` runbook covers migration ordering, rollback, secret rotation, and backup/restore drills.
4. Compile a final release readiness summary with **exact commands, exit codes, and observed counts**, separating:
   - **Verified Locally in This Session**
   - **Not Run / Requires Target Environment** (e.g., GitHub Actions CI run after push, remote PostgreSQL TLS/managed backup restore drill, field CrUX INP, external tools like Cursor/Copilot/Claude Code/Codex CLI runtime checks).

## Outputs
- Verified command execution log and updated `project/traceability-matrix.md`
- Honest go / no-go release summary distinguishing verified vs unrun checks

## Verification Method
- Every claimed pass must correspond to a command run **after the final file edit** with exit code `0` and zero skipped or relaxed assertions.
- If any gate fails or cannot run in the local environment, report the exact failure or environment gap rather than substituting assumptions.
