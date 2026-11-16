# Adapter: OpenAI Codex

- **Official Discovery Docs Verified:** `https://developers.openai.com/codex/guides/agents-md` (reviewed 2026-11-16).
- **Testing Status:** **Hayır — yalnızca dosya üretimi ve şema/tutarlılık doğrulaması yapıldı.** Codex CLI binary execution and local version behavior were not tested in this runtime.

## Discovery Paths & Scopes

1. **Global User Instructions:** `~/.codex/AGENTS.md` (or `$CODEX_HOME/AGENTS.md`).
2. **Repository Root:** `AGENTS.md` (primary entry point in this blueprint, kept strictly `<= 150` lines).
3. **Subdirectory Scoping:** Nested `<subdir>/AGENTS.md` or `<subdir>/AGENTS.override.md` along the path from project root to active working directory.

## Precedence Rules

- Codex walks from global `~/.codex/AGENTS.md` down through repo root `AGENTS.md` to the deepest directory containing the working directory.
- **Closest wins:** deeper subdirectory instructions override conflicting parent rules; `AGENTS.override.md` replaces parent `AGENTS.md` content at that level.
- Direct interactive user prompts override repository instruction files.

## Repo Files Used

- `AGENTS.md` (no extra Codex-only wrapper file is required, avoiding duplicate divergence).
- `.agents/skills/*/SKILL.md` can also be read explicitly when referenced from `AGENTS.md`.
