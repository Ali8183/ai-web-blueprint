# Privacy and Data Handling (`templates/fullstack/`)

> [!WARNING]
> **Not a Legal Compliance Guarantee:** This document describes the technical data inventory and retention defaults in the "Atölye Pusula" reference template (`templates/fullstack/`). Templates, schemas, and documentation do **not** guarantee compliance with GDPR, KVKK (Law No. 6698), CCPA, or sector regulations. Downstream operators must obtain legal review, publish tailored privacy notices, configure retention jobs, and execute Data Processing Agreements (DPAs) with subprocessors before serving real users.

## 1. Personal Data Collected by Default

The reference template collects only the minimum fields required for authenticated multi-organization project tracking:

| Category | Data Elements | Storage Location | Purpose |
| --- | --- | --- | --- |
| **Account Identity** | User `id`, display `name`, `email`, `emailVerified` status, `activeOrganizationId` | PostgreSQL `user` table | Account identification, workspace attribution, email verification |
| **Authentication Credentials** | Password hash (`account.password` managed by Better Auth `drizzleAdapter` — **never plaintext**) | PostgreSQL `account` table | Password login verification |
| **Session Metadata** | Opaque session `token`, `userId`, `ipAddress`, `userAgent`, `expiresAt` | PostgreSQL `session` table + `HttpOnly` `pusula` cookie | Authenticated session continuity and server-side revocation |
| **Verification & Reset Tokens** | Single-use SHA-256 `tokenHash`, `purpose` (`verify_email` / `reset_password`), `expiresAt`, `usedAt` | PostgreSQL `auth_token` table | Email verification and password reset flows |
| **Organization Membership** | `organizationId`, `userId`, `role` (`owner`, `editor`, `viewer`) | PostgreSQL `membership` table | Multi-tenant RBAC enforcement |
| **Workspace Content** | Organization `name`/`slug`/`studioCode`, Project `code`, `title`, `clientName`, `discipline`, `status`, `priority`, `budgetCents`, `dueDate`, `summary`, `version` | PostgreSQL `organization`, `project`, `idempotency_key` tables | Core application ledger functionality and idempotency |
| **Transactional Email Outbox** | Recipient email, `kind` (`verify_email` / `reset_password`), subject, body text, delivery `status`, `attempts`, `lastError` | PostgreSQL `email_outbox` table | Auditable delivery state and optional deferred retry queue (`processEmailOutboxRetries`) |
| **Rate-Limit Buckets** | Scoped bucket `key` (e.g., trusted proxy client IP + route scope), `count`, `resetAt` | PostgreSQL `rate_limit_bucket` table | Multi-instance auth brute-force throttling (`429`) |
| **Operational Logs** | `requestId`, HTTP method/path, status code, sanitized error codes | Application stdout logs | Diagnostics and incident correlation (**passwords, `smtpPass`, tokens, and cookies redacted**) |

### Data Explicitly Not Collected by Default
- Payment card numbers, billing addresses, or government ID numbers
- Geolocation, behavioral ad pixels, or third-party analytics scripts
- Uploaded user files or binary attachments

## 2. Retention and Deletion Lifecycle

- **Verification & Password Reset Tokens:** Expire automatically (30-minute TTL on password reset tokens) and are marked used or invalidated immediately upon redemption. Resetting a password revokes all active sessions for that user.
- **User Sessions:** Bound to explicit expiration timestamps; destroyed server-side upon `POST /api/auth/logout` and cleared from the client cookie.
- **Development Email Outbox (`.data/mailpit-outbox.json`):** Exists strictly in development/test mode so verification and password-reset flows can be tested offline without external mail servers. Never deploy `.data/` artifacts to production.
- **Production Account & Tenant Erasure (Downstream Responsibility):** The reference app keeps relational integrity via foreign keys and scoped delete routes (`owner` deleting projects). When operating a live service under GDPR/KVKK, operators should implement explicit user account erasure/anonymization, organization offboarding, and backup expiration windows matching their published privacy notice.

## 3. External Subprocessors & Email Delivery

- **Local Development & CI:** Email delivery targets local **Mailpit** (`templates/fullstack/docker-compose.yml`, SMTP port `1025`) or writes a local JSON dev outbox when SMTP is unavailable. Zero data leaves the host machine.
- **Production Requirement:** Production deployments must configure a real transactional SMTP/API provider (e.g., Postmark, Amazon SES, Resend, or an operator-managed SMTP relay) using TLS, SPF, DKIM, and DMARC. Any external email, database hosting, error-tracking, or CDN provider is a **subprocessor** that must be disclosed to end users and covered by an appropriate DPA.

## 4. Logging & Secret Redaction Controls

- Structured server logs attach a correlation `requestId` without logging request bodies containing `password`, `smtpPass`, `smtp_pass`, `token`, `cookie`, `authorization`, or `SESSION_SECRET`.
- API error responses return sanitized error codes (`401`, `403`, `400`, `409`, `429`) and **never** expose stack traces, SQL queries, or internal database paths to browsers.
