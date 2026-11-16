# Preset: Full-Stack Modular Monolith Web App

This preset documents the executable full-stack stack implemented in `templates/fullstack/` (**Atölye Pusula** reference application) and scaffolded by `scripts/create-project.mjs`.

## 1. When to Choose This Profile

- Multi-tenant SaaS dashboards, team trackers, booking systems, client portals, and internal operational tools requiring authentication, RBAC, relational invariants, and server-side pagination/search.
- If the site is a brochure or portfolio without logins or relational state, use `presets/static-site.md` instead.

## 2. Canonical Stack (`templates/fullstack/`)

| Concern | Implementation in `templates/fullstack/` | Notes |
| :--- | :--- | :--- |
| **Framework & Language** | Next.js 16 App Router (`next ^16.4.6`, `--webpack`), React 19, TypeScript (`^5.9.3`) | Server Components default; small `"use client"` interactive islands |
| **Styling & Design System** | Tailwind CSS v4 (`@tailwindcss/postcss`) + CSS custom properties (`src/app/globals.css`) | Swiss-editorial ledger tokens, tabular monospace numerals, reduced-motion resets |
| **Database & Dual Driver** | Drizzle ORM (`drizzle-orm ^0.45.4`, `drizzle-kit`) + `pg.Pool` (`postgresql://`) **and** `@electric-sql/pglite` (`pglite://`) | Zero-Docker local dev/tests via PGlite; real PostgreSQL 16 in Docker/prod using identical SQL migrations (`drizzle/`) |
| **Authentication & Sessions** | `better-auth` (`^1.7.25`) with `drizzleAdapter(db, { provider: "pg", transaction: true })` + `src/server/auth/{auth,service}.ts` | Database-backed sessions (`cookieCache: { enabled: false }`), `httpOnly`/`sameSite: "lax"` cookies (`pusula`), SHA-256 hashed single-use email/reset tokens |
| **Validation & API Layer** | Zod (`^4.6.7`) in `src/server/validation.ts` + `src/server/http.ts` + `src/server/services/{projects,organizations}.ts` | Strict schemas, mass-assignment rejection, bounded pagination (`limit <= 50`), DTOs, `Idempotency-Key`, optimistic `version` locking |
| **Security Controls** | `src/server/security/{csrf,headers,rate-limit}.ts`, `src/server/env.ts`, `src/server/logger.ts`, `src/middleware.ts`, `next.config.ts` | Exact `APP_URL`/`TRUSTED_ORIGINS` CSRF check, trusted-proxy IP extraction (`TRUST_PROXY`) + `PostgresRateLimitStore` (`rate_limit_bucket`), security headers, fail-closed prod env check, redacted JSON logs |
| **Email & Local Dev Stack** | `nodemailer` + `src/server/mail/mailer.ts` + `email_outbox` table + `docker-compose.yml` (`postgres:16-alpine` + `axllent/mailpit:v1.22`) | Authenticated TLS SMTP (`503` fail-closed or durable `retry_scheduled` queue via `processEmailOutboxRetries`) + `.data/mailpit-outbox.json` & `/api/dev/outbox` (`404` in production) |
| **Testing & A11y** | Vitest (`tests/integration/*.test.ts` + `assertSafeTestDatabaseTarget` via `TEST_DATABASE_URL`) + Playwright + `@axe-core/playwright` (`tests/e2e/journey.spec.ts`) | Negative-first API/DB/hardening tests against isolated `pglite://memory` + browser E2E & responsive screenshots (`360/768/1440`) |

## 3. Scaffolding a Downstream Project

```powershell
npm run create:project -- --name my-studio-app --target ..\my-studio-app
```

This copies `templates/fullstack/` (excluding `.next`, `node_modules`, `.data`), `AGENTS.md`, `standards/`, and `.github/workflows/ci.yml`, and records `.blueprint-manifest.json` (`0.1.0`) for downstream upgrade tracking (`docs/upgrading.md`).

## 4. Non-Negotiable Production Guards

- `src/server/env.ts` blocks `NODE_ENV=production` startup if `DATABASE_URL` is missing or uses `pglite://`, or if `SESSION_SECRET` is `< 32` chars or matches demo/placeholder patterns.
- `src/server/db/seed.ts` refuses to run in `NODE_ENV=production`.
- `src/app/api/dev/outbox/route.ts` returns `404` in `NODE_ENV=production`.
- Production deployments must run `npm run db:migrate` (never `drizzle-kit push`), configure `TRUSTED_ORIGINS`, `TRUST_PROXY`, external managed PostgreSQL (`RATE_LIMIT_DRIVER=postgres` default), and authenticated TLS SMTP (`SMTP_USER`/`SMTP_PASS`/`SMTP_REQUIRE_TLS=true`).
- Test suites must strictly target `TEST_DATABASE_URL` (guarded by `assertSafeTestDatabaseTarget`), never `DATABASE_URL`.
