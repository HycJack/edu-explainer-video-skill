/**
 * Dump the compiled timeline for one problem as JSON.
 *
 * The muxer must place clips at exactly the frames the video uses. Rather than
 * recompiling in a second process — where a different module graph could
 * quietly produce a different timeline — this snapshots the one that was
 * rendered.
 *
 *   npx tsx scripts/dump-timeline.ts <content-id> [out.json]
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { compile } from "../src/framework/compile";
import { getContent } from "../src/framework/registry";
import { getNarration } from "../src/narration";

import "../src/content/conic-chord";
import "../src/content/cuboid-perpendicular";
import "../src/content/circle-incenter";

// Side-effect imports: this is what the renderer does too, in the same order.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2] ?? "circle-incenter";
const out = process.argv[3] ?? join(ROOT, "out/.audio", `${id}-timeline.json`);

const narration = getNarration(id);
if (!narration) {
  console.error(`${id} 没有配音。先 npm run tts -- ${id}`);
  process.exit(1);
}

const tl = compile(getContent(id), narration, 30);

const schedule = tl.steps.flatMap((s) => {
  const step = s.track;
  if (!step) return [];
  const lines = narration.steps[s.step.id] ?? narration.steps[s.step.id.replace(/^_/, "")];
  return step.durations.map((duration, i) => ({
    step: s.step.id,
    index: i,
    text: lines?.lines[i]?.text ?? "",
    file: lines?.lines[i]?.file ?? "",
    duration,
    frame: s.from + (s.lineAt[i] ?? 30 * i),
  }));
});

const payload = {
  id,
  fps: 30,
  totalFrames: tl.total,
  durationSec: tl.total / 30,
  // The verifier needs the real gap to know where silence is supposed to be.
  gap: narration.gap ?? 0.26,
  steps: tl.steps.map((s) => ({
    id: s.step.id,
    from: s.from,
    dur: s.dur,
    card: s.card,
    heading: s.step.heading ?? "",
    lineAt: s.lineAt,
  })),
  schedule,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(payload, null, 1));

console.log(`${id}: ${schedule.length} 句语音, ${tl.total} 帧 @30fps = ${(tl.total / 30).toFixed(1)}s`);
console.log(`-> ${out}`);
