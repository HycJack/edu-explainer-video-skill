#!/usr/bin/env node
/**
 * Guard against the one failure mode a subsetted CJK font has: a character that
 * was never downloaded, showing up as a tofu box twenty minutes into a render.
 *
 * Reads every content and framework source file, collects the non-ASCII
 * characters they use, and checks them against charset.txt — the exact set the
 * Google Fonts `text=` subset was built from.
 *
 *   node scripts/check-charset.mjs
 *
 * If it reports missing characters, re-run scripts/build-fonts.mjs, which will
 * notice the extra characters and widen the subset for you.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const charsetPath = join(root, "charset.txt");

if (!existsSync(charsetPath)) {
  console.error("charset.txt is missing — run scripts/build-fonts.mjs first.");
  process.exit(1);
}

const subset = new Set(readFileSync(charsetPath, "utf8"));

const SOURCE_DIRS = [join(root, "src/content"), join(root, "src/framework")];

const walk = (dir) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if ([".tsx", ".ts"].includes(extname(full))) out.push(full);
  }
  return out;
};

const files = SOURCE_DIRS.filter(existsSync).flatMap(walk);

/**
 * Strip JSX/TS syntax so we only look at characters a user will ever see.
 *
 * String literals are deliberately NOT stripped: build-fonts.mjs scans them, so
 * the labels a figure builder prints inside "..." have to be checked here too,
 * or a missing glyph would pass the gate and print as a tofu box.
 */
const visible = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/`(?:[^`\\]|\\.)*`/g, " ")
    .replace(/=?\s*[{][^{}]*[}]/g, " ")
    .replace(/<\/?[A-Za-z][^>]*>/g, " ");

const missing = new Map();

for (const file of files) {
  const text = visible(readFileSync(file, "utf8"));
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined || cp < 0x80) continue;
    if (subset.has(ch)) continue;
    if (!missing.has(ch)) missing.set(ch, new Set());
    missing.get(ch).add(file.slice(root.length + 1));
  }
}

const total = files.length;
if (missing.size === 0) {
  console.log(`✓ charset OK — ${total} sources, every non-ASCII character is in the subset.`);
  process.exit(0);
}

console.error(`✗ ${missing.size} character(s) missing from the font subset:\n`);
for (const [ch, where] of missing) {
  console.error(`   ${ch}  U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}   ${[...where].join(", ")}`);
}
console.error(`\nRe-run: node scripts/build-fonts.mjs`);
process.exit(1);
