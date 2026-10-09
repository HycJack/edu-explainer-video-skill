import type { Params, Scene, SceneItem, Vec2 } from "../types";
import { amber, blue, green, inkMuted, red, sky, violet } from "../theme";

/**
 * A flat mechanics stage: ground, blocks, a cart, a pulley, force arrows.
 *
 * Each scene is namespaced by a leading digit in its parameter key, so "2:run"
 * drives only the friction comparison and nothing else. Several elements of a
 * scene share one reveal key, so a content file can switch a whole group on or
 * off with a single number.
 *
 * The figure is a pure function of the parameters — block positions, arrow
 * lengths and even the numbers printed on the stage are computed from them, so
 * a step that changes one number makes the diagram DO the physics instead of
 * merely fading in.
 *
 * Arrow length is a real multiple of a real quantity in every scene, with the
 * scale fixed once per scene. A force arrow that disagrees with the numbers is
 * worse than no arrow at all.
 */

export const STAGE_W = 940;
export const STAGE_H = 800;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 2 → "2", 5.5 → "5.5". */
const num = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1));

const roundRect = (x: number, y: number, w: number, h: number, r: number): string =>
  `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} ` +
  `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} ` +
  `V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;

/** A zig-zag spring from x0 to x1 at height y. */
const springPath = (x0: number, x1: number, y: number, coils: number, amp: number): string => {
  const lead = 10;
  const span = Math.max(2, x1 - x0 - lead * 2);
  const n = coils * 2;
  let d = `M ${x0.toFixed(1)} ${y} L ${(x0 + lead).toFixed(1)} ${y}`;
  for (let i = 1; i < n; i++) d += ` L ${(x0 + lead + (span * i) / n).toFixed(1)} ${(y + (i % 2 === 1 ? -amp : amp))}`;
  d += ` L ${(x1 - lead).toFixed(1)} ${y} L ${x1.toFixed(1)} ${y}`;
  return d;
};

// ---------------------------------------------------------------- primitives

type TextOpts = {
  readonly size?: number;
  readonly color?: string;
  readonly family?: "sans" | "serif";
  readonly italic?: boolean;
  readonly bold?: boolean;
  readonly anchor?: "start" | "middle" | "end";
  readonly opacity?: number;
};

const T = (key: string, at: Vec2, s: string, reveal?: string, o: TextOpts = {}): SceneItem => ({
  key,
  ...(reveal ? { reveal } : {}),
  kind: "text",
  at,
  text: s,
  size: o.size ?? 26,
  color: o.color ?? "#16202B",
  family: o.family ?? "sans",
  italic: o.italic ?? false,
  bold: o.bold ?? false,
  anchor: o.anchor ?? "middle",
  opacity: o.opacity ?? 1,
});

type ArrowOpts = {
  readonly width?: number;
  readonly head?: number;
  readonly labelSize?: number;
  readonly labelSide?: "tip" | "mid";
  readonly labelOffset?: Vec2;
  readonly labelAnchor?: "start" | "middle" | "end";
};

/** An arrow along (dx, dy) from `from`, `len` long, with an optional label. */
const arw = (
  out: SceneItem[],
  key: string,
  from: Vec2,
  dx: number,
  dy: number,
  len: number,
  color: string,
  label?: string,
  reveal?: string,
  o: ArrowOpts = {},
): void => {
  if (len < 1.5) return;
  const n = Math.hypot(dx, dy) || 1;
  const ux = dx / n;
  const uy = dy / n;
  const tip: Vec2 = [from[0] + ux * len, from[1] + uy * len];
  out.push({ key, ...(reveal ? { reveal } : {}), kind: "arrow", from, to: tip, stroke: color, width: o.width ?? 4.6, head: o.head ?? 17, glow: true });
  if (!label) return;
  const base: Vec2 = o.labelSide === "mid" ? [from[0] + (ux * len) / 2, from[1] + (uy * len) / 2] : tip;
  out.push(
    T(
      `${key}:lab`,
      [base[0] + (o.labelOffset?.[0] ?? ux * 18), base[1] + (o.labelOffset?.[1] ?? uy * 18)],
      label,
      reveal,
      {
        family: "serif",
        italic: true,
        bold: true,
        color,
        size: o.labelSize ?? 30,
        anchor: o.labelAnchor ?? (ux > 0.3 ? "start" : ux < -0.3 ? "end" : "middle"),
      },
    ),
  );
};

const caption = (out: SceneItem[], key: string, cx: number, y: number, s: string, color: string, size = 25, reveal?: string): void => {
  out.push(T(key, [cx, y], s, reveal, { family: "sans", bold: true, color, size }));
};

// ----------------------------------------------------------------- scene 0

/**
 * The title-card backdrop. A correct little free-body fact: m = 2 kg on a
 * frictionless floor with F = 6 N gives a = 3 m/s². Scale 24 px per newton,
 * 40 px per m/s².
 */
const heroScene = (): SceneItem[] => {
  const PXN = 24, PXA = 40, FORCE = 6, M = 2;
  const a = FORCE / M;                          // 3 m/s²
  const gy = 700;
  const bx = 292, bw = 200, bh = 166;
  const cy = gy - bh / 2;

  const items: SceneItem[] = [];
  items.push({ key: "0:ground", reveal: "0:ground", kind: "line", from: [84, gy], to: [876, gy], stroke: inkMuted, width: 3 });
  for (let i = 0; i <= 7; i++) items.push({ key: `0:h${i}`, reveal: "0:ground", kind: "line", from: [106 + i * 108, gy], to: [84 + i * 108, gy + 24], stroke: "#C2CAD4", width: 2 });
  items.push({ key: "0:block", reveal: "0:block", kind: "path", d: roundRect(bx, gy - bh, bw, bh, 18), fill: "#DBE8FB", stroke: blue, width: 4 });
  items.push(T("0:lab", [bx + bw / 2, cy - 4], "m = 2 kg", "0:block", { family: "sans", bold: true, color: blue, size: 31 }));
  arw(items, "0:F", [bx + bw + 30, cy - 30], 1, 0, FORCE * PXN, violet, "F = 6 N", "0:F", { labelOffset: [0, -22], labelAnchor: "middle", labelSide: "mid", labelSize: 30 });
  arw(items, "0:a", [bx + bw + 30, cy + 44], 1, 0, a * PXA, amber, "a = 3 m/s²", "0:a", { labelOffset: [0, -22], labelAnchor: "middle", labelSide: "mid", labelSize: 30 });
  return items;
};

// ----------------------------------------------------------------- scene 1

/**
 * A block gliding on a frictionless surface.
 *   1:pos   0→1 sweeps the block along the surface
 *   1:push  the initial shove, present for an instant only
 *   1:ghost trailing positions at equal time intervals
 *   1:ticks equal-interval marks on the surface — the evidence for v = const
 */
const scene1 = (p: Params): SceneItem[] => {
  const pos = clamp(p["1:pos"] ?? 0, 0, 1);
  const gy = 552;
  const bw = 172, bh = 122;
  const x0 = 326, x1 = 706;
  const bx = x0 + (x1 - x0) * pos;

  const items: SceneItem[] = [];
  items.push({ key: "1:surf", reveal: "1:ice", kind: "poly", points: [[104, gy], [876, gy], [876, gy + 66], [104, gy + 66]], fill: "#DCEEFB" });
  items.push({ key: "1:sline", reveal: "1:ice", kind: "line", from: [104, gy], to: [876, gy], stroke: sky, width: 3 });
  caption(items, "1:sname", 490, gy + 46, "光滑水平面（无摩擦）", sky, 27, "1:ice");

  for (let i = 0; i < 8; i++) items.push({ key: `1:t${i}`, reveal: "1:ticks", kind: "line", from: [136 + i * 95, gy], to: [136 + i * 95, gy - 22], stroke: "#7FB5D6", width: 2.6 });
  caption(items, "1:tname", 490, 668, "地面上等间隔的刻线 = 等时间间隔", "#3E6E8C", 23, "1:ticks");

  // Spaced exactly one tick apart, so the trail lands on the marks.
  for (let k = 3; k >= 1; k--) {
    const gp = clamp(pos - k * 0.25, 0, 1);
    items.push({
      key: `1:g${k}`, reveal: "1:ghost", kind: "path", d: roundRect(x0 + (x1 - x0) * gp - bw / 2, gy - bh, bw, bh, 16),
      fill: "#EAF3FC", stroke: "#9FBED8", width: 3, opacity: 0.85 - k * 0.18,
    });
  }
  items.push({ key: "1:block", reveal: "1:block", kind: "path", d: roundRect(bx - bw / 2, gy - bh, bw, bh, 16), fill: "#DBE8FB", stroke: blue, width: 4.4 });
  items.push(T("1:blockLab", [bx, gy - bh / 2 - 4], "物块", "1:block", { family: "sans", bold: true, color: blue, size: 27 }));

  arw(items, "1:vel", [bx, gy - bh - 54], 1, 0, 132, violet, "v", "1:vel", { labelOffset: [0, -14], labelSize: 34 });
  arw(items, "1:push", [bx - bw / 2 - 114, gy - bh * 0.55], 1, 0, 108, red, "推力", "1:push", { width: 5, labelSide: "mid", labelOffset: [-10, -22], labelAnchor: "middle", labelSize: 27 });
  return items;
};

// ----------------------------------------------------------------- scene 2

/**
 * Same initial speed, two surfaces. "2:run" is a clock: the ice block moves
 * x = x0 + span·t at constant speed, the rough block x = x0 + span·(t − t²/2)
 * and stops once the friction has drained the speed.
 */
const scene2 = (p: Params): SceneItem[] => {
  const run = clamp(p["2:run"] ?? 0, 0, 1);
  const Tt = 1.15 * run;
  const bw = 168, bh = 106;
  const x0 = 206, span = 468;
  const gyA = 328, gyB = 636;

  const xa = x0 + span * Tt;                    // v = const
  const sB = Tt <= 1 ? Tt - (Tt * Tt) / 2 : 0.5;// decelerating, then stopped
  const xb = x0 + span * sB;
  const vB = Math.max(0, 1 - Tt);

  const items: SceneItem[] = [];
  for (const [suf, gy, col, fill, name, rev] of [
    ["A", gyA, sky, "#DCEEFB", "光滑冰面", "2:ice"],
    ["B", gyB, "#B4763E", "#F3E6D8", "粗糙地面", "2:rough"],
  ] as const) {
    items.push({ key: `2:surf${suf}`, reveal: rev, kind: "poly", points: [[104, gy], [876, gy], [876, gy + 60], [104, gy + 60]], fill });
    items.push({ key: `2:sline${suf}`, reveal: rev, kind: "line", from: [104, gy], to: [876, gy], stroke: col, width: 3 });
    caption(items, `2:sname${suf}`, 490, gy + 41, name, col, 25, rev);
  }
  for (let i = 0; i < 7; i++) {
    const x = 136 + i * 114;
    items.push({ key: `2:tkA${i}`, reveal: "2:ticks", kind: "line", from: [x, gyA], to: [x, gyA - 20], stroke: "#7FB5D6", width: 2.4 });
    items.push({ key: `2:tkB${i}`, reveal: "2:ticks", kind: "line", from: [x, gyB], to: [x, gyB - 20], stroke: "#CB9A67", width: 2.4 });
  }

  items.push({ key: "2:blockA", reveal: "2:blockA", kind: "path", d: roundRect(xa - bw / 2, gyA - bh, bw, bh, 16), fill: "#DBE8FB", stroke: blue, width: 4.4 });
  items.push({ key: "2:blockB", reveal: "2:blockB", kind: "path", d: roundRect(xb - bw / 2, gyB - bh, bw, bh, 16), fill: "#E9DCCB", stroke: "#A1620A", width: 4.4 });
  arw(items, "2:velA", [xa, gyA - bh - 48], 1, 0, 126, violet, "v", "2:velA", { labelOffset: [0, -14], labelSize: 32 });
  arw(items, "2:velB", [xb, gyB - bh - 48], 1, 0, 126 * vB, violet, "v", "2:velB", { labelOffset: [0, -14], labelSize: 32 });

  caption(items, "2:note", 490, 126, "同一时刻，冰面上走过的距离远大于粗糙地面上", inkMuted, 24, "2:note");
  return items;
};

// ----------------------------------------------------------------- scene 3

/**
 * The cart-and-hanging-mass experiment. "3:F" is the force in newtons, "3:m"
 * the cart mass in kg, and a = F/m. "3:run" is a clock: the cart has travelled
 * ½·a·t² at the end of it, and the hanging mass has fallen by exactly that
 * amount — the string is inextensible, so the two displacements match.
 */
const scene3 = (p: Params): SceneItem[] => {
  const F = clamp(p["3:F"] ?? 0, 0, 12);
  const m = clamp(p["3:m"] ?? 1, 0.4, 2.4);
  const a = F / m;
  const run = clamp(p["3:run"] ?? 0, 0, 1);
  const Tt = 1.15 * run;
  const K = 24.2;                                // px per metre
  const dx = 0.5 * a * Tt * Tt * K;

  const tableY = 400;
  const cartW = 150, cartH = 86;
  const ccx = 226 + dx;
  const strY = 348;                              // the string's height above the table
  const pul: Vec2 = [856, strY];
  const cRight = ccx + cartW / 2;
  const massW = 68;
  const massTop = cRight + 193;                  // string length conserved

  const items: SceneItem[] = [];
  items.push({ key: "3:track", reveal: "3:track", kind: "poly", points: [[96, tableY], [884, tableY], [884, tableY + 30], [96, tableY + 30]], fill: "#E6EBF1" });
  items.push({ key: "3:tline", reveal: "3:track", kind: "line", from: [96, tableY], to: [884, tableY], stroke: "#93A3B5", width: 3 });
  for (const lx of [168, 560]) items.push({ key: `3:leg${lx}`, reveal: "3:track", kind: "line", from: [lx, tableY + 30], to: [lx, 762], stroke: "#C6D0DA", width: 9 });
  items.push({ key: "3:pul", reveal: "3:track", kind: "circle", c: pul, r: 17, fill: "#F7F4EE", stroke: "#93A3B5", width: 4 });
  items.push({ key: "3:pulIn", reveal: "3:track", kind: "circle", c: pul, r: 5, fill: "#93A3B5" });

  items.push({ key: "3:s1", reveal: "3:string", kind: "line", from: [cRight, strY], to: pul, stroke: "#6B7788", width: 2.6 });
  items.push({ key: "3:s2", reveal: "3:string", kind: "line", from: pul, to: [pul[0], massTop], stroke: "#6B7788", width: 2.6 });

  items.push({ key: "3:cart", reveal: "3:cart", kind: "path", d: roundRect(ccx - cartW / 2, tableY - cartH, cartW, cartH - 14, 14), fill: "#DBE8FB", stroke: blue, width: 4 });
  for (const wx of [-46, 46]) items.push({ key: `3:wh${wx}`, reveal: "3:cart", kind: "circle", c: [ccx + wx, tableY - 12], r: 13, fill: "#F7F4EE", stroke: "#4A5A6E", width: 3.4 });
  items.push(T("3:cartLab", [ccx, tableY - cartH / 2 - 6], "m", "3:cart", { family: "serif", italic: true, bold: true, color: blue, size: 34 }));

  items.push({ key: "3:hang", reveal: "3:hang", kind: "path", d: roundRect(pul[0] - massW / 2, massTop, massW, massW, 12), fill: "#FBE7CF", stroke: amber, width: 4 });
  items.push(T("3:hangLab", [pul[0], massTop + massW / 2 + 2], "M", "3:hang", { family: "serif", italic: true, bold: true, color: amber, size: 30 }));

  arw(items, "3:Farrow", [pul[0] - massW / 2 - 30, massTop + 8], 0, 1, F * 12, red, "F = Mg", "3:Farrow", { labelOffset: [-26, 0], labelAnchor: "end", labelSide: "mid", labelSize: 27 });
  arw(items, "3:aarrow", [ccx + cartW / 2 - 46, 272], 1, 0, 17 * a, amber, "a", "3:aarrow", { labelOffset: [0, -20], labelSide: "mid", labelAnchor: "middle", labelSize: 32 });

  for (const [k, y, lab, val, col] of [
    ["3:rm", 96, "小车质量", `${num(m)} kg`, blue],
    ["3:rF", 146, "拉力 F", `${num(F)} N`, red],
    ["3:ra", 198, "加速度 a = F/m", `${num(a)} m/s²`, amber],
  ] as const) {
    items.push(T(`${k}:l`, [210, y], lab, "3:read", { family: "sans", bold: true, color: inkMuted, size: 24 }));
    items.push(T(`${k}:v`, [428, y], val, "3:read", { family: "serif", bold: true, color: col, size: 29, anchor: "start" }));
  }
  return items;
};

// ----------------------------------------------------------------- scene 4

/**
 * The worked example: m = 2 kg, F = 10 N right, f = 4 N left, so F合 = 6 N and
 * a = 3 m/s². One scale for every arrow: 13 px per newton, 40 px per m/s², so
 * the resultant is exactly F − f long.
 */
const scene4 = (p: Params): SceneItem[] => {
  const run = clamp(p["4:run"] ?? 0, 0, 1);
  const PXN = 13, PXA = 40;
  const FORCE = 10, FRIC = 4, M = 2;
  const FNET = FORCE - FRIC;
  const A = FNET / M;
  const gy = 600;
  const bw = 200, bh = 150;
  const x0 = 208, x1 = 556;
  const bx = x0 + (x1 - x0) * run;
  const cy = gy - bh / 2;

  const items: SceneItem[] = [];
  items.push({ key: "4:ground", reveal: "4:ground", kind: "line", from: [84, gy], to: [876, gy], stroke: inkMuted, width: 3 });
  for (let i = 0; i <= 7; i++) items.push({ key: `4:h${i}`, reveal: "4:ground", kind: "line", from: [106 + i * 108, gy], to: [84 + i * 108, gy + 24], stroke: "#C2CAD4", width: 2 });

  items.push({ key: "4:block", reveal: "4:block", kind: "path", d: roundRect(bx - bw / 2, gy - bh, bw, bh, 18), fill: "#DBE8FB", stroke: blue, width: 4 });
  items.push(T("4:lab", [bx, cy], "m = 2 kg", "4:block", { family: "sans", bold: true, color: blue, size: 31 }));

  arw(items, "4:F", [bx + bw / 2 + 10, cy], 1, 0, FORCE * PXN, red, "F = 10 N", "4:F", { labelOffset: [0, -24], labelAnchor: "middle", labelSide: "mid", labelSize: 28 });
  arw(items, "4:f", [bx - bw / 2 - 10, cy], -1, 0, FRIC * PXN, "#A1620A", "f = 4 N", "4:f", { labelOffset: [0, -24], labelAnchor: "middle", labelSide: "mid", labelSize: 28 });
  arw(items, "4:net", [bx, cy - 104], 1, 0, FNET * PXN, violet, "F合 = 6 N", "4:net", { width: 6, labelOffset: [0, -22], labelAnchor: "middle", labelSide: "mid", labelSize: 28 });
  arw(items, "4:a", [bx, cy - 178], 1, 0, A * PXA, amber, "a = 3 m/s²", "4:a", { labelOffset: [0, -22], labelAnchor: "middle", labelSide: "mid", labelSize: 28 });

  caption(items, "4:note", 480, 700, "竖直方向 N = G，互相平衡，不影响水平运动", "#6E7A88", 24, "4:note");
  return items;
};

// ----------------------------------------------------------------- scene 5

/**
 * Two blocks on a frictionless floor, pushed apart by an internal push of
 * F = 4 N. mA = 1 kg, mB = 2 kg, so aA = 4 and aB = 2 m/s² — the same
 * magnitude of force, a different answer for each block.
 */
const scene5 = (p: Params): SceneItem[] => {
  const run = clamp(p["5:run"] ?? 0, 0, 1);
  const F = 4, MA = 1, MB = 2;
  const aA = F / MA, aB = F / MB;
  const Tt = 1.15 * run;
  const K = 40;                                  // px per metre
  const gy = 586;
  const bw = 148, bh = 130;
  const c0 = 470, off = 96;
  const ax = c0 - off - (0.5 * aA * Tt * Tt * K) / 2;
  const bx = c0 + off + (0.5 * aB * Tt * Tt * K) / 2;

  const items: SceneItem[] = [];
  items.push({ key: "5:surf", reveal: "5:floor", kind: "poly", points: [[84, gy], [876, gy], [876, gy + 62], [84, gy + 62]], fill: "#DCEEFB" });
  items.push({ key: "5:sline", reveal: "5:floor", kind: "line", from: [84, gy], to: [876, gy], stroke: sky, width: 3 });
  caption(items, "5:sname", 480, gy + 43, "光滑水平面", sky, 25, "5:floor");

  if (bx - ax - bw > 26) items.push({ key: "5:spring", reveal: "5:spring", kind: "path", d: springPath(ax + bw / 2, bx - bw / 2, gy - bh / 2, 5, 16), stroke: "#8A97A8", width: 3.4 });

  items.push({ key: "5:A", reveal: "5:A", kind: "path", d: roundRect(ax - bw / 2, gy - bh, bw, bh, 16), fill: "#DBE8FB", stroke: blue, width: 4.4 });
  items.push({ key: "5:B", reveal: "5:B", kind: "path", d: roundRect(bx - bw / 2, gy - bh, bw, bh, 16), fill: "#DBE8FB", stroke: blue, width: 4.4 });
  items.push(T("5:Alab", [ax, gy - bh / 2], "A", "5:A", { family: "serif", italic: true, bold: true, color: blue, size: 38 }));
  items.push(T("5:Blab", [bx, gy - bh / 2], "B", "5:B", { family: "serif", italic: true, bold: true, color: blue, size: 38 }));
  caption(items, "5:Amass", ax, gy - bh - 172, "mA = 1 kg", blue, 25, "5:mLab");
  caption(items, "5:Bmass", bx, gy - bh - 172, "mB = 2 kg", blue, 25, "5:mLab");

  const cy = gy - bh - 84;
  arw(items, "5:Fa", [ax, cy], -1, 0, F * 26, red, "F = 4 N", "5:Fa", { labelOffset: [0, -20], labelAnchor: "middle", labelSide: "mid", labelSize: 27 });
  arw(items, "5:Fb", [bx, cy], 1, 0, F * 26, red, "F′ = 4 N", "5:Fb", { labelOffset: [0, -20], labelAnchor: "middle", labelSide: "mid", labelSize: 27 });

  arw(items, "5:aA", [ax, gy + 112], -1, 0, aA * 30, amber, "aA = 4", "5:aA", { labelOffset: [0, -18], labelAnchor: "middle", labelSide: "mid", labelSize: 26 });
  arw(items, "5:aB", [bx, gy + 112], 1, 0, aB * 30, amber, "aB = 2", "5:aB", { labelOffset: [0, -18], labelAnchor: "middle", labelSide: "mid", labelSize: 26 });

  caption(items, "5:note", 480, 130, "同一对作用力，质量小的一方走得远得多", inkMuted, 24, "5:note");
  return items;
};

// ----------------------------------------------------------------- scene 6

/**
 * The comparison: on the left one body carrying two cancelling forces, on the
 * right two bodies pushing each other. Same pair of arrows, different meaning —
 * the only difference is whether the two forces share a body.
 */
const scene6 = (): SceneItem[] => {
  const items: SceneItem[] = [];
  const gy = 604;

  items.push({ key: "6:div", reveal: "6:divider", kind: "line", from: [480, 236], to: [480, 706], stroke: "#C2CAD4", width: 2.4, dash: "10 9" });

  // --- left: one body, the two forces cancel ---------------------------
  items.push({ key: "6:lsurf", reveal: "6:L", kind: "poly", points: [[84, gy], [452, gy], [452, gy + 52], [84, gy + 52]], fill: "#EDE7DC" });
  items.push({ key: "6:lsline", reveal: "6:L", kind: "line", from: [84, gy], to: [452, gy], stroke: "#A79A86", width: 3 });
  const lw = 154, lh = 126, lcx = 268;
  items.push({ key: "6:lblock", reveal: "6:L", kind: "path", d: roundRect(lcx - lw / 2, gy - lh, lw, lh, 16), fill: "#DBE8FB", stroke: blue, width: 4.2 });
  items.push(T("6:lblockLab", [lcx, gy - lh / 2], "同一物体", "6:L", { family: "sans", bold: true, color: blue, size: 25 }));
  const lcy = gy - lh - 62;
  arw(items, "6:lF", [lcx + lw / 2 + 8, lcy], 1, 0, 92, red, "F", "6:L", { labelOffset: [0, -18], labelSide: "mid", labelAnchor: "middle", labelSize: 30 });
  arw(items, "6:lf", [lcx - lw / 2 - 8, lcy], -1, 0, 92, red, "f", "6:L", { labelOffset: [0, -18], labelSide: "mid", labelAnchor: "middle", labelSize: 30 });
  caption(items, "6:lt1", lcx, 148, "平衡力", red, 31, "6:L");
  caption(items, "6:lt2", lcx, 194, "两个力作用在同一个物体上", inkMuted, 23, "6:L");
  caption(items, "6:lt3", lcx, 240, "合力 = 0，物体保持静止", "#4A5A6E", 23, "6:L");

  // --- right: two bodies, each force on a different one ----------------
  items.push({ key: "6:rsurf", reveal: "6:R", kind: "poly", points: [[512, gy], [876, gy], [876, gy + 52], [512, gy + 52]], fill: "#EDE7DC" });
  items.push({ key: "6:rsline", reveal: "6:R", kind: "line", from: [512, gy], to: [876, gy], stroke: "#A79A86", width: 3 });
  const rw = 122, rh = 126, rcx = 694;
  const aX = rcx - 108, bX = rcx + 108;
  items.push({ key: "6:rA", reveal: "6:R", kind: "path", d: roundRect(aX - rw / 2, gy - rh, rw, rh, 16), fill: "#DBE8FB", stroke: blue, width: 4.2 });
  items.push({ key: "6:rB", reveal: "6:R", kind: "path", d: roundRect(bX - rw / 2, gy - rh, rw, rh, 16), fill: "#DBE8FB", stroke: blue, width: 4.2 });
  items.push(T("6:rAlab", [aX, gy - rh / 2], "A", "6:R", { family: "serif", italic: true, bold: true, color: blue, size: 36 }));
  items.push(T("6:rBlab", [bX, gy - rh / 2], "B", "6:R", { family: "serif", italic: true, bold: true, color: blue, size: 36 }));
  const rcy = gy - rh - 62;
  arw(items, "6:rFa", [aX, rcy], -1, 0, 92, red, "F′", "6:R", { labelOffset: [0, -18], labelSide: "mid", labelAnchor: "middle", labelSize: 30 });
  arw(items, "6:rFb", [bX, rcy], 1, 0, 92, red, "F", "6:R", { labelOffset: [0, -18], labelSide: "mid", labelAnchor: "middle", labelSize: 30 });
  caption(items, "6:rt1", rcx, 148, "作用力与反作用力", red, 31, "6:R");
  caption(items, "6:rt2", rcx, 194, "分别作用在两个物体上", inkMuted, 23, "6:R");
  caption(items, "6:rt3", rcx, 240, "不能相互抵消", "#4A5A6E", 23, "6:R");

  return items;
};

// ----------------------------------------------------------------- figure

export const mechanicsFigure = () => {
  const figure = (p: Params): Scene => ({
    width: STAGE_W,
    height: STAGE_H,
    items: [...heroScene(), ...scene1(p), ...scene2(p), ...scene3(p), ...scene4(p), ...scene5(p), ...scene6()],
  });

  /** The hero image is on from frame zero — it backs the title card. */
  figure.defaults = { "0:ground": 1, "0:block": 1, "0:lab": 1, "0:F": 1, "0:a": 1 };

  /**
   * The only parameters that carry a measured quantity. Everything else is a
   * switch that turns a scene or an element on and off, and those snap over
   * `TIMING.switch` frames instead of gliding — otherwise a step that swaps one
   * scene for another leaves both scenes overlaid at full strength for seconds.
   */
  figure.continuous = ["1:pos", "2:run", "3:F", "3:m", "3:run", "4:run", "5:run"];
  return figure;
};
