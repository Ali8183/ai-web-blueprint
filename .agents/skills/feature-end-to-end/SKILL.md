---
name: feature-end-to-end
description: >-
  Use this skill when implementing a full-stack feature vertically across PostgreSQL/Drizzle
  schema migrations, Route -> Service -> DB backend layers, Next.js App Router UI, and
  negative-first integration and Playwright E2E tests tied to REQ-XXX IDs.
---

# Feature End-to-End

## Trigger Purpose
Activate when building or modifying a feature in `templates/fullstack/` or a downstream `fullstack-web-app` project so database constraints, backend authorization, frontend state, and tests are delivered as one cohesive slice.

## Inputs
- Assigned `REQ-XXX` requirement(s) from `project/brief.md` and `project/acceptance-criteria.md`
- Standards: [standards/frontend.md](../../../standards/frontend.md), [standards/backend.md](../../../standards/backend.md), [standards/database.md](../../../standards/database.md), [standards/testing-and-ops.md](../../../standards/testing-and-ops.md)

## Steps
1. **Schema & Migration (`standards/database.md`):**
   - Update Drizzle schema with `NOT NULL`, `FOREIGN KEY` (`ON DELETE` rules), `UNIQUE` (tenant-scoped where applicable), `CHECK`, UTC `TIMESTAMPTZ`, and integer minor units/`NUMERIC` for money.
   - Add composite indexes aligned with real filters + deterministic `ORDER BY ..., id ASC`.
   - Generate a versioned SQL migration (`drizzle/`)—never use `db push` or destructive resets in shared/prod environments.
2. **Backend Service & API (`standards/backend.md`):**
   - Follow `Route -> Service -> Data Access` layering.
   - Enforce server-side session auth (`401`), RBAC (`403`), tenant `organizationId` scoping (including cross-tenant FK checks), CSRF Origin validation, strict Zod validation (rejecting mass assignment `role`/`organizationId`/`ownerId`), bounded `limit <= 50` pagination, optimistic `version`/idempotency handling, and explicit DTOs.
3. **Frontend App Router UI (`standards/frontend.md`, `standards/design-system.md`):**
   - Fetch initial data in Server Components (avoiding client mount waterfalls); keep `"use client"` leaves focused.
   - Sync filter/search/sort/pagination state to URL `searchParams` (resetting `page=1` on filter changes).
   - Implement accessible form labels/errors, modal focus traps, and all 7 UI states.
4. **Negative-First Verification (`standards/testing-and-ops.md`):**
   - Write Vitest integration tests against real migrations covering unauthenticated `401`, RBAC `403`, cross-tenant isolation, mass assignment, input bounds, CSRF Origin mismatch, concurrency/double-submit, and DB persistence.
   - Update Playwright E2E + `@axe-core/playwright` coverage if user flows or modals changed.
   - Update `project/traceability-matrix.md` mapping `REQ-XXX -> files -> tests`.

## Outputs
- Versioned Drizzle SQL migration + updated schema/service/API/UI files
- Passing Vitest integration tests and updated E2E/traceability matrix entries

## Verification Method
- Run `npm run fullstack:lint`, `npm run fullstack:typecheck`, `npm run fullstack:test`, `npm run fullstack:build`, and `npm run fullstack:e2e` (in `templates/fullstack/` or downstream app).
- Confirm zero skipped assertions and verify `project/traceability-matrix.md` links every implemented `REQ-XXX` to observed passing tests.
