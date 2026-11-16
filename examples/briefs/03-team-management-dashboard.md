# Example Brief 03: Team Management Dashboard — Atölye Pusula (Compass Ledger)

> Canonical brief matching the working reference application in `templates/fullstack/` (**Atölye Pusula**, `REQ-001` through `REQ-015`).

## 1. Selected Profile

- **Profile:** `fullstack-web-app` ([presets/fullstack-web-app.md](../../presets/fullstack-web-app.md))
- **Implementation Target:** `templates/fullstack/`
- **Rationale:** Multi-organization architectural/engineering project ledger with email verification, password reset revocation, strict role-based permissions (`owner`, `editor`, `viewer`), tenant isolation, and optimistic version concurrency.

## 2. The 7 Requirement Dimensions

1. **Users & Core Job:** Architectural and structural engineering studio teams (`owner`, `editor`, `viewer`) tracking active commissions, budgets, deadlines, and phases without cross-studio leakage or conflicting overwrites.
2. **Pages, Roles & Critical Flows:**
   - Public: `/` (studio overview + SEO metadata), `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/robots.txt`, `/sitemap.xml`.
   - Authenticated: `/app` (studio ledger workspace with org switcher, URL-backed search/filter/sort/pagination, create/edit/delete modals).
   - Roles: `owner` (read/create/update/delete in org), `editor` (read/create/update, no delete -> `403`), `viewer` (read-only -> `403` on mutations).
3. **Data Model & Sensitive PII:**
   - Tables (`src/server/db/schema.ts`): `user`, `session`, `account`, `verification`, `auth_token`, `organization`, `membership`, `project` (`budget_cents INTEGER >= 0`, `due_date TIMESTAMPTZ`, `version INTEGER >= 1`), `idempotency_key`.
   - PII: User name, email, hashed password (`account.password`), session IP/user agent (`session`), hashed auth tokens (`auth_token.token_hash`).
4. **Integrations & Multi-Tenancy:**
   - Multi-tenancy: Users belong to 1+ `organization` rows via `membership`; active studio persists on `user.active_organization_id` and is verified against `membership` on every switch/query.
   - Email: Mailpit SMTP + local dev outbox (`.data/mailpit-outbox.json`, `/api/dev/outbox` disabled with `404` in production).
   - **Out of scope in v1:** File uploads, outbound user-supplied URL fetch, Stripe/billing webhooks (governed by `standards/security.md` conditional checklists if added later).
5. **Budget, Traffic & Hosting:** Single modular monolith Node.js container + Managed PostgreSQL (`max: 10` pool connections) for production; zero-Docker PGlite mode for local/CI verification.
6. **Language, Brand & Accessibility:** English technical studio UI with Turkish studio brand identity (`Atölye Pusula` — `Atölye Kuzey`, `Stüdyo Güney`), WCAG 2.2 AA target (`@axe-core/playwright` + keyboard modal focus trap + `360px`/`768px`/`1440px` screenshot review).
7. **Explicit Non-Goals:**
   - **No** file attachments / CAD uploads in v1
   - **No** external billing or webhooks in v1
   - **No** Redis, Kubernetes, or microservices in v1

## 3. Visual Design Direction (`standards/design-system.md`)

- **Option A — Dark CAD Terminal:** Charcoal slate `#111315`, cyan wireframe accents, glowing borders. *Rejected:* High visual fatigue during long tabular budget/schedule reviews and feels derivative of generic AI developer dashboards.
- **Option B — Swiss-Editorial Technical Ledger (Chosen):** Warm archival paper (`#F6F4EF`), crisp white ledger sheets (`#FFFFFF`), deep charcoal ink (`#141413`), oxidized vermilion primary accent (`#C84B31`), forest studio slate (`#1E3A2F`), `1px solid #D8D4CA` hairlines, editorial serif headings paired with sans body and tabular monospace codes/budgets (`--font-mono`, `tabular-nums`), and zero rounded-blob gradients or glassmorphism.
- **Justification:** Architectural and engineering studios work from specification sheets and numbered drawing schedules; crisp hairlines, high-contrast stone paper, and tabular numerals optimize scan accuracy and honor `standards/design-system.md`.

## 4. Requirements (`REQ-001`–`REQ-015`) & Traceability

| REQ-ID | Requirement Summary | Implementation Files | Verification Evidence |
| :--- | :--- | :--- | :--- |
| `REQ-001` | Public landing overview & SEO routes (`robots.txt`, `sitemap.xml`) with zero fake testimonials/metrics | `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts` | `tests/e2e/journey.spec.ts` (`/` axe + screenshots) |
| `REQ-002` | Atomic user registration creating user + initial studio + `owner` membership + verification token | `src/server/auth/service.ts` (`registerUser`), `src/app/api/auth/register/route.ts` | `tests/integration/auth.test.ts`, `tests/e2e/journey.spec.ts` |
| `REQ-003` | Single-use SHA-256 email verification + Mailpit/dev outbox (`/api/dev/outbox` `404` in prod) | `src/server/mail/mailer.ts`, `src/app/api/auth/verify-email/route.ts`, `src/app/api/dev/outbox/route.ts` | `tests/integration/auth.test.ts`, `tests/integration/security-and-ops.test.ts` |
| `REQ-004` | Login, server-side session logout (`Max-Age=0`), and identical generic invalid-credential error | `src/server/auth/{auth,service}.ts`, `src/app/api/auth/{login,logout,me}/route.ts` | `tests/integration/auth.test.ts` |
| `REQ-005` | Single-use 30m password reset token revoking all active user sessions on completion | `src/server/auth/service.ts`, `src/app/api/auth/{forgot-password,reset-password}/route.ts` | `tests/integration/auth.test.ts` |
| `REQ-006` | Multi-organization membership list & verified studio switching (`403` non-member) | `src/server/services/organizations.ts`, `src/app/api/organizations/**` | `tests/integration/rbac-and-tenant.test.ts` |
| `REQ-007` | Role matrix (`owner` CRUD, `editor` read/create/update + `403` delete, `viewer` read-only) | `src/server/services/projects.ts`, `src/app/api/projects/**` | `tests/integration/rbac-and-tenant.test.ts` |
| `REQ-008` | Strict tenant isolation on project `list`/`get`/`patch`/`delete` by verified `organizationId` | `src/server/services/projects.ts`, `src/server/db/schema.ts` | `tests/integration/rbac-and-tenant.test.ts` |
| `REQ-009` | Server-side search (`q`), filters, deterministic sort (`id ASC` tie-breaker), URL sync, `limit <= 50` | `src/server/services/projects.ts`, `src/server/validation.ts`, `src/app/app/page.tsx`, `src/components/LedgerDashboard.tsx` | `tests/integration/rbac-and-tenant.test.ts`, `tests/e2e/journey.spec.ts` |
| `REQ-010` | Integer minor units (`budgetCents >= 0`, never float) & UTC `TIMESTAMPTZ` schema constraints | `src/server/db/schema.ts`, `src/server/validation.ts`, `drizzle/0000_funny_gertrude_yorkes.sql` | `tests/integration/rbac-and-tenant.test.ts` |
| `REQ-011` | `UNIQUE(organization_id, code)`, `Idempotency-Key` replay/mismatch, optimistic `version` (`409`) | `src/server/db/schema.ts`, `src/server/services/projects.ts`, `src/app/api/projects/**` | `tests/integration/rbac-and-tenant.test.ts` |
| `REQ-012` | Strict Zod validation & explicit rejection (`400`) of mass-assignment keys (`role`, `organizationId`, etc.) | `src/server/validation.ts`, `src/server/http.ts` | `tests/integration/rbac-and-tenant.test.ts` |
| `REQ-013` | CSRF Origin/Fetch-Metadata check (`403`), auth rate limit (`429`), and security headers/CSP/HSTS | `src/server/security/{csrf,rate-limit,headers}.ts`, `src/middleware.ts`, `next.config.ts` | `tests/integration/{auth,rbac-and-tenant,security-and-ops}.test.ts` |
| `REQ-014` | Fail-closed prod env check, non-prod seed guard, `/api/health` readiness, redacted JSON logger | `src/server/{env,logger}.ts`, `src/server/db/seed.ts`, `src/app/api/health/route.ts` | `tests/integration/security-and-ops.test.ts` |
| `REQ-015` | CSS custom-property tokens, 7 UI states, modal focus trap (`Escape`/Tab), `@axe-core`, `360/768/1440` screenshots | `src/app/globals.css`, `src/components/{ProjectModal,DeleteProjectModal,useFocusTrap,LedgerDashboard}.tsx` | `tests/e2e/journey.spec.ts`, `docs/design-review.md` |
