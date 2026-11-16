# Adapter: Cursor

- **Official Discovery Docs Verified:** `https://docs.cursor.com/context/rules` (reviewed 2026-11-16).
- **Testing Status:** **Hayır — yalnızca dosya üretimi ve şema/tutarlılık doğrulaması yapıldı.** Local Cursor IDE version and live rule attachment were not executed in this runtime.

## Discovery Paths & Scopes

Cursor discovers project rules under `.cursor/rules/*.mdc` (replacing the deprecated monolithic `.cursorrules` file) as well as root `AGENTS.md` where supported:

| File | Activation Mode | Frontmatter |
| :--- | :--- | :--- |
| `.cursor/rules/00-core-blueprint.mdc` | **Always Apply** (every chat/agent session) | `alwaysApply: true` |
| `.cursor/rules/10-security-and-db.mdc` | **Auto-Attached** to server, API, auth, DB, and migration files | `alwaysApply: false`, `globs: ["templates/fullstack/src/server/**", "templates/fullstack/src/app/api/**", "templates/fullstack/drizzle/**", "src/server/**", "src/app/api/**", "drizzle/**"]` |
| `.cursor/rules/20-ui-and-design.mdc` | **Auto-Attached** to React components, pages, and stylesheets | `alwaysApply: false`, `globs: ["**/*.tsx", "**/*.css", "templates/fullstack/src/app/**", "templates/fullstack/src/components/**"]` |

## Precedence & Best Practices

- Team/project rules in `.cursor/rules/*.mdc` combine with Cursor User Rules (and `AGENTS.md` if enabled).
- Keep each `.mdc` file short and modular (`< 500` lines; ours are thin pointers `< 45` lines) that route the agent to the canonical `standards/` file rather than duplicating rules inside `.cursor/rules/`.
- Note: `.cursor/rules/*.mdc` uses YAML frontmatter; exact behavior can depend on the user's installed Cursor IDE version (unverified locally here).
