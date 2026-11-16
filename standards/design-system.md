# Design System & Anti-AI-Slop Standard

Visual design must grow from the product's domain, audience, and workflow—not from generic AI templates. Every visual choice must be deliberate, inspectable, and accessible.

## 1. Mandatory Anti-AI-Slop Workflow

Complete steps 1–3 before building UI components, and complete steps 4–7 before marking UI work done:

1. **Ground in audience, content, and job:** Identify what the user actually reads, compares, or edits on each screen (e.g., an editorial portfolio relies on photography scale and calm captions; a studio project ledger relies on high-contrast status scanning, tabular numerals, and compact row density).
2. **Propose 2 distinct visual directions:** Write down two genuinely different design options specifying for each:
   - Typography pairing (display/heading, body, monospace)
   - Surface and accent color palette
   - Information density and spacing rhythm
   - Layout structure and navigation chrome
   - Motion character (crisp instant state changes vs measured editorial transitions)
3. **Justify the chosen direction:** Record in `project/brief.md` or `docs/design-review.md` why the chosen direction fits the domain better than the alternative.
4. **Define CSS custom-property tokens:** Encode the chosen system in `globals.css` / theme CSS custom properties covering:
   - Color tokens (`--bg-paper`, `--bg-surface`, `--ink-primary`, `--ink-muted`, `--border-subtle`, `--accent`, `--danger`, `--success`, etc.)
   - Spacing scale (`--space-1` .. `--space-12`)
   - Type scale and line-heights (including `font-variant-numeric: tabular-nums` for IDs, dates, counts, and currency)
   - Border widths & crisp hairlines (`1px solid var(--border-subtle)`)
   - Radius scale (deliberate square/sharp vs rounded hierarchy, never uniform `rounded-2xl` everywhere)
   - Motion durations/easings with `@media (prefers-reduced-motion: reduce)` resets.
5. **Adapt accessible primitives visually:** Build dialogs, drawers, dropdowns, tabs, and form controls on accessible primitive semantics (proper roles, keyboard focus trapping, ARIA attributes) styled exclusively through your design tokens.
6. **Audit all 7 UI states & responsive interactions:** Verify every core view across all 7 states and interactive mobile flows before review.
7. **Inspect rendered screenshots:** Capture and inspect real browser screenshots at **`360px`**, **`768px`**, and **`1440px`**.

## 2. Forbidden AI-Slop Patterns

Reject the following defaults unless explicitly justified by an established brand identity:

- **Automatic purple/violet/indigo gradients**, glowing neon accents on dark `#0f172a` backgrounds, or gratuitous glassmorphism (`backdrop-filter: blur` stacked over colorful blobs).
- **Cookie-cutter SaaS layout formula:** `Centered Gradient Hero -> 3 Equal Feature Cards with Lucide Icons -> 3-Column Pricing Table -> Accordion FAQ`.
- **Unmotivated bento grids** used to disguise thin content.
- **Fabricated content:** Fake customer testimonials, invented client logos, made-up statistics ("Trusted by 12,000+ studios", "99.99% uptime"), placeholder Lorem Ipsum, or self-referential AI meta-text ("Crafted with modern intelligence", "Elevate your workflow").

## 3. Asset, Font & Icon Licensing

Log every third-party font, icon library, illustration, and media asset before release in `docs/design-review.md` or `project/brief.md`:
- Record **Asset Name**, **Source / Package**, **License** (e.g., SIL OFL 1.1, MIT, CC0, original work), and **Scope**.
- Prefer self-hosted or `@fontsource` / `next/font` typography with proper licensing; avoid hotlinking unverified external assets.

## 4. The 7 Mandatory UI States

Every interactive screen, list, form, and modal must explicitly design and handle:

1. **Loading:** Non-shifting skeleton or subtle inline status preserving layout bounds (`CLS <= 0.1`).
2. **Empty:** Clear explanation of why nothing is shown (new org vs active filter mismatch) plus one concrete next action.
3. **Error:** Plain-language actionable error recovery (retry button, preserved user inputs) without raw stack traces.
4. **Success:** Visible confirmation (`role="status"` / `aria-live="polite"`) after create, update, delete, or verification actions.
5. **Disabled:** Distinct contrast/cursor treatment plus clear reason or permission state (e.g., viewer role read-only notice).
6. **Focus-Visible:** Unmistakable high-contrast `:focus-visible` outline (`>= 2px`, offset) on every interactive element, never suppressed with `outline: none` without replacement.
7. **Long Content:** Graceful wrapping/truncation for 100+ character titles, narrow table cells, long emails, and multi-line descriptions without breaking cards or causing horizontal scroll.

## 5. Responsive, Interactive & Accessibility Verification

- **Interactive checks:** Test mobile drawer/menu toggle, form validation/error announcements, table/ledger behavior on narrow viewports, modal/drawer keyboard Escape & Tab wrap, and throttled slow-network feedback.
- **Viewport screenshots:** Inspect rendered screenshots at `360px`, `768px`, and `1440px` for overlap, clipped controls, broken contrast, or horizontal overflow.
- **WCAG 2.2 AA target:** Meet text contrast (`>= 4.5:1` normal, `>= 3:1` large text and active UI borders/focus indicators), keyboard-only operability, and generous hit targets (`>= 24x24px` minimum, `40–44px` preferred for primary controls).
- **Truthfulness on automated tools:** Explicitly state in reviews that automated `axe-core` scans catch common structural issues (missing labels, contrast failures, landmark errors) and **are NOT equivalent to full WCAG 2.2 AA conformance**—manual keyboard, reflow (`320px`/zoom), focus-order, and screen-reader state checks remain mandatory.
