# Design Review Record — Atölye Pusula (Compass Ledger)

This document records the visual direction decision, CSS token system, asset/license inventory, UI state coverage, and responsive inspection log for `templates/fullstack/` against `standards/design-system.md`.

---

## 1. Domain Grounding & Audience

- **Users:** Architectural and structural engineering studio owners, project editors, and read-only viewers.
- **Primary Job:** Scan active project codes, client commissions, disciplines, statuses, priorities, integer-accurate fees (`tabular-nums`), and milestone dates cleanly without marketing noise or visual clutter.

---

## 2. Two Proposed Visual Directions

### Option A (Chosen): Swiss-Editorial Technical Studio Ledger
- **Typography Pairing:** Editorial serif display headlines (`--font-serif`: `"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif`) + clean neutral sans UI text (`--font-sans`: `"Inter", "Segoe UI", system-ui, sans-serif`) + tabular monospace codes/fees/dates (`--font-mono`: `"JetBrains Mono", "Cascadia Mono", Consolas, ui-monospace, monospace` with `font-variant-numeric: tabular-nums`).
- **Palette:** Warm stone paper (`#f6f4ef`), crisp white sheets (`#ffffff`), muted warm band (`#ede9df`), charcoal ink (`#141413`), warm muted ink (`#524f49`), structural hairline borders (`#d8d4ca` / `#8f897e`), oxidized vermilion primary accent (`#c84b31`), architectural forest slate (`#1e3a2f`).
- **Density & Layout:** Editorial specification header on `/` transitioning into a ruled ledger table (`lg:block`, `>= 1024px`) on desktop and structured vertical cards (`lg:hidden`, `< 1024px`) on mobile/tablet (`360px` / `768px`). Sharp architectural corners (`2px` / `4px` radius).
- **Motion Character:** Instant/crisp `140ms` (`cubic-bezier(0.2, 0, 0, 1)`) hover/button state changes with full `@media (prefers-reduced-motion: reduce)` reset.

### Option B (Rejected Alternative): Dense Monochrome CAD Sheet
- **Typography Pairing:** All-monospace headings, labels, and descriptions across every viewport.
- **Palette:** Cool drafting white (`#f8fafc`), deep navy ink (`#0f172a`), cobalt highlight (`#1d4ed8`), heavy `2px` outer grids.
- **Why Rejected:** All-monospace copy impairs readability of multi-sentence project summaries and client briefs, and tight 7-column CAD grids collapse awkwardly on `360px` mobile screens compared to Option A's editorial-to-tabular split.

---

## 3. Rationale for Chosen Direction

Option A balances calm architectural studio credibility on public routes (`/`, `/login`, `/register`) with crisp tabular scannability inside `/app` (`LedgerDashboard`). Avoiding purple gradients, floating glass blurs, and fabricated metrics reinforces trust for technical studios.

---

## 4. Explicit CSS Custom-Property Token System (`src/app/globals.css`)

| Token Group | Defined Tokens |
| --- | --- |
| **Backgrounds** | `--bg-paper: #f6f4ef`, `--bg-surface: #ffffff`, `--bg-band: #ede9df` |
| **Ink & Contrast** | `--ink-primary: #141413`, `--ink-muted: #524f49`, `--accent-ink: #ffffff` |
| **Borders** | `--border-subtle: #d8d4ca`, `--border-strong: #8f897e` |
| **Accents & Semantics** | `--accent: #c84b31`, `--accent-hover: #ad3d26`, `--accent-text: #9e3520`, `--forest: #1e3a2f`, `--forest-soft: #ebf2ee`, `--danger: #9e2a2b`, `--danger-soft: #fdf2f2`, `--warning: #7a4e0b`, `--warning-soft: #fdf6e9` |
| **Spacing Scale** | `--space-1` (`0.25rem`) through `--space-12` (`3rem`) |
| **Radii** | `--radius-none: 0px`, `--radius-sm: 2px`, `--radius-md: 4px` |
| **Typography & Motion** | `--font-serif`, `--font-sans`, `--font-mono`, `--duration-fast: 140ms`, `--ease-standard` |

---

## 5. Font, Icon & Asset License Log

| Asset | Source / Implementation | License | Usage Scope |
| --- | --- | --- | --- |
| **System Editorial, Sans & Mono Font Stacks** | OS/local font stack in `src/app/globals.css` (zero external font CDN requests) | Local system fonts (no third-party redistribution) | Headings, body UI copy, tabular ledger columns |
| **`lucide-react` (`^1.73.0`)** | npm package `lucide-react` (`ArrowRight`, `Lock`, `ShieldCheck`, `Check`, `Menu`, `X`, `Plus`, `Search`, `Pencil`, `Trash2`, `LogOut`, `RefreshCw`) | **ISC License** | UI action icons (`aria-hidden="true"` paired with visible text or `aria-label`) |
| **`BrandMark` Compass Crosshair SVG** | Inline SVG component in `src/components/SiteHeader.tsx` | **MIT** (original blueprint work) | Studio logo mark across public and authenticated headers |

---

## 6. Coverage of the 7 Mandatory UI States

| UI State | Implemented Behavior (`templates/fullstack/src/components/`) |
| --- | --- |
| **1. Loading** | `LedgerDashboard.tsx` renders an `aria-busy="true"` 3-row skeleton block preserving vertical bounds without layout jumps; buttons show submitting labels (`Signing out…`, pending state). |
| **2. Empty** | Distinct empty-state copy & CTA for filtered mismatch (`"No projects match your current filters"` + `Clear filters`) vs. empty workspace (`"This studio ledger has no projects yet"` + `Create first project` for write roles or role notice for `viewer`). |
| **3. Error** | `role="alert"` error banner with inline `Retry` button (`LedgerDashboard.tsx`) plus inline validation/API error alerts inside `ProjectModal`, `DeleteProjectModal`, and `AuthFormShell` preserving entered values. |
| **4. Success** | `role="status"` `aria-live="polite"` forest-styled confirmation banners on project create/update/delete, studio workspace switch, and email verification. |
| **5. Disabled** | `:disabled` styles (`opacity: 0.5; cursor: not-allowed`) plus role explanation banner and button `title` tooltips when `viewer` cannot create/edit/delete or `editor` cannot delete. |
| **6. Focus-Visible** | Global `:focus-visible { outline: 2px solid var(--ink-primary); outline-offset: 2px; }`, `.skip-link` to `#main-content`, and `useFocusTrap` trapping `Tab` inside `ProjectModal`/`DeleteProjectModal` and restoring focus on `Escape`. |
| **7. Long Content** | `min-w-0`, `break-words`, `max-w-xs`, `line-clamp-2` on titles/clients/summaries, `overflow-x: clip` on `html, body`, and separate mobile/tablet stacked card layout below `1024px` (`lg:hidden`). |

---

## 7. Responsive Screenshot & Accessibility Inspection Log

> [!IMPORTANT]
> **Automated `axe-core` Is Not Full WCAG 2.2 AA Conformance:** Automated `@axe-core/playwright` scans catch common structural/contrast/ARIA defects, but do **not** verify logical reading order, 200%/400% zoom reflow, subtle color-contrast edge cases in hover/disabled states, or real screen-reader announcements.

| Viewport / Check | Target Output Path | Status | Verifier & Visual Inspection Notes (`2026-11-16`) |
| --- | --- | --- | --- |
| **Public Landing `/` (`360x800`)** | `docs/screenshots/home-360x800.png` (`110,139 B`) | **VERIFIED** | Clean vertical stack, mobile `Menu` button, `Sheet 01` spec table wraps cleanly, 4-column role matrix fits `360px` with `0` horizontal overflow; high contrast, zero purple gradients, glassmorphism, or fake testimonials. |
| **Public Landing `/` (`768x1024`)** | `docs/screenshots/home-768x1024.png` (`121,396 B`) | **VERIFIED** | Full single-row navigation header, balanced 3-column feature cards (`01`, `02`, `03`), clean role matrix with zero clipping. |
| **Public Landing `/` (`1440x900`)** | `docs/screenshots/home-1440x900.png` (`122,044 B`) | **VERIFIED** | 8/4 hero + `Sheet 01` spec card layout, 3-column feature row, full-width role matrix; clear Swiss-editorial hierarchy. |
| **Studio Ledger `/app` (`360x800`)** | `docs/screenshots/ledger-360x800.png` (`47,324 B`) | **VERIFIED** | Stacked header (org switcher, `ROLE: OWNER`, `Sign out`), vertical filter panel, mobile card stack (`AM-301 · v2`, `AM-302 · v1`), tabular `$245,000`, right-aligned `Edit`/`Delete`, pagination bar; `0` horizontal overflow. |
| **Studio Ledger `/app` (`768x1024`)** | `docs/screenshots/ledger-768x1024.png` (`49,056 B`) | **VERIFIED** | Single-row header (`Atölye Pusula / ATL`), 2x2 filter grid, `< 1024px` (`lg:hidden`) card stack, clean pagination bar. |
| **Studio Ledger `/app` (`1440x900`)** | `docs/screenshots/ledger-1440x900.png` (`56,918 B`) | **VERIFIED** | 4-column filter bar, 7-column tabular ledger (`lg:block`) with `tabular-nums`, crisp `1px` borders, zero text/badge clipping. |
| **Keyboard, Focus & Manual Accessibility Audit** | `/`, `/login`, `/register`, `/app` | **PARTIAL (Automated E2E Verified / Manual Gaps Noted)** | Playwright E2E verified `0` `@axe-core/playwright` violations on `/` and `/app`, `Enter` opens `New project` dialog, `14` `Tab` presses stay trapped inside `[role="dialog"]`, `Escape` closes modal and restores focus to `New project`; `:focus-visible` (`2px solid #141413`) and `.skip-link` confirmed in `globals.css`. **Not run locally:** real screen-reader announcement testing, manual 200%/400% zoom reflow inspection, and throttled slow-network visual verification. |
