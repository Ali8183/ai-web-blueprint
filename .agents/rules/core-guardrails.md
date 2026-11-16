# Core Blueprint Guardrails (Antigravity Workspace Rule)

This concise workspace rule mirrors `AGENTS.md` and routes to `standards/` and `presets/`. Keep this file compact (well below the 24,000-byte rule cap).

## Mandatory Pre-Build & Scope Rules

1. **Clarify & record first:** Before implementing a new site or feature, gather the 7 requirement dimensions (`standards/product-discovery.md`), assign `REQ-XXX` IDs, and save `project/brief.md` + `project/acceptance-criteria.md`.
2. **Static scope discipline:** Simple portfolios, landing pages, and brochures must use `presets/static-site.md` (guidance only) and **MUST NOT** introduce authentication, databases, ORMs, or admin dashboards without an explicit user workflow requirement.
3. **Architecture anti-bloat:** Pick one preset (`presets/`). Ban premature microservices, Kubernetes, Redis, or queues without documented need. Never mix two ORMs or two auth systems.

## Security & Data Non-Negotiables

4. **Server-side trust boundary (`standards/security.md`, `standards/backend.md`):**
   - Enforce auth (`401`), RBAC (`403`), tenant `organizationId` scoping, and Zod input validation on the server.
   - Reject client-supplied `role`, `ownerId`, `organizationId`, or `tenantId` mass assignment (`400`).
   - Enforce CSRF `Origin`/`Host` validation on cookie-authenticated mutations.
   - Fail closed on `NODE_ENV=production` if `SESSION_SECRET` is missing/weak/placeholder or `DATABASE_URL` uses embedded dev fallback.
   - Never log passwords, session tokens, verification tokens, or cookies.
5. **Database discipline (`standards/database.md`):**
   - Use parameterized Drizzle queries, integer minor units or `NUMERIC` for money (never `float`), UTC `TIMESTAMPTZ`, deterministic pagination (`ORDER BY ..., id ASC`), and versioned SQL migrations (`drizzle/`).
   - Never run `drizzle-kit push`, resets, or `db:seed` against production.

## UI & Verification Discipline

6. **Anti-AI-slop design (`standards/design-system.md`):** Propose 2 distinct visual directions, justify the winner, encode CSS custom-property tokens, reject generic purple gradients/glassmorphism/fake metrics, cover all 7 UI states, and inspect screenshots at `360px`, `768px`, and `1440px`.
7. **Honest verification (`standards/testing-and-ops.md`):** Run real negative tests against real migrations, `npm run check:adapters`, lint, typecheck, build, and Playwright/`axe` checks. Never report unrun checks as passing; note explicitly that `axe-core` != full WCAG 2.2 AA conformance and partial OWASP ASVS v5.0.0 checks != certification.
