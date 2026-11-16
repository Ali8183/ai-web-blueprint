# Testing, CI Gates, SEO & Operations Standard

Engineering confidence comes from repeatable negative testing, automated release gates, and verified operational runbooks—never from optimistic assumptions.

## 1. Negative-First Testing Policy

Write automated tests that actively try to break security boundaries, validation rules, and state invariants—not only happy-path flows:

| Category | Mandatory Negative & Edge Test Cases |
| :--- | :--- |
| **Authentication** | Wrong password and unknown email produce identical generic error; invalid/weak passwords rejected (`< 8` or `> 128` chars). |
| **Session Lifecycle** | Logout invalidates server session token immediately; password reset revokes all active sessions; expired or replayed email-verification and password-reset tokens fail. |
| **RBAC Matrix** | Unauthenticated calls return `401`; `viewer` write/delete returns `403`; `editor` delete returns `403`; `owner` succeeds within own org. |
| **Multi-Tenant Isolation** | Org A user cannot list, view, update, delete, or attach references to Org B records (`403` or `404`). |
| **Mass Assignment** | Supplying `role`, `ownerId`, `organizationId`, or `tenantId` in create/update payloads is rejected (`400`) or cannot escalate privilege. |
| **CSRF Origin & Host** | Cookie-authenticated `POST`/`PATCH`/`PUT`/`DELETE` with mismatched `Origin`/`Referer`, spoofed `Host`, untrusted `request.url`, wrong scheme/port, or missing `Origin` returns `403 CSRF_ORIGIN_MISMATCH`. |
| **Proxy & Rate Limiting** | Spoofed `X-Forwarded-For` cannot bypass `429` under `TRUST_PROXY=none`; explicit `cloudflare`/`fly`/`hops:N` modes extract validated IPs; `RATE_LIMIT_DRIVER=memory` is rejected in prod without explicit single-instance opt-in. |
| **Input & Pagination Bounds** | Invalid IDs, oversized strings, `limit > 50`, `page < 1`, unknown sort fields, and invalid enums return `400`. |
| **Concurrency & Double-Submit** | Duplicate project code / `Idempotency-Key` and stale `version` optimistic updates behave deterministically (`409` or deduplicated). |
| **Migrations & Test DB Safety** | Integration tests run strictly against `TEST_DATABASE_URL` (default `pglite://memory`), NEVER falling back to `DATABASE_URL`. `assertSafeTestDatabaseTarget` must fail closed before any connection or `TRUNCATE` outside `NODE_ENV=test`, on `prod` names, on non-`_test`/`-test` DBs, on matching active `DATABASE_URL`, or on remote hosts without `ALLOW_REMOTE_TEST_DB=true`. |
| **Email Fail-Closed & Outbox Retries** | Production SMTP failures without `ALLOW_PROD_DEFERRED_EMAIL_QUEUE=true` return `503` and clean up newly provisioned user/org or reset tokens; deferred mode persists `retry_scheduled` rows in `email_outbox` recoverable via `processEmailOutboxRetries()`. |
| **Browser E2E & A11y** | Playwright full journey (register -> verify -> create -> search/filter -> edit -> keyboard modal focus -> logout), `@axe-core/playwright` scan, and screenshots at `360px`, `768px`, and `1440px`. |

## 2. Continuous Integration Gates

Every PR and main-branch build must pass these automated gates without `continue-on-error` overrides:

1. **Adapter Drift Check:** `node scripts/sync-adapters.mjs --check`
2. **Repo & Generator Smoke Tests:** `npm run test:repo` (including scaffolding into a clean temporary directory via `scripts/create-project.mjs`)
3. **Static Quality:** `npm run lint` and `npm run typecheck`
4. **Integration Tests:** Vitest suite against both embedded PGlite (`pglite://memory`) and real PostgreSQL service container in CI with applied migrations
5. **Production Build:** `npm run build`
6. **E2E & Accessibility:** Playwright journey + `@axe-core/playwright`
7. **Supply Chain & Secret Scanning:** `npm audit` (triaged for high/critical production deps), Dependabot updates, CodeQL static analysis, and Gitleaks secret scanning

*(Note: Local developer environments verify gates locally; GitHub Actions execution itself is verified once pushed to GitHub.)*

## 3. SEO, Metadata & Crawler Boundaries

- Public marketing/editorial routes must define unique `<title>`, meta `description`, canonical URL, Open Graph tags, `robots.txt`, and `sitemap.xml`.
- Exclude authenticated routes (`/app`, `/api`, `/login`, `/reset-password`) from `sitemap.xml` and mark appropriately via `robots` metadata.
- **Security Rule:** **Never rely on `robots.txt` or `noindex` as access control.** Crawlers and attackers ignore `robots.txt`; private pages and every API route must enforce server-side authentication and authorization.

## 4. Production Deployment, TLS, Health & Runbooks

- **TLS & Transport:** Terminate HTTPS at the platform proxy/load balancer, force HTTP -> HTTPS redirects, and enable HSTS (`Strict-Transport-Security`) in production.
- **Readiness & Health (`GET /api/health`):** Verify runtime process health and live DB connectivity (`SELECT 1`), returning `200` when healthy or `503` when DB is unreachable—without exposing connection strings, stack traces, or env metadata.
- **Structured Logging & `requestId`:** Log JSON lines with timestamp, level, `requestId`, route, status, duration, and redacted user/org IDs. Automatically strip `password`, `token`, `authorization`, `cookie`, `smtpPass`/`smtp_pass`, and secrets.
- **Operational Runbooks (`docs/deployment.md`):** Document environment separation (`DATABASE_URL` vs `TEST_DATABASE_URL`, `TRUSTED_ORIGINS`, `TRUST_PROXY`, `RATE_LIMIT_DRIVER`, SMTP auth/TLS & `processEmailOutboxRetries` scheduling), migration order (`migrate` before rolling new app instances), secret rotation (invalidate sessions on compromise), rollback procedure, rate-limit tuning, and periodic backup restore drills.
