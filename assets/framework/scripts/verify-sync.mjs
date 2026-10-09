#!/usr/bin/env node
/**
 * Check that the voiced video actually lines up with its narration.
 *
 * Two independent signals, because either alone is weak:
 *   audio  — speech energy must start at the scheduled frame, not earlier
 *   video  — the panel must visibly change across the same frame
 *
 *   node scripts/verify-sync.mjs <content-id> [video.mp4] [samples]
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2] ?? "circle-incenter";
const video = process.argv[3] ?? join(ROOT, `out/${id}-voiced.mp4`);
const SAMPLES = Number(process.argv[4] ?? 8);

const tl = JSON.parse(readFileSync(join(ROOT, "out/.audio", `${id}-timeline.json`), "utf8"));
const tmp = join(ROOT, "out/.verify");

/**
 * ffmpeg writes filter telemetry (astats, metadata=print) to stderr, not
 * stdout — reading the wrong stream silently yields "no data" and every check
 * fails at once.
 */
const run = (args) => {
  const r = spawnSync("ffmpeg", args, { encoding: "utf8", maxBuffer: 1 << 26 });
  return `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
};
mkdirSync(tmp, { recursive: true });

/** RMS of the audio in a window, via ffmpeg's astats filter. */
const rmsBetween = (from, to) => {
  const out = run([
    "-v", "info", "-ss", String(from), "-to", String(to), "-i", video,
    "-af", "astats", "-f", "null", "-",
  ]);
  const m = out.match(/RMS level dB:\s*(-?[\d.]+)/);
  return m ? Number(m[1]) : -91;
};

/** Mean absolute pixel difference between two frames, 0..1. */
const frameDelta = (frameA, frameB) => {
  const a = join(tmp, `a${frameA}.png`);
  const b = join(tmp, `b${frameB}.png`);
  for (const [f, fr] of [[a, frameA], [b, frameB]]) {
    execFileSync("ffmpeg", [
      "-v", "error", "-y", "-i", video,
      "-vf", `select=eq(n\\,${fr}),scale=480:-1`, "-vsync", "0", "-frames:v", "1", f,
    ]);
  }
  const raw = run([
    "-v", "info", "-i", a, "-i", b, "-filter_complex",
    "[0:v][1:v]blend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG",
    "-f", "null", "-",
  ]);
  const m = raw.match(/YAVG=([\d.]+)/);
  return m ? Number(m[1]) / 255 : 0;
};

// Evenly spaced samples, skipping the first so the opening card is settled.
const picks = [];
for (let i = 0; i < SAMPLES; i++) {
  picks.push(tl.schedule[Math.floor(((i + 1) / (SAMPLES + 1)) * tl.schedule.length)]);
}

console.log(`验证 ${video}\n`);
console.log("  时刻      音频 dB(句中/间隙)   画面变化(与控制组之比)  结果   该说的一句话");
console.log("  " + "-".repeat(92));

let audioOk = 0;
let videoOk = 0;
for (const c of picks) {
  const t = c.frame / tl.fps;
  // Reference point is the gap itself, whose width comes from the timeline. A
  // fixed "0.6s before" reaches back into the PREVIOUS line whenever the
  // inter-line gap is shorter than that.
  const gap = tl.gap ?? 0.26;
  const on = rmsBetween(t, t + 0.5);
  const before = rmsBetween(Math.max(0, t - gap * 0.85), Math.max(0.02, t - gap * 0.15));
  // Not an absolute pixel threshold: a caption line is a sliver of a 1080p
  // frame. Compare against its own control a little later in the same clip.
  const atCue = frameDelta(c.frame - 3, c.frame + 9);
  const control = frameDelta(c.frame + 24, c.frame + 36);
  const ratio = control > 1e-6 ? atCue / control : atCue > 1e-5 ? 99 : 1;
  const aGood = on > -60 && on > before + 20;
  const vGood = ratio > 2;
  if (aGood) audioOk++;
  if (vGood) videoOk++;
  console.log(
    `  ${t.toFixed(2).padStart(6)}s  ${on.toFixed(1).padStart(7)}/${before.toFixed(1).padStart(6)}  ` +
      `${atCue.toFixed(5)}/${control.toFixed(5)}=${ratio.toFixed(1).padStart(5)}x  ` +
      `${aGood ? "✓" : "✗"}音 ${vGood ? "✓" : "✗"}画  ${c.text.slice(0, 14)}…`,
  );
}

console.log(`\n  音频对齐 ${audioOk}/${SAMPLES}   画面变化 ${videoOk}/${SAMPLES}`);
process.exit(audioOk === SAMPLES ? 0 : 1);
