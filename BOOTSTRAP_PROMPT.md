# Bootstrap Prompts

Use these prompts after opening this repository locally in a repository-aware AI coding agent (Antigravity, OpenAI Codex CLI, Claude Code, Cursor, or GitHub Copilot in VS Code).

> [!IMPORTANT]
> **Why pasting only a GitHub URL into a chat box is not enough:** Chat-only web interfaces do not automatically read `AGENTS.md`, `standards/`, `presets/`, `.agents/skills/`, or run terminal tests and Playwright checks against a local workspace. To get the blueprint's full benefit, clone or open the repository locally in an agent that can read files and run commands—or paste the prompt together with the specific `AGENTS.md`, `standards/*.md`, and `presets/*.md` files when using a chat-only model.

---

## Turkish Copy-Paste Prompt (Varsayılan / Önerilen)

Replace `[FİKİR]` with your site or web application idea before sending:

```text
Bu çalışma alanındaki AGENTS.md ve görevimle ilgili standards/preset dosyalarını oku. İlgili dosya yollarını ve seçtiğin profili belirt. Site fikrim: [FİKİR]. Eksik kritik bilgileri netleştir; brief, tasarım yönü ve kabul ölçütlerini kaydet. Ardından gerçek çalışan uygulamayı oluştur, kontrolleri çalıştır ve kanıtları raporla. Çalıştırılmayan testleri açıkça ayır. Güvenlik veya tasarım kalitesi hakkında doğrulanmamış garanti verme.
```

### Example Filled Prompt (TR)

```text
Bu çalışma alanındaki AGENTS.md ve görevimle ilgili standards/preset dosyalarını oku. İlgili dosya yollarını ve seçtiğin profili belirt. Site fikrim: İzmir'de butik bir mimarlık atölyesi için proje takip ve müşteri teslimat portalı; müşteriler kendi projelerinin durumunu görebilmeli, ekip üyeleri görev/aşama güncelleyebilmeli. Eksik kritik bilgileri netleştir; brief, tasarım yönü ve kabul ölçütlerini kaydet. Ardından gerçek çalışan uygulamayı oluştur, kontrolleri çalıştır ve kanıtları raporla. Çalıştırılmayan testleri açıkça ayır. Güvenlik veya tasarım kalitesi hakkında doğrulanmamış garanti verme.
```

---

## English Copy-Paste Prompt

Replace `[IDEA]` with your site or web application idea before sending:

```text
Read AGENTS.md and the standards/ and presets/ files relevant to my task in this workspace. State the exact file paths you read and the profile you selected. My site idea: [IDEA]. Clarify any missing critical details; record the brief, visual direction, and acceptance criteria. Then build the working application, run verification checks, and report observed evidence. Explicitly separate any tests or checks that were not run. Do not make unverified guarantees about security or design quality.
```

---

## Using Chat-Only Models (Web Chat Without Local Workspace Access)

If you only have access to a web chat window without repository/terminal execution:

1. Paste `AGENTS.md`, the matching preset from `presets/`, and the relevant `standards/*.md` files directly into your chat context (do **not** assume the model fetched every file from a repo URL).
2. Ask the model to complete discovery first using `project/brief.template.md` and `project/acceptance-criteria.template.md` before writing application code.
3. Explicitly note in your workflow that **automated tests, build checks, security header verification, and Playwright visual inspections have not been executed** until you copy the generated code locally and run the verification scripts yourself (`npm run verify` or `npm --prefix templates/fullstack test` + `npm --prefix templates/fullstack run build`).
4. Do not treat code reviewed only in chat as production-verified.
