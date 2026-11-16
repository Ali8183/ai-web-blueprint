# Usage Guide

This guide explains how to use the Web Blueprint repository effectively with agentic IDE/CLI tools, why repository URLs alone fail in web chat interfaces, and how to run the reference application or generate a new project.

## 1. CLI / IDE Agents vs. Chat-Only Models

### Recommended: Workspace-Aware CLI or IDE Coding Agents
Tools like **Antigravity**, **OpenAI Codex CLI**, **Claude Code**, **Cursor**, and **GitHub Copilot (VS Code)** inspect files directly in your local workspace and can execute commands and tests.

1. Clone or open this repository locally.
2. Copy the starter prompt from [`BOOTSTRAP_PROMPT.md`](../BOOTSTRAP_PROMPT.md) (Turkish or English), replacing `[FİKİR]` / `[IDEA]` with your project idea.
3. Require the agent to:
   - Read `AGENTS.md`, the selected `presets/*.md` profile, and relevant `standards/*.md` files.
   - Complete product discovery (`project/brief.template.md` and `project/acceptance-criteria.template.md`) before generating application code.
   - Run real checks (`lint`, `typecheck`, integration tests, `build`, Playwright) and clearly separate executed checks from unrun checks.

### Why Pasting Only a Repo URL in a Chat Box Is Insufficient
- **Incomplete context loading:** Web chat interfaces do not automatically discover `AGENTS.md`, `.agents/skills/`, `.cursor/rules/`, or all `standards/*.md` files from a bare URL.
- **No execution proof:** Chat-only models cannot run `npm ci`, apply Drizzle SQL migrations, execute negative Vitest security suites, verify HTTP headers, or inspect rendered Playwright screenshots at `360px` / `768px` / `1440px`.
- **Workaround for chat-only models:** Manually paste `AGENTS.md`, your chosen `presets/*.md` file, and the relevant `standards/*.md` sections into the chat prompt—and then copy the resulting code into a local directory to run verification commands yourself.

---

## 2. Profile Selection Rules (Important: `static-site` Is Guide-Only)

| Profile | File | Auto-Scaffold Generator? | Use When |
| --- | --- | --- | --- |
| **Full-Stack Web App** | `presets/fullstack-web-app.md` | **Yes** (`templates/fullstack/` via `scripts/create-project.mjs`) | Multi-user apps requiring auth, PostgreSQL persistence, RBAC, or multi-tenant isolation |
| **Static / Editorial Site** | `presets/static-site.md` | **No (Guidance & design contract only)** | Portfolios, studios, brochure/marketing sites, or docs with no login/database/admin panel |
| **Existing Project** | `presets/existing-project.md` | **No (Incremental adoption guide)** | Adding blueprint standards, security checks, and tests to an existing codebase without rewriting its framework/ORM |
| **Python / FastAPI / AI** | `presets/python-fastapi-ai.md` | **No (Architecture guide)** | Separate Python FastAPI backend / AI orchestration services |

> [!IMPORTANT]
> If your goal is a simple brochure or portfolio website, choose `presets/static-site.md` and **do not** run `create-project.mjs` to install PostgreSQL and auth boilerplate you do not need.

---

## 3. Running the Blueprint & Reference App Locally

### Windows PowerShell (Primary)

```powershell
# 1. Verify Node >= 20 LTS, npm, Git, and optional Docker/psql
npm run doctor

# 2. Verify adapter files and repository/generator tests
npm run check:adapters
npm run test:repo

# 3. Install dependencies for templates/fullstack (frozen lockfile)
npm run fullstack:install

# 4. Create local environment file (defaults to embedded real PostgreSQL via PGlite)
Copy-Item templates\fullstack\.env.example templates\fullstack\.env

# 5. Apply real Drizzle SQL migrations and non-production seed data
npm run fullstack:migrate
npm run fullstack:seed

# 6. Start the development server at http://localhost:3000
npm run fullstack:dev
```

### macOS / Linux (bash / zsh)

```bash
npm run doctor
npm run check:adapters
npm run test:repo
npm run fullstack:install
cp templates/fullstack/.env.example templates/fullstack/.env
npm run fullstack:migrate
npm run fullstack:seed
npm run fullstack:dev
```

### Optional Docker Mode (`postgres:16-alpine` + `Mailpit`)
If Docker Desktop / Docker Engine is installed:

```powershell
Set-Location templates\fullstack
docker compose up -d
```

Then uncomment the `postgresql://pusula:pusula_local_only@localhost:5432/pusula_dev` line in `templates/fullstack/.env` and inspect local emails at `http://localhost:8025` (Mailpit UI). Without Docker, `templates/fullstack/` runs on embedded `@electric-sql/pglite` (`pglite://./.data/pgdata`) and records outgoing verification/reset emails to `.data/mailpit-outbox.json` (inspectable via `GET /api/dev/outbox` in non-production modes).

---

## 4. Generating a Clean Downstream Project (`scripts/create-project.mjs`)

Generate a standalone application outside the blueprint repository:

```powershell
npm run create:project -- --name studio-ledger --target C:\projects\studio-ledger
```

CLI options and safety guards enforced by `scripts/create-project.mjs`:
- `--name <slug>`: Required; 2–63 lowercase alphanumeric characters + hyphens (`[a-z][a-z0-9-]*`, no consecutive `--`). Updates `package.json` `"name"` automatically.
- `--target <dir>`: Required external directory. Refuses filesystem roots or any path inside/enclosing the blueprint repository itself.
- `--force`: Required if `<dir>` already exists and is non-empty.
- **Exclusions:** Never copies `node_modules`, `.next`, `.data`, `coverage`, `playwright-report`, `test-results`, `.env`, or `.env.*` (except `.env.example`).
- **Copied Governance & CI:** Copies `AGENTS.md`, `standards/`, and `.github/workflows/ci.yml`, and writes `.blueprint-manifest.json` (`blueprintVersion: "0.1.0"`) for future upgrades (`docs/upgrading.md`).

---

## 5. Verification Commands

Run individual checks or the full non-E2E verification suite:

```powershell
npm run verify
```

`npm run verify` sequentially executes `doctor`, `check:adapters`, `test:repo`, `fullstack:lint`, `fullstack:typecheck`, `fullstack:test`, and `fullstack:build`.

> [!NOTE]
> **Test Database Isolation (`TEST_DATABASE_URL`):** Integration tests default to isolated `pglite://memory` and read `TEST_DATABASE_URL`—never `DATABASE_URL`. `assertSafeTestDatabaseTarget` blocks running tests outside `NODE_ENV=test` or against non-test or matching `DATABASE_URL` targets.

For browser E2E and `@axe-core/playwright` checks:

```powershell
npx --prefix templates/fullstack playwright install chromium
npm run fullstack:e2e
```
