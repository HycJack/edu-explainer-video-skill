import type { Params, Scene, SceneItem, Vec2 } from "../types";
import { green, ink, inkMuted, red } from "../theme";

/**
 * Bar chart / statistical figure — 统计与概率 figure.
 *
 * Bars rise individually (one switch each), the frequency polygon rides their
 * tops, and the mean line glides — a live mean is the whole point of the
 * figure: slide a value and watch the line move.
 *
 * Parameter keys:
 *   axis    the L-shaped axes
 *   bar:i   each bar (i = 0…n−1), revealed one at a time
 *   poly    frequency polygon through the bar tops
 *   mean    the mean line at height my (CONTINUOUS, in value units)
 */

export const WIDTH = 920;
export const HEIGHT = 620;

export type StatsOptions = {
  labels: readonly string[];
  values: readonly number[];
  ymax?: number;
  yTicks?: readonly number[];
  xlabel?: string;
  ylabel?: string;
  width?: number;
  height?: number;
};

export const statsFigure = (opts: StatsOptions) => {
  const W = opts.width ?? WIDTH;
  const H = opts.height ?? HEIGHT;
  const PADL = 86;
  const PADB = 74;
  const PADT = 40;
  const ymax = opts.ymax ?? Math.max(...opts.values) * 1.15;
  const n = opts.values.length;

  const X = (i: number): number => PADL + ((i + 0.5) / n) * (W - PADL - 30);
  const Y = (v: number): number => H - PADB - (v / ymax) * (H - PADB - PADT);
  const barW = ((W - PADL - 30) / n) * 0.62;

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];

    // --- axes -----------------------------------------------------------------
    items.push(
      { key: "ax:y", reveal: "axis", layer: 2, kind: "line", from: [PADL, H - PADB], to: [PADL, PADT - 8], stroke: ink, width: 2.6 },
      { key: "ax:x", reveal: "axis", layer: 2, kind: "line", from: [PADL, H - PADB], to: [W - 18, H - PADB], stroke: ink, width: 2.6 },
      ...(opts.ylabel ? [{ key: "ax:yl", reveal: "axis", layer: 2, kind: "text" as const, at: [PADL - 54, PADT + 40] as Vec2, text: opts.ylabel, size: 24, family: "sans" as const, color: inkMuted }] : []),
      ...(opts.xlabel ? [{ key: "ax:xl", reveal: "axis", layer: 2, kind: "text" as const, at: [W - 44, H - PADB + 30] as Vec2, text: opts.xlabel, size: 24, family: "sans" as const, color: inkMuted }] : []),
    );
    for (const t of opts.yTicks ?? []) {
      items.push(
        { key: `yt:${t}`, reveal: "axis", layer: 1, kind: "line", from: [PADL, Y(t)], to: [W - 18, Y(t)], stroke: "#E4DFD4", width: 1 },
        { key: `ytl:${t}`, reveal: "axis", layer: 2, kind: "text", at: [PADL - 16, Y(t)], text: String(t), size: 22, family: "serif", color: inkMuted },
      );
    }

    // --- bars --------------------------------------------------------------------
    opts.values.forEach((v, i) => {
      const x = X(i) - barW / 2;
      const y = Y(v);
      items.push(
        { key: `bar:${i}`, reveal: `bar:${i}`, layer: 3, kind: "poly", points: [[x, H - PADB], [x, y], [x + barW, y], [x + barW, H - PADB]], fill: "#DCE7FB", stroke: "#1D4ED8", width: 2.4, fillOpacity: 0.85 },
        { key: `barv:${i}`, reveal: `bar:${i}`, layer: 4, kind: "text", at: [X(i), y - 22], text: String(v), size: 25, bold: true, family: "sans", color: "#1D4ED8" },
        { key: `barl:${i}`, reveal: `bar:${i}`, layer: 4, kind: "text", at: [X(i), H - PADB + 30], text: opts.labels[i] ?? String(i + 1), size: 24, family: "sans", color: ink },
      );
    });

    // --- frequency polygon ---------------------------------------------------------
    if (n >= 2) {
      items.push({
        key: "poly",
        reveal: "poly",
        layer: 5,
        kind: "poly",
        close: false,
        points: opts.values.map((_, i) => [X(i), Y(opts.values[i])] as Vec2),
        stroke: green,
        width: 2.8,
      });
      opts.values.forEach((_, i) => {
        items.push({ key: `poly:p${i}`, reveal: "poly", layer: 5, kind: "marker", at: [X(i), Y(opts.values[i])], r: 5, fill: green });
      });
    }

    // --- the mean line ----------------------------------------------------------------
    const my = p.my ?? 0;
    if (my > 0) {
      items.push(
        { key: "mean", reveal: "mean", layer: 6, kind: "line", from: [PADL, Y(my)], to: [W - 18, Y(my)], stroke: red, width: 2.8, dash: "10 7" },
        { key: "mean:lab", reveal: "mean", layer: 6, kind: "text", at: [W - 66, Y(my) - 20], text: my.toFixed(1), size: 25, bold: true, family: "sans", color: red },
      );
    }

    return { width: W, height: H, items };
  };

  figure.defaults = { axis: 1 };
  figure.continuous = ["my"];
  return figure;
};
