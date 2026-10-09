import type { Params, Scene, SceneItem, Vec2 } from "../types";
import { blue, green, ink, inkMuted, red, violet } from "../theme";
import { add, mul, offset, sub, unit } from "../geometry";

/**
 * Plane vectors — 平面向量 figure.
 *
 * Options give three points O, A, B; the builder draws the two vectors and,
 * on request, their parallelogram sum, the orthogonal decomposition of one of
 * them, and a live λ-scaling of OA. Everything is arrows; the notation work
 * (bold, arrows over letters) stays in the content file.
 *
 * Parameter keys (k is CONTINUOUS):
 *   grid    light lattice + the two axes through O
 *   pts     the point markers O, A, B, C
 *   v1      arrow O→A with label
 *   v2      arrow O→B with label
 *   sum     parallelogram completion (dashed A→C, B→C) + resultant O→C
 *   decomp  dashed projections of OA onto the axes with component arrows
 *   scale   arrow O→λA with λ read-out (continuous k)
 */

export const WIDTH = 860;
export const HEIGHT = 620;

export type VecMathPt = readonly [number, number];

export type VectorOptions = {
  O: VecMathPt;
  A: VecMathPt;
  B: VecMathPt;
  scale?: number;
  width?: number;
  height?: number;
};

export const vectorFigure = (opts: VectorOptions) => {
  const W = opts.width ?? WIDTH;
  const H = opts.height ?? HEIGHT;
  const k0 = opts.scale ?? 72;

  const OX = W / 2 - opts.O[0] * k0;
  const OY = H / 2 + opts.O[1] * k0;
  const S = (p: VecMathPt): Vec2 => [OX + p[0] * k0, OY - p[1] * k0];

  const O = S(opts.O);
  const A = S(opts.A);
  const B = S(opts.B);
  const C = S([opts.A[0] + opts.B[0], opts.A[1] + opts.B[1]]);

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const k = p.k ?? 1;
    const gridStep = k0;

    // --- lattice -------------------------------------------------------------
    const lattice: SceneItem[] = [];
    for (let x = OX % gridStep; x <= W; x += gridStep) {
      lattice.push({ key: `vg:x${x}`, reveal: "grid", layer: 0, kind: "line", from: [x, 0], to: [x, H], stroke: "#EAE5DA", width: 1 });
    }
    for (let y = OY % gridStep; y <= H; y += gridStep) {
      lattice.push({ key: `vg:y${y}`, reveal: "grid", layer: 0, kind: "line", from: [0, y], to: [W, y], stroke: "#EAE5DA", width: 1 });
    }
    items.push(...lattice);

    // --- axes through O ---------------------------------------------------------
    items.push(
      { key: "ax:x", reveal: "grid", layer: 1, kind: "line", from: [24, OY], to: [W - 24, OY], stroke: inkMuted, width: 1.8 },
      { key: "ax:y", reveal: "grid", layer: 1, kind: "line", from: [OX, H - 24], to: [OX, 24], stroke: inkMuted, width: 1.8 },
    );

    // --- points ------------------------------------------------------------------
    items.push(
      { key: "pt:O", reveal: "pts", layer: 4, kind: "marker", at: O, r: 5, fill: ink },
      { key: "pt:A", reveal: "pts", layer: 4, kind: "marker", at: A, r: 5.5, fill: blue },
      { key: "pt:B", reveal: "pts", layer: 4, kind: "marker", at: B, r: 5.5, fill: "#D97706" },
      { key: "pt:C", reveal: "pts", layer: 4, kind: "marker", at: C, r: 5.5, fill: green },
      { key: "lab:O", reveal: "pts", layer: 4, kind: "text", at: offset(O, [-24, 20]), text: "O", italic: true, family: "serif", size: 29, bold: true, color: ink },
      { key: "lab:A", reveal: "pts", layer: 4, kind: "text", at: offset(A, [24, -16]), text: "A", italic: true, family: "serif", size: 30, bold: true, color: blue },
      { key: "lab:B", reveal: "pts", layer: 4, kind: "text", at: offset(B, [26, 4]), text: "B", italic: true, family: "serif", size: 30, bold: true, color: "#D97706" },
      { key: "lab:C", reveal: "pts", layer: 4, kind: "text", at: offset(C, [26, -6]), text: "C", italic: true, family: "serif", size: 30, bold: true, color: green },
    );

    // --- the two vectors -----------------------------------------------------------
    const mid1 = mul(add(O, A), 0.5);
    const mid2 = mul(add(O, B), 0.5);
    const n1: Vec2 = unit([-(A[1] - O[1]), A[0] - O[0]]);
    const n2: Vec2 = unit([-(B[1] - O[1]), B[0] - O[0]]);
    items.push(
      { key: "v1", reveal: "v1", layer: 3, kind: "arrow", from: O, to: A, stroke: blue, width: 3.6, head: 15, glow: true },
      { key: "v1:lab", reveal: "v1", layer: 4, kind: "text", at: offset(mid1, mul(n1, 26)), text: "a", italic: true, family: "serif", size: 30, bold: true, color: blue },
      { key: "v2", reveal: "v2", layer: 3, kind: "arrow", from: O, to: B, stroke: "#D97706", width: 3.6, head: 15, glow: true },
      { key: "v2:lab", reveal: "v2", layer: 4, kind: "text", at: offset(mid2, mul(n2, -26)), text: "b", italic: true, family: "serif", size: 30, bold: true, color: "#D97706" },
    );

    // --- parallelogram completion -----------------------------------------------------
    items.push(
      { key: "sum:AC", reveal: "sum", layer: 2, kind: "line", from: A, to: C, stroke: inkMuted, width: 2, dash: "8 7" },
      { key: "sum:BC", reveal: "sum", layer: 2, kind: "line", from: B, to: C, stroke: inkMuted, width: 2, dash: "8 7" },
      { key: "sum:OC", reveal: "sum", layer: 3, kind: "arrow", from: O, to: C, stroke: green, width: 4, head: 16, glow: true },
    );

    // --- orthogonal decomposition of OA -------------------------------------------------
    const Ax: Vec2 = [A[0], O[1]];
    const Ay: Vec2 = [O[0], A[1]];
    items.push(
      { key: "dc:drop", reveal: "decomp", layer: 2, kind: "line", from: A, to: Ax, stroke: inkMuted, width: 1.8, dash: "5 6" },
      { key: "dc:drop2", reveal: "decomp", layer: 2, kind: "line", from: A, to: Ay, stroke: inkMuted, width: 1.8, dash: "5 6" },
      { key: "dc:x", reveal: "decomp", layer: 3, kind: "arrow", from: O, to: Ax, stroke: violet, width: 3, head: 12 },
      { key: "dc:y", reveal: "decomp", layer: 3, kind: "arrow", from: O, to: Ay, stroke: violet, width: 3, head: 12 },
    );

    // --- λ scaling of OA -----------------------------------------------------------------
    const Scaled: Vec2 = [O[0] + (A[0] - O[0]) * k, O[1] + (A[1] - O[1]) * k];
    items.push(
      { key: "sc:arrow", reveal: "scale", layer: 4, kind: "arrow", from: O, to: Scaled, stroke: red, width: 3.4, head: 14 },
      {
        key: "sc:val", reveal: "scale", layer: 5, kind: "text",
        at: offset(Scaled, [0, -34]),
        text: `λ = ${k.toFixed(2)}`,
        size: 26, bold: true, family: "sans", color: red,
      },
    );

    return { width: W, height: H, items };
  };

  figure.defaults = { grid: 1, pts: 1 };
  figure.continuous = ["k"];
  return figure;
};
