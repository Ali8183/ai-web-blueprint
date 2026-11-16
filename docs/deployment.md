# Production Deployment Guide

> [!CAUTION]
> **Local Docker Compose Is Not Production Security:** `templates/fullstack/docker-compose.yml` exists solely for local development and integration testing (`postgres:16-alpine` with local defaults + `Mailpit` plain SMTP catcher). **Never expose local Compose defaults, `.env.example` secrets, or embedded `pglite://` databases to the public internet.**

## 1. Recommended Production Topology

For the `templates/fullstack/` modular monolith ("Atölye Pusula"), deploy a single stateless containerized Node.js service paired with managed PostgreSQL:

- **Application Compute:** Containerized Node.js 20/22/24 LTS running Next.js production server (`next start` or `standalone` output) on Fly.io, Railway, Render, or a hardened Linux VPS behind Caddy/Nginx.
- **Database:** Managed PostgreSQL 16+ (Neon, Supabase Postgres, AWS RDS, Fly Postgres, or Railway Managed Postgres) over TLS (`sslmode=require`) or private VPC networking.
- **TLS & Edge:** Mandatory HTTPS (`443`) terminating at platform proxy/load balancer with automatic HTTP->HTTPS redirect and `Strict-Transport-Security` header (enforced in production app config).
- **Transactional Email:** Dedicated SMTP/API service (Postmark, Amazon SES, Resend) with verified SPF, DKIM, and DMARC records for email verification and password reset delivery.

## 2. Environment Separation & Startup Guards

`templates/fullstack/src/server/env.ts` enforces strict startup validation when `NODE_ENV=production`:

1. **`SESSION_SECRET`:** Must be present, at least `32` random bytes/characters (recommended: `openssl rand -base64 48`), and must **not** match known placeholder/dev values.
2. **`DATABASE_URL` (and `TEST_DATABASE_URL` isolation):** `DATABASE_URL` must use a real PostgreSQL connection string (`postgres://` or `postgresql://`). Embedded `pglite://` URLs are rejected in production. Automated test suites use `TEST_DATABASE_URL` strictly isolated from `DATABASE_URL` (`assertSafeTestDatabaseTarget` blocks running tests in `NODE_ENV=production` or against matching/non-`_test` targets).
3. **`APP_URL` & `TRUSTED_ORIGINS`:** Set `APP_URL` to your canonical HTTPS origin (`https://app.example.com`) and optional comma-separated `TRUSTED_ORIGINS` (exact scheme + host + port). `verifyCsrfOrigin()` and Better Auth reject requests whose `Host`, `Origin`, or `Referer` fall outside these configured origins.
4. **`TRUST_PROXY` (Fail-Closed Client IP Extraction):** Defaults to `none` (ignores `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`, and `Fly-Client-IP`). Set explicitly to match your edge topology: `cloudflare`, `fly`, or `hops:<1..20>` (e.g., `hops:1` behind a single trusted reverse proxy).
5. **`RATE_LIMIT_DRIVER` (`postgres` required in production):** Defaults to `postgres` (atomic `rate_limit_bucket` table supporting multi-instance deployments). Production startup blocks `RATE_LIMIT_DRIVER=memory` unless `ALLOW_SINGLE_INSTANCE_MEMORY_RATE_LIMIT=true` is explicitly set for single-replica setups.
6. **Transactional SMTP (`SMTP_*` & `ALLOW_PROD_DEFERRED_EMAIL_QUEUE`):**
   - Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, paired `SMTP_USER` + `SMTP_PASS` (setting only one fails startup), `SMTP_SECURE` (`true` or port `465`), and `SMTP_REQUIRE_TLS` (defaults to `true` in production).
   - **Fail-Closed Delivery vs. Deferred Retry Queue:** Every outgoing email is persisted to `email_outbox`. By default (`ALLOW_PROD_DEFERRED_EMAIL_QUEUE=false`), SMTP outages fail closed with HTTP `503` (`EMAIL_DELIVERY_UNAVAILABLE`) and clean up uncommitted registration/reset tokens instead of silently losing mail. If you set `ALLOW_PROD_DEFERRED_EMAIL_QUEUE=true`, failed sends remain `"retry_scheduled"` in `email_outbox`, and **you must schedule periodic execution of `processEmailOutboxRetries()`** (via a cron job or worker process) to drain retries up to `maxAttempts` (`3`).
7. **Dev Endpoints Disabled:** `/api/dev/outbox` returns `404` in production, and `src/server/db/seed.ts` refuses to run when `NODE_ENV=production`.
8. **Separated Database Roles (Recommended):**
   - `migrator` role: Used only during deployment migration step (`CREATE`/`ALTER` schema privileges).
   - `app` runtime role: Least-privilege `SELECT`, `INSERT`, `UPDATE`, `DELETE` on application tables (no DDL permissions).

## 3. Deployment & Migration Order

Execute steps in this exact order on every production release:

1. **Take / Verify Pre-Migration Snapshot:** Ensure managed DB automatic snapshot or manual `pg_dump` completed before schema changes.
2. **Build & Test Artifact:** Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in CI.
3. **Run Versioned Migrations (Before Traffic Shift):**
   ```bash
   DATABASE_URL="$MIGRATOR_DATABASE_URL" npm run db:migrate
   ```
   - Use only versioned SQL migrations (`drizzle/`).
   - **Never** run `drizzle-kit push`, `drizzle-kit drop`, or dev seed scripts against production.
   - Destructive schema changes must follow **expand-and-contract** across two releases so running containers do not crash mid-rollout.
4. **Start / Roll Out Application Containers:** Deploy the new container image with runtime `app` DB credentials.
5. **Readiness Probe (`/api/health`):** Verify HTTP `200` from `GET /api/health`. The endpoint confirms active database connectivity (`SELECT 1`) without leaking credentials, stack traces, or internal DSNs.
6. **Post-Deploy Smoke Test:**
   - Verify `GET /` returns `200` with expected security headers (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Strict-Transport-Security`).
   - Verify `GET /api/projects` unauthenticated returns `401`.
   - Verify login and workspace load work end-to-end against production TLS.

## 4. Observability, Request Correlation & Logging

- Every API request carries a correlation `requestId` in structured JSON logs so errors can be traced across reverse proxy and Next.js server logs.
- Logger redaction strips `password`, `passwordHash`, `smtpPass`, `smtp_pass`, `token`, `cookie`, `set-cookie`, and `authorization` fields automatically.
- Configure external uptime monitoring on `GET /api/health` (30s–60s interval) plus error alerting on HTTP `5xx` spikes.

## 5. Backup & Restore Drill Procedure

Backups that have never been restored are unverified assumptions. Run this drill regularly in a staging or isolated scratch PostgreSQL instance:

```bash
# 1. Export backup from source (or download managed snapshot)
pg_dump --format=custom --no-owner --no-acl "$BACKUP_DATABASE_URL" -f backup.dump

# 2. Restore into a clean scratch database (NEVER production)
createdb restore_drill_db
pg_restore --no-owner --no-acl --dbname="postgresql://.../restore_drill_db" backup.dump

# 3. Verify schema & data counts
psql "postgresql://.../restore_drill_db" -c "\dt"
psql "postgresql://.../restore_drill_db" -c "SELECT count(*) FROM organizations; SELECT count(*) FROM projects;"
```

Record the date, backup size, restore duration, and verified row integrity in your operational runbook.

## 6. Cost Line Items & Sizing Assumptions (No Fabricated Pricing)

Because cloud provider prices vary by region, tier, and date, confirm current rates directly with your chosen vendor. Plan your production budget around these six concrete line items:

| Line Item | Sizing Driver / Assumption | Notes |
| --- | --- | --- |
| **1. App Compute (Container)** | Baseline 1–2 small instances (`512 MB–1 GB RAM`) for Next.js Node server | Add a 2nd instance across availability zones only when uptime SLA requires zero single-node downtime. |
| **2. Managed PostgreSQL** | Small primary instance (`1–2 GB RAM`, `10–20 GB SSD`) + automated daily backup storage | Storage grows linearly with `projects`, `sessions`, and WAL retention; schedule periodic expired-session cleanup. |
| **3. Network Egress / CDN** | Monthly page views x asset payload (~HTML + JS + SVG/fonts) | Static assets cached via immutable cache headers minimize origin egress. |
| **4. Transactional Email** | Monthly registrations + password resets | Low volume initially (typically fits entry tiers); verify dedicated IP/reputation needs only at high send volume. |
| **5. Logs & Error Tracking** | Request volume x log verbosity (avoid verbose debug logging in prod) | Structured JSON logs with `requestId` keep index volume predictable. |
| **6. Domain & DNS** | Annual domain registration; TLS certificates via Let's Encrypt / platform edge | Most PaaS platforms include automated TLS certs at no separate certificate fee. |
