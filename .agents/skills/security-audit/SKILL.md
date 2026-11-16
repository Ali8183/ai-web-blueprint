---
name: security-audit
description: >-
  Use this skill to audit authentication, session lifecycle, RBAC, multi-tenant isolation,
  CSRF, mass assignment, security headers, logging redaction, and conditional checklists
  against the OWASP ASVS v5.0.0 mapping in standards/security.md.
---

# Security Audit

## Trigger Purpose
Activate before releasing a full-stack app, after modifying auth/session/RBAC/API routes, or when adding out-of-scope high-risk capabilities (file uploads, outbound URL fetching, webhooks/payments).

## Inputs
- Target codebase (`templates/fullstack/` or downstream app)
- OWASP ASVS v5.0.0 control mapping & conditional checklists: [standards/security.md](../../../standards/security.md)
- Backend & Database contracts: [standards/backend.md](../../../standards/backend.md), [standards/database.md](../../../standards/database.md)

## Steps
1. Review [standards/security.md](../../../standards/security.md) and enumerate every mapped ASVS v5.0.0 control (`V1.2.1` through `V16.3.2`) for the target codebase.
2. Inspect authentication & session handling (`src/server/auth*`, `src/app/api/auth/*`):
   - Verify password length bounds (`>= 8`), no artificial composition bans, generic login/forgot-password errors, CSPRNG session/reset tokens stored hashed, HttpOnly/SameSite/Secure cookie attributes, logout server-side revocation, and full session revocation on password reset.
3. Inspect authorization, tenant isolation & input boundaries (`src/server/services/*`, `src/app/api/*`):
   - Confirm every protected endpoint checks session (`401`) and role matrix (`owner`/`editor`/`viewer` -> `403`).
   - Confirm every tenant query filters by verified session `organizationId` and prevents cross-tenant FK attachment.
   - Confirm strict Zod schemas reject mass assignment (`role`, `ownerId`, `organizationId`, `tenantId`) and bound `limit <= 50`.
4. Inspect transport, environment & logging defenses:
   - Confirm CSRF Origin/Host verification on cookie-authenticated `POST`/`PATCH`/`PUT`/`DELETE` routes.
   - Confirm `NODE_ENV=production` startup fails closed on missing/short/placeholder `SESSION_SECRET` or embedded DB fallback, and `/api/dev/outbox` + seed scripts refuse production execution.
   - Confirm security headers (CSP without `unsafe-eval` in prod, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in prod) and log redaction of passwords/tokens/cookies.
5. Check conditional scope triggers: if the project added **File Uploads**, **SSRF / Outbound URL Fetch**, or **Webhooks / Payments**, audit every item in the corresponding mandatory checklist in `standards/security.md`.
6. Execute negative security tests and dependency/secret checks (`vitest`, `npm audit`, `gitleaks`/secret scan if available).

## Outputs
- Updated security findings summary mapped to ASVS v5.0.0 control IDs, concrete code paths, test evidence, and explicit residual risks.

## Verification Method
- Run the full negative security integration suite (`npm run fullstack:test`) and confirm every adversarial case passes without skipped assertions.
- Record any unverified runtime checks (e.g., remote WAF, penetration test, or CI CodeQL/Gitleaks run) separately, and state explicitly that partial ASVS v5.0.0 checks do **not** establish full ASVS certification.
