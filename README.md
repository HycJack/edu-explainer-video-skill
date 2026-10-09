# edu-explainer-video

一道题 → 一份内容文件 → 一条成片。

这个包把「用 Remotion 做题目讲解视频」这件事沉淀成了一个 skill：agent 读完
`SKILL.md` 就能自己加题、出片，不需要每次重新摸索分镜、时间轴和排版的坑。

---

## 包里有什么

```
edu-explainer-video/
├── SKILL.md                          ← agent 的操作手册，先读这个
├── references/
│   ├── content-api.md                Content 类型的完整字段说明
│   ├── building-figures.md           怎么写一个新的图形构建器
│   ├── gallery/                      每个构建器真实渲染的一帧
│   └── lessons-learned.md            踩过的坑，和每个坑换来的一条规则
└── assets/
    └── framework/                    框架本体（可直接运行的 Remotion 项目）
        ├── src/framework/            编译器、图元渲染器、面板、符号系统、旁白时钟
        │   ├── narration.ts          实测语音 → 每句台词的出现帧
        │   └── builders/             图形构建器 ×26：长方体、椭圆、棱锥、旋转体、
        │                             平面最短路径、物理受力、圆与内心、函数图像、
        │                             数轴、三角形、四边形、两圆、球、向量、统计、
        │                             光学、运动学、抛体、杠杆、滑轮组、浮力、电路、
        │                             原子结构、分子、实验装置、溶解度曲线
        ├── src/player/               浏览器播放器：remotion 的 ~250 行替身 +
        │                             App（步骤导航、配音/静默双时间线）
        ├── src/content/              三道样例题（纯数据）
        ├── narration/                旁白稿样例（circle-incenter.json）
        ├── scripts/
        │   ├── build-fonts.mjs       扫源码 → 重建中文字体子集
        │   ├── check-charset.mjs     漏字体检（只读，可接 CI）
        │   ├── tts.mjs               edge-tts 逐句合成 → 剪静音 → ffprobe 实测
        │   ├── check-narration.ts    屏幕行数 / 配音句数对齐闸门
        │   ├── dump-timeline.ts      导出编译时间线（混音器读它，不重算）
        │   ├── mux-audio.mjs         adelay 逐句铺轨 → 混进视频
        │   ├── verify-sync.mjs       音画机械校验（能量跳变 + 画面变化比）
        │   ├── build-player.mjs      打包可交互 HTML
        │   └── serve-player.mjs      带 Range 的静态服务
        ├── public/fonts/             自托管字体子集 76 KB + 100 KB
        └── README.md                 框架原理
```

---

## 怎么用

### 给 agent 用

把 `edu-explainer-video/` 放进 skills 目录，然后告诉 agent：

> 用 edu-explainer-video 出一道题的视频，题目是：……

agent 会自己读 `SKILL.md`、挑构建器、写内容文件、注册 composition、检查、渲染。

### 给自己用

```bash
cp -r assets/framework ./my-video
cd my-video
npm install
npx remotion browser ensure      # 一次性下载 Chrome

npm run studio                   # 逐帧预览
npm run render:cuboid            # 渲染样例一
npm run render:conic             # 渲染样例二
npm run check                    # 漏字体检 + TypeScript + 行数对齐

# 配旁白（edge-tts，需 pip install edge-tts）：
npm run voiced:circle            # 旁白稿 → 合成 → 混音 → 机械校验 → 成片

# 可交互 HTML（带配音 / 不带配音可切换）：
npm run player && npm run serve:player   # -> http://localhost:8080/
```

加一道新题，看 `SKILL.md` 的「Adding a problem」，三步。

---

## 这个框架值钱在哪

**内容即数据。内容文件里不出现任何帧号。**

一道题的内容长这样：

```tsx
{
  id: "ad1",
  heading: "再求向量 AD₁，并算数量积",
  params: { "aux:B1E": 1, "aux:AD1": 1 },
  lines: [ { mark: "5", node: <>…</> }, … ],
}
```

没有 `from`，没有 `durationInFrames`，没有 `interpolate`。每一步多少帧、图形怎么
从这一步过渡到下一步，全部由编译器算出来。参数是增量的——不写的键从上一步继承。

**有旁白时，时钟换成实测的语音。**

旁白稿是独立文件（`narration/<id>.json`），每句念什么、屏幕上那行长什么样，各自
编辑。`tts` 逐句合成、剪掉每段开头约 0.2 秒的静音、ffprobe 实测时长，编译器再拿
这些实测值排出每一句的出现帧——画面和声音是同一组数字的两个消费者，想跑偏都没门。
混音器读的是同一份时间线快照，最后还有一道机械校验：在每个采样点上，语音能量必须
从间隙的 −91 dB 跳到句中的 −16 dB，画面变化必须显著大于它自己的控制组。

**图形是参数的纯函数，不是画死的。**

```ts
{ key: "seg", kind: "line", from: pt(A), to: movingPoint(p.t) }
```

所以「点沿棱滑动」「直线转到最优斜率」是改一个数的事，不是淡入淡出。

**通用性是被验证过的，不是声称的。**

框架里留了两道样例题：长方体立体几何（3D 斜二测投影 + 向量）和椭圆弦长最值
（2D 曲线 + 韦达定理 + 基本不等式）。图形类型、推理方式完全不同，共用同一个
`ProofVideo`。

`builders/` 里其余的构建器——棱锥、旋转体、将军饮马、物理受力、圆与内心、函数图像、
数轴、三角形、四边形、两圆、球、向量、统计、光学、运动学、抛体、杠杆、滑轮组、浮力、
电路、原子结构、分子、实验装置、溶解度曲线——也都是实际出片或逐帧验证过的，
不是占位。选型时先看 SKILL.md 的选型表和 `references/gallery/` 实拍图，再决定要不要自己写。

---

## 为什么有 references/lessons-learned.md

因为这框架是踩着坑长出来的。七个 bug 全都过了类型检查、过了打包、大部分还过了
渲染，全都不在语法层和算法层。

其中一个是**几何事实错误**：AI 在两条异面直线的「交点」上画了直角标记，因为
「垂直就该相交」这个桌面直觉。这是最贵的一类错——它看起来像证明。

Skill 里有完整记录。改框架之前值得先读一遍。
