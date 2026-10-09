import type { Params, Scene, SceneItem, Vec2 } from "../types";
import { blue, green, ink, inkMuted, red, violet } from "../theme";
import { fnPath, regionPath } from "../geometry";

/**
 * The cartesian plane with a function curve — the 函数与导数 figure.
 *
 * The builder is configured with the function itself, so a content file never
 * draws coordinates by hand:
 *
 *   const figure = graphFigure({
 *     f: (x) => x**3 - 3*x,  df: (x) => 3*x**2 - 3,
 *     view: { x: [-2.6, 2.6], y: [-3.4, 3.4] },
 *   });
 *
 * Parameter keys (tangent point and integration bound are CONTINUOUS):
 *   grid      light lattice behind everything
 *   axis      axes, arrows, tick labels, O
 *   curve     the curve y = f(x)
 *   pt        marker at x = px (continuous), riding the curve
 *   tangent   tangent line at px — needs df
 *   secant    chord from px to qx (continuous) — the derivative's other point
 *   area      shaded region between curve and x-axis over [ax, bx] (bx continuous)
 *   extrema   marks at the given extrema list
 */

export const WIDTH = 920;
export const HEIGHT = 660;

export type GraphOptions = {
  f: (x: number) => number;
  df?: (x: number) => number;
  domain?: readonly [number, number];
  view: { readonly x: readonly [number, number]; readonly y: readonly [number, number] };
  xTicks?: readonly number[];
  yTicks?: readonly number[];
  extrema?: readonly { readonly x: number; readonly kind: "max" | "min" }[];
  width?: number;
  height?: number;
};

export const graphFigure = (opts: GraphOptions) => {
  const W = opts.width ?? WIDTH;
  const H = opts.height ?? HEIGHT;
  const PAD = 46;
  const [x0, x1] = opts.view.x;
  const [y0, y1] = opts.view.y;

  const sx = (x: number): number => PAD + ((x - x0) / (x1 - x0)) * (W - 2 * PAD);
  const sy = (y: number): number => H - PAD - ((y - y0) / (y1 - y0)) * (H - 2 * PAD);
  const S = (x: number, y: number): Vec2 => [sx(x), sy(y)];

  const dom = opts.domain ?? [x0, x1];

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const px = p.px ?? 0;
    const qx = p.qx ?? 1;
    const bx = p.bx ?? (dom[0] + dom[1]) / 2;
    const ax = p.ax ?? dom[0];

    // --- lattice ------------------------------------------------------------
    const lattice: SceneItem[] = [];
    const stepX = opts.xTicks && opts.xTicks.length > 1 ? opts.xTicks[1] - opts.xTicks[0] : 1;
    const stepY = opts.yTicks && opts.yTicks.length > 1 ? opts.yTicks[1] - opts.yTicks[0] : 1;
    for (let x = Math.ceil(x0 / stepX) * stepX; x <= x1 + 1e-9; x += stepX) {
      lattice.push({ key: `gx:${x}`, reveal: "grid", layer: 0, kind: "line", from: S(x, y0), to: S(x, y1), stroke: "#E4DFD4", width: 1 });
    }
    for (let y = Math.ceil(y0 / stepY) * stepY; y <= y1 + 1e-9; y += stepY) {
      lattice.push({ key: `gy:${y}`, reveal: "grid", layer: 0, kind: "line", from: S(x0, y), to: S(x1, y), stroke: "#E4DFD4", width: 1 });
    }
    items.push(...lattice);

    // --- axes ---------------------------------------------------------------
    const arrow = 13;
    items.push(
      { key: "axis:x", reveal: "axis", layer: 2, kind: "line", from: S(x0 + 0.12, 0), to: S(x1 - 0.04, 0), stroke: ink, width: 2.6 },
      { key: "axis:xe", reveal: "axis", layer: 2, kind: "poly", close: false, points: [S(x1 - 0.04, 0), [sx(x1 - 0.04) - arrow, sy(0) - 5]], stroke: ink, width: 2.6 },
      { key: "axis:y", reveal: "axis", layer: 2, kind: "line", from: S(0, y0 + 0.08), to: S(0, y1 - 0.04), stroke: ink, width: 2.6 },
      { key: "axis:ye", reveal: "axis", layer: 2, kind: "poly", close: false, points: [S(0, y1 - 0.04), [sx(0) - 5, sy(y1 - 0.04) + arrow]], stroke: ink, width: 2.6 },
      { key: "axis:ox", reveal: "axis", layer: 2, kind: "text", at: [sx(x1) - 16, sy(0) + 24], text: "x", italic: true, family: "serif", size: 27, color: inkMuted },
      { key: "axis:oy", reveal: "axis", layer: 2, kind: "text", at: [sx(0) - 26, sy(y1) + 12], text: "y", italic: true, family: "serif", size: 27, color: inkMuted },
      { key: "axis:o", reveal: "axis", layer: 2, kind: "text", at: [sx(0) - 20, sy(0) + 22], text: "O", italic: true, family: "serif", size: 26, color: inkMuted },
    );
    for (const t of opts.xTicks ?? []) {
      if (t === 0) continue;
      items.push(
        { key: `tkx:${t}`, reveal: "axis", layer: 2, kind: "line", from: S(t, 0), to: S(t, -0.09 * ((y1 - y0) / 8)), stroke: ink, width: 2 },
        { key: `lbx:${t}`, reveal: "axis", layer: 2, kind: "text", at: [sx(t), sy(0) + 24], text: String(t), size: 22, family: "serif", color: inkMuted },
      );
    }
    for (const t of opts.yTicks ?? []) {
      if (t === 0) continue;
      items.push(
        { key: `tky:${t}`, reveal: "axis", layer: 2, kind: "line", from: S(0, t), to: S(-0.05 * ((x1 - x0) / 8), t), stroke: ink, width: 2 },
        { key: `lby:${t}`, reveal: "axis", layer: 2, kind: "text", at: [sx(0) - 26, sy(t)], text: String(t), size: 22, family: "serif", color: inkMuted },
      );
    }

    // --- the curve ----------------------------------------------------------
    items.push({
      key: "curve",
      reveal: "curve",
      layer: 3,
      kind: "path",
      d: fnPath(opts.f, dom[0], dom[1], S),
      stroke: blue,
      width: 3.6,
    });

    // --- the moving point on the curve --------------------------------------
    items.push(
      { key: "pt:m", reveal: "pt", layer: 5, kind: "marker", at: S(px, opts.f(px)), r: 7, fill: red, ring: red },
      {
        key: "pt:lab", reveal: "pt", layer: 5, kind: "text",
        at: [sx(px) + 34, sy(opts.f(px)) - 26], text: `x = ${px.toFixed(2)}`,
        size: 24, bold: true, family: "sans", color: red,
      },
    );

    // --- the tangent line ----------------------------------------------------
    if (opts.df) {
      const m = opts.df(px);
      const y = opts.f(px);
      const span = (dom[1] - dom[0]) * 0.42;
      items.push({
        key: "tangent",
        reveal: "tangent",
        layer: 4,
        kind: "line",
        from: S(px - span, y - m * span),
        to: S(px + span, y + m * span),
        stroke: violet,
        width: 2.6,
        dash: "9 7",
      });
    }

    // --- the secant (derivative's difference quotient) -----------------------
    if (opts.df) {
      items.push({
        key: "secant",
        reveal: "secant",
        layer: 4,
        kind: "line",
        from: S(px, opts.f(px)),
        to: S(qx, opts.f(qx)),
        stroke: green,
        width: 2.6,
        dash: "9 7",
      });
      items.push(
        { key: "secant:q", reveal: "secant", layer: 5, kind: "marker", at: S(qx, opts.f(qx)), r: 6, fill: green },
      );
    }

    // --- the shaded integral region ------------------------------------------
    items.push({
      key: "area",
      reveal: "area",
      layer: 2,
      kind: "path",
      d: regionPath(opts.f, Math.min(ax, bx), Math.max(ax, bx), S),
      fill: "#FDE9C8",
      fillOpacity: 0.85,
      stroke: "#D97706",
      width: 1.4,
    });

    // --- extrema -------------------------------------------------------------
    for (const e of opts.extrema ?? []) {
      const at = S(e.x, opts.f(e.x));
      items.push(
        { key: `ex:${e.x}`, reveal: "extrema", layer: 5, kind: "marker", at, r: 6.5, fill: ink, ring: ink },
        {
          key: `exl:${e.x}`, reveal: "extrema", layer: 5, kind: "text",
          at: [at[0], at[1] + (e.kind === "max" ? -28 : 30)],
          text: e.kind === "max" ? "极大值" : "极小值",
          size: 22, bold: true, family: "sans", color: ink,
        },
      );
    }

    return { width: W, height: H, items };
  };

  figure.defaults = { axis: 1 };
  figure.continuous = ["px", "qx", "bx", "ax"];
  return figure;
};
