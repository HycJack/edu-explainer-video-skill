/**
 * Check that every narration script lines up with the content it narrates.
 *
 * The two are written by hand and drift easily: a line added to one and not
 * the other does not throw, it silently shifts every later line against its
 * audio. A count mismatch is the cheapest possible early warning, so it is
 * checked before every build.
 *
 *   npx tsx scripts/check-narration.ts [content-id ...]
 */

import { compile } from "../src/framework/compile";
import { getContent } from "../src/framework/registry";
import { getNarration } from "../src/narration";

import "../src/content/conic-chord";
import "../src/content/cuboid-perpendicular";
import "../src/content/circle-incenter";


const ALL = [
  "circle-incenter",
  "conic-chord",
  "cuboid-perpendicular",
];

const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ALL;

let problems = 0;

for (const id of IDS) {
  const content = getContent(id);
  const narration = getNarration(id);
  if (!narration) {
    console.log(`\n${id}\n  （无配音，静默版）`);
    continue;
  }

  const tl = compile(content, narration, 30);
  console.log(`\n${id}   ${(tl.total / 30).toFixed(1)}s（含旁白）`);

  for (const s of tl.steps) {
    const spoken = s.track?.durations.length ?? 0;
    if (!spoken) continue;
    const onScreen = s.step.lines?.length ?? 0;
    const bad = onScreen !== spoken;
    if (bad) problems++;
    console.log(
      `  ${s.step.id.padEnd(22)} 屏幕 ${String(onScreen).padStart(2)} 行 / 配音 ${String(spoken).padStart(2)} 句` +
        (bad ? "   ✗ 行列不对齐，后面的每一句都会错位" : "   ✓"),
    );
  }
}

console.log(
  problems
    ? `\n${problems} 处不匹配 —— 配音会整体错位，先改 narration/<id>.json 或内容文件。`
    : "\n全部对齐。",
);
process.exit(problems ? 1 : 0);
