import type { FigureFn, Params, Scene, SceneItem, Vec2 } from "../types";
import { amber, blue, green, ink, inkFaint, red, violet } from "../theme";

/**
 * 四棱锥 P-ABCD，PA ⊥ 平面 ABCD，BC ∥ AD，AB ⊥ AD。
 * （2023 年全国甲卷理科第 17 题）
 *
 * 画法照教科书画：斜二测投影，A 被挤到 PBD 内部，所以 AB、AD、PA 三条
 * 被挡住画成虚线 —— 和题目原图一致。投影固定不变，内容文件只管谁该出现。
 *
 * 模型坐标用真实长度，单位是「长度」：
 *   A(0,0,0) B(√2,0,0) C(√2,2,0) D(0,√3+1,0) P(0,0,√2) O(0,1,0)
 *
 * 参数键（都是 0–1 的显露量，除注明外）：
 *   base      八条棱（BC/CD/PB/PC/PD 实线，AB/AD/PA 虚线）
 *   labels    五个顶点名
 *   axes      A 点的坐标三轴
 *   ra:PAAB   A 处 PA ⊥ AB 的直角记号
 *   patch:PAD 侧面 PAD 着色
 *   patch:PAB 侧面 PAB 着色
 *   aux:ABhl  把棱 AB 提亮
 *   sphere    过 P,B,C,D 的球（真实的投影轮廓椭圆）
 *   pt:O      球心 O 的标记与名字
 *   aux:PO    PO 提亮
 *   aux:AC    AC 提亮
 *   aux:ACpar 过 O 作 AC 的平行线（异面直线角要平移才看得见）
 *   arc:angle O 处所成角的弧与 θ
 */

export type P3 = readonly [number, number, number];

const SQRT2 = Math.SQRT2;
const SQRT3 = Math.sqrt(3);

/** 题目给的长度。AD = √3+1 是特意配的，使 AB² = AD·(AD−BC)。 */
export const LEN = { PA: SQRT2, AB: SQRT2, BC: 2, AD: SQRT3 + 1 } as const;

export const V: Record<string, P3> = {
  A: [0, 0, 0],
  B: [LEN.AB, 0, 0],
  C: [LEN.AB, LEN.BC, 0],
  D: [0, LEN.AD, 0],
  P: [0, 0, LEN.PA],
  O: [0, LEN.BC / 2, 0],
};

export const WIDTH = 940;
export const HEIGHT = 800;

// --- 斜二测投影 -------------------------------------------------------------
const SX = 170; // x 轴（AB 方向）每单位像素
const SY = 88; // y 轴（AD 方向）每单位像素 —— 压扁，才像教科书的图
const SZ = 172; // z 轴（AP 方向）每单位像素
const ux = [-0.8, 0.42]; // AB 指向左下
const uy = [0.94, -0.34]; // AD 指向右上
const wz = [0, -1]; // AP 竖直向上

const raw = ([x, y, z]: P3): Vec2 => [
  x * SX * ux[0] + y * SY * uy[0],
  x * SX * ux[1] + y * SY * uy[1] + z * SZ * wz[1],
];

const pts = Object.values(V).map(raw);
const OX = WIDTH / 2 - (Math.min(...pts.map((q) => q[0])) + Math.max(...pts.map((q) => q[0]))) / 2;
const OY = HEIGHT / 2 - (Math.min(...pts.map((q) => q[1])) + Math.max(...pts.map((q) => q[1]))) / 2;

export const sc = (p: P3): Vec2 => [raw(p)[0] + OX, raw(p)[1] + OY];

const sub = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: P3, b: P3): P3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: P3, k: number): P3 => [a[0] * k, a[1] * k, a[2] * k];
const norm = (a: P3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: P3): P3 => mul(a, 1 / (norm(a) || 1));

/** 球过 P,B,C,D，半径就是 |OB| = √3。 */
export const R_SPHERE = norm(sub(V.B, V.O));

/**
 * 球在斜二测下的轮廓是一个椭圆：投影矩阵 T 作用在球面上，像集正是以
 * T(O) 为中心、半轴为 R·σᵢ(T) 的椭圆。这里把 2×3 的投影矩阵的 M·Mᵀ
 * 解析地求特征值，得到两根半轴与转角 —— 不是凭手感画的圆。
 */
const sphereEllipse = (): { c: Vec2; rx: number; ry: number; rotate: number } => {
  // T 的两行
  const r0 = [SX * ux[0], SY * uy[0], 0];
  const r1 = [SX * ux[1], SY * uy[1], SZ * wz[1]];
  const a = r0[0] * r0[0] + r0[1] * r0[1] + r0[2] * r0[2];
  const b = r0[0] * r1[0] + r0[1] * r1[1] + r0[2] * r1[2];
  const d = r1[0] * r1[0] + r1[1] * r1[1] + r1[2] * r1[2];
  const tr = a + d;
  const disc = Math.sqrt(Math.max(0, tr * tr - 4 * (a * d - b * b)));
  const lam1 = (tr + disc) / 2;
  const lam2 = (tr - disc) / 2;
  const theta = 0.5 * Math.atan2(2 * b, a - d);
  return {
    c: sc(V.O),
    rx: Math.sqrt(lam1) * R_SPHERE,
    ry: Math.sqrt(lam2) * R_SPHERE,
    rotate: (theta * 180) / Math.PI,
  };
};
const SPHERE = sphereEllipse();

/** A 处的直角记号：沿 along、跨 across 各走 size 像素的小方块。 */
const rightAngle = (
  at: Vec2,
  along: Vec2,
  across: Vec2,
  size: number,
  color: string,
): Vec2[] => {
  const u = unit2(sub2(along, at));
  const v = unit2(sub2(across, at));
  return [
    at,
    [at[0] + u[0] * size, at[1] + u[1] * size],
    [at[0] + u[0] * size + v[0] * size, at[1] + u[1] * size + v[1] * size],
    [at[0] + v[0] * size, at[1] + v[1] * size],
  ];
};
const sub2 = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const unit2 = (a: Vec2): Vec2 => {
  const n = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / n, a[1] / n];
};

const EDGES_SOLID: readonly (readonly [P3, P3])[] = [
  [V.B, V.C], [V.C, V.D], [V.P, V.B], [V.P, V.C], [V.P, V.D],
];
const EDGES_HIDDEN: readonly (readonly [P3, P3])[] = [
  [V.A, V.B], [V.A, V.D], [V.A, V.P],
];

/** 顶点名的摆放位置，按投影后的实际图形逐个调过。 */
const LABELS: Record<string, { dx: number; dy: number; anchor?: "start" | "middle" | "end" }> = {
  A: { dx: -32, dy: -18, anchor: "end" },
  B: { dx: -26, dy: 40 },
  C: { dx: 30, dy: 34 },
  D: { dx: 34, dy: 10 },
  P: { dx: 0, dy: -32 },
  O: { dx: -18, dy: -44 },
};

export const pyramidFigure = () => {
  const figure: FigureFn = (p: Params): Scene => {
    const items: SceneItem[] = [];

    const A = sc(V.A);
    const B = sc(V.B);
    const C = sc(V.C);
    const D = sc(V.D);
    const P = sc(V.P);
    const O = sc(V.O);

    // --- 侧面着色（在线下面）--------------------------------------------
    items.push(
      {
        key: "patch:PAD",
        kind: "poly",
        points: [P, A, D],
        fill: amber,
        fillOpacity: 0.2,
        stroke: amber,
        strokeOpacity: 0.9,
        width: 2.6,
        dash: "10 7",
        layer: 1,
      },
      {
        key: "patch:PAB",
        kind: "poly",
        points: [P, A, B],
        fill: blue,
        fillOpacity: 0.18,
        stroke: blue,
        strokeOpacity: 0.9,
        width: 2.6,
        dash: "10 7",
        layer: 1,
      },
    );

    // --- 球：先铺一层极淡的实心，再画虚线轮廓 ---------------------------
    items.push({
      key: "sphere:fill",
      reveal: "sphere",
      kind: "ellipse",
      c: SPHERE.c,
      r: SPHERE.rx,
      ry: SPHERE.ry,
      rotate: SPHERE.rotate,
      fill: violet,
      opacity: 0.06,
      layer: 0,
    });
    items.push({
      key: "sphere:rim",
      reveal: "sphere",
      kind: "ellipse",
      c: SPHERE.c,
      r: SPHERE.rx,
      ry: SPHERE.ry,
      rotate: SPHERE.rotate,
      stroke: violet,
      width: 2.4,
      dash: "13 10",
      opacity: 0.55,
      layer: 2,
    });

    // --- 棱 -------------------------------------------------------------
    EDGES_SOLID.forEach(([a, b], i) => {
      items.push({
        key: `edge:solid:${i}`,
        reveal: "base",
        kind: "line",
        from: sc(a),
        to: sc(b),
        stroke: ink,
        width: 2.8,
      });
    });
    EDGES_HIDDEN.forEach(([a, b], i) => {
      items.push({
        key: `edge:hidden:${i}`,
        reveal: "base",
        kind: "line",
        from: sc(a),
        to: sc(b),
        stroke: inkFaint,
        width: 2,
        dash: "8 7",
      });
    });

    // --- A 点的坐标三轴（分别沿 AB、AD、AP），带箭头，才像坐标系 --------
    // 三个方向就是三条棱的方向，所以轴上一定压着一条虚线边；加了箭头尖，
    // 读起来就是「坐标轴」而不是「把某条棱提亮」。
    const AXES: readonly (readonly [string, string, Vec2, Vec2])[] = [
      // name  colour  箭头尖（相对 A）          标签（相对 A）
      ["x", "#DC2626", [-76.8, 40.3], [-114.9, 33.8]],
      ["y", "#16A34A", [90.2, -32.6], [132.2, -75.4]],
      ["z", "#2563EB", [0, -96], [-24, -128]],
    ];
    AXES.forEach(([name, color, tip, lab], i) => {
      items.push({
        key: `axis:${i}`,
        reveal: "axes",
        kind: "arrow",
        from: A,
        to: [A[0] + tip[0], A[1] + tip[1]],
        stroke: color,
        width: 3,
        head: 13,
      });
      items.push({
        key: `axislab:${i}`,
        reveal: "axes",
        kind: "text",
        at: [A[0] + lab[0], A[1] + lab[1]],
        text: name,
        italic: true,
        bold: true,
        family: "serif",
        size: 28,
        color,
      });
    });
    items.push({
      key: "axis:o",
      reveal: "axes",
      kind: "marker",
      at: A,
      r: 5,
      fill: ink,
    });

    // --- 直角记号 -------------------------------------------------------
    // 只在「竖直平面内」画直角：底面几乎侧倒在纸面上，AB ⊥ AD 的记号会扁成
    // 一条细缝，反而误导，所以底面内的直角交给旁白，图上只画 PA ⊥ AB。
    items.push({
      key: "ra:PAAB",
      kind: "poly",
      points: rightAngle(A, sc(V.P), sc(V.B), 26, red),
      fill: red,
      fillOpacity: 0.22,
      stroke: red,
      strokeOpacity: 1,
      width: 2.6,
      layer: 3,
    });

    // --- 被提亮的线与点 --------------------------------------------------
    items.push(
      { key: "aux:ABhl", kind: "line", from: A, to: B, stroke: blue, width: 5, glow: true, layer: 4 },
      { key: "aux:PO", kind: "line", from: P, to: O, stroke: violet, width: 5, glow: true, layer: 4 },
      { key: "aux:AC", kind: "line", from: A, to: C, stroke: amber, width: 5, glow: true, layer: 4 },
    );

    // 过 O 作 AC 的平行线：AC 与 PO 是异面直线，角必须平移后才看得见。
    // 向左下那头刚好收在 CD 边上，向右上那头探出底面，才看得出是「一条线」。
    const acVec = sub(V.C, V.A);
    items.push({
      key: "aux:ACpar",
      kind: "line",
      from: sc(sub(V.O, mul(acVec, 1.1))),
      to: sc(add(V.O, mul(acVec, 2.8))),
      stroke: amber,
      width: 3.4,
      dash: "12 9",
      layer: 4,
    });

    // --- O 处所成角的弧 --------------------------------------------------
    const acDir = unit(acVec);
    const uHat = unit2(sub2(sc(add(V.O, acDir)), O));
    const poDir = unit(sub(V.O, V.P));
    const vHat = unit2(sub2(sc(add(V.O, poDir)), O));
    let a0 = Math.atan2(uHat[1], uHat[0]);
    let a1 = Math.atan2(vHat[1], vHat[0]);
    // 取劣弧
    while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
    const arcR = 66;
    const n = 30;
    const d: string[] = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      d.push(`${i === 0 ? "M" : "L"}${(O[0] + arcR * Math.cos(a)).toFixed(1)},${(O[1] + arcR * Math.sin(a)).toFixed(1)}`);
    }
    items.push({ key: "arc:angle", kind: "path", d: d.join(" "), stroke: green, width: 3, layer: 5 });
    const mid = (a0 + a1) / 2;
    items.push({
      key: "arc:thetalab",
      reveal: "arc:angle",
      kind: "text",
      at: [O[0] + (arcR + 32) * Math.cos(mid), O[1] + (arcR + 32) * Math.sin(mid)],
      text: "θ",
      italic: true,
      bold: true,
      family: "serif",
      size: 34,
      color: green,
      layer: 5,
    });

    // --- 点与名字 --------------------------------------------------------
    for (const [name, l] of Object.entries(LABELS)) {
      const at = name === "O" ? O : sc(V[name]);
      if (name === "O") {
        items.push({
          key: "pt:O",
          kind: "marker",
          at: O,
          r: 10,
          fill: violet,
          ring: violet,
          ringWidth: 3,
          layer: 6,
        });
      } else {
        items.push({
          key: `pt:${name}`,
          reveal: "labels",
          kind: "marker",
          at,
          r: 6,
          fill: ink,
          layer: 6,
        });
      }
      items.push({
        key: `label:${name}`,
        reveal: name === "O" ? "pt:O" : "labels",
        kind: "text",
        at: [at[0] + l.dx, at[1] + l.dy],
        text: name,
        italic: true,
        bold: true,
        family: "serif",
        size: 32,
        color: name === "O" ? violet : ink,
        anchor: l.anchor ?? "middle",
        layer: 6,
      });
    }

    return { width: WIDTH, height: HEIGHT, items };
  };

  figure.defaults = { base: 1, labels: 1 };
  // 本图没有任何「被测量的量」——每个参数都只是开关：要么出要么收。必须把
  // continuous 声明成空数组，否则编译器会认为「没声明 = 全部按连续量滑行」，
  // 球面就会用 26 帧一边缩小一边淡出，看起来像球在塌。
  figure.continuous = [];
  return figure;
};
