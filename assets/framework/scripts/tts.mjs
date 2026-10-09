#!/usr/bin/env node
/**
 * Narration → speech → measured durations → src/narration/<id>.json
 *
 * The point of measuring instead of guessing: the timeline is then driven by
 * how long the voice actually takes. A long sentence gets the time it needs;
 * the panel reveals each line exactly as it is spoken, and nothing has to be
 * re-tuned by hand afterwards.
 *
 *   node scripts/tts.mjs <narration-id> [--dry] [--skip-existing]
 *
 * Writes:
 *   public/narration/<id>/*.mp3   one clip per spoken line, silences trimmed
 *   src/narration/<id>.json        { stepId: { lines: [{file, duration}], ... } }
 *   src/narration/index.ts         generated registry, so the bundler sees them
 *
 * Voice engine: edge-tts (Microsoft Edge's online voices, no API key). Point
 * TTS_BIN at it, or leave it on PATH. Every other pipeline stage reads only the
 * measured durations, so swapping the engine later changes this file alone.
 */

import { spawnSync } from "node:child_process";
import { existsSync, renameSync, unlinkSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2] ?? "circle-incenter";
const DRY = process.argv.includes("--dry");
const SKIP = process.argv.includes("--skip-existing");

/**
 * Where the edge-tts binary lives. TTS_BIN wins, then PATH, then the managed
 * venv. A bare command name has to be resolved against PATH explicitly — assuming
 * it exists is what produced `exited null` (a spawn ENOENT, not a real failure)
 * on the first run.
 */
const MANAGED = join(
  process.env.HOME ?? "",
  ".workbuddy/binaries/python/envs/default/bin/edge-tts",
);

const onPath = (name) =>
  (process.env.PATH ?? "")
    .split(":")
    .some((dir) => dir && existsSync(join(dir, name)));

const TTS_BIN = [process.env.TTS_BIN, "edge-tts", MANAGED].filter(Boolean).find((c) =>
  c.includes("/") ? existsSync(c) : onPath(c),
);
if (!TTS_BIN) {
  console.error(
    "找不到 edge-tts。装一个：\n" +
      "  pip install edge-tts         # 或\n" +
      "  python3 -m venv ~/.workbuddy/binaries/python/envs/default && " +
      "~/.workbuddy/binaries/python/envs/default/bin/pip install edge-tts\n" +
      "也可以直接 TTS_BIN=/path/to/edge-tts node scripts/tts.mjs " + id,
  );
  process.exit(1);
}

const scriptPath = join(ROOT, "narration", `${id}.json`);
if (!existsSync(scriptPath)) {
  console.error(`没有旁白稿：${scriptPath}`);
  process.exit(1);
}
const script = JSON.parse(readFileSync(scriptPath, "utf8"));

const audioDir = join(ROOT, "public/narration", id);
const outDir = join(ROOT, "src/narration");
mkdirSync(audioDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const voice = script.voice_id ?? "zh-CN-XiaoxiaoNeural";
/** edge-tts wants a signed percentage: "-4%" is slightly slower than natural. */
const rate = script.rate ?? (script.speed ? `${Math.round((script.speed - 1) * 100)}%` : "-4%");
const gap = script.gapAfterLineSec ?? 0.25;

/** One clip, straight from the engine.
 *
 * Every value goes through `--key=value`, not `--key value`: argparse reads a
 * value starting with "-" — which is exactly what a rate like `-4%` is — as an
 * option name and dies with "expected one argument".
 *
 * spawnSync with an argv array also means no shell, so punctuation in the text
 * cannot be reinterpreted.
 */
const speak = (text, dest) => {
  const r = spawnSync(
    TTS_BIN,
    [`--voice=${voice}`, `--rate=${rate}`, `--text=${text}`, `--write-media=${dest}`],
    { encoding: "utf8", maxBuffer: 1 << 26 },
  );
  if (r.status !== 0) throw new Error(`edge-tts exited ${r.status}\n${r.stderr ?? ""}`);
};

const durationOf = (file) => {
  const out = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  ).stdout;
  return parseFloat(out.trim());
};

// ---------------------------------------------------------------- trim
/**
 * Every engine pads its clips. edge-tts measured ~0.196 s of leading silence
 * here (the MiniMax batch API used to send 0.220 s — same problem, different
 * vendor). Left in, the text lands on screen a fifth of a second before the
 * voice starts, far outside the 45–80 ms humans tolerate. Trimming at ingest is
 * what makes "the frame this line appears" mean "the frame it is heard", so the
 * trim happens BEFORE anything is measured.
 */
const trim = (src, dest) => {
  const r = spawnSync("ffmpeg", [
    "-v", "error", "-y", "-i", src,
    "-af",
    "silenceremove=start_periods=1:start_duration=0.05:start_threshold=-45dB:start_silence=0.01," +
      "areverse," +
      "silenceremove=start_periods=1:start_duration=0.05:start_threshold=-45dB:start_silence=0.01," +
      "areverse",
    "-c:a", "libmp3lame", "-q:a", "2", dest,
  ], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) {
    process.stderr.write(r.stderr ?? "");
    throw new Error(`ffmpeg exited ${r.status}`);
  }
};

// ---------------------------------------------------------------- run
const steps = script.steps;
const flat = [];
for (const [stepId, lines] of Object.entries(steps)) {
  lines.forEach((text, i) => flat.push({ stepId, i, text, file: `${stepId}-${i}.mp3` }));
}
console.log(`${id}: ${Object.keys(steps).length} 段, ${flat.length} 句, voice=${voice} rate=${rate}`);
console.log(`engine: ${TTS_BIN}`);

if (DRY) {
  for (const b of flat) console.log(`  ${b.file.padEnd(24)} ${b.text}`);
  console.log("\n--dry：只打印，未合成。");
  process.exit(0);
}

let skipped = 0;
let made = 0;
for (const b of flat) {
  const dest = join(audioDir, b.file);
  if (SKIP && existsSync(dest)) {
    skipped++;
    continue;
  }
  process.stdout.write(`  ${b.file} … `);
  speak(b.text, dest);
  const before = durationOf(dest);
  const raw = join(audioDir, `.raw-${b.file}`);
  renameSync(dest, raw);
  trim(raw, dest);
  unlinkSync(raw);
  const after = durationOf(dest);
  made++;
  console.log(`${before.toFixed(2)}s → ${after.toFixed(2)}s  "${b.text.slice(0, 18)}${b.text.length > 18 ? "…" : ""}"`);
}

// ---------------------------------------------------------------- measure
const result = {};
for (const [stepId, lines] of Object.entries(steps)) {
  result[stepId] = {
    lines: lines.map((text, i) => {
      const name = `${stepId}-${i}.mp3`;
      const file = join(audioDir, name);
      if (!existsSync(file)) throw new Error(`缺少音频 ${file}`);
      return { text, file: `narration/${id}/${name}`, duration: +durationOf(file).toFixed(3) };
    }),
    gap,
  };
}

const outPath = join(outDir, `${id}.json`);
writeFileSync(outPath, JSON.stringify({ id, voice, rate, gap, steps: result }, null, 1));

// A typed index so the bundler statically includes every generated track: a
// dynamic import would leave Remotion unable to see the clips at bundle time.
const known = readdirSync(outDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));
const ident = (k) => "n_" + k.replace(/[^A-Za-z0-9]/g, "_");
writeFileSync(
  join(outDir, "index.ts"),
  [
    "// GENERATED by scripts/tts.mjs — do not edit by hand.",
    `import type { Narration } from "../framework/narration-types";`,
    ...known.sort().map((k) => `import * as ${ident(k)} from "./${k}.json";`),
    "",
    "const TRACKS: Record<string, Narration> = {",
    ...known.sort().map((k) => `  ${JSON.stringify(k)}: ${ident(k)},`),
    "};",
    "",
    "export const getNarration = (id: string): Narration | undefined => TRACKS[id];",
    "",
  ].join("\n"),
);

let total = 0;
for (const [stepId, s] of Object.entries(result)) {
  const d = s.lines.reduce((a, l) => a + l.duration, 0);
  total += d;
  console.log(`  ${stepId.padEnd(12)} ${String(s.lines.length).padStart(2)} 句  ${d.toFixed(2)}s`);
}
console.log(
  `\n语音合计 ${total.toFixed(2)}s（新合成 ${made}，复用 ${skipped}）  ->  ${outPath}`,
);
console.log(`clips: ${audioDir}`);
