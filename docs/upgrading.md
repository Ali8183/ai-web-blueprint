# Upgrading Downstream Projects

Projects generated with `scripts/create-project.mjs` record a `.blueprint-manifest.json` file at the project root so you can inspect upstream blueprint changes and merge governance, CI, and security improvements without overwriting custom application code.

## 1. How `.blueprint-manifest.json` Works

When `scripts/create-project.mjs` scaffolds a project, it records:

```json
{
  "blueprintVersion": "0.1.0",
  "template": "fullstack",
  "projectName": "my-studio-app",
  "createdAt": "2026-11-16T13:30:00.000Z",
  "managedFiles": [
    ".github/workflows/ci.yml",
    "AGENTS.md",
    "package.json",
    "standards/security.md"
  ],
  "checksums": {
    "AGENTS.md": "<sha256-hex>",
    "package.json": "<sha256-hex>"
  }
}
```

- `blueprintVersion`: Upstream blueprint release version from which the project was created or last upgraded.
- `managedFiles`: Sorted list of relative file paths originally copied from `templates/fullstack/`, `AGENTS.md`, `standards/`, and `.github/workflows/ci.yml`.
- `checksums`: SHA-256 hex digest of each managed file right after generation.

## 2. Safe Upgrade Workflow (Without Overwriting Custom Business Code)

> [!CAUTION]
> **Never blindly run `create-project.mjs --force` directly over an active project with unreviewed changes.** Doing so overwrites customized routes, schemas, styles, or `package.json` dependencies.

Follow this diff-first merge workflow when upgrading to a newer blueprint tag:

### Step 1: Ensure a Clean Git Working Tree
Commit or stash all ongoing feature work in your downstream repository before inspecting blueprint updates:

```powershell
git status
git checkout -b chore/upgrade-blueprint-v0.x.y
```

### Step 2: Detect Which Managed Files You Customized
Compare current SHA-256 hashes of files in `.blueprint-manifest.json` against `manifest.checksums` using a quick Node one-liner:

```powershell
node -e '
const fs = require("node:fs"), crypto = require("node:crypto");
const m = JSON.parse(fs.readFileSync(".blueprint-manifest.json", "utf8"));
for (const f of m.managedFiles) {
  if (!fs.existsSync(f)) { console.log("DELETED :", f); continue; }
  const h = crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  if (h !== m.checksums[f]) console.log("MODIFIED:", f);
}
'
```

- **Unmodified files** (no output line above) can generally accept upstream governance/CI/utility updates cleanly.
- **`MODIFIED` or `DELETED` files** contain your custom business logic, dependencies, or tailored standards and must be merged selectively.

### Step 3: Stage the New Blueprint Output in a Clean Temp Directory
Checkout or clone the target blueprint release tag (`v0.x.y`), generate a clean reference copy into a temporary directory using your exact `projectName`, and diff the directories:

```powershell
# Run from the updated blueprint repository checkout:
npm run create:project -- --name my-studio-app --target C:\temp\blueprint-v0.x.y

# Diff governance, CI, and core security helpers against your project:
git diff --no-index C:\projects\my-studio-app\standards C:\temp\blueprint-v0.x.y\standards
git diff --no-index C:\projects\my-studio-app\.github\workflows\ci.yml C:\temp\blueprint-v0.x.y\.github\workflows\ci.yml
```

### Step 4: Merge in Safe Priority Order
1. **Standards & Governance (`AGENTS.md`, `standards/`):** Safe to sync directly unless you added project-specific overrides.
2. **CI & Dependabot (`.github/workflows/ci.yml`):** Review SHA updates and added checks, preserving any custom project jobs.
3. **Security Middleware & Env Guards (`src/server/env.ts`, `src/server/security/*`, `next.config.ts`):** Apply selectively via patch/diff, keeping custom CSP allowances or route hooks intact.
4. **Schema / Migrations (`src/server/db/schema.ts`, `drizzle/`):** **Never overwrite blindly.** Read upstream changelog notes first and generate a forward Drizzle SQL migration (`npm run db:generate`) rather than replacing existing migration history.
5. **Dependencies (`package.json` / `package-lock.json`):** Review bumped versions, run `npm install`, and re-verify lockfile integrity.

### Step 5: Update Manifest & Re-Verify Everything
After merging, update `blueprintVersion` and `checksums` in `.blueprint-manifest.json`, then run full checks before merging your upgrade branch:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```
