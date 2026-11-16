# Sources and References

All external repositories and official documentation listed below were reviewed on **2026-11-16** to ground this blueprint's structure, adapter model, security controls, frontend patterns, and visual standards.

> [!IMPORTANT]
> **License Hygiene Rule:** Only verified permissive or properly attributed materials were used. Where a repository had mixed or missing file/root licenses (specifically `anthropics/skills` at root vs. `skills/frontend-design/LICENSE.txt`, and `vercel-labs/agent-skills` `web-design-guidelines`), **zero text or code was copied verbatim from any unlicensed file**.

## 1. Inspected GitHub Repositories

| Repository | URL | Branch / Tag | Verified Commit | Review Date | License | What Was Used | Key Limitations & Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agentsmd/agents.md` | https://github.com/agentsmd/agents.md | `main` | `d001185d792e` | 2026-11-16 | MIT (`2026-09-10` snapshot) | Shared `AGENTS.md` convention for keeping cross-tool agent entry points concise and machine-discoverable. | `AGENTS.md` alone does not enforce tool-specific discovery paths for Claude Code, Cursor, Copilot, or Antigravity skills without thin adapters. |
| `github/spec-kit` | https://github.com/github/spec-kit | `main` | `2ee2b1e80059` | 2026-11-16 | MIT (`2026-11-12` snapshot) | Spec-driven workflow discipline separating product specification, plan, and task breakdown before coding. | Heavy CLI/command scaffolding can add overhead on small projects; simplified here into lean `project/*.template.md` artifacts. |
| `obra/superpowers` | https://github.com/obra/superpowers | `main` | `22f0b463e7a5` | 2026-11-16 | MIT (`2026-11-03` snapshot) | Structured agent skill workflow principles: brainstorming/clarification before build, verification-before-completion, and TDD discipline. | Opinionated slash-command/plugin assumptions are specific to supported host harnesses; adapted to native `.agents/skills/` SKILL.md files. |
| `anthropics/skills` (`skills/frontend-design`) | https://github.com/anthropics/skills/tree/main/skills/frontend-design | `main` | `1780c5e5a552` | 2026-11-16 | Skill `LICENSE.txt` = Apache-2.0 (`2026-11-14`; **parent repo has no root license**) | Conceptual anti-generic visual direction guidance: committing to an intentional aesthetic direction, typography pairing, and rejecting boilerplate gradients/layouts. | Parent repo lacks a root license file; only concepts consistent with the Apache-2.0 `skills/frontend-design` skill were referenced, with original blueprint rules written independently. |
| `vercel-labs/agent-skills` | https://github.com/vercel-labs/agent-skills | `main` | `1a2c79d4e6c4` | 2026-11-16 | `react-best-practices` = MIT (`2026-10-27`); **`web-design-guidelines` = no explicit license** | Performance waterfall avoidance, Server/Client boundary discipline, and bundle hygiene concepts informed by MIT-licensed React guidance. | `web-design-guidelines` lacks an explicit license header; **zero verbatim copying** from `web-design-guidelines`. UI/a11y rules in `standards/design-system.md` are authored independently against WCAG 2.2 AA and original checks. |
| `alan2207/bulletproof-react` | https://github.com/alan2207/bulletproof-react | `master` | `9506629ed003` | 2026-11-16 | MIT (`2026-05-14` snapshot) | Feature-oriented frontend modularization, strict API/DTO separation, and clean feature boundaries inside a single app. | Client-first SPA patterns require adaptation for Next.js App Router Server Components and server-side route handlers. |
| `fastapi/full-stack-fastapi-template` | https://github.com/fastapi/full-stack-fastapi-template | `master` | `77e550a73bb4` | 2026-11-16 | MIT (`2026-11-16` snapshot) | Inspiration for `presets/python-fastapi-ai.md`, Docker Compose local Mailpit/Postgres ergonomics, and clean separation of API health/env/migrations. | Uses Python/FastAPI/SQLModel rather than Next.js/Drizzle; kept strictly as a separate optional preset rather than mixing stacks in the JS reference template. |
| `shadcn-ui/ui` | https://github.com/shadcn-ui/ui | `main` | `e62c9435fff7` | 2026-11-16 | MIT (`2026-11-13` snapshot) | Accessible primitive composition model (ownable component primitives with keyboard/ARIA semantics styled via CSS tokens). | Default Neutral/Zinc look can produce homogeneous UIs if tokens and typography are not deliberately customized per project. |
| `OWASP/ASVS` | https://github.com/OWASP/ASVS | tag `v5.0.0_release` | `650b4bff6f1b` | 2026-11-16 | CC-BY-SA-4.0 (`2026-11-16` snapshot) | Authoritative verification control catalog (`V1`, `V2`, `V3`, `V6`, `V7`, `V8`, `V13`, `V16`) mapped in `standards/security.md` targeting Level 2 for multi-tenant apps. | Adopting a subset of ASVS controls does not constitute formal ASVS Level 2 certification or cover out-of-scope features (e.g., file uploads, webhooks) until implemented. |
| `OWASP/CheatSheetSeries` | https://github.com/OWASP/CheatSheetSeries | `master` | `31f5b8f5ad29` | 2026-11-16 | CC-BY-SA-4.0 (`2026-11-16` snapshot) | Concrete defense patterns for CSRF origin checks, session lifecycle, password reset invalidation, input validation, and secrets handling. | Cheat sheets provide defensive patterns rather than framework-specific Next.js/Drizzle code; adapted into concrete TS modules and negative tests. |

## 2. Detailed Notes on Repository Usage

### Agent Governance & Workflow Sources
- **`agentsmd/agents.md` (`d001185d792e`, MIT):** Guided our decision to keep root `AGENTS.md` strictly <= 150 lines as a fast, universal routing index rather than dumping multi-thousand-line manuals into every prompt context.
- **`github/spec-kit` (`2ee2b1e80059`, MIT) & `obra/superpowers` (`22f0b463e7a5`, MIT):** Motivated the mandatory `scope-and-brief` gate before coding, requirement IDs (`REQ-XXX`), traceability matrix (`project/traceability-matrix.template.md`), and verification-before-reporting discipline ("separate unrun checks from verified evidence").

### Frontend, Design & Full-Stack Architecture Sources
- **`anthropics/skills/tree/main/skills/frontend-design` (`1780c5e5a552`, Apache-2.0):** Informed the anti-slop workflow in `standards/design-system.md`: explicitly rejecting default AI aesthetics in favor of an editorial/utilitarian direction grounded in domain content ("Atölye Pusula").
- **`vercel-labs/agent-skills` (`1a2c79d4e6c4`, mixed license):** Only MIT-licensed `react-best-practices` concepts (eliminating sequential client fetch waterfalls, server-side data preparation, minimizing client JS surface) were referenced. Unlicensed `web-design-guidelines` was never copied.
- **`alan2207/bulletproof-react` (`9506629ed003`, MIT) & `shadcn-ui/ui` (`e62c9435fff7`, MIT):** Informed `templates/fullstack/` feature boundaries (`src/server/*`, `src/components/*`) and accessible primitive styling with bespoke CSS custom properties instead of opaque component defaults.
- **`fastapi/full-stack-fastapi-template` (`77e550a73bb4`, MIT):** Informed `presets/python-fastapi-ai.md` and local Mailpit SMTP inspection workflow (`docker-compose.yml` + local outbox inspection during development).

### Security Standards Sources
- **`OWASP/ASVS` (`v5.0.0_release`, `650b4bff6f1b`, CC-BY-SA-4.0) & `OWASP/CheatSheetSeries` (`31f5b8f5ad29`, CC-BY-SA-4.0):** Used as the canonical backbone for `standards/security.md`. Every referenced ASVS v5.0.0 control ID (`V1.2.1` through `V16.3.2`) is mapped to concrete files, tests, and remaining risks in `templates/fullstack/`.

## 3. Official Platform, Framework & Tool Documentation

| Technology / Tool | Official Documentation URL | Purpose in Blueprint |
| --- | --- | --- |
| **Next.js (App Router)** | https://nextjs.org/docs | Full-stack reference application framework, Server/Client boundaries, middleware/headers, production build. |
| **Drizzle ORM** | https://orm.drizzle.team/docs/overview & https://orm.drizzle.team/docs/get-started-postgresql-pglite | Type-safe PostgreSQL schema, versioned SQL migrations (`drizzle-kit`), and dual `node-postgres` + `PGlite` drivers. |
| **Better Auth** | https://www.better-auth.com/docs & https://better-auth.com/docs/adapters/drizzle | Evaluated and referenced for authentication architecture & Drizzle PostgreSQL integration (see `docs/architecture-decisions.md` for actual implementation decision in `templates/fullstack/`). |
| **PostgreSQL** | https://www.postgresql.org/docs/ | Primary production relational database target, constraints, transactions, and backup/restore (`pg_dump`/`pg_restore`). |
| **PGlite (`@electric-sql/pglite`)** | https://pglite.dev/docs/ | Embedded Postgres engine enabling real PostgreSQL SQL + migrations locally and in tests without requiring Docker. |
| **Vitest** | https://vitest.dev/guide/ | Integration test runner executing negative security, RBAC, tenant-isolation, and concurrency tests against real migrations. |
| **Playwright** | https://playwright.dev/docs/intro | End-to-end browser verification, keyboard/focus inspection, responsive screenshot capture, and `@axe-core/playwright` checks. |
| **OWASP ASVS v5.0.0** | https://owasp.org/www-project-application-security-verification-standard/ | Security verification benchmark (`v5.0.0_release`, CC BY-SA 4.0). |
| **Antigravity** | https://antigravity.google/docs (IDE built-in skills & rules discovery) | `.agents/skills/*/SKILL.md`, `.agents/rules/*.md`, and `GEMINI.md` workspace integration. |
| **OpenAI Codex** | https://developers.openai.com/codex/guides/agents-md | Root `AGENTS.md` discovery and repo-scoped instructions. |
| **Claude Code** | https://docs.anthropic.com/en/docs/claude-code/memory | Root `CLAUDE.md` memory/instruction loading pointing to `AGENTS.md` and `standards/`. |
| **Cursor** | https://docs.cursor.com/context/rules | `.cursor/rules/*.mdc` scoped rule adapters (`alwaysApply` and glob-matched files). |
| **GitHub Copilot** | https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot | `.github/copilot-instructions.md` and path-scoped `.github/instructions/*.instructions.md`. |
