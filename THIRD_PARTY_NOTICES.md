# Third-Party Notices and Licenses

This blueprint repository combines original engineering guidelines, templates, and scripts with carefully attributed third-party open-source concepts and specifications.

## 1. Original Repository Content

- **Code, Templates, Scripts, Presets, and Adapter Generator:** Licensed under the **MIT License** (see [`LICENSE`](LICENSE)).
- **Security Standards Documentation (`standards/security.md` and derived ASVS mappings):** Adapted documentation incorporating OWASP ASVS v5.0.0 and OWASP Cheat Sheet Series material is licensed under **CC BY-SA 4.0** (see Section 3 below).

---

## 2. Referenced Open-Source Repositories (Reviewed 2026-11-16)

| Source | Repository / Path | Verified Ref & Commit | License | Usage & Notes |
| --- | --- | --- | --- | --- |
| `agentsmd/agents.md` | https://github.com/agentsmd/agents.md | `main` (`d001185d792e`) | **MIT** | Inspired the concise root `AGENTS.md` routing format. |
| `github/spec-kit` | https://github.com/github/spec-kit | `main` (`2ee2b1e80059`) | **MIT** | Inspired specification-first templates (`project/*.template.md`). |
| `obra/superpowers` | https://github.com/obra/superpowers | `main` (`22f0b463e7a5`) | **MIT** | Inspired structured skill gates (discovery before build, verification before completion). |
| `anthropics/skills` (`skills/frontend-design`) | https://github.com/anthropics/skills/tree/main/skills/frontend-design | `main` (`1780c5e5a552`) | **Apache-2.0** (`skills/frontend-design/LICENSE.txt`; parent repo has no root license) | Conceptual anti-generic frontend design principles only. |
| `vercel-labs/agent-skills` (`react-best-practices`) | https://github.com/vercel-labs/agent-skills | `main` (`1a2c79d4e6c4`) | **MIT** (`react-best-practices` only) | React/Next.js waterfall avoidance & bundle performance concepts. |
| `vercel-labs/agent-skills` (`web-design-guidelines`) | https://github.com/vercel-labs/agent-skills | `main` (`1a2c79d4e6c4`) | **No explicit license header** | Inspected for scope context only; **zero verbatim copying** of text or code. |
| `alan2207/bulletproof-react` | https://github.com/alan2207/bulletproof-react | `master` (`9506629ed003`) | **MIT** | Modular feature structure and API/DTO boundary concepts. |
| `fastapi/full-stack-fastapi-template` | https://github.com/fastapi/full-stack-fastapi-template | `master` (`77e550a73bb4`) | **MIT** | Inspired `presets/python-fastapi-ai.md` and local Mailpit/Postgres Compose workflow. |
| `shadcn-ui/ui` | https://github.com/shadcn-ui/ui | `main` (`e62c9435fff7`) | **MIT** | Accessible primitive UI component architecture concepts. |

---

## 3. OWASP Attribution (CC BY-SA 4.0)

### OWASP Application Security Verification Standard (ASVS) v5.0.0
- **Source:** https://github.com/OWASP/ASVS (Tag `v5.0.0_release`, commit `650b4bff6f1b`, reviewed `2026-11-16`)
- **Creator:** Open Worldwide Application Security Project (OWASP) Foundation and ASVS contributors
- **License:** Creative Commons Attribution-ShareAlike 4.0 International (**CC BY-SA 4.0**) — https://creativecommons.org/licenses/by-sa/4.0/
- **Changes Made:** Selected and adapted specific ASVS v5.0.0 control categories and requirement IDs (`V1.2.1`, `V1.2.2`, `V1.2.4`, `V2.2.1`, `V2.2.2`, `V3.2.2`, `V3.3.1`, `V3.3.2`, `V3.3.4`, `V6.1.1`, `V6.2.1`, `V6.2.5`, `V7.2.1`, `V7.2.3`, `V7.2.4`, `V8.2.1`, `V8.2.2`, `V8.2.3`, `V13.2.2`, `V16.2.1`, `V16.2.5`, `V16.3.1`, `V16.3.2`) into `standards/security.md` with implementation mappings to `templates/fullstack/` and explicit out-of-scope checklists. OWASP does not endorse this repository or guarantee compliance.

### OWASP Cheat Sheet Series
- **Source:** https://github.com/OWASP/CheatSheetSeries (`master`, commit `31f5b8f5ad29`, reviewed `2026-11-16`)
- **Creator:** OWASP Foundation and Cheat Sheet Series contributors
- **License:** Creative Commons Attribution-ShareAlike 4.0 International (**CC BY-SA 4.0**) — https://creativecommons.org/licenses/by-sa/4.0/
- **Changes Made:** Defensive patterns for CSRF origin checking, session revocation, password reset lifecycle, input validation, and secret handling were synthesized and adapted for Next.js + Drizzle PostgreSQL applications.

---

## 4. Apache License 2.0 Notice (`anthropics/skills/skills/frontend-design`)

Concepts regarding avoiding generic UI aesthetics and establishing intentional typography, color, and motion direction in `standards/design-system.md` are informed by `skills/frontend-design`, which carries an Apache License 2.0 `LICENSE.txt` inside that skill directory (`1780c5e5a552`). See https://www.apache.org/licenses/LICENSE-2.0 for the full Apache-2.0 license terms.

---

## 5. Runtime Dependencies & Visual Assets (`templates/fullstack/`)

Runtime npm dependencies, typography, and icon libraries installed in `templates/fullstack/package.json` (such as Next.js, React, Drizzle ORM, `@electric-sql/pglite`, Playwright, Vitest, `@axe-core/playwright`, and open-source icon/font packages) remain subject to their respective upstream licenses recorded in `templates/fullstack/package.json`, `templates/fullstack/package-lock.json`, and `docs/design-review.md`.
