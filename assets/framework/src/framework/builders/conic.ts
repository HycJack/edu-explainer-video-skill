import type { Params, Scene, SceneItem, Vec2 } from "../types";

/**
 * An ellipse with a chord through a fixed point — the analytic-geometry figure.
 *
 * Unlike the cuboid, this one is a function of a continuous parameter, so it
 * doubles as the worked example of animating geometry: a content file sets
 * `k` and the chord actually swings round to that slope.
 *
 * Parameter keys:
 *   curve    reveal the ellipse and its axes
 *   chord    reveal the line through the fixed point
 *   seg      reveal the chord segment itself
 *   at:M     reveal point M
 *   at:N     reveal point N
 *   k        the slope — animated, not a reveal
 */

export const WIDTH = 920;
export const HEIGHT = 660;

const A = 2; // semi-major on x
const B = 1; // semi-minor on y
const SCALE = 158;
const CX = 470;
const CY = 300;

/** Ellipse point -> screen. */
export const pt = (x: number, y: number): Vec2 => [CX + x * SCALE, CY - y * SCALE];

export const TOP: Vec2 = [0, 1];
export const K_OPT = Math.SQRT1_2; // 1/sqrt(2)

/** The second intersection of y = kx + 1 with the ellipse. */
export const secondPoint = (k: number): [number, number] => {
  if (Math.abs(k) < 1e-9) return [0, 1];
  const x = (-8 * k) / (1 + 4 * k * k);
  return [x, k * x + 1];
};

const axisLine = (x1: number, y1: number, x2: number, y2: number): Vec2[] => [
  pt(x1, y1),
  pt(x2, y2),
];

export const conicFigure = () => (p: Params): Scene => {
  const items: SceneItem[] = [];
  const k = p.k ?? 0;
  const [nx, ny] = secondPoint(k);

  // --- axes ---------------------------------------------------------------
  items.push(
    { layer: 2, key: "axis:x", reveal: "curve", kind: "line", from: axisLine(-2.6, 0, 2.6, 0)[0], to: axisLine(-2.6, 0, 2.6, 0)[1], stroke: "#94A3B8", width: 1.8 },
    { layer: 2, key: "axis:y", reveal: "curve", kind: "line", from: axisLine(0, -1.6, 0, 1.6)[0], to: axisLine(0, -1.6, 0, 1.6)[1], stroke: "#94A3B8", width: 1.8 },
    { layer: 2, key: "axis:xh", reveal: "curve", kind: "line", from: pt(2.6, 0), to: pt(2.45, 0), stroke: "#94A3B8", width: 2 },
    { layer: 2, key: "axis:yh", reveal: "curve", kind: "line", from: pt(0, 1.6), to: pt(0, 1.45), stroke: "#94A3B8", width: 2 },
    { key: "axis:ox", reveal: "curve", layer: 2, kind: "text", at: [pt(2.72, 0)[0], pt(0, 0)[1] + 8], text: "x", italic: true, family: "serif", size: 26, color: "#64707E" },
    { key: "axis:oy", reveal: "curve", layer: 2, kind: "text", at: [pt(0, 0)[0] - 16, pt(0, 1.72)[1]], text: "y", italic: true, family: "serif", size: 26, color: "#64707E" },
    { key: "axis:o", reveal: "curve", layer: 2, kind: "text", at: [pt(0, 0)[0] - 20, pt(0, 0)[1] + 22], text: "O", italic: true, family: "serif", size: 26, color: "#64707E" },
  );

  // --- the ellipse --------------------------------------------------------
  items.push({
    key: "ellipse",
    reveal: "curve",
    kind: "ellipse",
    c: pt(0, 0),
    r: A * SCALE,
    ry: B * SCALE,
    fill: "#DCE7FB",
    stroke: "#1D4ED8",
    width: 3.6,
    layer: 0,
  });

  // --- vertices of the conic ---------------------------------------------
  const verts: readonly (readonly [number, number, string, string?])[] = [
    [-A, 0, "A", "1"],
    [A, 0, "A", "2"],
    [0, B, "B", "1"],
    [0, -B, "B", "2"],
  ];
  for (const [x, y, t, s] of verts) {
    items.push(
      { key: `vert:${t}${s}`, reveal: "curve", kind: "marker", at: pt(x, y), r: 5, fill: "#1D4ED8" },
      { key: `vertlab:${t}${s}`, reveal: "curve", kind: "text", at: [pt(x, y)[0] + (x < 0 ? -22 : 22), pt(x, y)[1] - 18], text: t, sub: s, italic: true, family: "serif", size: 27, bold: true, color: "#1D4ED8" },
    );
  }

  // --- the fixed point the line passes through ----------------------------
  items.push(
    { layer: 2, key: "pt:B1", reveal: "fixed", kind: "marker", at: pt(...TOP), r: 8, fill: "#D97706", ring: "#D97706" },
  );

  // --- the moving line l --------------------------------------------------
  // Extend it well past the ellipse so it reads as a line, not a segment.
  const span = 2.45;
  const lineA = pt(-span, -k * span + 1);
  const lineB = pt(span, k * span + 1);
  items.push({
    key: "line:l",
    reveal: "chord",
    kind: "line",
    from: lineA,
    to: lineB,
    stroke: "#D97706",
    width: 2.6,
    dash: "10 8",
  });

  // --- the chord segment --------------------------------------------------
  items.push({
    key: "chord",
    reveal: "seg",
    kind: "line",
    from: pt(...TOP),
    to: pt(nx, ny),
    stroke: "#059669",
    width: 6,
    glow: true,
  });

  // --- the two intersection points ----------------------------------------
  items.push(
    { layer: 2, key: "at:M", reveal: "at:M", kind: "marker", at: pt(...TOP), r: 7, fill: "#059669", ring: "#059669" },
    { layer: 2, key: "at:N", reveal: "at:N", kind: "marker", at: pt(nx, ny), r: 7, fill: "#059669", ring: "#059669" },
    { layer: 2, key: "lab:M", reveal: "at:M", kind: "text", at: [pt(...TOP)[0] + 30, pt(...TOP)[1] + 26], text: "M", italic: true, family: "serif", size: 30, bold: true, color: "#059669" },
    { layer: 2, key: "lab:N", reveal: "at:N", kind: "text", at: [pt(nx, ny)[0] - 30, pt(nx, ny)[1] + 6], text: "N", italic: true, family: "serif", size: 30, bold: true, color: "#059669" },
  );

  // --- a dashed radius to make OMN read as a triangle --------------------
  items.push(
    { layer: 2, key: "tri:OM", reveal: "seg", kind: "line", from: pt(0, 0), to: pt(...TOP), stroke: "#059669", width: 1.8, dash: "6 6" },
    { layer: 2, key: "tri:ON", reveal: "seg", kind: "line", from: pt(0, 0), to: pt(nx, ny), stroke: "#059669", width: 1.8, dash: "6 6" },
  );

  return { width: WIDTH, height: HEIGHT, items };
};