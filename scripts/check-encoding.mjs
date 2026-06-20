import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "src");

const badPatterns = [
  "\u00c3\u00a9",
  "\u00c3\u00a8",
  "\u00c3\u00aa",
  "\u00c3\u0192",
  "\u00c2\u00a9",
  "\u00c2\u00a8",
  "\u00c2\u00aa",
  "\u00f0\u0178",
  "\u00e2\u20ac",
  "\u00e2\u0161",
  "\ufffd",
];

const exts = new Set([".ts", ".tsx", ".js", ".jsx"]);
const ignored = ["backup-avant", "backup-ajout", "backup-clean", ".backup", ".next"];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (ignored.some((part) => full.includes(part))) continue;

    if (entry.isDirectory()) {
      walk(full, files);
    } else if (exts.has(path.extname(entry.name))) {
      files.push(full);
    }
  }

  return files;
}

const badFiles = [];

for (const file of walk(srcDir)) {
  const content = fs.readFileSync(file, "utf8");
  if (badPatterns.some((pattern) => content.includes(pattern))) {
    badFiles.push(file);
  }
}

if (badFiles.length > 0) {
  console.error("");
  console.error("ENCODING ERROR: corrupted text detected.");
  for (const file of badFiles) {
    console.error(` - ${path.relative(root, file)}`);
  }
  console.error("");
  console.error("Build blocked. Fix encoding before deploy.");
  process.exit(1);
}

console.log("Encoding OK.");