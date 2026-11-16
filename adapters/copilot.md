# Adapter: GitHub Copilot

- **Official Discovery Docs Verified:** `https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot` (reviewed 2026-11-16).
- **Testing Status:** **Hayır — yalnızca dosya üretimi ve şema/tutarlılık doğrulaması yapıldı.** VS Code / JetBrains / GitHub.com Copilot extension versions and runtime injection were not executed in this runtime.

## Discovery Paths & Scopes

1. **Repository-Wide Instructions:** `.github/copilot-instructions.md`
   - Plain Markdown (no frontmatter required); automatically appended to Copilot requests within the repository.
2. **Path-Specific Instructions:** `.github/instructions/*.instructions.md`
   - Uses YAML frontmatter with `applyTo` globs (and optional `description` / `excludeAgent`):
     - `.github/instructions/security.instructions.md` -> applies to server, API, DB, migration, and auth files.
     - `.github/instructions/ui-design.instructions.md` -> applies to `.tsx`, `.css`, app pages, and UI components.

## Precedence & Additive Combination

- Both `.github/copilot-instructions.md` and any matching `.github/instructions/*.instructions.md` files are sent additively to Copilot when editing matching paths.
- Personal user instructions take precedence over repository instructions, which take precedence over organization instructions.
- Note: Support for `.github/instructions/*.instructions.md` (`applyTo`) depends on Copilot client/IDE support (unverified against a local IDE extension in this runtime).
