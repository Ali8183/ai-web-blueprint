# Acceptance Criteria: [PROJECT NAME]

> Link every criterion to a `REQ-XXX` ID from `project/brief.md`. Include negative and edge cases, not only happy paths.

## 1. Functional & Flow Criteria

### `REQ-001` — [Short Title]
- **Given:** [Initial state / role / dataset]
- **When:** [User or API action]
- **Then:** [Observable UI result, HTTP status, DB persistence, or side effect]
- **Negative / Edge Case:** [Invalid input, unauthenticated state, duplicate submit, or permission denial]

### `REQ-002` — [Short Title]
- **Given:**
- **When:**
- **Then:**
- **Negative / Edge Case:**

## 2. Security & Boundary Criteria (`standards/security.md`)

- **Auth & Sessions:** Wrong credentials return generic error; logout and password reset invalidate server sessions; expired/replayed tokens fail.
- **RBAC & Tenant Isolation:** Cross-organization read/write/delete fails with `403`/`404`; unauthorized role mutations fail with `403`; mass-assignment fields (`role`, `organizationId`) are rejected (`400`).
- **CSRF & Headers:** Cross-origin mutating cookie requests return `403`; production startup fails if secrets or DB config fall back to dev defaults.

## 3. Design, Responsive & Accessibility Criteria (`standards/design-system.md`)

- **All 7 UI States Verified:** Loading, empty, error, success, disabled, focus-visible, long content (100+ chars).
- **Viewports Inspected:** Screenshots reviewed at `360px`, `768px`, and `1440px` with zero horizontal overflow or clipped interactive elements.
- **Accessibility:** Keyboard navigation (including modal/drawer focus trap and Escape restore) + `@axe-core/playwright` zero critical/serious violations (noting manual WCAG 2.2 AA review remains required).

## 4. Operational Criteria (`standards/testing-and-ops.md`)

- `GET /api/health` returns `200` with live DB check and zero secret leakage.
- Migrations run cleanly from empty DB; integration, build, and E2E gates pass without skipped assertions.
