# edu-explainer — 题目讲解视频生成框架

> 本目录是 `edu-explainer-video` skill 的 `assets/framework`。先读上一级的 `SKILL.md`。

一道题 → 一份内容文件 → 一条成片。用 [Remotion](https://www.remotion.dev) 4.0.534
实现，遵循官方 `remotion-dev/skills` 规范。

框架里**没有任何一道题的痕迹**。题目、解法、分镜全是数据。

---

## 核心设计：内容即数据

以前每做一道题，都要重写一遍分镜表和一堆 `interpolate(frame, [...])`。现在内容文件
里**不出现任何帧号**：

| 谁来决定 | 什么 |
|---|---|
| **编译器** | 每一步多少帧 —— 由这一步有几行文字算出来 |
| **编译器** | 图形参数怎么从一步过渡到下一步 |
| **内容文件** | 这一步讲什么，图上每个对象该是什么数 |

```tsx
// 一个 step 长这样。注意：没有 from，没有 dur，没有 interpolate。
{
  id: "ad1",
  eyebrow: "证垂直 · 第 2 步",
  heading: "再求向量 AD₁，并算数量积",
  params: { "aux:B1E": 1, "aux:AD1": 1 },   // ← 只说"变了什么"
  lines: [
    { mark: "4", node: <>…</> },
    { mark: "5", node: <>…</> },
  ],
}
```

`params` 是**增量**的：不写的键从上一步继承。所以"关掉高亮 CD 线、打开 AD₁ 和 B₁E"
不需要复述整张状态表。

---

## 加一道新题，要写的东西

### 1. 一个图形构建器（如果已有现成的就跳过）

`src/framework/builders/` 下每个构建器导出**一个纯函数**：

```ts
export const myFigure = (opts) => (p: Params): Scene => {
  // p 是编译器插值好的参数，每一帧都会重新调用
  return { width: 900, height: 600, items: [
    { key: "edge:a", kind: "line", from: pt(A), to: pt(B), stroke: "#16202B" },
    { key: "aux:x", kind: "line", from: pt(X), to: f(p), stroke: blue },
  ] };
};

myFigure.defaults = { box: 1 };   // 默认就亮的（底图），其余一律关闭
```

要点：

- **每个图元的 `key` 就是它的参数名。** 某一步想让 `aux:x` 出现，写
  `params: { "aux:x": 1 }` 就行。
- **端点可以依赖参数**（`to: f(p)`），所以"点 P 沿棱滑动""直线 k 转到某个斜率"
  都是改一个数的事，不需要单独的动画代码。
- **没在 `defaults` 里的参数默认关闭。** 否则后面的辅助线会提前泄漏到前面的步骤
  （这个坑踩过）。
- `layer` 控制遮挡，高层压低层。

现有构建器：`cuboid.ts`（长方体，斜二测投影）、`conic.ts`（椭圆 + 动弦）。

### 2. 一个内容文件

```tsx
import { registerContent } from "../framework/registry";

registerContent({
  id: "my-problem",
  series: "导数 · 恒成立",
  title: "求参数的取值范围",
  figure: myFigure(),
  statement: [ { mark: "题", node: <>…</> } ],
  chapters: [
    { id: "one", label: "审题", steps: [ /* … */ ] },
    { id: "two", label: "求导", steps: [ /* … */ ] },
  ],
  outro: [ /* 可选 */ ],
});
```

### 3. 注册一条 Composition

```tsx
<Composition
  id="my-problem"
  component={ProofVideo}
  width={1920} height={1080} fps={30}
  durationInFrames={compile(getContent("my-problem")).total}
  defaultProps={{ contentId: "my-problem" }}
/>
```

时长是**算出来的**，不是手填的。

---

## 数学排版

中文教材里点名、向量、标量是三种写法，混排会把 `AD₁` 读成 `a·d₁`。框架用三个组件
把它们严格分开：

| 组件 | 类别 | 样式 | 例 |
|---|---|---|---|
| `Nm` | 点名 / 线段名 | 正体 | `B₁E`、`AD₁`、`平面 B₁AE` |
| `Vec` | 向量 | 斜体 + 箭头 | `EB₁`、`n` |
| `Vv` | 斜体标量 | 斜体 | `a`、`t` |

配 `<M>` 定字号、`<Tup>` 加元组括号。

---

## 字体

中文用 Google Fonts 的 `text=` 子集自托管，每族一个可变 woff2（约 76 KB / 100 KB，
而不是 10 MB），渲染不依赖网络。

```bash
npm run fonts     # 扫描源码里的所有非 ASCII 字符，重建子集
npm run check     # 只读体检：有没有漏掉的字（适合接 CI）
```

漏字的表现是渲染到一半出现豆腐块，所以值得跑一次。加了新文案就 `npm run fonts`。

> 子集里**没有斜体**，斜体字元由浏览器合成。对单字母数学变量够用，正文不要用。

---

## 两条现成的样例

| id | 题目 | 图形 | 帧数 |
|---|---|---|---|
| `cuboid-perpendicular` | 长方体中证垂直、判平行 | 3D 斜二测投影 | 1246 |
| `conic-chord` | 椭圆上定过点弦长的最值 | 2D 椭圆 + 动弦 | 692 |

第二条是特意选的：图形类型完全不同，而且步骤在**动一个连续参数** `k` ——弦会真的转到
最优斜率，不是淡入出来的。两条共用同一个 `ProofVideo`。

---

## 目录

```
src/
  framework/
    types.ts        内容契约（Content / Chapter / Step / Scene / SceneItem）
    compile.ts      内容 → 时间轴：算帧号、插值参数
    Scene.tsx       通用 SVG 图元渲染器（line/arrow/poly/circle/ellipse/marker/text/path）
    ProofVideo.tsx  唯一的主时间轴，按 contentId 取内容
    Panel.tsx       右侧逐行揭示面板 + 首尾卡片
    Rail.tsx        顶部章节导航
    Math.tsx        Nm / Vec / Vv 符号系统
    registry.ts     内容注册表
    fonts.ts theme.ts
    builders/
      cuboid.ts     长方体
      conic.ts      椭圆
  content/
    cuboid-perpendicular.tsx
    conic-chord.tsx
scripts/
  build-fonts.mjs   扫描源码 → 重建字体子集
  check-charset.mjs 漏字体检（只读，可接 CI）
```

---

## 命令

```bash
npm install
npm run studio              # 逐帧预览，Studio 里每一步都是独立可编辑的层
npm run render:cuboid       # 单题
npm run render:conic
npm run render:all
npm run check               # 漏字体检 + TypeScript
npm run fonts               # 改过文案后重建字体子集
```

---

## 实现约束

- **零 `Math.random()` / `Date.now()`**，每一帧可复现
- **全部动画由 `useCurrentFrame()` + `interpolate()` 驱动**，没有 CSS 过渡
- **时间量全部来自 `useVideoConfig()` 的 `fps`**
- 组件用 `Interactive.withSchema` 包装，可在 Studio 里交互编辑
- 输出 H.264 / yuv420p / CRF 18，1920×1080，30 fps，无声