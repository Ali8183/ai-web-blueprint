# Backend & API Engineering Standard

All backend endpoints and server actions must follow strict layering, server-side trust boundaries, deterministic validation, and resilience rules.

## 1. Three-Layer Architecture

Separate server logic into three clear layers under `src/server/`:

1. **Transport Layer (`src/app/api/**/route.ts`, Server Actions):**
   - Parse request headers, cookies, path params, query params, and JSON body.
   - Enforce CSRF Origin checks on cookie-authenticated mutating methods (`POST`, `PATCH`, `PUT`, `DELETE`).
   - Resolve authenticated session context (`401` if missing/invalid).
   - Validate inputs with Zod (`400` on schema violations).
   - Call the Service layer and translate domain results/errors into HTTP status codes and headers.
2. **Service / Domain Layer (`src/server/services/`):**
   - Enforce business invariants, RBAC permissions (`403` when insufficient), tenant ownership, idempotency, state transitions, and DB transactions.
   - Emit structured security/audit log events without leaking secrets.
   - Return explicit DTOs—never raw database entity rows with sensitive fields.
3. **Data Access Layer (`src/server/db/`):**
   - Execute parameterized Drizzle queries scoped explicitly to `organizationId` / `userId` where required.
   - Contain zero HTTP or cookie knowledge.

## 2. Server-Side Authorization & Validation

- **Zero client trust:** Never read `userId`, `organizationId`, `tenantId`, or `role` from request bodies to override session context or bypass membership checks.
- **Reject mass assignment:** Use strict `.strict()` Zod schemas or explicit field allowlists on `POST`/`PATCH` payloads so unexpected privilege fields (`role`, `ownerId`, `organizationId`, `isVerified`) trigger `400 VALIDATION_ERROR` or are explicitly rejected.
- **Consistent auth errors:** Login and password-reset endpoints must return identical generic responses for unknown emails and wrong passwords to avoid account enumeration.

## 3. Explicit DTOs & Output Filtering

- Map every returned record through an explicit serializer/projection function (`toProjectDto`, `toUserDto`).
- Never return `passwordHash`, `tokenHash`, `sessionSecret`, internal tokens, or unredacted ORM relations.

## 4. Validated & Bounded List, Sort, Filter & Pagination Params

Every list endpoint must parse and clamp query parameters strictly:
- `page`: positive integer (`>= 1`, default `1`, capped to reasonable bounds).
- `limit`: positive integer (`1 <= limit <= 50`, default `20`; reject `> 50` or `<= 0` with `400`).
- `q`: trimmed string with maximum length (e.g. `<= 100` chars).
- `status`, `priority`: validated against explicit domain enums.
- `sort`: allowlisted enum mapped in code to safe column references (never interpolated into SQL), always paired with a deterministic tie-breaker (`id ASC`).

## 5. Consistent Error Codes & Safe Responses

Return consistent structured JSON errors with correlation `requestId`:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to delete projects in this workspace.",
    "requestId": "req_01J..."
  }
}
```

- Standard codes: `BAD_REQUEST` / `VALIDATION_ERROR` (`400`), `UNAUTHORIZED` (`401`), `FORBIDDEN` (`403`), `CSRF_ORIGIN_MISMATCH` (`403`), `NOT_FOUND` (`404`), `CONFLICT` (`409`), `RATE_LIMITED` (`429` + `Retry-After`), `INTERNAL_ERROR` (`500`).
- **Never expose** stack traces, SQL queries, constraint internals, file paths, or environment variables in API responses.

## 6. Timeouts, Bounded Retries & Idempotency

- **Outbound calls:** Every external HTTP/SMTP call must set an explicit timeout (`AbortSignal.timeout(5000)` or SMTP socket timeout) and handle failures gracefully.
- **Bounded retries:** Retry at most 1–2 times with jitter ONLY for transient network errors on idempotent `GET` requests or operations backed by a server-verified `Idempotency-Key`. Never auto-retry non-idempotent mutations blindly.
- **Double-submit & concurrency safety:**
  - Support `Idempotency-Key` headers (or unique composite constraints such as `(organizationId, code)`) on create endpoints so rapid double-clicks do not create duplicate rows.
  - Enforce optimistic concurrency (`version` integer check on `PATCH`, returning `409 CONFLICT` on stale writes) for concurrent edits.
  - Cover both double-submit and conflicting-update cases with automated concurrency tests.

## 7. Email & Local Outbox Pattern

- In development and tests, dispatch verification and password-reset messages through Mailpit SMTP (when `SMTP_HOST` is configured and reachable) and/or a local JSON outbox (`.data/mailpit-outbox.json`) inspectable via `/api/dev/outbox` ONLY when `NODE_ENV !== "production"`.
- In production (`NODE_ENV === "production"`), `/api/dev/outbox` must strictly return `404` and never expose verification/reset tokens over HTTP.
- Never log raw verification/reset tokens or pretend an email was delivered in production when SMTP is unconfigured.
