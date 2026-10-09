#!/usr/bin/env node
/**
 * Bundle the clickable stepper into a folder you can open in a browser.
 *
 * The player renders the SAME components the MP4 came from, driven by the SAME
 * compiled timeline, with `remotion` aliased to a ~250-line runtime — so the
 * picture here cannot drift from the picture in the file. The render pipeline
 * still uses real Remotion; only this browser bundle is aliased.
 *
 *   node scripts/build-player.mjs [content-id]
 */

import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out/player");
const id = process.argv[2] ?? "circle-incenter";

const clear = (dir) => {
  try {
    // A preview server may still hold a handle on a media file; EBUSY is not a
    // reason to refuse to rebuild.
    rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch (e) {
    console.warn(`  (保留 ${dir}：${e.code ?? e.message})`);
  }
};
clear(OUT);
mkdirSync(join(OUT, "media"), { recursive: true });
mkdirSync(join(OUT, "fonts"), { recursive: true });

// ---------------------------------------------------------------- bundle
await build({
  entryPoints: [join(ROOT, "src/player/index.tsx")],
  bundle: true,
  outfile: join(OUT, "bundle.js"),
  // esbuild emits bundle.css alongside when the entry imports CSS — index.html
  // has to link it or the page renders completely unstyled.
  format: "iife",
  platform: "browser",
  target: ["chrome110", "firefox110", "safari16"],
  jsx: "automatic",
  loader: { ".json": "json", ".woff2": "file", ".css": "css" },
  define: { "process.env.NODE_ENV": '"production"' },
  minify: true,
  sourcemap: false,
  logLevel: "info",
  alias: {
    remotion: join(ROOT, "src/player/runtime.tsx"),
    "@remotion/fonts": join(ROOT, "src/player/fonts-noop.ts"),
  },
});

// ---------------------------------------------------------------- assets
for (const f of ["sans-400.woff2", "serif-400.woff2"]) {
  cpSync(join(ROOT, "public/fonts", f), join(OUT, "fonts", f));
}

/**
 * The audio is the very track that was mixed into the MP4, so playback and file
 * cannot disagree. Taken from out/.audio rather than re-extracted from the
 * video: one file, one clock.
 */
const track = join(ROOT, "out/.audio", `${id}-track.m4a`);
let sound = false;
if (existsSync(track)) {
  cpSync(track, join(OUT, "media/voice.m4a"));
  sound = true;
}

writeFileSync(
  join(OUT, "index.html"),
  `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>题目讲解 · 逐步播放</title>
<link rel="stylesheet" href="./bundle.css" />
<style>
  @font-face { font-family: "Noto Sans SC"; src: url("./fonts/sans-400.woff2") format("woff2");
    font-weight: 400 900; font-display: block; }
  @font-face { font-family: "Noto Serif SC"; src: url("./fonts/serif-400.woff2") format("woff2");
    font-weight: 400 900; font-display: block; }
</style>
</head>
<body>
<div id="root"></div>
<script src="./bundle.js"></script>
</body>
</html>
`,
);

writeFileSync(
  join(OUT, "README.txt"),
  `题目讲解 · 逐步播放器
${id}

启动（必须走 http，不能直接双击 index.html）：

  npm run serve:player

然后打开 http://localhost:8080/

注意：不要用 python3 -m http.server。它不支持 Range 请求，
浏览器无法 seek 音频，会表现为「画面在走、声音不动」——
看起来像播放器坏了，其实问题在服务端。

界面：
  顶部可切换「带配音 / 不带配音」，两条不同的时间线。
  右侧是全部步骤，点一下即跳到该步骤第一句被念出的那一帧。
  快捷键：← 上一步   → 下一步   空格 播放/暂停   Home 回到开头
` + (sound ? "" : "\n（本次构建没有找到配音音轨，只能看无配音版。）\n"),
);

console.log(`\nplayer -> ${OUT}`);
console.log(`  ${sound ? "音轨已就位 media/voice.m4a" : "没有音轨，仅有配音版时间线"}`);
console.log("  起服务: npm run serve:player   -> http://localhost:8080/  (支持 Range)");
