# Product Discovery & Requirements Standard

Every site or application starts with structured discovery before choosing a stack or writing code. Skipping discovery causes over-engineered brochure sites, insecure data handling, and generic UI.

## 1. The 7 Requirement Dimensions

Extract and record these 7 dimensions in `project/brief.md` before implementation. If critical dimensions are missing, ask clarifying questions first; if proceeding with defaults, mark every assumption explicitly as `[ASSUMPTION]`.

| # | Dimension | Questions to Answer |
| :--- | :--- | :--- |
| 1 | **Users & Core Job** | Who are the primary users? What single job-to-be-done defines success for v1? |
| 2 | **Pages, Roles & Critical Flows** | Which public routes, authenticated views, user roles, and end-to-end flows exist? What happens on failure? |
| 3 | **Data Model & Sensitive PII** | Which entities exist, who owns them, how long are they retained, and which fields hold PII, credentials, or financial/health data? |
| 4 | **Integrations & Multi-Tenancy** | Are payments, file uploads, transactional email, outbound webhooks/APIs, or multi-organization tenant boundaries required? |
| 5 | **Budget, Traffic & Hosting** | What are expected concurrency/traffic levels, hosting constraints, maintenance owner, and backup RPO/RTO expectations? |
| 6 | **Language, Brand & Accessibility** | What is the primary UI locale (and RTL/i18n need), brand voice, visual reference domain, and WCAG 2.2 AA accessibility requirement? |
| 7 | **Non-Goals & Acceptance Criteria** | What is explicitly out of scope for v1, and what observable Given/When/Then criteria define "done"? |

## 2. Translating Vague Asks into Observable Choices

Never leave subjective adjectives unquantified. Convert vague requests into concrete design and engineering decisions:

| Vague Request | Observable Requirement to Record |
| :--- | :--- |
| "Modern / Clean" | Specific typography pairing, palette tokens, whitespace rhythm, max content width, and single-purpose card/table density. |
| "Fast" | Server-rendered initial routes, bounded payload/pagination (`limit <= 50`), and Core Web Vitals targets (`LCP <= 2.5s`, `INP <= 200ms`, `CLS <= 0.1`). |
| "Secure" | Server-side authz/validation, session lifecycle, tenant isolation, CSRF protection, and OWASP ASVS v5.0.0 mapped controls with negative tests. |
| "Mobile-friendly" | Verified layout, touch targets, navigation, forms, and tables at `360px`, `768px`, and `1440px` without horizontal overflow. |
| "Dashboard" | Exact entity columns, server-side search/filter/sort parameters, role permissions per action, and all 7 UI states. |

## 3. Requirement IDs & Traceability

Assign a sequential `REQ-XXX` identifier to every functional, security, and operational requirement in `project/brief.md` and `project/acceptance-criteria.md`.

Maintain end-to-end traceability in `project/traceability-matrix.md`:

```text
REQ-ID  ->  File / Feature Implementation  ->  Automated Test / Manual Review Evidence
```

Example:
- `REQ-004` (Cross-organization project isolation) -> `src/server/services/project-service.ts`, `src/app/api/projects/[id]/route.ts` -> `tests/integration/tenant-isolation.test.ts`

Unmapped requirements are incomplete; code without a requirement should be questioned against Non-Goals.

## 4. Scope Discipline for Static & Brochure Sites

**Hard Rule:** Do **not** add authentication, databases, ORMs, user accounts, session cookies, or admin panels to simple static, portfolio, event, or brochure websites unless Dimension 2 or 3 establishes a concrete authenticated or dynamic persistence workflow.

- A photographer portfolio, architectural studio showcase, or local service landing page without online booking/accounts belongs on `presets/static-site.md`.
- Adding unneeded auth and DB surfaces introduces credential risk, operational maintenance, and failure modes with zero user value.
