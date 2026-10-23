---
name: edu-explainer-video
description: Turn a maths / physics problem into an animated explainer video where the figure and the narration stay in lockstep. Use when asked to make a 讲解视频, 解题视频, explainer video, animated solution, or animated walkthrough for a problem — 立体几何, 解析几何, 函数与导数, 数列, 概率, 物理受力, or any problem with a diagram. Silent by default; when the user wants a voice, generate edge-tts narration with frame-accurate sync, and ship an interactive HTML stepper (with/without audio) alongside. The framework lives in assets/framework. Read this before writing a single line of content.
---

# Problem explainer videos

A framework where **a problem is a data file**, not a component. Give it chapters,
steps and the numbers each step drives the figure to; a compiler works out every
frame number and every transition.

## The one hard rule

**No frame numbers anywhere in a content file.** No `from`, no `durationInFrames`,
no `interpolate(frame, …)`.

A step declares only two things: the words on screen, and *what changed on the
figure*.

```tsx
{
  id: "ad1",
  eyebrow: "证垂直 · 第 2 步",
  heading: "再求向量 AD₁，并算数量积",
  params: { "aux:B1E": 1, "aux:AD1": 1 },   // ← only what changed
  lines: [
    { mark: "5", node: <M size={33}><Vec><Nm>A</Nm><Nm sub="1">D</Nm></Vec> = <Nm sub="1">D</Nm> − <Nm>A</Nm></M> },
  ],
}
```

The compiler derives: how long the step runs (from how many lines it has), how
the figure travels from the previous step to this one, and the total runtime.

`params` is **incremental**. Anything you don't mention is inherited from the
previous step. So "turn off the CD highlight, turn on AD₁ and B₁E" is
`{ "aux:CD": 0, "aux:AD1": 1, "aux:B1E": 1 }` — never a full state dump.

## Check the environment first — always

This pipeline shells out to three things **npm cannot install for you**. A render
that reaches the last step and discovers one missing has burnt several minutes
for nothing, so check before writing content:

```bash
npm run doctor              # the tools every render needs
npm run doctor -- --voice   # adds the ones only narration needs
```

It names each missing tool, prints its official download page, and **exits
non-zero**. Where to send the user:

| Missing | Get it from |
|---|---|
| **ffmpeg / ffprobe** | <https://ffmpeg.org/download.html>（同一个压缩包里有这两个文件，解压后要把目录加进 PATH） |
| **Node.js**（含 npm，18 以上） | <https://nodejs.org/zh-cn/download> |
| **Python 3** | <https://www.python.org/downloads/> |
| **edge-tts** | 装好 Python 后 `pip3 install edge-tts`；主页 <https://github.com/rany2/edge-tts> |

The rules that follow from this:

- **Tell the user what is missing and where to get it, then stop.** Report the
  list from `doctor` verbatim.
- **Do not install system tools for them,** not even with a package manager.
  These are machine-level installs with their own admin prompts and licence
  decisions; quietly running `brew`/`apt` on someone's laptop is worse than
  asking.
- **Do not carry on past a failed check.** Everything downstream assumes ffmpeg
  and ffprobe sit on PATH — the muxer in particular fails halfway through a file
  it has already written.
- **Not having edge-tts does not block a silent film.** Say which dependency
  blocks which deliverable: no ffmpeg → no video at all; no edge-tts → no voice.
  Then ask, rather than deciding for them.

`npm run check` and `npm run tts` run the doctor for you (`precheck` / `pretts`
hooks), so a normal build cannot skip it.

## Setup

```bash
npm run doctor                            # 先体检：缺什么当场说清楚
cp -r <skill>/assets/framework ./edu-explainer   # framework is read-only here
cd edu-explainer
npm install
npx remotion browser ensure                   # one-time Chrome download
```

`npm install` pulls Remotion. The fonts are already vendored in `public/fonts`.
If `doctor` failed, hand the list to the user and wait — do not proceed on the
assumption it can be sorted out later.

## Adding a problem

1. **Pick a figure.** Check `assets/framework/src/framework/builders/` first:

   | Builder | Draws |
   |---|---|
   | `cuboid.ts` | 长方体 / 立方体，点线面，向量与数量积 |
   | `conic.ts` | 圆锥曲线：椭圆、弦、焦点 |
   | `pyramid.ts` | 棱锥：球心、截面、异面直线 |
   | `rotate.ts` | 旋转体与旋转中的不变量 |
   | `river.ts` | 平面上的最短路径（将军饮马一类） |
   | `mechanics.ts` | 物理受力：物块、斜面、冰面 / 粗糙面、弹簧 |
   | `circle.ts` | 圆与三角形：内心、角平分线、弧中点、相似三角形 |
   | `graph.ts` | 坐标系与函数图像：切线、割线、积分阴影、极值 |
   | `numberline.ts` | 数轴与解集：区间滑动、开闭端点 |
   | `triangle.ts` | 一般三角形：中线、高、角平分线、中位线、A 字相似 |
   | `quad.ts` | 四边形家族：平行四边形 → 矩形 → 菱形 → 梯形连续变形 |
   | `twocircles.ts` | 两圆位置关系：五种关系随圆心距连续变化 |
   | `sphere.ts` | 球与截面：截面圆沿轴移动，r² = R² − h² 实时可见 |
   | `vector.ts` | 平面向量：平行四边形法则、正交分解、λ 缩放 |
   | `stats.ts` | 统计图表：柱状图、频率折线、平均线滑动 |
   | `optics.ts` | 几何光学：反射、折射（实时 Snell）、全反射 |
   | `kinematics.ts` | 运动学：v-t / s-t 图、面积即位移、追及相遇 |
   | `projectile.ts` | 抛体：平抛 / 斜抛，速度分解、轨迹、射程 |
   | `lever.ts` | 杠杆：支点、动力 / 阻力、力臂，F₁l₁ = F₂l₂ |
   | `pulley.ts` | 滑轮组：定 / 动滑轮、绳段数 n、省力比 G/n |
   | `buoyancy.ts` | 浮力：排开液体、阿基米德原理、浮沉条件 |
   | `circuit.ts` | 电路：电源 / 灯泡 / 电阻 / 电表、串并联、滑变 |
   | `atom.ts` | 原子结构：原子核、电子层排布、离子得失电子 |
   | `molecule.ts` | 分子：球棍模型、共价键、路易斯电子式（水 / 氯化钠） |
   | `lab.ts` | 实验装置：铁架台 / 酒精灯 / 试管 / 导管 / 集气瓶 / 漏斗，可组合 |
   | `solubility.ts` | 溶解度曲线：多条曲线、温度滑竿、饱和点 |

   每个构建器的参数键都写在自己的文件头注释里。实拍效果见
   `references/gallery/*.png`——每张都是对应构建器真实渲染的一帧。

   If none matches, write one — see `references/building-figures.md`.
2. **Write the content file** in `src/content/<id>.tsx`, call `registerContent`
   at module scope, and import it from `src/index.ts`.
3. **Register the composition** in `src/Root.tsx`:

```tsx
<Composition
  id="my-problem"
  component={ProofVideo}
  width={1920} height={1080} fps={30}
  durationInFrames={filmFrames(getContent("my-problem"), FPS)}   // cards included
  defaultProps={{ contentId: "my-problem" }}
/>
```

**`filmFrames`, never `compile(...).total`** — unless you pass the narration:
`compile(content, narration, FPS).total` is the whole film, cards included
(the compiler lays the cards out as `_statement` / `_outro` pseudo-steps).
`filmFrames(content, FPS)` is the narration-less spelling of the same call.
Timing a narrated film without its narration clips the last sentence
(`references/lessons-learned.md` #5).

Then `npm run render:my-problem`.

`ProofVideo` takes a **content id**, never a content object: a Composition's
`defaultProps` are serialised into the bundle and a Content carries React nodes
and functions that would not survive the trip.

## Symbol system

Chinese textbooks write three kinds of thing differently, and mixing them up is
the most common way to make a maths video *look* wrong. Use the right component:

| Component | Stands for | Looks like |
|---|---|---|
| `Nm` | point / segment **name** | upright: `B₁E`, `AD₁`, `平面 B₁AE` |
| `Vec` | **vector** | oblique + arrow: `EB₁`, `n` |
| `Vv` | italic **scalar** | `a`, `t`, `k` |
| `M` | any maths run | sets size and colour |
| `Tup` | a tuple | `( a/2, 1, 0 )` |

`AD₁` set in `Vv` reads as `a·d₁`. That single mistake costs more credibility
than any animation bug.

## Before you render anything

**Never go straight to the full render.** Both expensive mistakes caught so far
were invisible until late.

```bash
npm run check                              # charset gate + tsc
npx remotion still my-problem out/f.png --frame=420
```

Look at the still. Then sample the whole timeline:

```bash
npx remotion render my-problem out/frames --frames=0,120,300,480,700 --image-format=png
```

Details in `references/lessons-learned.md`.

## Fonts

Chinese uses Google Fonts `text=` subsets vendored in `public/fonts` — two
variable woff2 files, ~76 KB and ~100 KB instead of 10 MB. Rendering never
touches the network.

- **After editing any copy**, run `npm run fonts`. It scans the sources for every
  non-ASCII character and rebuilds the subset.
- `npm run check` fails if the sources contain a character the subset lacks.
  Missing glyphs render as tofu boxes mid-video, so this gate is worth running.
- Subsets have no italic. The oblique on maths variables is synthesised by the
  browser, which is right for single letters and wrong for running prose.

## Voice it — TTS narration (edge-tts)

**Ask first.** Narration triples the runtime and is a different deliverable, so
offer it as a question before doing it — "要配旁白吗？" — and default to silent
when the user does not answer. When they do want it:

```
narration/<id>.json ──▶ npm run tts ──▶ public/narration/<id>/*.mp3 (trimmed)
                                     └▶ src/narration/<id>.json (measured)
                                            │
content + measured ──▶ compile ──▶ timeline（每一句的出现帧）
                                            │
        render（无声，但按配音时长）─▶ mux ──▶ verify ──▶ out/<id>-voiced.mp4
```

The one rule: **the timeline is fitted to the audio, never the reverse.** The
compiler reads measured durations (`src/narration/<id>.json`), so the picture
and the voice are two consumers of one set of numbers and cannot drift.

1. **Write `narration/<id>.json`** — one entry per step id, one string per
   on-screen line, **counts must match exactly** (`npm run check` gates this;
   a mismatch shifts every later sentence against its own audio without
   erroring). Write *speakable Chinese*: `½∠A` → `二分之一角A`, `x²` →
   `x的平方`, `∽` → `相似于`. `voice_id` picks the edge-tts voice
   (`zh-CN-XiaoxiaoNeural` is a good teaching default), `rate` its pace
   (`-4%` slightly slow), `gapAfterLineSec` the silence between lines.
2. `npm run tts -- <id>` — synthesises per line with edge-tts (no API key;
   install with `pip install edge-tts`, or point `TTS_BIN` at it), **trims the
   ~0.2 s of leading silence every clip ships with**, then measures with
   ffprobe. Trim before measuring: an untrimmed pad puts the text on screen a
   fifth of a second before the voice, outside the 45–80 ms humans tolerate.
   Re-runs are safe with `--skip-existing`.
3. `npm run check:narration -- <id>` — the count gate.
4. `npm run timeline -- <id>` — snapshot the compiled schedule to
   `out/.audio/<id>-timeline.json`. The muxer reads this file instead of
   recompiling, so two processes cannot disagree.
5. Render the silent video **at the narrated length** to
   `out/.audio/<id>-silent.mp4` — not to `out/<id>.mp4`, which is the short
   silent cut. `remotion render <id>` already picks up the narration from
   `src/narration/`, so the same command produces the long cut.
6. `npm run mux -- <id>` — per-line `adelay` onto one track (`amix` with
   `normalize=0`, then `apad`), `-c:v copy` into the video.
7. `npm run verify:sync -- <id>` — mechanical check, sampled across the runtime:
   speech energy must jump out of the gap at each cue (~−91 dB → ~−16 dB) and
   the panel must change against its own control. Ship the numbers, not
   "looks in sync".

One command does 3–7: `npm run voiced:circle` (rename per problem).

**Report the measured duration and say the voice id.** Speech needs the room —
a 46 s silent cut becoming 3 min 50 s of narration is correct, not a bug. To
shorten it, cut sentences; never push the rate past natural.

## Also ship it as something clickable

```bash
npm run player -- <content-id>   # -> out/player/  (bundle + fonts + voice.m4a)
npm run serve:player             # -> http://localhost:8080/  (Range-capable server)
```

The id is baked into the bundle by `scripts/build-player.mjs` (esbuild `define`s
`__CONTENT_ID__`); with no id it falls back to `circle-incenter`. **Add the new
content file to the import list in `src/player/index.tsx`** — content registers
on import, and esbuild only follows what is named there.

Publishing it next to other files (a repo, a static host) instead of `out/`:

```bash
PLAYER_OUT=../site/player SITE_PREFIX=../ FILM_FILE=<id>.mp4 \
  node scripts/build-player.mjs <content-id>
```

`PLAYER_OUT` is where the page is written, `SITE_PREFIX` makes the page look for
`player.webm` / the MP4 one level up (so the film is stored once), and `FILM_FILE`
adds the plain `<video>` under the stepper. **Encode a `player.webm` for GitHub
Pages**: Pages serves `.mp4` as `application/octet-stream` and Chrome refuses to
play it, while `.webm` comes back as `video/webm` — the page lists webm first and
mp4 second for exactly that reason.

`src/player/App.tsx` renders the same `ProofVideo` with `remotion` aliased, at
bundle time, to `src/player/runtime.tsx` — a ~250-line Remotion-compatible
runtime. Nothing is redrawn for the web, so the stepper cannot drift from the
MP4. It offers **two cuts of the same problem**: 带配音 (the narrated timeline,
audio is the clock) and 不带配音 (the silent timeline, shorter because nothing
waits on a voice) — a mode, not a mute button.

Rules baked into the player that are easy to get wrong:

- **Audio leads; the frame follows.** Never a wall-clock loop correcting the
  audio toward itself — that replays the same sentence whenever rendering lags.
- **Scale the 1920×1080 composition as a whole** (`transform: scale`), never
  re-layout it with CSS.
- **The server must support HTTP Range** or the audio cannot be seeked and the
  player looks broken while the page is innocent. `python3 -m http.server` does
  NOT; use `npm run serve:player`.
- Jumping lands on the step's **first spoken line**, not its first frame — the
  panel fades in, so `from + 1` is an empty box.

## Deliverables

H.264 / yuv420p / CRF 18, 1920×1080, 30 fps. Silent unless narration was asked
for; then also ship `out/<id>-voiced.mp4` with the verification numbers, and
state the voice id. The interactive player is a third deliverable when the user
wants something clickable — `out/player/` plus the serve command.

## References

- `references/content-api.md` — the full `Content` type, every field
- `references/building-figures.md` — writing a new figure builder
- `references/lessons-learned.md` — the four bugs that hit during the build, and
  the rule each one produced
