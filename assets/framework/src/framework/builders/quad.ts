import type { Params, Scene, SceneItem, Vec2 } from "../types";
import { blue, green, ink, inkMuted, violet } from "../theme";
import { lerp2, mid, offset, rightAngleMark, tick, unit, mul, sub } from "../geometry";

/**
 * The quadrilateral family, MORPHING — 平行四边形 → 矩形 → 菱形 → 梯形.
 *
 * shape is a CONTINUOUS parameter in [0, 3]; the vertices travel between the
 * four reference shapes, so "watch what stays true while the shape changes"
 * becomes an animation rather than four screenshots:
 *   0 平行四边形   1 矩形   2 菱形   3 (等腰)梯形
 * Shape boundaries at 0.5, 1.5, 2.5; property claims hold near the integers.
 *
 * Parameter keys:
 *   quad     outline, vertices, labels, translucent fill
 *   diags    both diagonals
 *   marks    parallel chevrons on AB/DC and equal ticks on AB/AD
 *   height   the height: dashed perpendicular from D onto AB, right angle
 *   midline  the trapezoid midline (also valid for the parallelogram pair)
 *   shape    the morph (continuous)
 */

export const WIDTH = 920;
export const HEIGHT = 620;

type Shape = readonly [Vec2, Vec2, Vec2, Vec2]; // A, B, C, D in order

const SHAPES: readonly Shape[] = [
  // 0 平行四边形
  [[180, 420], [560, 420], [690, 190], [310, 190]],
  // 1 矩形
  [[230, 430], [660, 430], [660, 170], [230, 170]],
  // 2 菱形
  [[255, 300], [455, 445], [665, 300], [455, 155]],
  // 3 等腰梯形
  [[225, 430], [675, 430], [575, 170], [325, 170]],
];

const morphVertices = (shape: number): Shape => {
  const s = Math.max(0, Math.min(3, shape));
  const i = Math.min(2, Math.floor(s));
  const t = s - i;
  const a = SHAPES[i];
  const b = SHAPES[Math.min(3, i + 1)];
  return [
    lerp2(a[0], b[0], t),
    lerp2(a[1], b[1], t),
    lerp2(a[2], b[2], t),
    lerp2(a[3], b[3], t),
  ] as Shape;
};

const NAMES = ["A", "B", "C", "D"] as const;

export const quadFigure = () => {
  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const [A, B, C, D] = morphVertices(p.shape ?? 0);

    // Outward label offset: away from the centroid.
    const ctr: Vec2 = [(A[0] + B[0] + C[0] + D[0]) / 4, (A[1] + B[1] + C[1] + D[1]) / 4];
    const lab = (V: Vec2): Vec2 => {
      const u = unit(sub(V, ctr));
      return offset(V, mul(u, 34));
    };

    // --- the quadrilateral ---------------------------------------------------
    items.push(
      { key: "quad:fill", reveal: "quad", layer: 0, kind: "poly", points: [A, B, C, D], fill: "#DCE7FB", fillOpacity: 0.5, stroke: "none" },
      { key: "quad:AB", reveal: "quad", layer: 2, kind: "line", from: A, to: B, stroke: ink, width: 3.2 },
      { key: "quad:BC", reveal: "quad", layer: 2, kind: "line", from: B, to: C, stroke: ink, width: 3.2 },
      { key: "quad:CD", reveal: "quad", layer: 2, kind: "line", from: C, to: D, stroke: ink, width: 3.2 },
      { key: "quad:DA", reveal: "quad", layer: 2, kind: "line", from: D, to: A, stroke: ink, width: 3.2 },
    );
    [A, B, C, D].forEach((V, i) => {
      const L = lab(V);
      items.push(
        { key: `quad:p${i}`, reveal: "quad", layer: 4, kind: "marker", at: V, r: 5.5, fill: ink },
        { key: `quad:l${i}`, reveal: "quad", layer: 4, kind: "text", at: L, text: NAMES[i], italic: true, family: "serif", size: 33, bold: true, color: ink },
      );
    });

    // --- diagonals -----------------------------------------------------------
    items.push(
      { key: "diag:AC", reveal: "diags", layer: 1, kind: "line", from: A, to: C, stroke: violet, width: 2.4, dash: "9 7" },
      { key: "diag:BD", reveal: "diags", layer: 1, kind: "line", from: B, to: D, stroke: violet, width: 2.4, dash: "9 7" },
      { key: "diag:ctr", reveal: "diags", layer: 4, kind: "marker", at: mid(A, C), r: 4.5, fill: violet },
    );

    // --- parallel chevrons (AB ∥ DC) and one pair of equal ticks -------------
    const chev = (F: Vec2, T: Vec2, t: number, key: string): SceneItem => {
      const u = unit(sub(T, F));
      const n: Vec2 = [-u[1], u[0]];
      const p0 = lerp2(F, T, t);
      return {
        key,
        reveal: "marks",
        layer: 6,
        kind: "poly",
        close: false,
        points: [offset(offset(p0, mul(u, -8)), mul(n, 8)), offset(p0, mul(u, 4)), offset(offset(p0, mul(u, -8)), mul(n, -8))],
        stroke: blue,
        width: 2.6,
      };
    };
    items.push(
      chev(A, B, 0.45, "mark:AB"),
      chev(D, C, 0.45, "mark:DC"),
      tick(A, D, 16, "tick:AD", blue, "marks"),
      tick(B, C, 16, "tick:BC", blue, "marks"),
    );

    // --- the height: perpendicular from D onto AB ----------------------------
    const uAB = unit(sub(B, A));
    const tD = (D[0] - A[0]) * uAB[0] + (D[1] - A[1]) * uAB[1];
    const F = offset(A, mul(uAB, tD)); // foot on line AB
    items.push(
      { key: "h:seg", reveal: "height", layer: 3, kind: "line", from: D, to: F, stroke: green, width: 2.6, dash: "8 6" },
      rightAngleMark(F, D, B, 18, "h:ra", "height", green),
      { key: "h:f", reveal: "height", layer: 4, kind: "marker", at: F, r: 4.5, fill: green },
      { key: "h:lab", reveal: "height", layer: 4, kind: "text", at: offset(mid(D, F), [-30, 0]), text: "h", italic: true, family: "serif", size: 29, bold: true, color: green },
    );

    // --- the midline of the (trapezoid) legs AD, BC ---------------------------
    const E1 = mid(A, D);
    const E2 = mid(B, C);
    items.push(
      { key: "ml:E1", reveal: "midline", layer: 4, kind: "marker", at: E1, r: 5, fill: inkMuted },
      { key: "ml:E2", reveal: "midline", layer: 4, kind: "marker", at: E2, r: 5, fill: inkMuted },
      { key: "ml:seg", reveal: "midline", layer: 3, kind: "line", from: E1, to: E2, stroke: inkMuted, width: 2.6 },
    );

    return { width: WIDTH, height: HEIGHT, items };
  };

  figure.defaults = { quad: 1 };
  figure.continuous = ["shape"];
  return figure;
};
