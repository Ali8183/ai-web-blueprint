---
name: scope-and-brief
description: >-
  Use this skill at the start of any new website, web application, or major feature request
  to extract the 7 requirement dimensions, select the right architectural preset, assign
  REQ-XXX identifiers, and record brief, acceptance criteria, and architecture decisions before coding.
---

# Scope and Brief

## Trigger Purpose
Activate before creating scaffolds, schemas, or UI code whenever starting a new website/application or scoping a non-trivial feature. Prevents overbuilding simple static sites and resolves ambiguous adjectives ("modern", "fast", "clean") into testable requirements.

## Inputs
- User's site/app idea or feature request
- Canonical discovery & architecture rules: [standards/product-discovery.md](../../../standards/product-discovery.md), [standards/architecture-and-stack.md](../../../standards/architecture-and-stack.md)
- Templates: [project/brief.template.md](../../../project/brief.template.md), [project/acceptance-criteria.template.md](../../../project/acceptance-criteria.template.md), [project/decisions.template.md](../../../project/decisions.template.md), [project/traceability-matrix.template.md](../../../project/traceability-matrix.template.md)

## Steps
1. Read `standards/product-discovery.md` and `standards/architecture-and-stack.md`.
2. Extract all **7 requirement dimensions** from the user's request:
   - Users & core job-to-be-done
   - Pages, roles & critical flows (including failure states)
   - Data model, retention & sensitive PII/regulated fields
   - Integrations & multi-tenancy (payments, uploads, email, external APIs, tenant isolation)
   - Budget, traffic, hosting & backup/restore expectations
   - Primary language/locale, brand voice & WCAG 2.2 AA accessibility target
   - Explicit v1 non-goals & measurable acceptance criteria
3. If critical dimensions are missing and would alter architecture or security, ask focused clarifying questions before implementing; mark any unavoidable defaults explicitly as `[ASSUMPTION]`.
4. Convert vague quality adjectives ("modern", "clean", "fast", "secure") into observable layout, CWV, and security criteria.
5. Select the single matching profile in `presets/` (`static-site`, `fullstack-web-app`, `existing-project`, `python-fastapi-ai`, or escalate for mandatory human review if high-risk/regulated PCI/HIPAA). Confirm simple static/brochure sites do NOT add auth, databases, or admin panels.
6. Assign sequential `REQ-001`, `REQ-002`, ... IDs and draft the target project's `project/brief.md`, `project/acceptance-criteria.md`, `project/decisions.md` (ADRs), and initial `project/traceability-matrix.md`.

## Outputs
- Completed `project/brief.md` with 7 dimensions, selected preset, and `REQ-XXX` table
- `project/acceptance-criteria.md` with Given/When/Then and negative/boundary criteria
- `project/decisions.md` recording profile choice and rejected premature infrastructure
- `project/traceability-matrix.md` seeded with `REQ-XXX` rows

## Verification Method
- Verify all 7 dimensions and at least one explicit non-goal are documented.
- Verify simple brochure/portfolio briefs select `presets/static-site.md` and exclude auth/DB.
- Verify every `REQ-XXX` in `brief.md` appears in `acceptance-criteria.md` and `traceability-matrix.md`.
