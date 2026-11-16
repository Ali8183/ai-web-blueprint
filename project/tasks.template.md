# Implementation Tasks: [PROJECT NAME]

> Break work into vertical slices mapped to `REQ-XXX` IDs. Verify each slice before moving on.

## Phase 1 — Discovery, Design System & Foundation
- [ ] Complete `project/brief.md`, `project/acceptance-criteria.md`, and `project/decisions.md`
- [ ] Define CSS tokens and typography/color palette in `globals.css` (`REQ-XXX`)
- [ ] Configure database schema, constraints, and versioned SQL migrations (`REQ-XXX`)

## Phase 2 — Auth, Tenant Boundaries & Core Backend
- [ ] Implement server env guard, structured logger with `requestId`, and CSRF Origin helper (`REQ-XXX`)
- [ ] Implement auth/session/token flows and local outbox/Mailpit delivery (`REQ-XXX`)
- [ ] Implement domain service + tenant-scoped API endpoints with bounded pagination and DTOs (`REQ-XXX`)

## Phase 3 — UI States, Accessibility & Public/App Pages
- [ ] Build public pages with SEO metadata, `robots.txt`, and `sitemap.xml` (`REQ-XXX`)
- [ ] Build interactive workspace views covering all 7 UI states and modal focus trap (`REQ-XXX`)

## Phase 4 — Negative Tests, Screenshots & Release Readiness
- [ ] Write and run negative integration tests against real migrations (`REQ-XXX`)
- [ ] Run Playwright E2E + `@axe-core/playwright` + capture/inspect `360px`/`768px`/`1440px` screenshots (`REQ-XXX`)
- [ ] Complete `project/traceability-matrix.md` and run final lint/typecheck/test/build gates
