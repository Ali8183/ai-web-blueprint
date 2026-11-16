import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const BLUEPRINT_VERSION = "0.1.0";

const EXCLUDED_NAMES = new Set([
  ".next",
  "node_modules",
  ".data",
  "playwright-report",
  "test-results",
  "coverage",
  ".env",
  ".env.local",
  "AGENTS.md",
]);

function printUsage() {
  console.log(
    [
      "Usage: node scripts/create-project.mjs --name <project-slug> --target <target-dir> [--force]",
      "",
      "Options:",
      "  --name    Lowercase slug (2-63 chars, [a-z][a-z0-9-]*)",
      "  --target  Destination directory path",
      "  --force   Allow writing into an existing non-empty target directory",
      "  --help    Show this help message",
    ].join("\n")
  );
}

function parseArgs(argv) {
  const args = { name: "", target: "", force: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      args.help = true;
    } else if (token === "--force") {
      args.force = true;
    } else if (token === "--name") {
      args.name = argv[++i] ?? "";
    } else if (token.startsWith("--name=")) {
      args.name = token.slice("--name=".length);
    } else if (token === "--target") {
      args.target = argv[++i] ?? "";
    } else if (token.startsWith("--target=")) {
      args.target = token.slice("--target=".length);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function validateProjectName(name) {
  if (!name || typeof name !== "string") {
    throw new Error("Missing required --name <project-slug>.");
  }
  if (!/^[a-z][a-z0-9-]{1,62}$/.test(name)) {
    throw new Error(
      `Invalid project name "${name}". Use 2-63 lowercase letters, digits, or hyphens starting with a letter.`
    );
  }
  if (name.includes("--")) {
    throw new Error(`Invalid project name "${name}". Avoid consecutive hyphens.`);
  }
}

function isSubPathOrEqual(candidate, base) {
  const rel = path.relative(base, candidate);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function validateTargetDir(targetInput, force) {
  if (!targetInput || typeof targetInput !== "string") {
    throw new Error("Missing required --target <directory>.");
  }
  const targetDir = path.resolve(process.cwd(), targetInput);
  const parsedRoot = path.parse(targetDir).root;
  if (targetDir === parsedRoot) {
    throw new Error(`Refusing to target filesystem root: ${targetDir}`);
  }
  if (isSubPathOrEqual(targetDir, repoRoot) || isSubPathOrEqual(repoRoot, targetDir)) {
    throw new Error(
      `Refusing to target inside or enclosing the blueprint repository itself (${repoRoot}). Choose an external directory.`
    );
  }
  if (fs.existsSync(targetDir)) {
    const stat = fs.statSync(targetDir);
    if (!stat.isDirectory()) {
      throw new Error(`Target path exists and is not a directory: ${targetDir}`);
    }
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0 && !force) {
      throw new Error(
        `Target directory is not empty: ${targetDir}. Pass --force to overwrite matching blueprint files.`
      );
    }
  }
  return targetDir;
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function copyTreeFiltered(srcDir, destDir, targetRoot, checksums) {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDED_NAMES.has(entry.name) || entry.name.startsWith(".env.")) {
      if (entry.name !== ".env.example") {
        continue;
      }
    }
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyTreeFiltered(srcPath, destPath, targetRoot, checksums);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
      const rel = path.relative(targetRoot, destPath).split(path.sep).join("/");
      checksums[rel] = sha256File(destPath);
    }
  }
}

function copySingleFile(srcPath, destPath, targetRoot, checksums) {
  if (!fs.existsSync(srcPath)) {
    return false;
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  const rel = path.relative(targetRoot, destPath).split(path.sep).join("/");
  checksums[rel] = sha256File(destPath);
  return true;
}

export function createProject(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printUsage();
    return null;
  }
  validateProjectName(args.name);
  const targetDir = validateTargetDir(args.target, args.force);

  const templateDir = path.join(repoRoot, "templates", "fullstack");
  if (!fs.existsSync(templateDir)) {
    throw new Error(`Missing template directory: ${templateDir}`);
  }

  const checksums = {};
  copyTreeFiltered(templateDir, targetDir, targetDir, checksums);

  // Update generated package.json name
  const pkgPath = path.join(targetDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.name = args.name;
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
    checksums["package.json"] = sha256File(pkgPath);
  }

  // Copy governance & workflow files when present in blueprint repo
  copySingleFile(
    path.join(repoRoot, "AGENTS.md"),
    path.join(targetDir, "AGENTS.md"),
    targetDir,
    checksums
  );
  const standardsDir = path.join(repoRoot, "standards");
  if (fs.existsSync(standardsDir)) {
    copyTreeFiltered(standardsDir, path.join(targetDir, "standards"), targetDir, checksums);
  }
  copySingleFile(
    path.join(repoRoot, ".github", "workflows", "ci.yml"),
    path.join(targetDir, ".github", "workflows", "ci.yml"),
    targetDir,
    checksums
  );

  // Write .blueprint-manifest.json
  const manifest = {
    blueprintVersion: BLUEPRINT_VERSION,
    template: "fullstack",
    projectName: args.name,
    createdAt: new Date().toISOString(),
    managedFiles: Object.keys(checksums).sort(),
    checksums,
  };
  fs.writeFileSync(
    path.join(targetDir, ".blueprint-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  return { targetDir, manifest };
}

const isCli =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  try {
    const res = createProject();
    if (res) {
      console.log(`Created project "${res.manifest.projectName}" at ${res.targetDir}`);
      console.log("Next steps:");
      console.log(`  cd "${res.targetDir}"`);
      console.log("  Copy .env.example to .env and set a 32+ char SESSION_SECRET");
      console.log("  npm ci");
      console.log("  npm run db:migrate");
      console.log("  npm run db:seed");
      console.log("  npm run dev");
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
