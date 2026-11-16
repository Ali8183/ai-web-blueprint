# Preset: Static & Editorial Site

> [!IMPORTANT]
> **Guidance & Design Profile Only:** This preset is **not** an auto-scaffolding code generator profile (unlike `scripts/create-project.mjs` which scaffolds `templates/fullstack/`). Use this profile as an architectural and design contract when building marketing pages, portfolios, studio showcases, or documentation sites.

## 1. When to Choose This Profile

- Portfolios, architectural/creative studios, local business info sites, event pages, or static product documentation.
- Content changes through code/Markdown/CMS builds rather than user logins or relational writes.
- Contact needs can be handled by a static mailto/phone link or a standalone form endpoint (never building a custom auth/admin database just for a contact form).

## 2. Stack & Hard Constraints

- **Allowed Stack:** Next.js static export (`output: "export"`), Astro, or clean semantic HTML/CSS/TypeScript deployed to static CDN/object storage.
- **Forbidden Complexity:**
  - **No** database, ORM (`drizzle-orm`, `prisma`), or migration pipeline.
  - **No** authentication, user accounts, sessions, cookies, or admin dashboards (per `standards/product-discovery.md`).
  - **No** Redis, queues, or container orchestration.
- **Contact/Inquiry Boundary:** If an interactive inquiry form is required without building a backend, use an explicit third-party form handler or single serverless validation endpoint with spam/rate limiting and no database persistence—never introduce an entire auth stack just to store contact messages.

## 3. Mandatory Design & Content Rules

Follow `standards/design-system.md`:
1. Propose **2 distinct visual directions** grounded in the subject matter (e.g., high-margin gallery catalog vs typographic print zine) and document why one fits best.
2. Define semantic CSS custom-property tokens (paper/surface, ink, muted, border, accent, spacing, display/body/mono type scales).
3. Reject cookie-cutter `Hero + 3 Icon Cards + Pricing + FAQ` layouts, neon dark-mode templates, and purple gradients.
4. Use real or explicitly licensed imagery/fonts and log every source and license (`OFL-1.1`, `CC0`, photographer copyright) in the project brief/design review.
5. Verify responsive presentation and typography at `360px`, `768px`, and `1440px`, plus keyboard navigation, contrast, and focus-visible indicators.

## 4. Verification Checklist

- Semantic HTML5 landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`), single `<h1>` per page, valid heading hierarchy.
- Canonical URL, unique page `<title>` & `<meta name="description">`, `robots.txt`, and `sitemap.xml`.
- Explicit `width`/`height` or `aspect-ratio` on all images (`CLS <= 0.1`), `LCP <= 2.5s`.
- Zero console errors, zero broken asset links, and accessibility audit (`axe-core` + manual keyboard/zoom review).
