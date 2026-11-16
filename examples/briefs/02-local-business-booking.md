# Example Brief 02: Local Business Appointment Booking (Kuzey Berber & Grooming Studio)

> Reference example demonstrating a domain-heavy **full-stack transactional app**: IANA timezone handling + UTC storage, atomic double-booking prevention, and explicit cancellation cutoff rules.

## 1. Selected Profile

- **Profile:** `fullstack-web-app` ([presets/fullstack-web-app.md](../../presets/fullstack-web-app.md))
- **Rationale:** Real-time slot availability, customer cancellations, staff schedule management, and concurrency-safe booking invariants require PostgreSQL transactions, `UNIQUE`/`EXCLUDE` constraints, and server-side RBAC.

## 2. The 7 Requirement Dimensions

1. **Users & Core Job:**
   - **Customer:** Book an available grooming slot in under 60 seconds, receive confirmation, and reschedule/cancel before cutoff.
   - **Staff / Studio Owner:** Manage services, daily working hours, blocked time-offs, and walk-in/online appointments.
2. **Pages, Roles & Critical Flows:**
   - Public: `/` (Studio info, service duration/pricing list, location/hours), `/book` (Service -> Barber -> Date/Slot -> Confirm), `/booking/[token]` (View/Cancel via signed unguessable cancellation token or customer account).
   - Authenticated Staff/Admin: `/login`, `/app/schedule` (Calendar/day agenda, mark completed/no-show, block slots), `/app/services` (Owner only).
   - Roles: `customer` (public/token or self-service), `staff` (manage own schedule & check-in), `owner` (manage all barbers, services, pricing, policies).
3. **Data Model & Sensitive PII:**
   - Entities: `studios` (stores `ianaTimezone`, e.g. `Europe/Istanbul`), `services` (`durationMinutes`, `priceCents INTEGER`—never float!), `staffMembers`, `availabilityRules`, `bookings` (`startsAtUtc TIMESTAMPTZ`, `endsAtUtc TIMESTAMPTZ`, `status`, `cancellationCutoffUtc TIMESTAMPTZ`).
   - PII: Customer name, email, phone number (`bookings`), and staff email + credential digest. Inactive booking contact details are anonymized or purged after 18 months (`[ASSUMPTION]`).
4. **Integrations & Multi-Tenancy:** Single-studio or multi-branch (`studioId` scope on all staff/booking queries); transactional email confirmations/cancellations via Mailpit (dev) / SMTP (prod). **Out of scope in v1:** online card payments (pay-in-person at studio; triggers payment checklist if added later).
5. **Budget, Traffic & Hosting:** Containerized Node.js + Managed PostgreSQL, ~500 daily slot lookups, ~80 bookings/day.
6. **Language, Brand & Accessibility:** Turkish primary (`Europe/Istanbul`), warm utilitarian barbershop ledger aesthetic, WCAG 2.2 AA (`aria-live` announcements when slots update).
7. **Explicit Non-Goals:**
   - **No** Stripe/iyzico online prepayment in v1
   - **No** SMS gateway in v1 (email only)
   - **No** native mobile app

## 3. Critical Technical Invariants (Timezone, Double-Booking & Cutoff)

- **IANA Timezone + UTC Storage (`standards/database.md`):**
  - Store `studios.timezone = 'Europe/Istanbul'` (validated IANA string).
  - Compute slot boundaries in the studio's IANA zone (handling DST transitions cleanly via `Intl` / `luxon` / `Temporal` helper), then persist `starts_at_utc` and `ends_at_utc` as PostgreSQL `TIMESTAMPTZ` in UTC.
- **Double-Booking Prevention (Database + Transaction):**
  - Wrap booking creation in `db.transaction(...)`: lock staff availability / check overlapping active bookings (`status IN ('confirmed', 'checked_in')`), **AND** enforce a PostgreSQL `EXCLUDE USING gist (staff_id WITH =, tstzrange(starts_at_utc, ends_at_utc, '[)') WITH &&) WHERE (status IN ('confirmed', 'checked_in'))` constraint (requiring `btree_gist` extension) so two concurrent requests for the same barber and overlapping minute range can **never** both succeed.
  - Map constraint violation (`23P01`) cleanly to HTTP `409 SLOT_ALREADY_BOOKED`.
- **Cancellation Cutoff Rule:**
  - Customer self-cancellation succeeds ONLY if `nowUtc <= startsAtUtc - interval '4 hours'`; later requests return `409 CANCELLATION_CUTOFF_PASSED` and instruct the customer to call the studio directly (while `owner`/`staff` retain override capability with audit logging).

## 4. Requirements (`REQ-XXX`) & Verification

| REQ-ID | Requirement | Key Implementation | Verification |
| :--- | :--- | :--- | :--- |
| `REQ-001` | Prices stored in integer minor units (`priceCents`), never float | `services` schema `INTEGER CHECK (price_cents >= 0)` | Schema + validation tests |
| `REQ-002` | Studio IANA timezone converted accurately to UTC `TIMESTAMPTZ` | `src/server/time/slots.ts` | Unit tests across midnight & DST boundaries |
| `REQ-003` | Concurrent requests for same staff/slot never double-book | DB `EXCLUDE` constraint + `POST /api/bookings` transaction | `Promise.all` concurrent booking test (1 succeeds `201`, 1 fails `409`) |
| `REQ-004` | Customer cancel blocked within 4h cutoff (`409`); staff/owner audit-logged | `src/server/services/booking-service.ts` | Negative cutoff boundary test (3h59m fails, 4h01m passes) |
| `REQ-005` | Staff role cannot modify studio pricing/services (`403`) | `POST/PATCH /api/services` RBAC guard | Negative RBAC matrix test |
