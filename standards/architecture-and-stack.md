# Architecture & Stack Selection Standard

Choose the simplest architecture that satisfies the verified 7 requirement dimensions. Avoid speculative infrastructure and split responsibilities cleanly.

## 1. Profile Selection Framework

Select exactly one primary profile during discovery and document the rationale in `project/decisions.md`:

| Profile | Use When | Reference Preset |
| :--- | :--- | :--- |
| **Static / Editorial Site** | Brochure, portfolio, studio showcase, marketing landing page, or documentation without user accounts or server persistence. | [presets/static-site.md](../presets/static-site.md) *(guidance/design profile — NOT an auto-scaffolding generator profile)* |
| **Modular Monolith Full-Stack** | SaaS dashboards, team trackers, booking systems, client portals, or multi-tenant apps with auth + relational data. | [presets/fullstack-web-app.md](../presets/fullstack-web-app.md) *(matches `templates/fullstack/`)* |
| **Existing Brownfield Project** | Extending or hardening an existing codebase where framework, ORM, and runtime are already established. | [presets/existing-project.md](../presets/existing-project.md) |
| **Python / FastAPI / AI Service** | Python-centric APIs, data pipelines, document/RAG workflows, or ML inference backends paired with a web UI. | [presets/python-fastapi-ai.md](../presets/python-fastapi-ai.md) |
| **High-Risk / Regulated** | PCI-DSS cardholder data, HIPAA PHI, banking/custody, or safety-critical workflows. | **Mandatory human security, legal, and compliance review before implementation.** Blueprints never certify regulatory compliance. |

## 2. Anti-Bloat & Single-Stack Rules

- **Ban premature distributed systems:** Do **not** introduce microservices, Kubernetes, Redis, or message queues (Kafka, RabbitMQ, BullMQ) without a documented, measured bottleneck or asynchronous SLA requirement recorded in an ADR. Start with a modular monolith and PostgreSQL.
- **Single ORM rule:** Never mix two ORMs or query builders in the same application (e.g., do not combine Prisma and Drizzle). Use one schema and migration source of truth.
- **Single Auth rule:** Never mix two authentication systems (e.g., custom JWT middleware alongside session-cookie auth). One canonical session/auth boundary must govern every protected route and API.
- **Boundary discipline:** Keep domain logic independent of HTTP transport details so route handlers stay thin (`Route/Action -> Service -> Data Access`).

## 3. Runtime, Dependencies & Reproducibility

- **Pinned Node.js LTS:** Require Node.js LTS (`>= 20`, documented in `package.json` `engines` and `.nvmrc` when applicable). Avoid bleeding-edge unverified runtimes in production builds.
- **Committed lockfiles:** Every Node project must commit `package-lock.json` (or the repository's single lockfile) so local builds and CI resolve identical dependency graphs.
- **Frozen CI installs:** CI pipelines must run `npm ci` (never unpinned `npm install`) so builds fail immediately if `package.json` and the lockfile drift.
- **Pinned GitHub Actions:** Pin third-party GitHub Actions to immutable full-length commit SHAs rather than floating `@main` or `@v4` tags.

## 4. Local-to-Production Parity

- Use real PostgreSQL in production and Docker Compose (`postgres` + `mailpit`) locally where available.
- Where local Docker/PostgreSQL is unavailable, embedded PostgreSQL (`@electric-sql/pglite`) may run the exact same Drizzle SQL migrations (`drizzle/*.sql`) for development and integration tests—never mock SQL or substitute SQLite for PostgreSQL semantics.
- Production startup must fail closed (`src/server/env.ts`) if `DATABASE_URL` falls back to embedded dev defaults or if secrets match demo placeholders.
