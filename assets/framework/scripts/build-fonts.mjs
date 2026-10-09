#!/usr/bin/env node
/**
 * Rebuilds the self-hosted CJK subsets in public/fonts.
 *
 * Scans the content and framework sources for every non-ASCII character they
 * use, then asks Google Fonts for a subset containing exactly those, and stores
 * two variable woff2 files (~50 KB each instead of ~10 MB).
 *
 *   node scripts/build-fonts.mjs
 *
 * Run this after adding or re-wording copy. `check-charset.mjs` is the cheap
 * read-only gate you can wire into CI; this is the thing that fixes it.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/fonts");
const charsetPath = join(root, "charset.txt");

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * ASCII, plus the maths and punctuation the panels actually use.
 *
 * The scanner below keeps `"..."` and `'...'` string literals intact, so the
 * labels a figure builder prints are picked up on their own. EXTRA is the safety
 * net for characters that never appear in source text at all — anything produced
 * programmatically instead of written out — plus the maths punctuation.
 */
const EXTRA =
  "·−⊥∥→⇒✓✗×|⟨⟩①②③④＝≠≥≤≈∞，、。：；（）「」《》—…‘’“”′″√" +
  "₀₁₂₃₄₅₆₇₈₉ᵐ²±°" +
  "物块车小钩码光滑冰粗糙地面砖秒牛米加速度速度方向相同相反大小直线上水平竖直静止运动";

const SOURCE_DIRS = [join(root, "src/content"), join(root, "src/framework")];

const walk = (dir) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if ([".tsx", ".ts"].includes(extname(name))) out.push(full);
  }
  return out;
};

const visible = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/`(?:[^`\\]|\\.)*`/g, " ")
    .replace(/=?\s*[{][^{}]*[}]/g, " ")
    .replace(/<\/?[A-Za-z][^>]*>/g, " ");

const chars = new Set(EXTRA);
for (let ascii = 0x20; ascii < 0x7f; ascii++) chars.add(String.fromCharCode(ascii));
for (const file of SOURCE_DIRS.filter(existsSync).flatMap(walk)) {
  for (const ch of visible(readFileSync(file, "utf8"))) {
    if (ch.codePointAt(0) >= 0x80) chars.add(ch);
  }
}

const charset = [...chars].sort().join("");
writeFileSync(charsetPath, charset, "utf8");
console.log(`charset.txt — ${chars.size} characters`);

const fetchText = (url) =>
  fetch(url, { headers: { "User-Agent": UA } }).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
    return r.text();
  });

mkdirSync(outDir, { recursive: true });

const FAMILIES = [
  { name: "sans", query: "Noto+Sans+SC:wght@400;500;700;900", out: "sans-400.woff2" },
  { name: "serif", query: "Noto+Serif+SC:ital,wght@0,400;0,700;1,400", out: "serif-400.woff2" },
];

for (const fam of FAMILIES) {
  const css = await fetchText(
    `https://fonts.googleapis.com/css2?family=${fam.query}&text=${encodeURIComponent(charset)}`,
  );
  // With text= subsetting Google returns one variable file per family, repeated
  // in every @font-face block — so the first URL is the one.
  const url = css.match(/url\((https:\/\/[^)]+)\)/)?.[1];
  if (!url) throw new Error(`no woff2 URL for ${fam.name}`);
  const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
  writeFileSync(join(outDir, fam.out), buf);
  console.log(`${fam.out.padEnd(18)} ${(buf.length / 1024).toFixed(1)} KB`);
}

console.log("\nDone. Both files are variable fonts — declare them with weight: \"400 900\".");
console.log("Note: the text= subset has no italic, so maths variables use a synthesised oblique.");