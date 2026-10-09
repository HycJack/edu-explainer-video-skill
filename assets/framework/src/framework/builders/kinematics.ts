import type { FigureFn, Params, Scene, SceneItem, Vec2 } from "../types";
import { amber, blue, green, ink, inkFaint, inkMuted, red, violet } from "../theme";
import { fnPath, regionPath } from "../geometry";

/**
 * 追及与相遇的运动学图：同一张 v–t 图上两条运动线。
 *
 *   甲在前匀速 vA = 4 m/s，乙在后从静止出发 a = 2 m/s²，初始相距 9 m。
 *   相遇时刻由 t² = 9 + 4t 给出（t = 2 + √13 ≈ 5.61 s），乙自行追上时速度
 *   已到 11.2 m/s —— 数字都按这两条真实运动线算，不是画上去的装饰。
 *
 * 图上两块面积就是两人各自走过的路程：矩形 = 甲的 4t，三角形 = 乙的 t²。
 * 这是中学唯一 "凭图说话" 的解法，所以面积和公式必须同屏可读。
 *
 * Parameter keys:
 *   axes    坐标轴与刻度            lineA   甲的匀速线（蓝）
 *   lineB   乙的匀加速线（橙）      now     当前时刻的竖线与两个瞬时点
 *   shadow  截至当前时刻的两块面积  areaLab 面积数值与 s = 公式
 *   slope   乙的斜率三角形 = a      equal   速度相等的时刻（相距最远）
 *   meet    相遇时刻的垂线与标记
 *
 * Continuous: `t` — 唯一的测量量，秒。
 */

export const WIDTH = 980;
export const HEIGHT = 680;

export type KinematicsOpts = {
  /**甲的速度 m/s。*/ readonly vA?: number;
  /**乙的加速度 m/s²。*/ readonly aB?: number;
  /**出发时乙落后的距离 m。*/ readonly d0?: number;
  /**横轴量程 s。*/ readonly tMax?: number;
  /**纵轴量程 m/s。*/ readonly vMax?: number;
};

const num = (v: number, digits = 1) => v.toFixed(digits);

export const kinematicsFigure = (opts: KinematicsOpts = {}): FigureFn => {
  const vA = opts.vA ?? 4;
  const aB = opts.aB ?? 2;
  const d0 = opts.d0 ?? 9;
  const tMax = opts.tMax ?? 6;
  const vMax = opts.vMax ?? 13;

  const LEFT = 118;
  const RIGHT = WIDTH - 84;
  const TOP = 72;
  const BOTTOM = HEIGHT - 108;

  const sx = (RIGHT - LEFT) / tMax;
  const sy = (BOTTOM - TOP) / vMax;
  const X = (t: number) => LEFT + t * sx;
  const Y = (v: number) => BOTTOM - v * sy;
  const toScreen = (t: number, v: number): Vec2 => [X(t), Y(v)];

  /** 乙的路程 s_B = ½at²，甲领先 d0 后的位置 s_A = d0 + vA·t。 */
  const sA = (t: number) => d0 + vA * t;
  const sB = (t: number) => 0.5 * aB * t * t;
  /** s_B = s_A 的正根。 */
  const meetT = (() => {
    const disc = vA * vA + 2 * aB * d0;
    return (vA + Math.sqrt(disc)) / aB;
  })();
  /** 速度相等的时刻：此后乙比甲快，距离开始缩小。 */
  const equalT = vA / aB;

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const t = Math.max(0, Math.min(tMax, p.t ?? 0));
    const on = (k: string) => (p[k] ?? 0) > 0;

    // --- axes ---------------------------------------------------------------
    items.push(
      { key: "ax:x", reveal: "axes", layer: 0, kind: "arrow", from: [LEFT - 26, BOTTOM], to: [RIGHT + 30, BOTTOM], stroke: ink, width: 2.8, head: 13 },
      { key: "ax:y", reveal: "axes", layer: 0, kind: "arrow", from: [LEFT, BOTTOM + 26], to: [LEFT, TOP - 30], stroke: ink, width: 2.8, head: 13 },
      {
        key: "ax:xl", reveal: "axes", layer: 1, kind: "text",
        at: [RIGHT + 34, BOTTOM - 14], text: "t / s", size: 26, family: "serif", italic: true, color: inkMuted, anchor: "end",
      },
      {
        key: "ax:yl", reveal: "axes", layer: 1, kind: "text",
        at: [LEFT - 34, TOP - 18], text: "v", size: 27, family: "serif", italic: true, color: inkMuted, anchor: "end",
      },
      { key: "ax:unit", reveal: "axes", layer: 1, kind: "text", at: [LEFT - 52, TOP + 4], text: "m/s", size: 21, color: inkMuted, anchor: "end" },
    );

    for (let k = 0; k <= tMax; k++) {
      items.push(
        { key: `tick:x${k}`, reveal: "axes", layer: 1, kind: "line", from: [X(k), BOTTOM], to: [X(k), BOTTOM + 9], stroke: ink, width: 2.2 },
        { key: `tick:xn${k}`, reveal: "axes", layer: 1, kind: "text", at: [X(k), BOTTOM + 30], text: String(k), size: 23, color: inkMuted },
      );
    }
    for (let k = 2; k <= vMax; k += 2) {
      items.push(
        { key: `tick:y${k}`, reveal: "axes", layer: 1, kind: "line", from: [LEFT - 9, Y(k)], to: [LEFT, Y(k)], stroke: ink, width: 2.2 },
        { key: `tick:yn${k}`, reveal: "axes", layer: 1, kind: "text", at: [LEFT - 16, Y(k)], text: String(k), size: 23, color: inkMuted, anchor: "end" },
      );
    }

    // --- the given distance ahead -------------------------------------------
    items.push(
      {
        key: "given", reveal: "axes", layer: 2, kind: "text",
        at: [LEFT + 10, TOP + 6],
        text: `出发时乙落后 ${num(d0, 0)} m`, size: 25, color: inkMuted, anchor: "start",
      },
    );

    // --- the two motion lines ------------------------------------------------
    items.push(
      {
        key: "line:A", reveal: "lineA", layer: 3, kind: "line",
        from: toScreen(0, vA), to: toScreen(tMax, vA), stroke: blue, width: 4.2, glow: true,
      },
      {
        key: "line:A:lab", reveal: "lineA", layer: 4, kind: "text",
        at: [X(tMax) + 16, Y(vA) - 2], text: `甲  ${num(vA, 0)} m/s`, size: 26, color: blue, bold: true, anchor: "start",
      },
      {
        key: "line:B", reveal: "lineB", layer: 3, kind: "path",
        d: fnPath((x) => aB * x, 0, tMax, toScreen, 90), stroke: amber, width: 4.2, fill: "none",
      },
      {
        key: "line:B:lab", reveal: "lineB", layer: 4, kind: "text",
        at: [X(tMax) + 14, Y(aB * tMax) + 26], text: `乙  a = ${num(aB, 0)} m/s²`, size: 26, color: amber, bold: true, anchor: "start",
      },
    );

    // --- the two areas: each one IS a distance travelled ----------------------
    if (on("shadow")) {
      items.push(
        {
          key: "sh:A", reveal: "shadow", layer: 1, kind: "path",
          d: regionPath(() => vA, 0, t, toScreen, 60), fill: blue, fillOpacity: 0.15, stroke: "none",
        },
        {
          key: "sh:B", reveal: "shadow", layer: 1, kind: "path",
          d: regionPath((x) => aB * x, 0, t, toScreen, 60), fill: amber, fillOpacity: 0.2, stroke: "none",
        },
      );
    }

    // --- slope triangle on B: rise/run = a ------------------------------------
    if (on("slope")) {
      const x0 = 3.2;
      const x1 = 5.2;
      items.push(
        { key: "slope:h", reveal: "slope", layer: 5, kind: "line", from: toScreen(x0, 0), to: toScreen(x1, 0), stroke: green, width: 2.6 },
        { key: "slope:v", reveal: "slope", layer: 5, kind: "line", from: toScreen(x1, 0), to: toScreen(x1, aB * x1), stroke: green, width: 2.6 },
        {
          key: "slope:run", reveal: "slope", layer: 6, kind: "text",
          at: [X((x0 + x1) / 2), BOTTOM + 56], text: `Δt = ${num(x1 - x0, 1)} s`, size: 24, color: green, italic: true, family: "serif",
        },
        {
          key: "slope:rise", reveal: "slope", layer: 6, kind: "text",
          at: [X(x1) + 92, Y(aB * x1 / 2)], text: `Δv = ${num(aB * (x1 - x0), 1)} m/s`, size: 24, color: green, italic: true, family: "serif", anchor: "start",
        },
        { key: "slope:pt", reveal: "slope", layer: 6, kind: "marker", at: toScreen(x1, aB * x1), r: 5, fill: green },
      );
    }

    // --- now: the vertical cut, both points, both speeds ----------------------
    if (on("now")) {
      items.push(
        { key: "now:line", reveal: "now", layer: 4, kind: "line", from: [X(t), BOTTOM], to: [X(t), TOP - 12], stroke: inkFaint, width: 1.8, dash: "7 6" },
        { key: "now:ptA", reveal: "now", layer: 7, kind: "marker", at: toScreen(t, vA), r: 7, fill: blue, ring: blue },
        { key: "now:ptB", reveal: "now", layer: 7, kind: "marker", at: toScreen(t, aB * t), r: 7, fill: amber, ring: amber },
        {
          key: "now:t", reveal: "now", layer: 7, kind: "text",
          at: [X(t), BOTTOM + 62], text: `t = ${num(t)} s`, size: 26, bold: true, color: ink,
        },
        {
          key: "now:sA", reveal: "now", layer: 7, kind: "text",
          at: [RIGHT + 6, Y(vA) - 44], text: `甲路程 ${num(sA(t))} m`, size: 24, color: blue, anchor: "end",
        },
        {
          key: "now:sB", reveal: "now", layer: 7, kind: "text",
          at: [RIGHT + 6, Y(aB * t) + 44], text: `乙路程 ${num(sB(t))} m`, size: 24, color: amber, anchor: "end",
        },
      );
    }

    // --- the areas as formulas ------------------------------------------------
    if (on("areaLab")) {
      const gap = Math.max(0, sA(t) - sB(t));
      items.push(
        {
          key: "area:A", reveal: "areaLab", layer: 6, kind: "text",
          at: [X(t / 2), Y(vA / 2)], text: `矩形面积 = ${num(sA(t))} m`, size: 25, bold: true, color: blue,
        },
        {
          key: "area:B", reveal: "areaLab", layer: 6, kind: "text",
          at: [X(t * 0.62), Y(aB * t * 0.3)], text: `三角形面积 = ${num(sB(t))} m`, size: 25, bold: true, color: amber,
        },
        {
          key: "area:gap", reveal: "areaLab", layer: 7, kind: "text",
          at: [LEFT + 8, TOP + 44],
          text: gap > 0.05 ? `还差 ${num(gap)} m 追上` : `已经追上，超出 ${num(-gap)} m`,
          size: 26, bold: true, color: gap > 0.05 ? violet : green, anchor: "start",
        },
      );
    }

    // --- the instant the two speeds match: the gap stops growing --------------
    if (on("equal") && equalT > 0 && equalT < tMax) {
      items.push(
        { key: "eq:line", reveal: "equal", layer: 3, kind: "line", from: [X(equalT), BOTTOM], to: [X(equalT), Y(vA)], stroke: green, width: 2.4, dash: "7 6" },
        { key: "eq:pt", reveal: "equal", layer: 7, kind: "marker", at: toScreen(equalT, vA), r: 7, fill: green, ring: green },
        {
          key: "eq:lab", reveal: "equal", layer: 7, kind: "text",
          at: [X(equalT) + 10, TOP + 82],
          text: `t = ${num(equalT)} s 时两人同速，此刻相距最远（${num(sA(equalT) - sB(equalT))} m）`,
          size: 25, bold: true, color: green, anchor: "start",
        },
      );
    }

    // --- the meeting ----------------------------------------------------------
    if (on("meet") && meetT < tMax) {
      items.push(
        { key: "meet:line", reveal: "meet", layer: 3, kind: "line", from: [X(meetT), BOTTOM], to: [X(meetT), TOP - 12], stroke: red, width: 2.6, dash: "9 6" },
        { key: "meet:pt", reveal: "meet", layer: 8, kind: "marker", at: toScreen(meetT, aB * meetT), r: 8, fill: red, ring: red },
        {
          key: "meet:lab", reveal: "meet", layer: 8, kind: "text",
          at: [X(meetT) - 14, TOP + 20],
          text: `追上时 t = ${num(meetT, 2)} s`, size: 26, bold: true, color: red, anchor: "end",
        },
        {
          key: "meet:check", reveal: "meet", layer: 8, kind: "text",
          at: [X(meetT) - 14, TOP + 52],
          text: `${num(sB(meetT))} m = ${num(sA(meetT))} m`, size: 25, color: red, anchor: "end",
        },
      );
    }

    return { width: WIDTH, height: HEIGHT, items };
  };

  figure.defaults = { axes: 1, lineA: 1, lineB: 1 };
  figure.continuous = ["t"];
  return figure;
};

const inkFaintStroke = () => "#B9C2CC";
