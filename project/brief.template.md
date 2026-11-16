# Project Brief: [PROJECT NAME]

> Complete this brief using `standards/product-discovery.md` before writing application code. Mark unknown defaults as `[ASSUMPTION]`.

## 1. Selected Profile

- **Profile:** `[static-site | fullstack-web-app | existing-project | python-fastapi-ai | high-risk-review-required]`
- **Preset Reference:** `presets/[chosen-preset].md`
- **Rationale:** [Why this architecture fits; confirm no banned premature infrastructure.]

## 2. The 7 Requirement Dimensions

### Dimension 1 — Users & Core Job-to-be-Done
- **Primary Users / Personas:**
- **Core Job-to-be-Done:**
- **Primary Success Signal:**

### Dimension 2 — Pages, Roles & Critical Flows
- **Public Routes:**
- **Authenticated / Protected Routes:**
- **Roles & Permissions Matrix:**
- **Critical End-to-End Flows (Happy + Failure Paths):**

### Dimension 3 — Data Model & Sensitive PII
- **Core Entities & Ownership:**
- **Sensitive PII / Secrets / Regulated Data:**
- **Retention & Deletion Rules:**

### Dimension 4 — Integrations & Multi-Tenancy
- **Multi-Tenancy Model:** `[None (single-tenant/static) | Organization-scoped | ...]`
- **Payments / Uploads / Email / External APIs:**
- **Out-of-Scope Integrations (Mandatory Checklist Triggered?):**

### Dimension 5 — Budget, Traffic & Hosting
- **Expected Traffic / Concurrency:**
- **Hosting Target & Runtime Constraints:**
- **Maintenance Owner & Backup/Restore Expectation:**

### Dimension 6 — Brand, Language & Accessibility
- **Primary Locale(s) & Domain Terminology:**
- **Brand Voice & Visual References:**
- **Accessibility Target:** WCAG 2.2 AA (with explicit note that automated checks != full conformance)

### Dimension 7 — Explicit Non-Goals
- **What will NOT be built in v1:**
  - [e.g., No billing/Stripe integration in v1]
  - [e.g., No file upload storage in v1]

## 3. Visual Design Direction (`standards/design-system.md`)

- **Option A:** [Typography, surface/accent palette, density, layout, motion]
- **Option B:** [Typography, surface/accent palette, density, layout, motion]
- **Chosen Direction & Justification:**
- **Core CSS Tokens:**
- **Font / Icon / Asset Licenses:**

## 4. Requirement IDs (`REQ-XXX`)

| ID | Category | Requirement Statement |
| :--- | :--- | :--- |
| `REQ-001` | Functional | |
| `REQ-002` | Security | |
| `REQ-003` | Design / A11y | |
