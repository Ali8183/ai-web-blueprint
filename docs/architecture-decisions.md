# Architecture Decision Records (ADRs)

This document records the core architectural decisions governing the blueprint repository and the **Atölye Pusula (Compass Ledger)** reference application in `templates/fullstack/`.

---

## ADR-001: Modular Monolith with Next.js App Router, Drizzle ORM, and PostgreSQL

- **Status:** Accepted (`2026-11-16`)
- **Context:** Studio SaaS apps, booking dashboards, and client portals require tight server-side authorization, relational integrity, fast SSR initial loads, and low operational complexity. Splitting UI, API, and background workers into microservices or adding Kubernetes/Redis prematurely slows delivery and creates synchronization bugs.
- **Decision:** Standardize `templates/fullstack/` as a **single-deployment modular monolith** built on Next.js App Router (`^16.4.6`) + React (`^19.3.1`) + Drizzle ORM (`^0.45.4`) + PostgreSQL (`16+`), strictly layered as:
  - **Transport (`src/app/api/**`, Server Components):** Validates inputs with Zod, checks CSRF Origin (`src/server/security/csrf.ts`), applies rate limiting (`src/server/security/rate-limit.ts`), and delegates to services.
  - **Domain Services (`src/server/services/*`, `src/server/auth/service.ts`):** Enforces RBAC (`owner` / `editor` / `viewer`), server-derived `organizationId` isolation, optimistic locking (`version`), and explicit DTO mapping.
  - **Data Access (`src/server/db/schema.ts`, `src/server/db/index.ts`):** Single schema and versioned SQL migration source of truth (`drizzle/`).
- **Consequences:** Simple deployment (`next start` + managed Postgres), zero distributed transaction complexity, and clear boundaries if an isolated worker/Python service is later added (`presets/python-fastapi-ai.md`).

---

## ADR-002: Dual `pg.Pool` and Embedded `@electric-sql/pglite` Database Mode

- **Status:** Accepted (`2026-11-16`)
- **Context:** Many contributor and CI/sandbox workstations (including Windows setups without Docker Desktop or a native PostgreSQL installation) cannot immediately launch PostgreSQL TCP containers. However, substituting SQLite or mocking SQL queries breaks PostgreSQL constraint, transaction, and migration parity.
- **Decision:** Implement dual database driver selection in `templates/fullstack/src/server/db/index.ts` (`createDatabaseBundle`):
  - `postgres://` or `postgresql://` -> `pg.Pool` (`node-postgres`) + `drizzle-orm/node-postgres`
  - `pglite://` (e.g., `pglite://./.data/pgdata` for dev or `pglite://memory` for isolated tests) -> `@electric-sql/pglite` + `drizzle-orm/pglite`
  - Both modes execute the **exact same** versioned Drizzle SQL migrations (`drizzle/0000_*.sql`) via `applyMigrations()`.
  - `templates/fullstack/src/server/env.ts` (`validateEnv`) **blocks** `NODE_ENV=production` startup if `DATABASE_URL` is missing or uses `pglite://`.
- **Consequences:** Zero-Docker local onboarding and fast isolated Vitest integration suites (`fileParallelism: false`, `pglite://memory`) while keeping production strictly bound to external PostgreSQL (verified in CI against `postgres:16-alpine`).

---

## ADR-003: Authentication & Session Model (`Better Auth` + Application RBAC/Token Layer)

- **Status:** Accepted (`2026-11-16`)
- **Context:** Mixing multiple auth libraries or rolling custom password hashing/cookie signing introduces subtle timing, encoding, and session-fixation vulnerabilities. Meanwhile, our multi-organization studio model requires transactional sign-up (`user` + initial `organization` + `owner` membership), single-use email verification/reset tokens with full session revocation on reset, and server-side active-organization switching.
- **Decision:** Use **Better Auth** (`better-auth@^1.7.25`) with `drizzleAdapter(db, { provider: "pg", schema, transaction: true })` (`src/server/auth/auth.ts`) as the single canonical session and password-credential boundary:
  - **Opaque Database-Backed Sessions:** `session.cookieCache.enabled: false` so server-side logout (`POST /api/auth/logout`) and password-reset revocation (`DELETE` from `session` table) take effect immediately across all requests.
  - **Hardened Cookie Attributes:** `cookiePrefix: "pusula"`, `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, and `secure: true` when `NODE_ENV === "production"`.
  - **Password Rules & Account Enumeration Defense:** `minPasswordLength: 8`, `maxPasswordLength: 128`, `autoSignIn: false`; `POST /api/auth/login` returns identical generic `401` errors for unknown email vs. wrong password.
  - **Verification & Password Reset (`src/server/auth/service.ts` + `auth_token` table):** Single-use SHA-256 hashed tokens (`verify_email`, `reset_password`), 30-minute reset TTL, atomic `usedAt` marking, and revocation of all active sessions on password reset.
  - **CSRF Defense:** Cookie-authenticated mutating API calls enforce `verifyCsrfOrigin()` (`src/server/security/csrf.ts`) validating `Sec-Fetch-Site`, `Host`, `Origin`, and `Referer` strictly against configured `APP_URL` + `TRUSTED_ORIGINS` (see ADR-008).
- **Consequences:** Single authoritative auth stack with real database session revocation and zero mixed-auth drift; assumes sticky/central PostgreSQL session table lookup per authenticated API request.

---

## ADR-004: Visual Direction — "Atölye Pusula" Swiss-Editorial Technical Studio Ledger

- **Status:** Accepted (`2026-11-16`)
- **Context:** Generic AI SaaS outputs rely on purple/indigo gradients, floating glassmorphism, and identical card grids that look untrustworthy for architectural and structural engineering teams managing budgets, project codes, and milestones.
- **Decision:** Adopt a **Swiss-editorial technical ledger** aesthetic (`src/app/globals.css`, `src/app/layout.tsx`, `src/components/`):
  - Warm drafting-paper ground (`--bg-paper: #f6f4ef`), crisp white card/table surfaces (`--bg-surface: #ffffff`), ink (`--ink-primary: #141413`), oxidized vermilion accent (`--accent: #c84b31`), and forest slate (`--forest: #1e3a2f`).
  - `1px` structural hairline rules (`--border-subtle: #d8d4ca`), crisp `2px` radii, editorial serif display typography paired with neutral sans body and `tabular-nums` monospace codes/fees/dates.
  - Explicit CSS system font stacks (`--font-serif`, `--font-sans`, `--font-mono`) eliminating external font network requests/FOIT and third-party font licensing ambiguity, paired with `lucide-react` (`ISC`) UI icons and an original inline SVG `BrandMark`.
- **Consequences:** High-contrast scannable ledger density, zero third-party font privacy/CDN dependencies, and accessible responsive adaptation between desktop table (`lg:block`, `>= 1024px`) and mobile/tablet stacked cards (`lg:hidden`, `< 1024px`). See `docs/design-review.md` for full state and viewport review details.

---

## ADR-005: Single-Copy Reference Template Architecture + Manifest Tracking

- **Status:** Accepted (`2026-11-16`)
- **Context:** Maintaining multiple diverging full-stack generators across presets causes rot and untested template combinations, while scaffolding database/auth stacks for simple brochure sites violates `standards/product-discovery.md`.
- **Decision:** Maintain **one verified runnable template** (`templates/fullstack/`), scaffolded externally by `scripts/create-project.mjs` which excludes dev artifacts (`node_modules`, `.next`, `.data`, `.env`), copies `AGENTS.md`, `standards/`, and `.github/workflows/ci.yml`, and writes `.blueprint-manifest.json` with SHA-256 checksums (`docs/upgrading.md`). Keep `presets/static-site.md`, `presets/existing-project.md`, and `presets/python-fastapi-ai.md` explicitly as guidance profiles rather than separate code generators.
- **Consequences:** All CI gates (`lint`, `typecheck`, `test`, `build`, `e2e`, and `generator-smoke.test.mjs`) verify one real codebase continuously rather than drifting skeleton templates.

---

## ADR-006: Strict `TEST_DATABASE_URL` Isolation Guard (`assertSafeTestDatabaseTarget`)

- **Status:** Accepted (`2026-11-16`)
- **Context:** Integration suites reset database state (`TRUNCATE ... RESTART IDENTITY CASCADE`). Allowing test helpers to fall back silently to `DATABASE_URL` risks wiping local development or operator-configured databases if `TEST_DATABASE_URL` is omitted or misconfigured.
- **Decision:** Require `setupTestDatabase()` and `resetTestDatabase()` in `templates/fullstack/tests/integration/test-helpers.ts` to read `TEST_DATABASE_URL` (defaulting only to isolated `pglite://memory`—never `process.env.DATABASE_URL`) and enforce `assertSafeTestDatabaseTarget()` **before** opening any connection or executing `TRUNCATE`:
  - Fails closed (`[test-db-guard]`) whenever `NODE_ENV !== "test"`.
  - Rejects `TEST_DATABASE_URL` matching an active non-memory `DATABASE_URL`.
  - Restricts `pglite://` test targets to `pglite://memory` or paths containing `test`/`e2e` (blocking dev `pglite://./.data/pgdata`).
  - Restricts `postgres://`/`postgresql://` test targets to `_test`/`-test` database names (or `test_` schema/options), rejects `prod` in hostname or database name, and blocks non-local hosts unless `ALLOW_REMOTE_TEST_DB=true`.
- **Consequences:** Destructive test resets fail fast in memory before touching SQL, while `playwright.config.ts` passes `TEST_DATABASE_URL` explicitly (`pglite://./.data/e2e-pgdata` by default).

---

## ADR-007: Fail-Closed `TRUST_PROXY` IP Extraction & `PostgresRateLimitStore`

- **Status:** Accepted (`2026-11-16`)
- **Context:** Trusting arbitrary `X-Forwarded-For` or `X-Real-IP` headers allows attackers to spoof client IPs and bypass auth rate limits (`429`), while an in-memory `Map` rate-limit store cannot share buckets across multiple production server replicas.
- **Decision:** Harden `src/server/env.ts` and `src/server/security/rate-limit.ts`:
  - **`TRUST_PROXY` (`none` default):** Under `"none"`, `getClientIp()` ignores all forwarding headers and returns `"untrusted-proxy-direct"`. Supported explicit proxy modes are `"cloudflare"` (`cf-connecting-ip`), `"fly"` (`fly-client-ip`), and `"hops:<1..20>"` (rightmost trusted hop after `net.isIP` filtering of `x-forwarded-for`, never the spoofable leftmost client entry).
  - **`PostgresRateLimitStore` (`RATE_LIMIT_DRIVER=postgres` default in production):** Uses atomic `INSERT INTO "rate_limit_bucket" ... ON CONFLICT ("key") DO UPDATE ... RETURNING "count", "reset_at"` (`drizzle/0001_needy_silverclaw.sql`). `NODE_ENV=production` rejects `RATE_LIMIT_DRIVER=memory` unless `ALLOW_SINGLE_INSTANCE_MEMORY_RATE_LIMIT=true` is explicitly declared.
- **Consequences:** Rate-limit buckets survive multi-instance horizontal scaling and restarts, and forwarding headers cannot spoof rate-limit keys unless the deployment platform proxy topology is explicitly configured.

---

## ADR-008: Strict `APP_URL` + `TRUSTED_ORIGINS` Exact-Origin CSRF Boundary

- **Status:** Accepted (`2026-11-16`)
- **Context:** Constructing allowed CSRF hosts dynamically from incoming `request.url` or `Host` headers allows reverse-proxy misconfigurations or spoofed `Host` headers to bypass Origin/Referer verification.
- **Decision:** Build `allowedOrigins` and `allowedHosts` in `src/server/security/csrf.ts` (`verifyCsrfOrigin`) and Better Auth `trustedOrigins` (`src/server/auth/auth.ts`) **exclusively** from normalized `APP_URL` and comma-separated `TRUSTED_ORIGINS` URLs (`http://` or `https://`). Validate incoming `Host`, `Origin`, and `Referer` against exact configured scheme+host+port origins in all environments (including development/test).
- **Consequences:** Spoofed `Host`, cross-protocol (`http://` vs `https://`), `null`, and untrusted `Origin`/`Referer` headers fail closed with `403 CSRF_ORIGIN_MISMATCH`.

---

## ADR-009: Production SMTP Auth/TLS, Durable `email_outbox` Queue & Fail-Closed `503`

- **Status:** Accepted (`2026-11-16`)
- **Context:** Silently falling back to a local JSON file or succeeding on SMTP errors in production causes verification and password-reset tokens to be lost without operator visibility or user feedback.
- **Decision:** Harden `src/server/mail/mailer.ts` and `src/server/auth/service.ts`:
  - Require paired `SMTP_USER`/`SMTP_PASS` (never half-configured; redacted in `src/server/logger.ts`), explicit `SMTP_SECURE`, and `SMTP_REQUIRE_TLS` (default `true` in production).
  - Persist every verification/reset message to PostgreSQL `email_outbox` (`status: "pending"`) before attempting SMTP delivery (with up to 2 immediate attempts on transient errors).
  - In `NODE_ENV=production`: if SMTP fails, log sanitized diagnostics and—unless `ALLOW_PROD_DEFERRED_EMAIL_QUEUE=true` saves `"retry_scheduled"` for `processEmailOutboxRetries()`—mark `"failed"` and throw `ServiceUnavailableError` (`503`, `EMAIL_DELIVERY_UNAVAILABLE`). `registerUser` cleans up newly inserted user/workspace rows on `503`; `requestPasswordReset` checks SMTP/queue readiness and rolls back tokens on `503` without revealing whether an email exists.
- **Consequences:** Production email failures never drop silently; operators enabling `ALLOW_PROD_DEFERRED_EMAIL_QUEUE=true` must schedule `processEmailOutboxRetries()` in a background worker/cron.
