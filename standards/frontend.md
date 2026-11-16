# Frontend Engineering Standard

Frontend code must prioritize server-first rendering, predictable URL state, accessible interaction patterns, and measurable Web Vitals discipline.

## 1. Next.js App Router: Server vs Client Boundaries

- **Default to Server Components:** Layouts, public pages, initial list/detail reads, and metadata belong in Server Components so secrets, DB queries, and heavy formatting stay off the client bundle.
- **Keep `"use client"` leaves small:** Push `"use client"` down to interactive islands (forms, filter bars, modal/drawer wrappers, organization switchers). Never wrap entire route trees in `"use client"` out of convenience.
- **Guard server boundaries:** Keep DB clients, crypto/session helpers, and environment secrets inside `src/server/` (using `server-only` where helpful) so bundling them into a Client Component fails at build time.

## 2. Data Fetching & Avoiding Waterfalls

- **Fetch in parallel on the server:** Use `Promise.all` for independent queries in Server Components and Route Handlers instead of sequential `await` chains.
- **Eliminate client mount waterfalls:** Never render an empty shell and chain `useEffect -> fetch('/api/me') -> fetch('/api/orgs') -> fetch('/api/projects')`. Resolve initial authenticated context and first-page data on the server or in one consolidated initial payload.
- **Explicit mutations:** Pair client mutations with clear pending states, disabled duplicate triggers, optimistic/rollback rules (only when reliable), and `router.refresh()` or deterministic state synchronization after server confirmation.

## 3. URL-Backed Filter, Search, Sort & Pagination

- Store list view state (`q`, `status`, `priority`, `sort`, `page`, `limit`) in URL search parameters (`useSearchParams` / Server Component `searchParams`), not ephemeral local state alone.
- Changing any filter or search term must reset `page` to `1` so users do not land on an empty out-of-range page.
- Support browser Back/Forward navigation and bookmarkable deep links cleanly.

## 4. Accessible Forms, Controls & Modal Focus Trapping

- **Forms:** Every input requires an explicit `<label htmlFor>`, meaningful `name` and `autoComplete` attributes, inline error messages linked via `aria-describedby` + `aria-invalid="true"`, and a live region (`role="alert"` or `aria-live="polite"`) for server errors/confirmations.
- **Buttons vs Links:** Use `<Link>`/`<a>` for navigation and `<button type="button|submit">` for actions. Never attach `onClick` handlers to clickable `<div>` or `<span>` elements.
- **Modals & Drawers:** When a dialog or slide-over drawer opens:
  1. Set `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
  2. Move initial focus inside the dialog (first focusable control or dialog heading/close button).
  3. Trap `Tab` and `Shift+Tab` inside the dialog while open.
  4. Close cleanly on `Escape` and backdrop click (unless blocked during active mutation).
  5. Restore focus to the triggering element when closed.

## 5. Image & Asset Optimization

- Always declare explicit dimensions (`width`/`height` or CSS `aspect-ratio`) on images and media containers to eliminate layout shifts.
- Provide accurate `sizes` on responsive images; reserve `priority` / `fetchPriority="high"` strictly for the single above-the-fold LCP image.
- Use meaningful descriptive `alt` text for informative images and `alt=""` for purely decorative visuals.

## 6. Core Web Vitals Budgets & Lab vs Field Distinction

Target these production Core Web Vitals budgets:

| Metric | Target | Primary Levers |
| :--- | :--- | :--- |
| **LCP** (Largest Contentful Paint) | `<= 2.5s` | Server-rendered HTML, self-hosted/preloaded fonts, no render-blocking scripts, fast LCP media |
| **INP** (Interaction to Next Paint) | `<= 200ms` | Small client JS bundles, minimal hydration cost, non-blocking event handlers, no main-thread stalls |
| **CLS** (Cumulative Layout Shift) | `<= 0.1` | Fixed dimensions on images/skeletons/headers, font fallback metrics (`font-display: swap`) |

**Reporting Honesty Rule:** Lab measurements (Lighthouse, Playwright traces, local synthetic runs) verify layout stability and load behavior under controlled conditions, **NOT real-world field INP**. Never present local lab timings as field CWV compliance; field compliance requires real-user telemetry (RUM / CrUX) across representative client hardware and networks.
