# Security Policy

## Scope

This repository is an engineering blueprint, governance framework, and reference template (`templates/fullstack/`).

- **In scope:** Security vulnerabilities in the reference application template (`templates/fullstack/`), generator/repository tooling (`scripts/`), CI workflow definitions (`.github/workflows/`), or unsafe security guidance in `standards/`.
- **Out of scope:** Downstream applications generated or customized from this blueprint by third parties (each downstream operator is responsible for their own deployment, secrets management, dependency updates, and security testing), as well as theoretical issues requiring physical access to a developer's local machine.

> [!NOTE]
> Following this blueprint reduces common security mistakes, but **no template or automated check guarantees zero vulnerabilities or regulatory compliance**. Production deployments still require environment-specific threat modeling, penetration testing, and operational hardening.

## Supported Blueprint Versions

| Version | Status | Security Fixes |
| --- | --- | --- |
| `0.1.x` | Active | Supported |
| `< 0.1.0` | Unsupported | Not applicable |

## Reporting a Vulnerability

**Do not open a public GitHub issue for suspected security vulnerabilities.**

Report vulnerabilities privately through **GitHub Private Vulnerability Reporting**:

1. Open the repository's **Security** tab on GitHub.
2. Navigate to `/security/advisories/new` (or click **Advisories** -> **New draft security advisory**).
3. Provide:
   - Affected file paths or template component (`templates/fullstack/`, `scripts/`, etc.).
   - Clear reproduction steps or proof-of-concept request/payload.
   - Impact assessment (e.g., cross-tenant data exposure, CSRF bypass, privilege escalation, secret leakage).
   - Suggested remediation, if known.

If Private Vulnerability Reporting is disabled on a fork or mirror, contact the repository maintainer through GitHub's private maintainer channels on that fork rather than posting exploit details publicly.

## Response Expectations

Maintainers aim to acknowledge valid private advisory reports within a reasonable review window, confirm whether the issue reproduces against the reference application or generator, and publish a coordinated fix and changelog entry (`CHANGELOG.md`) once verified.

## Local Development vs. Production Defaults

- The reference app (`templates/fullstack/`) includes `.env.example` and `docker-compose.yml` strictly for local development and automated test execution.
- `templates/fullstack/src/server/env.ts` blocks startup in `NODE_ENV=production` if `SESSION_SECRET` is missing, shorter than 32 characters, or matches placeholder values, or if `DATABASE_URL` points to an embedded development fallback.
- Seed scripts refuse to run in `NODE_ENV=production`, and `/api/dev/outbox` is disabled outside development/test environments.

## Secret-Scan False-Positive Exceptions (`.gitleaksignore`)

No global rule disables are allowed. Only commit-pinned Gitleaks false positives from initial commit `e0ea4d9f371f08c6e66ecbb4a9bfc81cdb9d4b1c` are recorded in [`.gitleaksignore`](.gitleaksignore), and subsequent commits replace synthetic test literals with runtime-assembled non-secret fixtures:

| Evidence | Fingerprints | Owner | Rationale | Review Date |
| --- | --- | --- | --- | --- |
| GitHub Actions run `43906928050` (`2026-11-16`) | 11 `generic-api-key` matches in `e0ea4d9f371f08c6e66ecbb4a9bfc81cdb9d4b1c` (`examples/briefs/02-local-business-booking.md:21`, `tests/generator-smoke.test.mjs:88`, `security-and-ops.test.ts:51,59`, `hardening.test.ts:94,287,295,444,452,487,561`) | `@Ali8183` | Synthetic `SESSION_SECRET` test fixtures and example brief prose; no real credentials exist in Git history. | `2027-05-16` |
