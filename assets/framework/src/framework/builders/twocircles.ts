import type { Params, Scene, SceneItem, Vec2 } from "../types";
import { blue, green, ink, inkMuted } from "../theme";

/**
 * Two circles and their five positional relations — 圆与圆的位置关系 figure.
 *
 * d is the centre distance and it is CONTINUOUS: sliding it walks the figure
 * through 内含 → 内切 → 相交 → 外切 → 外离. The intersection points (computed
 * exactly) appear and vanish on their own; the tangency points appear exactly
 * at d = r1 + r2 and d = |r1 − r2| because that is where the maths puts them.
 *
 * Parameter keys:
 *   c1      circle O₁ with radius r1
 *   c2      circle O₂ with radius r2 (centre rides the CONTINUOUS d)
 *   line    the dashed line of centres, with O₁O₂ labelled
 *   pts     intersection points P, Q (or the tangent point when tangent)
 */

export const WIDTH = 920;
export const HEIGHT = 560;

export type TwoCirclesOptions = {
  r1: number;
  r2: number;
  /** Screen radius for r1 = 1. */
  scale?: number;
  width?: number;
  height?: number;
};

export const twoCirclesFigure = (opts: TwoCirclesOptions) => {
  const W = opts.width ?? WIDTH;
  const H = opts.height ?? HEIGHT;
  const SC = opts.scale ?? 100;
  const r1 = opts.r1 * SC;
  const r2 = opts.r2 * SC;
  // O₁ pinned so the biggest circle clears the left edge; O₂ rides d to the right.
  const C1: Vec2 = [r1 + 42, H / 2];
  const { r1: R1, r2: R2 } = { r1, r2 };

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const d = p.d ?? opts.r1 + opts.r2; // in units of r1=1? No — screen px below.
    const D = d * SC;
    const C2: Vec2 = [C1[0] + D, C1[1]];

    // --- circles and centres -------------------------------------------------
    items.push(
      { key: "c1", reveal: "c1", layer: 2, kind: "circle", c: C1, r: R1, fill: "#DCE7FB", fillOpacity: 0.4, stroke: blue, width: 3.4 },
      { key: "c2", reveal: "c2", layer: 2, kind: "circle", c: C2, r: R2, fill: "#FCE9C8", fillOpacity: 0.45, stroke: "#D97706", width: 3.4 },
      { key: "o1", reveal: "c1", layer: 4, kind: "marker", at: C1, r: 5, fill: blue },
      { key: "o2", reveal: "c2", layer: 4, kind: "marker", at: C2, r: 5, fill: "#D97706" },
      { key: "o1l", reveal: "c1", layer: 4, kind: "text", at: [C1[0] - 6, C1[1] + 34], text: "O₁", italic: true, family: "serif", size: 30, bold: true, color: blue },
      { key: "o2l", reveal: "c2", layer: 4, kind: "text", at: [C2[0] + 8, C2[1] + 34], text: "O₂", italic: true, family: "serif", size: 30, bold: true, color: "#D97706" },
    );

    // --- line of centres -------------------------------------------------------
    items.push(
      { key: "cl", reveal: "line", layer: 1, kind: "line", from: [C1[0] - R1 - 24, C1[1]], to: [C2[0] + R2 + 24, C2[1]], stroke: inkMuted, width: 2, dash: "9 7" },
      {
        key: "cl:lab", reveal: "line", layer: 4, kind: "text",
        at: [(C1[0] + C2[0]) / 2, C1[1] + 74],
        text: `d = ${d.toFixed(2)}`,
        size: 27, bold: true, family: "sans", color: ink,
      },
    );

    // --- intersection / tangency points ---------------------------------------
    const pts: { at: Vec2; name: string }[] = [];
    const sum = R1 + R2;
    const dif = Math.abs(R1 - R2);
    if (D > dif + 0.5 && D < sum - 0.5) {
      // Two intersections: standard construction.
      const a = (R1 * R1 - R2 * R2 + D * D) / (2 * D);
      const h = Math.sqrt(Math.max(0, R1 * R1 - a * a));
      const ux = (C2[0] - C1[0]) / (D || 1);
      const uy = (C2[1] - C1[1]) / (D || 1);
      const Mx = C1[0] + a * ux;
      const My = C1[1] + a * uy;
      pts.push({ at: [Mx - h * uy, My + h * ux], name: "P" });
      pts.push({ at: [Mx + h * uy, My - h * ux], name: "Q" });
    } else if (Math.abs(D - sum) <= 0.5) {
      // Externally tangent.
      pts.push({ at: [(C1[0] * R2 + C2[0] * R1) / sum, C1[1]], name: "T" });
    } else if (Math.abs(D - dif) <= 0.5 && dif > 1) {
      // Internally tangent.
      const sgn = R1 > R2 ? 1 : -1;
      pts.push({ at: [C1[0] + sgn * R1, C1[1]], name: "T" });
    }
    for (const q of pts) {
      items.push(
        { key: `ip:${q.name}`, reveal: "pts", layer: 5, kind: "marker", at: q.at, r: 6.5, fill: green, ring: green },
        {
          key: `ipl:${q.name}`, reveal: "pts", layer: 5, kind: "text",
          at: [q.at[0], q.at[1] - 30], text: q.name,
          italic: true, family: "serif", size: 30, bold: true, color: green,
        },
      );
    }

    // --- relation name, live ---------------------------------------------------
    const name =
      D < dif - 0.5 ? "内含" :
      Math.abs(D - dif) <= 0.5 ? "内切" :
      D < sum - 0.5 ? "相交" :
      Math.abs(D - sum) <= 0.5 ? "外切" : "外离";
    items.push({
      key: "rel",
      reveal: "line",
      layer: 5,
      kind: "text",
      at: [W / 2, 56],
      text: name,
      size: 34,
      bold: true,
      family: "sans",
      color: ink,
    });

    return { width: W, height: H, items };
  };

  figure.defaults = { c1: 1 };
  figure.continuous = ["d"];
  return figure;
};
