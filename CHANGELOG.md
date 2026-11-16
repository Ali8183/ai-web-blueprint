# Changelog

All notable changes to this blueprint repository are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses Semantic Versioning (`MAJOR.MINOR.PATCH`).

## [0.1.0] - 2026-11-16

### Added

- **Root & Governance Documentation:** `AGENTS.md` (concise repository router), `README.md`, `README.tr.md`, `BOOTSTRAP_PROMPT.md`, `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE` (MIT), and `THIRD_PARTY_NOTICES.md`.
- **Architecture & Engineering Standards (`standards/`):** Product discovery, architecture & stack decisions, anti-AI-slop design system, frontend, backend, database, OWASP ASVS v5.0.0-mapped security standards, and testing/ops standards.
- **Stack Presets & Project Templates (`presets/`, `project/`, `examples/briefs/`):** Profiles for static-site (guidance-only), fullstack-web-app, existing-project, and python-fastapi-ai; reusable brief/acceptance/decision/task/traceability templates; three worked example briefs.
- **Cross-Tool Adapters & Skills (`adapters/`, `.agents/`, `.cursor/`, `.github/`):** Canonical Antigravity skills (`scope-and-brief`, `design-direction-and-review`, `feature-end-to-end`, `security-audit`, `release-readiness`), workspace rule, and generated thin adapters (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules/*.mdc`, `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`) verified by `scripts/sync-adapters.mjs`.
- **Reference Application (`templates/fullstack/`):** "Atölye Pusula (Compass Ledger)" built with Next.js App Router, Drizzle ORM, PostgreSQL (`pg.Pool`) + embedded `@electric-sql/pglite` mode, multi-organization RBAC (`owner`/`editor`/`viewer`), auth & email verification/reset flows, CSRF origin enforcement, rate limiting, security headers, Vitest integration suite, and Playwright + `@axe-core/playwright` E2E tests.
- **Tooling & CI (`scripts/`, `tests/`, `.github/workflows/ci.yml`, `.github/dependabot.yml`):** Environment doctor, downstream project generator (`scripts/create-project.mjs` with `.blueprint-manifest.json`), repo structure and generator smoke tests, SHA-pinned GitHub Actions CI, and Dependabot configuration.
