# Contributing

Thank you for helping improve this blueprint repository. Changes here affect both engineering guidance and downstream generated applications, so clarity, verifiability, and license hygiene matter.

## Scope of Contributions

- **Standards & Presets (`standards/`, `presets/`, `project/`, `examples/`):** Keep rules concise, testable, and free of unverified marketing claims. Avoid duplicating the same rule across multiple files; link back to the canonical `standards/*.md` file instead.
- **Adapters (`.agents/`, `.cursor/`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.github/instructions/`):** Never hand-edit generated pointer files out of sync with `scripts/sync-adapters.mjs`. Update the generator template and run `node scripts/sync-adapters.mjs` so drift checks pass.
- **Reference Template (`templates/fullstack/`):** Every new security or multi-tenant capability must ship with real migration files (if schema changed) and negative integration tests against real PostgreSQL/PGlite migrations.
- **Documentation (`docs/`, `README*.md`):** Distinguish verified test results from pending or unrun checks. Do not fabricate metrics, benchmarks, or emails.

## Local Verification Before Opening a PR

Run all repository checks from the repository root (PowerShell on Windows or bash on macOS/Linux):

```powershell
npm run doctor
npm run check:adapters
npm run test:repo
```

When modifying `templates/fullstack/`, also run full lint, typecheck, integration tests, production build, and Playwright E2E checks inside `templates/fullstack/`:

```powershell
npm --prefix templates/fullstack ci
npm --prefix templates/fullstack run lint
npm --prefix templates/fullstack run typecheck
npm --prefix templates/fullstack test
npm --prefix templates/fullstack run build
```

Or run the combined verification entrypoint:

```powershell
npm run verify
```

## Licensing & Third-Party Attribution Rules

- Original blueprint code, templates, and tooling are contributed under the **MIT License** (`LICENSE`).
- Adapted security documentation derived from OWASP ASVS v5.0.0 or OWASP Cheat Sheet Series must preserve **CC BY-SA 4.0** attribution (`THIRD_PARTY_NOTICES.md`) and clearly note changes made.
- **Never copy text or code verbatim from third-party files lacking an explicit open-source license** (see `docs/references.md`, including the explicit distinction inside `vercel-labs/agent-skills`).
- New third-party libraries, fonts, or icons added to `templates/fullstack/` must use permissive licenses compatible with MIT (e.g., MIT, Apache-2.0, ISC, OFL-1.1) and be logged in `THIRD_PARTY_NOTICES.md` and `docs/design-review.md`.

## Security Disclosures

Do not open public pull requests or issues for exploitable vulnerabilities in `templates/fullstack/` or `scripts/`. Follow `SECURITY.md` and report privately via GitHub Private Vulnerability Reporting.
