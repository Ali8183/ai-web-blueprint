# Example Brief 01: Photographer Portfolio (Selin Kaya Architectural & Editorial Photography)

> Reference example demonstrating **scope discipline**: a portfolio showcase uses `presets/static-site.md` and explicitly forbids unnecessary databases, auth, or admin dashboards.

## 1. Selected Profile

- **Profile:** `static-site` ([presets/static-site.md](../../presets/static-site.md))
- **Rationale:** Pure editorial showcase for client commissions and exhibition history. Zero user accounts, zero shopping cart, zero dynamic booking persistence needed in v1.

## 2. The 7 Requirement Dimensions

1. **Users & Core Job:** Art directors, architectural firms, and magazine editors reviewing Selin Kaya's portfolio to assess visual style and commission an assignment.
2. **Pages, Roles & Critical Flows:**
   - `/` (Selected series index & studio statement)
   - `/series/[slug]` (Full photographic series with project notes, camera/location metadata, and sequential plate view)
   - `/about` (Biography, exhibition timeline, client archive, direct email/agent contact)
   - Roles: Public visitor only (no login/admin role).
3. **Data Model & Sensitive PII:** Static TypeScript/MDX portfolio metadata stored in Git. Zero PII stored on any server; contact runs via direct email link (`mailto:`) and studio phone.
4. **Integrations & Multi-Tenancy:** None. Zero database, zero auth, zero payment gateway, zero uploads.
5. **Budget, Traffic & Hosting:** Low-cost static CDN deployment (e.g. Cloudflare Pages / Netlify / static bucket), expected < 10k monthly visits, zero DB maintenance burden.
6. **Language, Brand & Accessibility:** Bilingual TR/EN toggle or primary English with Turkish exhibition captions (`[ASSUMPTION: English primary with Turkish studio titles]`), calm museum-monograph tone, WCAG 2.2 AA compliance.
7. **Explicit Non-Goals:**
   - **No** CMS login or custom admin panel (`standards/product-discovery.md` static rule)
   - **No** print e-commerce checkout in v1
   - **No** lightbox libraries that trap mobile pinch-zoom or break `Escape`/keyboard focus

## 3. Visual Design Direction (`standards/design-system.md`)

- **Option A — Dark Gallery Void:** Near-black `#0E0E0E` background, large full-bleed fade transitions, floating captions. *Rejected:* Feels heavy for daylight architectural photography and risks muted caption contrast.
- **Option B — Daylight Monograph Print (Chosen):** Warm archival paper (`#F5F2EB`), deep charcoal ink (`#181816`), subtle gallery border (`#DCD6CA`), paired with editorial serif headings (`Instrument Serif` / `Newsreader`) and crisp grotesque captions (`Plus Jakarta Sans`) + tabular plate numbers (`IBM Plex Mono`).
- **Justification:** Daylight archival paper mirrors architectural print monographs, preserves accurate tonal perception of natural-light photography, and avoids dark-mode AI portfolio clichés.

### Image & Asset Licensing Log
| Asset / Font | Source | License | Usage |
| :--- | :--- | :--- | :--- |
| Portfolio photographs | Selin Kaya original work (placeholder/sample shots documented before prod) | All Rights Reserved (Client-owned) | Series plates |
| `Newsreader`, `Plus Jakarta Sans`, `IBM Plex Mono` | `@fontsource` / Google Fonts self-hosted | SIL Open Font License 1.1 | Editorial typography |
| Arrow/Close UI glyphs | Custom inline SVG (3 primitives) | MIT / Project-original | Navigation & plate controls |

## 4. Requirements (`REQ-XXX`) & Traceability

| REQ-ID | Requirement | Target Implementation | Verification |
| :--- | :--- | :--- | :--- |
| `REQ-001` | Index shows curated series with zero fake testimonials/metrics | `src/app/page.tsx`, `src/content/series.ts` | Content & code audit |
| `REQ-002` | Series detail displays full plate sequence with explicit aspect ratios (`CLS <= 0.1`) | `src/app/series/[slug]/page.tsx` | Playwright CLS/layout check |
| `REQ-003` | Static export builds cleanly with zero DB/auth dependencies | `next.config.ts` (`output: "export"`) | `npm run build` output check |
| `REQ-004` | Keyboard-operable navigation & plate modal/view + `360/768/1440` screenshot review | `src/components/PlateViewer.tsx` | Playwright + `axe` + visual screenshots |
