# Database & Multi-Tenant Data Standard

Relational integrity, tenant isolation, and safe schema evolution must be enforced in the database schema and data-access layer—not left to UI assumptions.

## 1. Relational Ownership, Lifecycle & Delete Rules

- Model explicit ownership (`organizationId` -> `organizations.id`, `createdById` -> `users.id`) with foreign keys.
- Choose `ON DELETE` actions intentionally:
  - `CASCADE` only for pure owned sub-records/join rows (e.g., `sessions.userId`, `memberships.organizationId`).
  - `RESTRICT` or `SET NULL` where deletion would erase audit trails or shared financial/operational history.
- Prefer explicit status transitions or `archivedAt` timestamps over irreversible hard deletes when historical traceability is required.

## 2. Schema Constraints & Data Types

- **Constraints:** Enforce `PRIMARY KEY`, `FOREIGN KEY`, `NOT NULL`, `UNIQUE`, and `CHECK` constraints in SQL migrations—never rely on application validation alone.
- **Money & precise decimals:** Use `NUMERIC(12, 2)` / `DECIMAL` or integer minor units (`amountCents INTEGER`). **Never store money in `FLOAT`, `REAL`, or `DOUBLE PRECISION`.**
- **Timestamps & timezones:** Store all timestamps in **UTC `TIMESTAMPTZ`**. For scheduling/booking domains, store the venue or user's IANA timezone string (e.g. `Europe/Istanbul`) alongside UTC instants and convert only at business-boundary/UI formatting layers.

## 3. Query-Driven Indexes, N+1 Prevention & Deterministic Pagination

- Create composite indexes matching real query filters and sort order, starting with tenant scope: e.g. `INDEX (organization_id, status, updated_at DESC, id ASC)`.
- Eliminate N+1 queries by loading related entities via SQL joins or batched `inArray(...)` queries instead of issuing per-row queries inside loops.
- Every paginated query must specify a deterministic total order ending in a unique column (`ORDER BY updated_at DESC, id ASC`) so rows never duplicate or vanish across pages during concurrent writes.

## 4. Transactions & Atomic Invariants

Wrap every multi-step state change in a single database transaction (`db.transaction(...)`), including:
- User registration + initial organization creation + `owner` membership assignment.
- Password reset confirmation + marking reset token used + revoking all active user sessions.
- Reservation/slot capacity check + insert (paired with a DB `UNIQUE` or `EXCLUDE` constraint so concurrent requests cannot double-book).

## 5. Mandatory Tenant Scoping & Cross-Tenant Attachment Prevention

- Every query reading, updating, or deleting tenant-owned data must filter by the verified session's `organizationId` (e.g. `and(eq(projects.id, id), eq(projects.organizationId, ctx.organizationId))`).
- **Prevent cross-tenant FK attachment:** Whenever a record in Organization A references a parent/member/category ID, verify in the same transaction (or via composite FK `(target_id, organization_id)`) that the referenced entity also belongs to Organization A. Never permit attaching Org B's IDs to Org A's records.

## 6. RLS vs App-Layer Enforcement

- **App-layer tenant enforcement (baseline in reference template):** Every tenant query passes through tenant-scoped service/repository functions that inject `organizationId` from verified server session context, verified by negative cross-tenant tests.
- **PostgreSQL Row-Level Security (RLS) (recommended defense-in-depth for shared multi-tenant production clusters):**
  - Enable `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` with policies checking `current_setting('app.current_org_id', true)::uuid`.
  - Set `SET LOCAL app.current_org_id = ...` per transaction on pooled connections (never `SET` globally across a shared pool).
  - Run the runtime app under a non-owner DB role without `BYPASSRLS` (table owners bypass RLS unless `FORCE ROW LEVEL SECURITY` is set and superuser/bypass attributes are absent).

## 7. Migrations, Expand-Contract & Least-Privilege Roles

- **Versioned migrations only:** All schema changes must live as reviewed SQL files in `drizzle/`. **Never run `drizzle-kit push`, `db reset`, or ad-hoc manual DDL against staging or production.**
- **Expand-contract for destructive changes:** To rename or remove a column/table in production without downtime:
  1. **Expand:** Add new nullable column/table; deploy code writing both old and new.
  2. **Backfill:** Migrate historical rows in bounded batches.
  3. **Switch:** Read from new column/table; verify stability.
  4. **Contract:** Drop old column/table in a separate subsequent migration once old app instances are retired.
- **Separated DB privileges:** Separate the **migrator role** (used only during deploy migrations; holds `CREATE`/`ALTER`) from the **runtime app role** (least-privilege `SELECT`, `INSERT`, `UPDATE`, `DELETE` only—no DDL).

## 8. Connection Pooling, Cache Invalidation & Backups

- Bound pool `max` connections explicitly (e.g. `max: 10` per Node process) sized against total PostgreSQL `max_connections` and replica count.
- Any in-memory or distributed cache keys must include `organizationId` and invalidate atomically on mutation; never serve cached Org A data to Org B.
- **Backup & restore drills:** Automated snapshots are not verified backups. Periodically run and log a restore drill into an isolated database, verifying schema integrity, row counts, and app smoke checks.
