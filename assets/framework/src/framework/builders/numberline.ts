import type { Params, Scene, SceneItem, Vec2 } from "../types";
import { green, ink, inkMuted, red } from "../theme";

/**
 * The number line — 不等式与绝对值 figure.
 *
 * Parameter keys (both endpoints are CONTINUOUS, so an interval visibly
 * slides shut or open while the narration talks):
 *   axis    the line, arrowhead, ticks and their numbers
 *   a       endpoint A at pa (continuous)
 *   b       endpoint B at pb (continuous)
 *   span    the shaded interval between them
 *   labelA  a text label pinned above A (reads pa, e.g. "|x - 1| ≤ 3")
 *   labelB  a text label pinned below B
 *
 * Endpoint style: `closedA` / `closedB` (0/1) choose solid vs hollow — the
 * builder swaps fill and ring on the marker, it does not crossfade.
 */

export const WIDTH = 920;
export const HEIGHT = 300;

export type NumberLineOptions = {
  min: number;
  max: number;
  step?: number;
  /** Number labels every `labelEvery` ticks (default every tick). */
  labelEvery?: number;
  width?: number;
  height?: number;
};

export const numberLineFigure = (opts: NumberLineOptions) => {
  const W = opts.width ?? WIDTH;
  const H = opts.height ?? HEIGHT;
  const step = opts.step ?? 1;
  const labelEvery = opts.labelEvery ?? 1;

  const PAD = 70;
  const X = (v: number): number => PAD + ((v - opts.min) / (opts.max - opts.min)) * (W - 2 * PAD);
  const CY = H / 2 + 14;

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const pa = p.pa ?? 0;
    const pb = p.pb ?? opts.max;
    const closedA = (p.closedA ?? 1) > 0.5;
    const closedB = (p.closedB ?? 1) > 0.5;

    // --- the line -----------------------------------------------------------
    items.push(
      { key: "nl:line", reveal: "axis", layer: 2, kind: "line", from: [PAD - 26, CY], to: [W - PAD + 26, CY], stroke: ink, width: 3 },
      { key: "nl:head", reveal: "axis", layer: 2, kind: "poly", close: false, points: [[W - PAD + 26, CY], [W - PAD + 10, CY - 8]], stroke: ink, width: 3 },
      { key: "nl:head2", reveal: "axis", layer: 2, kind: "poly", close: false, points: [[W - PAD + 26, CY], [W - PAD + 10, CY + 8]], stroke: ink, width: 3 },
    );
    for (let v = Math.ceil(opts.min / step) * step; v <= opts.max + 1e-9; v += step) {
      const major = Math.abs(v / (step * labelEvery) - Math.round(v / (step * labelEvery))) < 1e-9;
      items.push(
        { key: `nl:t:${v}`, reveal: "axis", layer: 2, kind: "line", from: [X(v), CY - (major ? 9 : 5)], to: [X(v), CY + (major ? 9 : 5)], stroke: ink, width: major ? 2.4 : 1.6 },
        ...(major
          ? [{ key: `nl:l:${v}`, reveal: "axis", layer: 2, kind: "text" as const, at: [X(v), CY + 34] as Vec2, text: String(Number(v.toFixed(6))), size: 23, family: "serif" as const, color: inkMuted }]
          : []),
      );
    }

    // --- the shaded interval --------------------------------------------------
    const lo = Math.min(pa, pb);
    const hi = Math.max(pa, pb);
    items.push({
      key: "nl:span",
      reveal: "span",
      layer: 3,
      kind: "line",
      from: [X(lo), CY],
      to: [X(hi), CY],
      stroke: green,
      width: 9,
      glow: true,
      opacity: 0.85,
    });

    // --- the two endpoints ----------------------------------------------------
    items.push(
      {
        key: "nl:a",
        reveal: "a",
        layer: 5,
        kind: "marker",
        at: [X(pa), CY],
        r: 9,
        fill: closedA ? red : "#FFFFFF",
        ring: red,
        ringWidth: 3,
      },
      {
        key: "nl:b",
        reveal: "b",
        layer: 5,
        kind: "marker",
        at: [X(pb), CY],
        r: 9,
        fill: closedB ? red : "#FFFFFF",
        ring: red,
        ringWidth: 3,
      },
      {
        key: "nl:alab",
        reveal: "labelA",
        layer: 5,
        kind: "text",
        at: [X(pa), CY - 52],
        text: String(Number(pa.toFixed(2))),
        size: 27,
        bold: true,
        family: "serif",
        color: red,
      },
      {
        key: "nl:blab",
        reveal: "labelB",
        layer: 5,
        kind: "text",
        at: [X(pb), CY + 64],
        text: String(Number(pb.toFixed(2))),
        size: 27,
        bold: true,
        family: "serif",
        color: red,
      },
    );

    return { width: W, height: H, items };
  };

  figure.defaults = { axis: 1 };
  figure.continuous = ["pa", "pb"];
  return figure;
};
