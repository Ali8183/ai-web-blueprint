# AI Web Blueprint (`web-blueprint` / `Atölye Pusula` Reference Kit)

A practical, spec-driven engineering blueprint (`ai-web-blueprint`, published at the root `package.json` and `AGENTS.md` under package name `web-blueprint`), multi-agent governance system, and runnable full-stack Next.js reference template built to turn vague AI coding prompts into verified, maintainable web applications.

> [!NOTE]
> **Language Guides:** Looking for step-by-step Turkish instructions for Windows PowerShell and AI coding agents? See [`README.tr.md`](README.tr.md) and [`BOOTSTRAP_PROMPT.md`](BOOTSTRAP_PROMPT.md).

## Why This Repository Exists

Most "AI web app" prompts fail in three predictable ways:
1. **Skipped discovery:** The agent jumps straight into code without locking down user roles, tenancy, edge cases, or non-goals.
2. **Visual & architectural drift:** Every UI ends up as a generic hero + purple gradient + fake testimonials, while business logic leaks into components or trusts client-supplied `organizationId`/`role` fields.
3. **Unverified completion claims:** Code is declared "production ready" without running migrations, negative security tests, builds, or responsive browser inspections.

This repository addresses those failures with four tightly aligned layers:
- **Concise Routing (`AGENTS.md`) + Thin Cross-Tool Adapters (`adapters/`, `.agents/`, `.cursor/`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`):** Keeps base context lightweight while routing agents to the exact standard needed per task.
- **Modular Engineering Standards (`standards/`, `presets/`, `project/`):** Product discovery, stack selection, anti-AI-slop visual system, frontend/backend/database engineering rules, OWASP ASVS v5.0.0 security mappings, and testing/ops gates.
- **Working Reference Application (`templates/fullstack/` — *Atölye Pusula / Compass Ledger*):** Next.js App Router + Drizzle ORM + dual PostgreSQL (`pg.Pool`) / embedded `@electric-sql/pglite` support, multi-organization RBAC (`owner` / `editor` / `viewer`), email verification and password reset flows (with Mailpit + local dev outbox fallback), CSRF origin enforcement, rate limiting, security headers, Vitest integration tests, and Playwright + `@axe-core/playwright` E2E checks.
- **Project Generator & Verification Tooling (`scripts/`, `tests/`):** `create-project.mjs` scaffolds clean downstream projects with `.blueprint-manifest.json` tracking for safe future upgrades.

## Quick Start (Windows PowerShell / macOS / Linux)

**Prerequisites:** Node.js `>= 20` LTS, `npm`, and `git`. Docker is **optional** because `templates/fullstack/` supports embedded `@electric-sql/pglite` (`pglite://./.data/pgdata`) out of the box when Docker/PostgreSQL is unavailable locally.

```powershell
# 1. Check host tools
npm run doctor

# 2. Verify repository structure, adapter sync, and generator smoke test
npm run check:adapters
npm run test:repo

# 3. Install dependencies, migrate, seed, and start the reference app
npm run fullstack:install
Copy-Item templates\fullstack\.env.example templates\fullstack\.env
npm run fullstack:migrate
npm run fullstack:seed
npm run fullstack:dev
```

On macOS/Linux, replace `Copy-Item templates\fullstack\.env.example templates\fullstack\.env` with `cp templates/fullstack/.env.example templates/fullstack/.env`.

To scaffold a clean new project outside this blueprint repository:

```powershell
npm run create:project -- --name my-studio-app --target C:\path\to\my-studio-app
```

See [`docs/usage.md`](docs/usage.md) for detailed workflows with AI CLI/IDE agents vs. chat-only models.

## Repository Map

| Path | Role |
| --- | --- |
| `AGENTS.md` | Universal concise agent entrypoint (<= 150 lines) and task router |
| `BOOTSTRAP_PROMPT.md` | Ready-to-paste Turkish & English prompts for AI coding agents |
| `standards/` | Canonical rules (discovery, stack, design, frontend, backend, DB, security, testing/ops) |
| `presets/` | Stack profiles (`fullstack-web-app`, `static-site` guide-only, `existing-project`, `python-fastapi-ai`) |
| `project/` & `examples/` | Reusable brief/AC/decision/task/traceability templates and 3 worked briefs |
| `adapters/`, `.agents/`, `.cursor/` | Cross-tool skill & rule adapters kept in sync via `scripts/sync-adapters.mjs` |
| `templates/fullstack/` | Runnable "Atölye Pusula" Next.js + Drizzle + PostgreSQL/PGlite reference app |
| `scripts/` & `tests/` | `doctor`, `sync-adapters`, `create-project`, `verify-all`, and repo/smoke tests |
| `docs/` | Architecture decisions, usage, upgrades, deployment, privacy, performance, design review, references |

## Honest Scope & Non-Goals

- **Not a one-click SaaS generator for every stack:** Only `templates/fullstack/` is a live scaffoldable code template (`create-project.mjs`). `presets/static-site.md`, `presets/existing-project.md`, and `presets/python-fastapi-ai.md` are **engineering guidance profiles**, not separate code generators.
- **Adapter verification scope:** Adapter files for Antigravity, OpenAI Codex, Claude Code, Cursor, and GitHub Copilot are generated consistently and verified against official documentation (`docs/references.md`) and `scripts/sync-adapters.mjs --check`, but **only Antigravity runtime behavior is directly tested in this environment** (`adapters/README.md`).
- **Chat-only web UIs cannot run this repository automatically:** Pasting only a GitHub repo URL into a web chat window does not execute local commands, migrations, or Playwright visual checks. Use a local workspace agent (IDE/CLI) or copy relevant `standards/` files explicitly.

## Security & Quality Disclaimer

This blueprint implements concrete defensive patterns mapped to **OWASP ASVS v5.0.0** controls (`standards/security.md`) and ships negative-first integration tests. However:
- **No template or automated check guarantees zero vulnerabilities, full ASVS certification, or full WCAG / GDPR / KVKK compliance.**
- Automated `@axe-core/playwright` scans catch common accessibility regressions (~30–50% of rule classes) and **do not replace** manual keyboard, focus, zoom, and screen-reader testing.
- Local `docker-compose.yml` credentials and embedded `pglite://` defaults are **strictly for development/testing**; production deployments must configure `TRUSTED_ORIGINS`, `TRUST_PROXY` (`none` default, or `cloudflare` / `fly` / `hops:<N>`), `RATE_LIMIT_DRIVER=postgres`, paired `SMTP_USER`/`SMTP_PASS` with TLS (`SMTP_SECURE`/`SMTP_REQUIRE_TLS`), and either fail-closed `503` email handling or scheduled `processEmailOutboxRetries()` workers (`ALLOW_PROD_DEFERRED_EMAIL_QUEUE=true`), while automated tests isolate via `TEST_DATABASE_URL` (see [`docs/deployment.md`](docs/deployment.md) and [`SECURITY.md`](SECURITY.md)).

## License

Original blueprint code, templates, and tooling are licensed under the **MIT License** ([`LICENSE`](LICENSE)). Security documentation incorporating OWASP ASVS v5.0.0 and Cheat Sheet Series material carries **CC BY-SA 4.0** attribution, and `anthropics/skills/skills/frontend-design` concepts are documented under **Apache-2.0**. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and [`docs/references.md`](docs/references.md) for complete provenance.
