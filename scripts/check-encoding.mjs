import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "prisma", "scripts"];
const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".scss",
  ".html",
  ".prisma",
  ".yml",
  ".yaml",
  ".sql",
]);

const suspiciousPatterns = [
  /\u00C3./,
  /\u00C2./,
  /\uFFFD/,
];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
      continue;
    }

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (ALLOWED_EXTENSIONS.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function hasUtf8Bom(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
}

const findings = [];

for (const scanDir of SCAN_DIRS) {
  const fullDir = join(ROOT, scanDir);
  try {
    if (!statSync(fullDir).isDirectory()) continue;
  } catch {
    continue;
  }

  for (const file of walk(fullDir)) {
    const raw = readFileSync(file);
    const text = raw.toString("utf8");

    if (hasUtf8Bom(raw)) {
      findings.push({ file, reason: "UTF-8 BOM detectado" });
    }

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        findings.push({ file, reason: `Patron sospechoso detectado: ${pattern}` });
        break;
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Se detectaron posibles problemas de encoding:\n");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.reason}`);
  }
  process.exit(1);
}

console.log("Encoding OK: no se detectaron problemas evidentes.");
