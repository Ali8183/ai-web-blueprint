# Cross-Tool Adapter Architecture & Honest Compatibility Matrix

Canonical engineering rules live once in `AGENTS.md`, `standards/`, `presets/`, and `.agents/skills/`. Tool-specific adapter files (`GEMINI.md`, `CLAUDE.md`, `.cursor/rules/*.mdc`, `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`) are **thin generated pointers** produced and drift-checked by `scripts/sync-adapters.mjs` (`npm run sync:adapters` / `npm run check:adapters`).

## 1. Compatibility & Verification Matrix

| Araç / Ortam | Üretilen / Keşfedilen Dosyalar | Belgesi Doğrulandı | Dosyalar Üretildi | Araçta Gerçekten Denendi |
| :--- | :--- | :--- | :--- | :--- |
| **Antigravity** | `AGENTS.md`, `GEMINI.md`, `.agents/rules/core-guardrails.md`, `.agents/skills/*/SKILL.md` | Evet (yerleşik `agy-customizations` dokümanları + resmi Antigravity keşif kuralları, 2026-11-16) | Evet | **Evet** — bu Antigravity çalışma zamanında dosya/skill/kural formatı aktif ortamda doğrulandı |
| **OpenAI Codex** | `AGENTS.md` (+ isteğe bağlı alt dizin `AGENTS.md` / `AGENTS.override.md`) | Evet (`developers.openai.com/codex/guides/agents-md`, 2026-11-16) | Evet (`AGENTS.md` mevcut) | **Hayır — yalnızca dosya üretimi ve şema/tutarlılık doğrulaması yapıldı** (yerel Codex CLI sürümü bu ortamda çalıştırılmadı) |
| **Claude Code** | `CLAUDE.md` (`AGENTS.md` ve `standards/` işaretçisi) | Evet (`docs.anthropic.com/en/docs/claude-code/memory`, 2026-11-16) | Evet (`scripts/sync-adapters.mjs`) | **Hayır — yalnızca dosya üretimi ve şema/tutarlılık doğrulaması yapıldı** (yerel Claude Code ikilisi bu ortamda çalıştırılmadı) |
| **Cursor** | `.cursor/rules/00-core-blueprint.mdc`, `10-security-and-db.mdc`, `20-ui-and-design.mdc` | Evet (`docs.cursor.com/context/rules`, 2026-11-16) | Evet (`scripts/sync-adapters.mjs`) | **Hayır — yalnızca dosya üretimi ve şema/tutarlılık doğrulaması yapıldı** (yerel Cursor IDE sürümü ve canlı kural enjeksiyonu bu ortamda doğrulanamadı) |
| **GitHub Copilot** | `.github/copilot-instructions.md`, `.github/instructions/security.instructions.md`, `.github/instructions/ui-design.instructions.md` | Evet (`docs.github.com` Copilot custom instructions, 2026-11-16) | Evet (`scripts/sync-adapters.mjs`) | **Hayır — yalnızca dosya üretimi ve şema/tutarlılık doğrulaması yapıldı** (yerel VS Code/GitHub Copilot uzantısı ve sürümü bu ortamda doğrulanamadı) |

## 2. Single-Source Drift Rule

- Edit canonical guidance ONLY in `AGENTS.md`, `standards/*.md`, `presets/*.md`, `.agents/rules/*.md`, or `.agents/skills/*/SKILL.md`.
- Never manually edit generated pointer files; run `npm run sync:adapters` after updating shared rules or adapter templates, and gate CI with `npm run check:adapters`.
- Note for **chat-only web models** (without filesystem access): pasting a repository URL alone is unreliable because models cannot automatically crawl every rule file; use `BOOTSTRAP_PROMPT.md` or run an IDE/CLI agent inside the checked-out workspace.
