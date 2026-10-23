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
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// PLAYER_OUT lets a repo host the built page next to its own files:
//   PLAYER_OUT=../<repo>/videos/<problem>/player npm run player -- <content-id>
const OUT = process.env.PLAYER_OUT ? resolve(ROOT, process.env.PLAYER_OUT) : join(ROOT, "out/player");
const id = process.argv[2] ?? "circle-incenter";

// Optional: SITE_PREFIX points at media that lives one level up, in the folder
// that hosts this bundle (the repo keeps the MP4 next to player/ so the page can
// show the same film without shipping a second copy).
const SITE_PREFIX = process.env.SITE_PREFIX ?? "";

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
  define: {
    "process.env.NODE_ENV": '"production"',
    // The page is a single static build per problem, so the id is baked in.
    __CONTENT_ID__: JSON.stringify(id),
  },
  minify: true,
  sourcemap: false,
  logLevel: "info",
  alias: {
    remotion: join(ROOT, "src/player/runtime.tsx"),
    "@remotion/fonts": join(ROOT, "src/player/fonts-noop.ts"),
  },
});

// ---------------------------------------------------------------- assets
// index.html links fonts/…, so the font files belong in fonts/ — NOT at the
// bundle root, or the page silently falls back to a system font and the CJK
// subset that was built for this problem never gets used. Mirror the tree in
// public/ (fonts/) into the bundle root, and carry over anything a voiced
// build produced there (media/, narration.json).
//
// Pre-check the destination instead of letting cpSync discover it: on Windows an
// overwrite can fail while the target is being read (preview server, editor,
// antivirus scan), and node reports that as a bogus errno 0 / "operation
// completed successfully". The bytes are identical, so leaving an existing file
// alone is both cheaper and safer.
const copyPublic = (dir, into = "") => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = into ? `${into}/${e.name}` : e.name;
    if (e.isDirectory()) {
      mkdirSync(join(OUT, rel), { recursive: true });
      copyPublic(join(dir, e.name), rel);
    } else if (!existsSync(join(OUT, rel))) {
      cpSync(join(dir, e.name), join(OUT, rel), { force: false });
    }
  }
};
copyPublic(join(ROOT, "public"));

/**
 * The audio is the very track that was mixed into the MP4, so playback and file
 * cannot disagree. Taken from out/.audio rather than re-extracted from the
 * video: one file, one clock.
 *
 * narration.json is what gives the page its voiced timeline; src/narration/ only
 * carries it when it was generated inside this checkout, so the copy here is
 * what makes a player built elsewhere behave the same.
 */
const track = join(ROOT, "out/.audio", `${id}-track.m4a`);
let sound = false;
if (existsSync(track)) {
  cpSync(track, join(OUT, "media/voice.m4a"), { force: false });
  sound = true;
}
const measured = join(ROOT, `narration/${id}.json`);
if (existsSync(measured)) {
  cpSync(measured, join(OUT, "narration.json"), { force: false });
  sound = true;
}

// The film and the webm fallback sit next to this bundle, in the folder that
// hosts it. Only advertise a source whose file is actually there: a <source>
// pointing at a missing file is a silent failure that looks like the page is
// broken. Sibling of OUT is where a repo keeps them (player/ next to the mp4).
const beside = (name) =>
  name && (existsSync(join(OUT, "..", name)) || existsSync(join(OUT, name)))
    ? SITE_PREFIX + name
    : "";
const FILM_FILE = process.env.FILM_FILE ?? "";
const FILM_URL = beside(FILM_FILE.split(/[\\/]/).pop());
const WEBM = beside(process.env.WEBM_FILE ?? "player.webm");
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
  .film { display: flex; justify-content: center; padding: 8px 40px 28px; }
  .film video { width: 100%; max-width: 1100px; border-radius: 14px;
    box-shadow: 0 6px 28px rgba(22,32,43,0.12); background: #0F172A; }
</style>
</head>
<body>
<div id="root"></div>
<script src="./bundle.js"></script>
<script>
// 同一道题，两种看法：上面是逐步播放器（点步骤、拖动进度），下面是成片。
// 成片的路径由构建脚本写进来；空字符串就整块不渲染，不在页面上留一个坏播放器。
(function () {
  var film = "{{FILM}}";
  var webm = "{{WEBM}}";
  if (!film && !webm) return;
  var wrap = document.createElement("div");
  wrap.className = "film";
  // 先放 webm（小、GitHub Pages 直接给 video/webm），再放 mp4 兜底：
  // Pages 给 .mp4 的 Content-Type 是 octet-stream，Chrome 会拒播，所以顺序不能反。
  var sources = [];
  if (webm) sources.push('<source src="' + webm + '" type="video/webm">');
  if (film) sources.push('<source src="' + film + '" type="video/mp4">');
  wrap.innerHTML =
    '<video controls preload="metadata" playsinline>' + sources.join("") + "</video>";
  document.body.appendChild(wrap);
})();
</script>
</body>
</html>
`.replace("{{FILM}}", FILM_URL).replace("{{WEBM}}", WEBM),
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

放到网上（GitHub Pages / 任意静态托管）：把这个目录整个传上去即可，
index.html 用的是相对路径。可分享的深链接：
  ?f=<帧号>          落在某一帧
  ?mode=silent       直接打开无配音版
` +
    (sound
      ? ""
      : `
注意：本次构建没有 FPS 测量过的音轨，所以「带配音」用的是和静默版一样的时间线
（也就是你在 MP4 里看到的那条）。要真配音，先跑 npm run tts 生成 narration/ 与音轨。
`),
);

console.log(`\nplayer -> ${OUT}`);
console.log(`  ${sound ? "音轨已就位 media/voice.m4a" : "没有音轨，两条时间线相同（都是 MP4 那条）"}`);
console.log("  起服务: npm run serve:player   -> http://localhost:8080/  (支持 Range)");
