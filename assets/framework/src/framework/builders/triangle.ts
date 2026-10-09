import type { Params, Scene, SceneItem, Vec2 } from "../types";
import { amber, blue, green, ink, inkMuted, red, violet } from "../theme";
import { arcPath, dist, lerp2, lineIntersect, mid, rightAngleMark, tick, unit, offset, mul, sub } from "../geometry";

/**
 * The general triangle with its four principal lines — 全等/相似/解三角形 figure.
 *
 * The triangle itself is fixed (options), everything added on top is a step:
 *
 *   const figure = triangleFigure({ A: [0, 4.6], B: [0, 0], C: [6.2, 0] });
 *
 * Parameter keys (k is CONTINUOUS — the similar triangle actually grows):
 *   tri      outline, vertices, labels
 *   med      median from A to the midpoint of BC
 *   alt      altitude from A, foot F, right-angle mark
 *   bis      angle bisector from A
 *   midline  midpoints of AB, AC joined — the midline
 *   sim      A-shape: DE ∥ BC with D on AB, E on AC at fraction k of the way down
 *   ticks    equal marks on AB and AC (isosceles claim)
 *   angles   angle arcs at all three vertices
 */

export const WIDTH = 920;
export const HEIGHT = 660;

export type MathPt = readonly [number, number];

export type TriangleOptions = {
  A: MathPt;
  B: MathPt;
  C: MathPt;
  scale?: number;
  width?: number;
  height?: number;
};

export const triangleFigure = (opts: TriangleOptions) => {
  const W = opts.width ?? WIDTH;
  const H = opts.height ?? HEIGHT;
  const k0 = opts.scale ?? 100;

  // Centre the triangle once.
  const xs = [opts.A[0], opts.B[0], opts.C[0]];
  const ys = [opts.A[1], opts.B[1], opts.C[1]];
  const OX = W / 2 - ((Math.min(...xs) + Math.max(...xs)) / 2) * k0;
  const OY = H / 2 + ((Math.min(...ys) + Math.max(...ys)) / 2) * k0;
  const S = (p: MathPt): Vec2 => [OX + p[0] * k0, OY - p[1] * k0];

  const A = S(opts.A);
  const B = S(opts.B);
  const C = S(opts.C);

  const foot = (P: Vec2, U: Vec2, V: Vec2): Vec2 => {
    const u = unit(sub(V, U));
    const t = (P[0] - U[0]) * u[0] + (P[1] - U[1]) * u[1];
    return offset(U, mul(u, t));
  };

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const k = p.k ?? 0.55;

    const M = mid(B, C); // midpoint of BC
    const F = foot(A, B, C); // altitude foot
    // Angle bisector from A: unit vectors along AB and AC summed.
    const u1 = unit(sub(B, A));
    const u2 = unit(sub(C, A));
    const bisDir = unit(offset(u1, u2));
    const bisEnd = lineIntersect(A, bisDir, B, sub(C, B)) ?? offset(A, mul(bisDir, dist(A, M)));

    const D = lerp2(A, B, k); // similar triangle: D on AB
    const E = lerp2(A, C, k); // E on AC

    // --- the triangle -------------------------------------------------------
    items.push(
      { key: "tri:AB", reveal: "tri", layer: 2, kind: "line", from: A, to: B, stroke: ink, width: 3.2 },
      { key: "tri:BC", reveal: "tri", layer: 2, kind: "line", from: B, to: C, stroke: ink, width: 3.2 },
      { key: "tri:CA", reveal: "tri", layer: 2, kind: "line", from: C, to: A, stroke: ink, width: 3.2 },
      { key: "pt:A", reveal: "tri", layer: 4, kind: "marker", at: A, r: 5.5, fill: ink },
      { key: "pt:B", reveal: "tri", layer: 4, kind: "marker", at: B, r: 5.5, fill: ink },
      { key: "pt:C", reveal: "tri", layer: 4, kind: "marker", at: C, r: 5.5, fill: ink },
      { key: "lab:A", reveal: "tri", layer: 4, kind: "text", at: [A[0] - 6, A[1] - 30], text: "A", italic: true, family: "serif", size: 34, bold: true, color: ink },
      { key: "lab:B", reveal: "tri", layer: 4, kind: "text", at: [B[0] - 28, B[1] + 30], text: "B", italic: true, family: "serif", size: 34, bold: true, color: ink },
      { key: "lab:C", reveal: "tri", layer: 4, kind: "text", at: [C[0] + 28, C[1] + 30], text: "C", italic: true, family: "serif", size: 34, bold: true, color: ink },
    );

    // --- median from A ------------------------------------------------------
    items.push(
      { key: "med", reveal: "med", layer: 3, kind: "line", from: A, to: M, stroke: blue, width: 2.8 },
      { key: "med:m", reveal: "med", layer: 4, kind: "marker", at: M, r: 5, fill: blue },
      { key: "med:lab", reveal: "med", layer: 4, kind: "text", at: [M[0], M[1] + 30], text: "M", italic: true, family: "serif", size: 28, bold: true, color: blue },
    );

    // --- altitude from A ----------------------------------------------------
    items.push(
      { key: "alt", reveal: "alt", layer: 3, kind: "line", from: A, to: F, stroke: violet, width: 2.8, dash: "9 7" },
      rightAngleMark(F, A, dist(A, F) > 1 ? B : B, 20, "alt:ra", "alt", violet),
      { key: "alt:f", reveal: "alt", layer: 4, kind: "marker", at: F, r: 5, fill: violet },
      { key: "alt:lab", reveal: "alt", layer: 4, kind: "text", at: [F[0], F[1] + 32], text: "F", italic: true, family: "serif", size: 28, bold: true, color: violet },
    );

    // --- angle bisector from A ----------------------------------------------
    items.push(
      { key: "bis", reveal: "bis", layer: 3, kind: "line", from: A, to: bisEnd, stroke: amber, width: 2.8 },
      { key: "bis:a1", reveal: "bis", layer: 5, kind: "path", d: arcPath(A, B, offset(A, bisDir), 46), stroke: amber, width: 2.4, fill: "none" },
      { key: "bis:a2", reveal: "bis", layer: 5, kind: "path", d: arcPath(A, offset(A, bisDir), C, 46), stroke: amber, width: 2.4, fill: "none" },
    );

    // --- the midline ----------------------------------------------------------
    const P = mid(A, B);
    const Q = mid(A, C);
    items.push(
      { key: "ml:P", reveal: "midline", layer: 4, kind: "marker", at: P, r: 5, fill: green },
      { key: "ml:Q", reveal: "midline", layer: 4, kind: "marker", at: Q, r: 5, fill: green },
      { key: "ml:seg", reveal: "midline", layer: 3, kind: "line", from: P, to: Q, stroke: green, width: 2.8 },
      { key: "ml:labP", reveal: "midline", layer: 4, kind: "text", at: [P[0] - 28, P[1] - 8], text: "P", italic: true, family: "serif", size: 27, bold: true, color: green },
      { key: "ml:labQ", reveal: "midline", layer: 4, kind: "text", at: [Q[0] + 28, Q[1] - 8], text: "Q", italic: true, family: "serif", size: 27, bold: true, color: green },
    );

    // --- the A-shape similar triangle ---------------------------------------
    items.push(
      { key: "sim:DE", reveal: "sim", layer: 3, kind: "line", from: D, to: E, stroke: red, width: 2.8 },
      { key: "sim:AD", reveal: "sim", layer: 3, kind: "line", from: A, to: D, stroke: red, width: 2.8 },
      { key: "sim:AE", reveal: "sim", layer: 3, kind: "line", from: A, to: E, stroke: red, width: 2.8 },
      { key: "sim:D", reveal: "sim", layer: 4, kind: "marker", at: D, r: 5, fill: red },
      { key: "sim:E", reveal: "sim", layer: 4, kind: "marker", at: E, r: 5, fill: red },
      { key: "sim:labD", reveal: "sim", layer: 4, kind: "text", at: [D[0] - 28, D[1]], text: "D", italic: true, family: "serif", size: 27, bold: true, color: red },
      { key: "sim:labE", reveal: "sim", layer: 4, kind: "text", at: [E[0] + 28, E[1]], text: "E", italic: true, family: "serif", size: 27, bold: true, color: red },
      { key: "sim:parD", reveal: "sim", layer: 6, kind: "poly", close: false, points: [offset(lerp2(D, E, 0.3), [0, -7]), offset(lerp2(D, E, 0.36), [0, -7]), offset(lerp2(D, E, 0.42), [0, -7])], stroke: red, width: 2.4 },
    );

    // --- equal-side ticks -----------------------------------------------------
    items.push(
      tick(A, B, 18, "tick:AB", inkMuted, "ticks"),
      tick(A, C, 18, "tick:AC", inkMuted, "ticks"),
    );

    // --- angle arcs ------------------------------------------------------------
    items.push(
      { key: "ang:A", reveal: "angles", layer: 5, kind: "path", d: arcPath(A, B, C, 52), stroke: inkMuted, width: 2.4, fill: "none" },
      { key: "ang:B", reveal: "angles", layer: 5, kind: "path", d: arcPath(B, C, A, 40), stroke: inkMuted, width: 2.4, fill: "none" },
      { key: "ang:C", reveal: "angles", layer: 5, kind: "path", d: arcPath(C, A, B, 40), stroke: inkMuted, width: 2.4, fill: "none" },
    );

    return { width: W, height: H, items };
  };

  figure.defaults = { tri: 1 };
  figure.continuous = ["k"];
  return figure;
};
