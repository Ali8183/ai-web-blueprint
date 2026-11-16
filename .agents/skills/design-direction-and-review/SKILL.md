---
name: design-direction-and-review
description: >-
  Use this skill before building UI components and after capturing Playwright screenshots
  at 360px, 768px, and 1440px to enforce anti-AI-slop design directions, CSS custom-property
  tokens, all 7 UI states, font/asset license logging, and WCAG 2.2 AA accessibility review.
---

# Design Direction and Review

## Trigger Purpose
Activate before writing pages, layouts, or styles—and again during visual/accessibility verification—so interfaces are intentionally designed around the domain rather than defaulting to generic AI gradients, glassmorphism, or fabricated marketing copy.

## Inputs
- Target `project/brief.md` (audience, domain, locale, brand references)
- Design & frontend rules: [standards/design-system.md](../../../standards/design-system.md), [standards/frontend.md](../../../standards/frontend.md)
- Existing design tokens/stylesheets (e.g. `src/app/globals.css`) and captured screenshots (`360px`, `768px`, `1440px`)

## Steps
1. Ground the aesthetic in the actual audience, content hierarchy, and primary workflow.
2. Propose **2 distinct visual directions** covering typography pairing, surface/accent palette, information density, layout chrome, and motion character; select one and document the justification in `project/brief.md` or `docs/design-review.md`.
3. Reject cliché AI defaults (purple/neon gradients, gratuitous glassmorphism, unmotivated bento grids, `Hero + 3 Cards + Pricing + FAQ` boilerplate) and forbid fake testimonials, invented logos, fabricated uptime/customer stats, and AI meta-text.
4. Define CSS custom-property tokens (`globals.css`) for colors, spacing scale, type scale (with tabular numerals for numbers/IDs), borders, radii, and reduced-motion overrides, and style accessible primitives cleanly.
5. Log every font, icon library, and image asset with its source and license (e.g., SIL OFL 1.1, MIT, original/owned).
6. Verify every view handles all **7 mandatory UI states**: `loading`, `empty`, `error`, `success`, `disabled`, `focus-visible`, and `long content` (100+ char titles/cells).
7. Run interactive & responsive checks: mobile navigation menu, form validation/live error announcements, table/ledger behavior on narrow viewports, modal/drawer keyboard Escape & Tab wrap, slow-network states, `@axe-core/playwright`, and visual inspection of real screenshots at **`360px`**, **`768px`**, and **`1440px`**.

## Outputs
- Documented 2-option comparison, chosen direction justification, and asset/font license log
- Tokenized stylesheet (`globals.css`) and accessible UI components covering all 7 states
- Screenshot inspection notes for `360px`, `768px`, and `1440px` + accessibility review notes

## Verification Method
- Inspect the rendered `360px`, `768px`, and `1440px` PNG screenshots directly for overflow, contrast, wrapping, and visual cohesion.
- Run Playwright + `@axe-core/playwright` and keyboard-only Tab/Shift+Tab/Escape checks on forms and modals.
- State explicitly in the review report that automated `axe-core` checks do **not** constitute full WCAG 2.2 AA conformance; list any remaining manual screen-reader/reflow checks clearly.
