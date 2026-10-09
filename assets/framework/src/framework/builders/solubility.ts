import type { FigureFn, Params, Scene, SceneItem, Vec2 } from "../types";
import { blue, green, ink, inkFaint, inkMuted, red, violet } from "../theme";
import { fnPath } from "../geometry";

/**
 * 溶解度曲线：三条典型曲线都用真实数据插值 —— 硝酸钾陡升、氯化钠几乎不动、
 * 熟石灰反而是下降的。拿这套数据去解释"为什么硝酸钾要降温结晶、氯化钠要蒸发
 * 结晶"，图自己就会说话。
 *
 * 曲线上的点是饱和溶液，曲线下方是不饱和，上方是过饱和（会析出）。这层含义
 * 是这个图的全部，所以 `note` 会把三块区域分别染出来。
 *
 * Parameter keys:
 *   axes   坐标轴与刻度      curves 三条曲线    legend 图例
 *   cursor 温度游标与读数    zones  曲线上 / 上 / 下的含义
 *   cool   降温结晶：S(t₁) − S(t₂) 就是能析出的晶体
 *
 * Continuous: `t`（当前温度 °C）、`t2`（降温到 °C）。
 */

export const WIDTH = 1010;
export const HEIGHT = 700;

export type Curve = {
  readonly key: string;
  readonly label: string;
  readonly color: string;
  /** 每 10 °C 一个点的真实溶解度 g/100g 水。 */
  readonly points: readonly [number, number][];
};

export const CURVES: readonly Curve[] = [
  {
    key: "kno3", label: "KNO₃", color: red,
    points: [[0, 13.3], [10, 20.9], [20, 31.6], [30, 45.8], [40, 63.9], [50, 85.5], [60, 110], [70, 138], [80, 169]],
  },
  {
    key: "nacl", label: "NaCl", color: blue,
    points: [[0, 35.7], [10, 35.8], [20, 36.0], [30, 36.3], [40, 36.6], [50, 37.0], [60, 37.3], [70, 37.8], [80, 38.4]],
  },
  {
    key: "caoh2", label: "Ca(OH)₂", color: green,
    points: [[0, 0.185], [10, 0.176], [20, 0.165], [30, 0.153], [40, 0.141], [50, 0.13], [60, 0.116], [70, 0.106], [80, 0.094]],
  },
];

const T_MAX = 80;
const S_MAX = 175;

const interp = (pts: readonly [number, number][], t: number): number => {
  if (t <= pts[0][0]) return pts[0][1];
  const last = pts[pts.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [t0, s0] = pts[i - 1];
      const [t1, s1] = pts[i];
      return s0 + ((s1 - s0) * (t - t0)) / (t1 - t0);
    }
  }
  return last[1];
};

const num = (v: number, d = 1) => v.toFixed(d);

export const solubilityFigure = (): FigureFn => {
  const LEFT = 126;
  const RIGHT = WIDTH - 96;
  const TOP = 86;
  const BOTTOM = HEIGHT - 104;

  const sx = (RIGHT - LEFT) / T_MAX;
  const sy = (BOTTOM - TOP) / S_MAX;
  const X = (t: number) => LEFT + t * sx;
  const Y = (s: number) => BOTTOM - s * sy;
  const toScreen = (t: number, s: number): Vec2 => [X(t), Y(s)];

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const on = (k: string) => (p[k] ?? 0) > 0;

    const t = Math.max(0, Math.min(T_MAX, p.t ?? 0));
    const t2 = Math.max(0, Math.min(T_MAX, p.t2 ?? 0));

    // --- axes ---------------------------------------------------------------------
    items.push(
      { key: "ax:x", reveal: "axes", layer: 0, kind: "arrow", from: [LEFT - 24, BOTTOM], to: [RIGHT + 28, BOTTOM], stroke: ink, width: 2.8, head: 13 },
      { key: "ax:y", reveal: "axes", layer: 0, kind: "arrow", from: [LEFT, BOTTOM + 24], to: [LEFT, TOP - 28], stroke: ink, width: 2.8, head: 13 },
      { key: "ax:xl", reveal: "axes", layer: 1, kind: "text", at: [RIGHT + 44, BOTTOM - 10], text: "温度 / °C", size: 25, color: inkMuted, anchor: "start" },
      { key: "ax:yl", reveal: "axes", layer: 1, kind: "text", at: [LEFT - 56, TOP - 12], text: "S / g", size: 26, family: "serif", italic: true, color: inkMuted, anchor: "end" },
      { key: "ax:unit", reveal: "axes", layer: 1, kind: "text", at: [LEFT - 96, TOP + 12], text: "（每 100 g 水）", size: 21, color: inkMuted, anchor: "end" },
    );
    for (let k = 0; k <= T_MAX; k += 10) {
      items.push(
        { key: `tx:${k}`, reveal: "axes", layer: 1, kind: "line", from: [X(k), BOTTOM], to: [X(k), BOTTOM + 8], stroke: ink, width: 2.2 },
        { key: `txn:${k}`, reveal: "axes", layer: 1, kind: "text", at: [X(k), BOTTOM + 28], text: String(k), size: 22, color: inkMuted },
      );
    }
    for (let k = 0; k <= S_MAX; k += 25) {
      items.push(
        { key: `ty:${k}`, reveal: "axes", layer: 1, kind: "line", from: [LEFT - 8, Y(k)], to: [LEFT, Y(k)], stroke: ink, width: 2.2 },
        { key: `tyn:${k}`, reveal: "axes", layer: 1, kind: "text", at: [LEFT - 14, Y(k)], text: String(k), size: 22, color: inkMuted, anchor: "end" },
      );
    }

    // --- the three curves ------------------------------------------------------------
    if (on("curves")) {
      for (const c of CURVES) {
        items.push({
          key: `curve:${c.key}`, reveal: "curves", layer: 3, kind: "path",
          d: fnPath((x) => interp(c.points, x), 0, T_MAX, toScreen, 140),
          stroke: c.color, width: 4.2, fill: "none",
        });
      }
    }

    // --- legend --------------------------------------------------------------------------
    if (on("legend")) {
      CURVES.forEach((c, i) => {
        const y = TOP + 18 + i * 44;
        items.push(
          {
            key: `lg:${c.key}`, reveal: "legend", layer: 7, kind: "poly", close: true,
            points: [[RIGHT - 250, y - 4], [RIGHT - 200, y - 4], [RIGHT - 200, y + 4], [RIGHT - 250, y + 4]],
            fill: c.color, stroke: "none",
          },
          { key: `lgt:${c.key}`, reveal: "legend", layer: 8, kind: "text", at: [RIGHT - 192, y], text: c.label, size: 26, bold: true, color: c.color, anchor: "start" },
        );
      });
    }

    // --- what above and below the curve mean ---------------------------------------------------
    if (on("zones")) {
      const kno3 = CURVES[0];
      const above = (x: number) => Math.min(S_MAX, interp(kno3.points, x) + 46);
      items.push(
        {
          key: "zone:above", reveal: "zones", layer: 1, kind: "path",
          d: `${fnPath((x) => interp(kno3.points, x), 0, T_MAX, toScreen, 100).replace(/^M/, "M")} ` +
            `L ${X(T_MAX).toFixed(1)} ${Y(S_MAX).toFixed(1)} L ${X(0).toFixed(1)} ${Y(S_MAX).toFixed(1)} Z`,
          fill: violet, fillOpacity: 0.1, stroke: "none",
        },
        {
          key: "zone:below", reveal: "zones", layer: 1, kind: "path",
          d: `${fnPath((x) => interp(kno3.points, x), 0, T_MAX, toScreen, 100)} L ${X(T_MAX).toFixed(1)} ${BOTTOM} L ${X(0).toFixed(1)} ${BOTTOM} Z`,
          fill: green, fillOpacity: 0.08, stroke: "none",
        },
        { key: "zone:a", reveal: "zones", layer: 8, kind: "text", at: [X(22), Y(above(22) + 96)], text: "线上方：过饱和，有晶体析出", size: 24, color: violet, bold: true },
        { key: "zone:b", reveal: "zones", layer: 8, kind: "text", at: [X(60), Y(46)], text: "线下方：不饱和溶液", size: 24, color: green, bold: true },
      );
    }

    // --- the temperature cursor: read every curve at this one temperature -----------------------------
    if (on("cursor")) {
      items.push({ key: "cur:line", reveal: "cursor", layer: 2, kind: "line", from: [X(t), BOTTOM], to: [X(t), TOP - 20], stroke: inkFaint, width: 2, dash: "7 6" });
      items.push({ key: "cur:t", reveal: "cursor", layer: 8, kind: "text", at: [X(t), BOTTOM + 58], text: `${num(t, 0)} °C`, size: 26, bold: true, color: ink });
      CURVES.forEach((c, i) => {
        const s = interp(c.points, t);
        const at = toScreen(t, s);
        items.push({ key: `cur:pt:${c.key}`, reveal: "cursor", layer: 7, kind: "marker", at, r: 6.5, fill: c.color, ring: "#FFFFFF", ringWidth: 2 });
        items.push({
          key: `cur:val:${c.key}`, reveal: "cursor", layer: 8, kind: "text",
          at: [X(t) + 96, Y(s) + (i === 1 ? -26 : 0)], text: `${c.label} ${num(s)} g`, size: 23, color: c.color, anchor: "start",
        });
      });
    }

    // --- cooling a saturated solution: exactly what comes out ---------------------------------------------
    if (on("cool")) {
      const kno3 = CURVES[0];
      const tHi = Math.max(t, t2);
      const tLo = Math.min(t, t2);
      const sHi = interp(kno3.points, tHi);
      const sLo = interp(kno3.points, tLo);
      const out = Math.max(0, sHi - sLo);
      const Hi = toScreen(tHi, sHi);
      const Lo = toScreen(tLo, sLo);

      items.push(
        { key: "cool:h", reveal: "cool", layer: 2, kind: "line", from: [LEFT, Hi[1]], to: [RIGHT, Hi[1]], stroke: red, width: 1.8, dash: "6 5" },
        { key: "cool:l", reveal: "cool", layer: 2, kind: "line", from: [LEFT, Lo[1]], to: [RIGHT, Lo[1]], stroke: red, width: 1.8, dash: "6 5" },
        { key: "cool:v1", reveal: "cool", layer: 2, kind: "line", from: [X(tHi), BOTTOM], to: [X(tHi), TOP - 20], stroke: red, width: 2, dash: "7 6" },
        { key: "cool:v2", reveal: "cool", layer: 2, kind: "line", from: [X(tLo), BOTTOM], to: [X(tLo), TOP - 20], stroke: blue, width: 2, dash: "7 6" },
        { key: "cool:pt1", reveal: "cool", layer: 7, kind: "marker", at: Hi, r: 7, fill: red, ring: "#FFFFFF", ringWidth: 2 },
        { key: "cool:pt2", reveal: "cool", layer: 7, kind: "marker", at: Lo, r: 7, fill: blue, ring: "#FFFFFF", ringWidth: 2 },
        {
          key: "cool:diff", reveal: "cool", layer: 5, kind: "arrow",
          from: [X(tLo) - 62, Hi[1]], to: [X(tLo) - 62, Lo[1]], stroke: violet, width: 3.2, head: 12,
        },
        {
          key: "cool:lab", reveal: "cool", layer: 9, kind: "text",
          at: [X(tLo) - 78, (Hi[1] + Lo[1]) / 2], text: `析出 ${num(out)} g`, size: 26, bold: true, color: violet, anchor: "end",
        },
        {
          key: "cool:hi", reveal: "cool", layer: 8, kind: "text",
          at: [X(tHi), TOP - 44], text: `${num(tHi, 0)} °C：${num(sHi)} g`, size: 24, color: red, bold: true,
        },
        {
          key: "cool:lo", reveal: "cool", layer: 8, kind: "text",
          at: [X(tLo), TOP - 44], text: `${num(tLo, 0)} °C：${num(sLo)} g`, size: 24, color: blue, bold: true,
        },
        {
          key: "cool:note", reveal: "cool", layer: 9, kind: "text",
          at: [LEFT, HEIGHT - 46],
          text: `100 g 水配成的饱和溶液从 ${num(tHi, 0)} °C 降到 ${num(tLo, 0)} °C：析出晶体 ${num(out)} g`,
          size: 26, bold: true, color: violet, anchor: "start",
        },
      );
      // why NaCl is not cooled: here is how little comes out
      const naclOut = interp(CURVES[1].points, tHi) - interp(CURVES[1].points, tLo);
      items.push({
        key: "cool:nacl", reveal: "cool", layer: 8, kind: "text",
        at: [LEFT, HEIGHT - 82],
        text: `同样的降温，NaCl 只析出 ${num(naclOut, 2)} g —— 所以它用蒸发结晶`,
        size: 23, color: inkMuted, anchor: "start",
      });
    }

    return { width: WIDTH, height: HEIGHT, items };
  };

  figure.defaults = { axes: 1, curves: 1 };
  figure.continuous = ["t", "t2"];
  return figure;
};
