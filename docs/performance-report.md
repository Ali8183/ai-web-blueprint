# Performance Report & Budgets (`templates/fullstack/`)

> [!IMPORTANT]
> **Honest Measurement Policy:** Runtime metrics below report **only directly observed measurements** from the local Next.js production build, Vitest PGlite suite, and Playwright Chromium verification run on `2026-11-16`. Unmeasured standalone Lighthouse CLI audits, PostgreSQL TCP p95 latency, and real-user production field RUM (`LCP`, `INP`, `CLS`) remain explicitly marked **`NOT RUN`**—no metrics are fabricated.

## 1. Core Web Vitals Targets

Aligned with `standards/frontend.md`, the reference application targets Google's Core Web Vitals "Good" thresholds at the 75th percentile:

| Metric | Target | Primary Engineering Controls in `templates/fullstack/` |
| --- | --- | --- |
| **LCP (Largest Contentful Paint)** | `<= 2.5s` | Server-rendered landing (`/`) and initial workspace HTML; self-hosted / optimized fonts without layout-blocking third-party font waterfalls; crisp SVG/CSS visual system without heavy hero videos or unoptimized raster assets. |
| **INP (Interaction to Next Paint)** | `<= 200ms` | Minimal client JavaScript surface (`use client` pushed down to interactive controls/modals); zero heavy charting/animation bundles on initial view; responsive optimistic/pending states on form submissions. |
| **CLS (Cumulative Layout Shift)** | `<= 0.1` | Explicit container dimensions and crisp `1px` structural borders; zero late-loading ad/banner injections; stable typography metrics. |

## 2. Lab vs. Field `INP` (Critical Distinction)

Automated local checks (Playwright interactions, Lighthouse, or Chrome DevTools throttling) measure **lab performance** on a developer or CI machine with synthetic test data and scripted clicks. They **do not equal real-user field INP**:

- **Field `INP`** (CrUX / Real User Monitoring) measures the worst (near-p98/high-percentile) interaction latency across **real user sessions**, spanning low-end mobile CPUs, long JavaScript hydration tasks, third-party scripts, background tabs, and real user input timing.
- Passing local Playwright E2E and Lighthouse checks is a baseline **regression gate**, not proof of field Core Web Vitals compliance across production traffic.
- When deploying to production, measure real-user Web Vitals (`web-vitals` reporting or hosting RUM) before claiming production `INP <= 200ms`.

## 3. Server & Database Query Budget

To prevent hidden latency degradation as organizations accumulate projects:

1. **Bounded Pagination (`limit <= 50`):** `GET /api/projects` validates `page` and `limit` server-side, capping page size at `50` records and using deterministic ordering (`created_at DESC, id DESC` or requested allow-listed sort key).
2. **Server-Side Filtering & Search:** `q`, `status`, and `priority` filters execute in PostgreSQL queries scoped strictly by `organization_id`—never fetching an entire organization's records into React state to filter on the client.
3. **N+1 Query Prevention:** List queries fetch scoped project rows and total count cleanly without per-row membership or user queries inside a loop.
4. **No Client Fetch Waterfalls:** Initial page data and session/organization context are resolved cleanly without chained `useEffect -> fetch -> render -> child useEffect` waterfalls.
5. **Composite Indexes:** Schema indexes align with `(organization_id, status, created_at)` / `(organization_id, code)` lookup paths so multi-tenant queries stay indexed under growth.

## 4. Runtime Benchmark & Measurement Log (`2026-11-16`)

| Check | Scope | Target / Budget | Measured Value | Status |
| --- | --- | --- | --- | --- |
| Production JS & CSS Bundle (`next build --webpack`, Next.js 16.4.6) | `.next/build-manifest.json` & `.next/static/chunks` | Inspect built chunks (note Next.js 16.4.6 omits legacy `First Load JS` CLI column) | `rootMainFiles` (`webpack`, `4bd1b696`, `794`, `main-app`) = `449,383 B` raw (`133,250 B` / `130.1 KiB` gzip); CSS (`78b0fb832a443775.css`) = `20,604 B` raw (`5,164 B` gzip); `/` = `3,700 B` raw (`1,256 B` gzip); `/app` = `33,552 B` raw (`8,131 B` gzip); `/login` = `6,930 B` raw (`2,362 B` gzip); `/register` = `7,859 B` raw (`2,474 B` gzip) | **MEASURED** (Post-fix production build verified) |
| Query & Integration Execution (PGlite) | Vitest (`tests/integration/*.test.ts`) with real Drizzle migrations | All security, RBAC, tenancy, hardening, and search/filter/pagination bounds pass without N+1 failures | `26/26` tests across 4 files passed in `24.44s` (`hardening.test.ts`: 11 tests in `7,491ms`; `auth.test.ts`: 4 tests in `4,229ms`; `rbac-and-tenant.test.ts`: 6 tests in `3,303ms`; `security-and-ops.test.ts`: 5 tests in `1,617ms`) | **MEASURED** (Embedded `@electric-sql/pglite` mode) |
| PostgreSQL 16 TCP Query Latency (p95) | Standalone `pg.Pool` (`postgresql://`) | Measure p95 under seeded dataset | — | **NOT RUN** (Docker & local `psql` not installed on host) |
| Lab Browser E2E & Overflow Check | Playwright Chromium (`tests/e2e/journey.spec.ts`) | End-to-end journey, `0` horizontal overflow (`360`/`768`/`1440`), `0` `@axe-core/playwright` violations | `1/1` journey passed in `27.7s` (`42.8s` total run), `0` overflow, `0` axe violations | **MEASURED** (Playwright E2E lab run) |
| Standalone Lighthouse CLI Audit | `/`, `/login`, `/app` | Lab LCP proxy `<= 2.5s`, CLS `<= 0.1`, zero console errors | — | **NOT RUN** (Standalone Lighthouse CLI not executed) |
| Production Field RUM (`LCP`, `INP`, `CLS`, prod p95) | Live user traffic across real devices | p75 Good (`LCP <= 2.5s`, `INP <= 200ms`, `CLS <= 0.1`) | N/A locally | **NOT RUN** (Requires live production deployment) |
