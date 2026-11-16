# Preset: Python / FastAPI / AI Service

Use this profile when a product genuinely needs a Python backend—such as AI/LLM orchestration, RAG document indexing, scientific/data processing, or existing Python ML libraries—paired with a modern TypeScript web frontend. Pattern structure is informed by `fastapi/full-stack-fastapi-template` (MIT).

> [!NOTE]
> This blueprint's executable template lives in `templates/fullstack/` (TypeScript/Next.js). This Python/FastAPI preset is a documented architectural guide—not an auto-scaffolded generator template in `scripts/create-project.mjs`.

## 1. When to Choose This Profile

- Core product logic depends on Python ML/AI ecosystems (embeddings, PDF/OCR parsing, scientific computing, background inference pipelines) or an existing FastAPI platform.
- If the app is a standard multi-tenant CRUD dashboard, booking system, or business portal without Python-specific libraries, prefer `presets/fullstack-web-app.md` to avoid running two runtimes unnecessarily.

## 2. Recommended Reference Architecture

- **Frontend:** Next.js App Router (TypeScript) or React + Vite SPA consuming explicit OpenAPI-generated typed clients over HTTPS.
- **Backend API:** Python 3.12+ with FastAPI, Pydantic v2 strict request/response models (never exposing ORM models directly), and SQLAlchemy 2.x or SQLModel.
- **Database & Migrations:** PostgreSQL 16+ with Alembic versioned migrations (`alembic upgrade head` in deploy pipeline; no `Base.metadata.create_all()` in production).
- **Dependency & Packaging Discipline:** `uv` or Poetry with committed `uv.lock` / `poetry.lock` and frozen installs in CI (`uv sync --frozen`).
- **Async / Long AI Workloads:** Use FastAPI `BackgroundTasks` only for short non-critical tasks; introduce a persistent job table + worker process (or Redis/queue ONLY when throughput and SLA metrics justify it per `standards/architecture-and-stack.md`).

## 3. Security & AI-Specific Controls

All rules in `standards/security.md`, `standards/backend.md`, and `standards/database.md` apply equally in Python:
- **OWASP ASVS alignment:** Server-side password hashing (Argon2id/bcrypt via `pwdlib` or `passlib`), short-lived signed/opaque tokens or HttpOnly cookies with Origin/CSRF protection, strict Pydantic `.model_config = ConfigDict(extra="forbid")` to reject mass assignment, and tenant `organization_id` filtering in every repository query.
- **AI / LLM Guardrails (when applicable):**
  - Enforce server-side per-tenant rate limits and token/cost budgets on inference endpoints (`429 Retry-After`).
  - Treat model outputs and retrieved RAG chunks as **untrusted data**: never interpolate LLM output directly into raw HTML (`dangerouslySetInnerHTML`) or raw SQL.
  - Enforce tenant ACL filtering **before** vector similarity retrieval so Org B documents never enter Org A's prompt context.
  - Set explicit HTTP timeouts (`httpx.Timeout`) and never log user prompts containing PII or API keys (`OPENAI_API_KEY`, etc.).

## 4. Verification Gates

- `ruff check` / `mypy` (or `pyright`) for static lint and strict type checking.
- `pytest` negative-first integration suite running against a real PostgreSQL test database with Alembic migrations applied.
- OpenAPI schema contract check between FastAPI backend and frontend typed client.
- Playwright E2E + `@axe-core/playwright` on the paired web UI.
