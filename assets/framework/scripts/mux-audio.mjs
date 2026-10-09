#!/usr/bin/env node
/**
 * Lay every spoken line onto one continuous track, then mux it with the video.
 *
 * Timing comes from the timeline snapshot the renderer uses, not from a
 * recompile: same numbers, no chance of the two drifting apart.
 *
 *   node scripts/mux-audio.mjs <content-id> [video.mp4] [out.mp4]
 */

import { execFileSync, spawnSync } from "node:child_process";

/**
 * Run ffmpeg and surface its own diagnostics on failure. Letting it inherit
 * stderr means a thrown execFileSync carries an empty message, and the real
 * cause — a bad filter graph, a missing input — is lost.
 */
const ffmpeg = (args) => {
  const r = spawnSync("ffmpeg", args, { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) {
    process.stderr.write(r.stderr ?? "");
    throw new Error(`ffmpeg exited ${r.status}`);
  }
};
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2] ?? "circle-incenter";
// The silent render at NARRATED length, not the shipped silent deliverable:
// `out/<id>.mp4` is the short cut compiled without narration, and muxing into
// it would leave `-shortest` trimming the voice down to 45 seconds.
const video = process.argv[3] ?? join(ROOT, "out/.audio", `${id}-silent.mp4`);
const outFile = process.argv[4] ?? join(ROOT, `out/${id}-voiced.mp4`);

const timelinePath = join(ROOT, "out/.audio", `${id}-timeline.json`);
if (!existsSync(timelinePath)) {
  console.error(`缺少时间线快照。先跑：npx tsx scripts/dump-timeline.ts ${id}`);
  process.exit(1);
}
const tl = JSON.parse(readFileSync(timelinePath, "utf8"));
if (!tl.schedule?.length) {
  console.error(`时间线里没有语音 —— 跑过 scripts/tts.mjs ${id} 吗？`);
  process.exit(1);
}

// Each clip is delayed to the exact frame where its line is spoken, which is
// the same number the panel uses to reveal it: one clock drives both.
const clips = tl.schedule.map((c) => {
  const file = join(ROOT, "public", c.file);
  if (!existsSync(file)) {
    console.error(`缺少音频 ${c.file}`);
    process.exit(1);
  }
  return { ...c, file, at: c.frame / tl.fps };
});

console.log(`${id}: ${clips.length} 句语音，片长 ${tl.durationSec.toFixed(1)}s`);
for (const c of clips.slice(0, 4)) {
  console.log(
    `   ${c.step}/${c.index}  ${String(c.frame).padStart(5)}帧 @${c.at.toFixed(2)}s  ${c.duration}s  "${c.text.slice(0, 18)}…"`,
  );
}
if (clips.length > 4) console.log(`   … 另有 ${clips.length - 4} 句`);

// ---------------------------------------------------------------- audio track
const tmpDir = join(ROOT, "out/.audio");
mkdirSync(tmpDir, { recursive: true });

const args = [];
for (const c of clips) args.push("-i", c.file);

// adelay already inserts the leading silence; padding every input to a common
// length first would make the graph N times longer than the film itself.
const chains = clips.map((c, i) => {
  const ms = Math.round(c.at * 1000);
  return `[${i}]adelay=${ms}|${ms}[a${i}]`;
});
const mix =
  clips.map((_, i) => `[a${i}]`).join("") +
  `amix=inputs=${clips.length}:duration=longest:normalize=0:dropout_transition=0[aout]`;

const trackPath = join(tmpDir, `${id}-track.m4a`);
console.log("\n合成音轨…");
ffmpeg([
  "-y", ...args, "-filter_complex", `${chains.join(";")};${mix}`,
  "-map", "[aout]", "-c:a", "aac", "-b:a", "160k", trackPath,
]);
console.log(`  -> ${trackPath}`);

// ---------------------------------------------------------------- mux
console.log("混流…");
// apad keeps silence flowing after the last line, and -shortest then stops at
// the PICTURE instead of at the voice. Without it the mix is ~1s shorter than
// the film and `-shortest` trims the outro card's exit fade off the end.
//
// -c:v copy: never re-encode video just to add a sound track.
ffmpeg([
  "-y", "-i", video, "-i", trackPath, "-map", "0:v:0", "-map", "1:a:0",
  "-af", "apad", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", outFile,
]);

const probe = JSON.parse(
  execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration",
     "-show_entries", "stream=codec_type,codec_name,width,height,nb_frames", "-of", "json", outFile],
    { encoding: "utf8" },
  ),
);
console.log(`\n${outFile}`);
for (const s of probe.streams ?? []) {
  const bits = [s.codec_name, s.width ? `${s.width}x${s.height}` : null, s.nb_frames ? `${s.nb_frames} 帧` : null].filter(Boolean);
  console.log(`  ${s.codec_type.padEnd(6)} ${bits.join("  ")}`);
}
console.log(`  duration ${Number(probe.format.duration).toFixed(2)}s`);
