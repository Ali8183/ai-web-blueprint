# Atölye Pusula — Studio Project Ledger (`templates/fullstack`)

Reference Next.js App Router + Drizzle ORM + PostgreSQL / PGlite + Better Auth application demonstrating isolated multi-organization workspaces, role-based access control (`owner`, `editor`, `viewer`), optimistic version locking, idempotent creation, and negative-first testing.

## Quick Start (Zero-Docker Embedded PostgreSQL via PGlite)

1. Copy `.env.example` to `.env`:
   - PowerShell: `Copy-Item .env.example .env`
   - macOS/Linux: `cp .env.example .env`
   Set a strong random `SESSION_SECRET` (32+ characters).
2. Install dependencies:
   `npm ci`
3. Apply Drizzle SQL migrations and seed sample studios (`Atölye Kuzey` & `Stüdyo Güney`):
   `npm run db:migrate`
   `npm run db:seed`
4. Start development server:
   `npm run dev`

## Docker PostgreSQL 16 + Mailpit Mode

1. Start local Postgres and Mailpit containers:
   `docker compose up -d`
2. Set `DATABASE_URL=postgresql://pusula:pusula_local_only@localhost:5432/pusula_dev` in `.env`.
3. Run `npm run db:migrate`, `npm run db:seed`, and `npm run dev`.
4. View captured SMTP emails at `http://localhost:8025` (or `GET /api/dev/outbox` in non-production).

## Verification Commands

- `npm run lint` — ESLint (`eslint-config-next`)
- `npm run typecheck` — TypeScript (`tsc --noEmit`)
- `npm test` — Vitest integration tests against isolated `pglite://memory` (or `DATABASE_URL` if set to PostgreSQL)
- `npm run build` — Next.js production build
- `npm run test:e2e` — Playwright + `@axe-core/playwright` E2E journey & responsive viewport checks (`360px`, `768px`, `1440px`)

## Development Seed Accounts (Disabled in `NODE_ENV=production`)

- `owner@atolyekuzey.local` / `PusulaDemo!2026` (`Atölye Kuzey` owner, `Stüdyo Güney` viewer)
- `editor@atolyekuzey.local` / `PusulaDemo!2026` (`Atölye Kuzey` editor — create/edit only, delete returns `403`)
- `viewer@atolyekuzey.local` / `PusulaDemo!2026` (`Atölye Kuzey` viewer — read-only, writes return `403`)
- `owner@studyoguney.local` / `PusulaDemo!2026` (`Stüdyo Güney` owner)
