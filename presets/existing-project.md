# Preset: Existing Brownfield Project

Use this profile when adopting this blueprint's engineering, security, design, and testing standards inside an **existing** repository without rewriting its framework, ORM, or directory layout.

## 1. Non-Destructive Adoption Rules

- **Keep existing stack foundations:** Do **not** replace the project's existing web framework (Express, Next.js, Remix, NestJS, Django, Rails), ORM (Prisma, TypeORM, SQLAlchemy, Drizzle), or package manager (`pnpm`, `yarn`, `npm`).
- **Single-ORM & Single-Auth discipline still applies:** Never introduce a second ORM or parallel auth library alongside the existing one; fix or wrap the existing layer cleanly.
- **Adapter integration:** Add `AGENTS.md` (and optional tool adapters via `scripts/sync-adapters.mjs` or equivalent pointer rules) pointing to adopted standards without breaking existing CI.

## 2. Prioritized Incremental Hardening Order

Adopt controls in risk order rather than attempting a big-bang rewrite:

1. **Discovery & Traceability (`standards/product-discovery.md`):**
   - Document current critical flows, sensitive PII fields, and known non-goals in `project/brief.md`.
   - Assign `REQ-XXX` IDs to every new change or bug fix.
2. **Trust Boundaries & Security Baseline (`standards/security.md`, `standards/backend.md`):**
   - Audit existing endpoints for server-side session checks (`401`), role enforcement (`403`), and tenant/owner scoping (`organizationId` / `userId` in queries).
   - Add strict Zod/schema validation on inputs and reject mass-assignment fields (`role`, `organizationId`).
   - Add CSRF Origin verification for cookie-authenticated mutations and redact credentials/tokens in logs.
   - Add startup secret checks (`NODE_ENV === "production"` fails closed on missing/weak secrets).
3. **Database & Migration Discipline (`standards/database.md`):**
   - Stop any manual schema pushes in production; adopt versioned SQL migrations and expand-contract for destructive changes.
   - Verify composite indexes and add `CHECK`/`UNIQUE` constraints for race-prone operations.
4. **Negative-First Test Coverage (`standards/testing-and-ops.md`):**
   - Before refactoring legacy code, write negative integration tests for auth, RBAC, tenant isolation, validation bounds, and regressions.
5. **UI States & Design Cleanup (`standards/design-system.md`, `standards/frontend.md`):**
   - Ensure touched screens implement all 7 UI states (`loading`, `empty`, `error`, `success`, `disabled`, `focus-visible`, `long content`), accessible dialog focus trapping, and responsive verification at `360px`/`768px`/`1440px`.

## 3. What NOT to Copy Blindly

- Do not copy `templates/fullstack/` verbatim over an active repository.
- Do not change existing database connection drivers or session cookie names in production without a backwards-compatible migration plan.
