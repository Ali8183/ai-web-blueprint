# AGENTS.md

Shared entry point for coding agents operating in this blueprint repository (`web-blueprint`, v0.1.0).

## 1. Non-Negotiable Core Rules

1. **Discover before coding:** Inspect the matching preset in `presets/` and run `scope-and-brief` expectations before writing application code. Record `REQ-XXX` IDs (`project/brief.template.md`, `project/acceptance-criteria.template.md`, `project/traceability-matrix.template.md`).
2. **Never overbuild static sites:** Simple brochure/portfolio sites use `presets/static-site.md` (guidance only) and MUST NOT add auth, databases, or admin panels without explicit requirement.
3. **Fail-closed security & tenant isolation:** Enforce auth, RBAC, CSRF Origin checks, and `organizationId` scoping on the server. Never trust client-supplied `role`, `ownerId`, or `organizationId`. Reject `NODE_ENV=production` startups missing strong `SESSION_SECRET` (>= 32 chars) or external PostgreSQL.
4. **No AI-slop UI:** Propose 2 distinct visual directions, justify the choice, use explicit CSS tokens, design all 7 UI states, and avoid default purple gradients, glassmorphism, and fabricated metrics/testimonials.
5. **Real migrations & negative tests:** Never use `drizzle-kit push` or `seed` in production. Test negative auth, RBAC, tenant isolation, mass assignment, CSRF, and concurrency against real migrations.
6. **Honest verification & license hygiene:** Report only commands actually run in this session; clearly separate unrun/blocked checks. Never claim "100% secure" or zero vulnerabilities. Never copy verbatim from files without an explicit open-source license (`docs/references.md`).
7. **Sync adapters:** Do not hand-edit generated adapter files (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules/*`, `.github/copilot-instructions.md`, `.github/instructions/*`); regenerate via `npm run sync:adapters`.

## 2. Exact Workspace Commands

Run from repository root (`package.json`):

| Command | Purpose |
| --- | --- |
| `npm run doctor` | Check Node >= 20, npm, Git, optional Docker/`psql`, and `.env` status |
| `npm run check:adapters` | Verify generated cross-tool adapters match `scripts/sync-adapters.mjs` |
| `npm run sync:adapters` | Regenerate `CLAUDE.md`, `GEMINI.md`, `.cursor/`, and `.github/` instruction pointers |
| `npm run test:repo` | Run repository structure, adapter sync, and `create-project` smoke tests |
| `npm run create:project -- --name <app> --target <dir>` | Scaffold a new downstream full-stack project with `.blueprint-manifest.json` |
| `npm run verify` | Run `doctor`, `check:adapters`, `test:repo`, and fullstack lint/typecheck/test/build |
| `npm run fullstack:install` | Frozen install (`npm ci`) inside `templates/fullstack` |
| `npm run fullstack:dev` | Start local Next.js dev server for `templates/fullstack` |
| `npm run fullstack:migrate` | Apply Drizzle SQL migrations in `templates/fullstack` |
| `npm run fullstack:seed` | Seed non-production sample organizations/users (`Atölye Kuzey`, `Stüdyo Güney`) |
| `npm run fullstack:lint` | Run ESLint in `templates/fullstack` |
| `npm run fullstack:typecheck` | Run `tsc --noEmit` in `templates/fullstack` |
| `npm run fullstack:test` | Run Vitest integration suite against real PGlite migrations |
| `npm run fullstack:e2e` | Run Playwright + `@axe-core/playwright` E2E journey |
| `npm run fullstack:build` | Run Next.js production build inside `templates/fullstack` |

## 3. Task-to-Standards Router

Read ONLY the standards and presets relevant to the active task:

| Task / Concern | Canonical File(s) |
| --- | --- |
| Clarifying idea, REQ-IDs, traceability | `standards/product-discovery.md`, `project/*.template.md` |
| Stack choice, modular monolith vs static/Python | `standards/architecture-and-stack.md` |
| Visual direction, tokens, states, WCAG 2.2 AA | `standards/design-system.md`, `docs/design-review.md` |
| Next.js App Router, RSC boundaries, CWV budgets | `standards/frontend.md`, `docs/performance-report.md` |
| Route -> service -> DB layers, DTOs, idempotency | `standards/backend.md` |
| Schema, FKs, PGlite/Postgres, migrations, RLS | `standards/database.md` |
| OWASP ASVS v5.0.0 controls, auth, CSRF, rate limits | `standards/security.md`, `SECURITY.md` |
| Negative tests, CI, SEO, health, deploy, backups | `standards/testing-and-ops.md`, `docs/deployment.md` |
| Brochure / portfolio site (guide only, no scaffold) | `presets/static-site.md`, `examples/briefs/01-photographer-portfolio.md` |
| Next.js + Drizzle + PostgreSQL multi-tenant app | `presets/fullstack-web-app.md`, `templates/fullstack/` |
| Existing codebase incremental adoption | `presets/existing-project.md` |
| Separate Python / FastAPI / AI service | `presets/python-fastapi-ai.md` |
| Cross-tool adapter discovery & honest test matrix | `adapters/README.md`, `adapters/*.md` |
| License attribution & upstream references | `docs/references.md`, `THIRD_PARTY_NOTICES.md` |

## 4. Available Workflow Skills (`.agents/skills/`)

| Skill | When to Invoke | Path |
| --- | --- | --- |
| `scope-and-brief` | Start of any new site/feature; resolve missing decisions and write brief/ACs | `.agents/skills/scope-and-brief/SKILL.md` |
| `design-direction-and-review` | Before building UI and after Playwright screenshots (360/768/1440) | `.agents/skills/design-direction-and-review/SKILL.md` |
| `feature-end-to-end` | Implementing schema, API routes, UI states, and integration/E2E tests | `.agents/skills/feature-end-to-end/SKILL.md` |
| `security-audit` | Reviewing auth, RBAC, tenant isolation, CSRF, headers, and ASVS mapping | `.agents/skills/security-audit/SKILL.md` |
| `release-readiness` | Final verification before merge or deployment; separates run vs unrun checks | `.agents/skills/release-readiness/SKILL.md` |
