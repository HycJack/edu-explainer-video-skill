import type { Params, Scene, SceneItem, Vec2 } from "../types";
import { amber, green, ink, inkMuted, violet } from "../theme";

/**
 * 将军饮马 —— the straight-bank reflection figure.
 *
 * The bank is the x axis, the river lies below it, and A and B stand on the
 * SAME side. That last part is not decoration: if A and B were on opposite
 * sides then reflecting B puts B′ on A's side, the segment AB′ never reaches
 * the bank, and AQ + QB has an infimum but no minimum. Same-side is the only
 * form of the problem where the reflection lands, and it is the form textbooks
 * actually use.
 *
 * The distances are chosen so every number in the narration is exact:
 *   A = (0, 3)   3 from the bank
 *   B = (4, 1)   1 from the bank, 4 along it
 *   B′ = (4, −1) the reflection
 *   P  = (3, 0)  where AB′ crosses the bank, so AP = 3√2, PB = √2, total 4√2
 *
 * Parameter keys (reveals are 0–1; `qx` is animated, not a reveal):
 *   bank      the bank line l and the water below it
 *   pts       the two given points A and B
 *   try       the route A → Q → B, with Q sliding along l
 *   meter     a live read-out of AQ + QB for the current Q
 *   drop      the perpendicular BF and the reflected point B′
 *   shortest  the straightened line AB′ and the route through P
 *   ticks     equal-length marks on PB and PB′
 *   qx        the x-coordinate of Q — this is what makes the figure move
 */

export const WIDTH = 900;
export const HEIGHT = 760;

const SCALE = 100;
const OX = 230;
const OY = 490;

/** A point in the problem's own coordinates → screen. */
export const pt = (x: number, y: number): Vec2 => [OX + x * SCALE, OY - y * SCALE];

export const L = { x0: -1.6, x1: 6 } as const;
export const RIVER_Y = -2.2;

export type MathPoint = readonly [number, number];

export const A_M: MathPoint = [0, 3];
export const B_M: MathPoint = [4, 1];
export const F_M: MathPoint = [4, 0];
export const BP_M: MathPoint = [4, -1];
/** Solved, not eyeballed: AB′ falls 4 in y, so y = 0 is at t = 3/4 → x = 3. */
export const P_M: MathPoint = [3, 0];

export const dist = (a: MathPoint, b: MathPoint): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

// ---------------------------------------------------------------------------
// Shared primitives that the Scene renderer has no dedicated item for
// ---------------------------------------------------------------------------

const offset = (from: Vec2, by: Vec2): Vec2 => [from[0] + by[0], from[1] + by[1]];

const unit = (d: Vec2): Vec2 => {
  const m = Math.hypot(d[0], d[1]) || 1;
  return [d[0] / m, d[1] / m];
};

/** The little square at a corner, from the two directions that meet there. */
const rightAngle = (
  corner: Vec2,
  along: Vec2,
  across: Vec2,
  size: number,
  key: string,
  reveal: string,
  color: string,
): SceneItem => {
  const u = unit([along[0] - corner[0], along[1] - corner[1]]);
  const v = unit([across[0] - corner[0], across[1] - corner[1]]);
  const a: Vec2 = [u[0] * size, u[1] * size];
  const b: Vec2 = [v[0] * size, v[1] * size];
  return {
    key,
    reveal,
    layer: 5,
    kind: "poly",
    points: [corner, offset(corner, a), offset(offset(corner, a), b), offset(corner, b)],
    fill: color,
    fillOpacity: 0.2,
    stroke: color,
    width: 2.2,
  };
};

/** A bar across the middle of a segment — the "these two are equal" tick. */
const tick = (
  from: Vec2,
  to: Vec2,
  len: number,
  key: string,
  reveal: string,
  color: string,
): SceneItem => {
  const mid: Vec2 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const u = unit([to[0] - from[0], to[1] - from[1]]);
  const p: Vec2 = [(-u[1] * len) / 2, (u[0] * len) / 2];
  return {
    key,
    reveal,
    layer: 6,
    kind: "line",
    from: offset(mid, [-p[0], -p[1]]),
    to: offset(mid, p),
    stroke: color,
    width: 3.2,
  };
};

// ---------------------------------------------------------------------------

export const riverFigure = () => {
  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const qx = p.qx ?? 4;
    const q: MathPoint = [qx, 0];

    // --- the water, and the bank line l ------------------------------------
    items.push(
      {
        key: "water",
        reveal: "bank",
        layer: 0,
        kind: "poly",
        points: [pt(L.x0, 0), pt(L.x1, 0), pt(L.x1, RIVER_Y), pt(L.x0, RIVER_Y)],
        fill: "#CBE7F7",
        fillOpacity: 0.8,
      },
      {
        key: "bank:l",
        reveal: "bank",
        layer: 2,
        kind: "line",
        from: pt(L.x0, 0),
        to: pt(L.x1, 0),
        stroke: ink,
        width: 3.4,
      },
      {
        key: "bank:lab",
        reveal: "bank",
        layer: 2,
        kind: "text",
        at: [pt(L.x0, 0)[0] + 6, pt(L.x0, 0)[1] - 26],
        text: "l",
        anchor: "start",
        italic: true,
        family: "serif",
        size: 30,
        color: ink,
      },
    );

    // --- the two given points ----------------------------------------------
    items.push(
      { key: "pt:A", reveal: "pts", layer: 4, kind: "marker", at: pt(...A_M), r: 8, fill: ink },
      {
        key: "lab:A", reveal: "pts", layer: 4, kind: "text",
        at: [pt(...A_M)[0] - 27, pt(...A_M)[1] - 22],
        text: "A", italic: true, family: "serif", size: 32, bold: true, color: ink,
      },
      { key: "pt:B", reveal: "pts", layer: 4, kind: "marker", at: pt(...B_M), r: 8, fill: ink },
      {
        key: "lab:B", reveal: "pts", layer: 4, kind: "text",
        at: [pt(...B_M)[0] + 28, pt(...B_M)[1] - 20],
        text: "B", italic: true, family: "serif", size: 32, bold: true, color: ink,
      },
    );

    // --- the route under test: A → Q → B, with Q sliding along l ------------
    items.push(
      { key: "try:AQ", reveal: "try", layer: 2, kind: "line", from: pt(...A_M), to: pt(qx, 0), stroke: amber, width: 4.2, glow: true },
      { key: "try:QB", reveal: "try", layer: 2, kind: "line", from: pt(qx, 0), to: pt(...B_M), stroke: amber, width: 4.2, glow: true },
      { key: "pt:Q", reveal: "try", layer: 4, kind: "marker", at: pt(qx, 0), r: 7, fill: amber },
      {
        key: "lab:Q", reveal: "try", layer: 4, kind: "text",
        at: [pt(qx, 0)[0], pt(qx, 0)[1] + 34],
        text: "Q", italic: true, family: "serif", size: 30, bold: true, color: amber,
      },
    );

    // --- the live read-out: recomputed every frame, because the figure runs
    //     every frame and Q is a function of a parameter ------------------------
    const total = dist(A_M, q) + dist(B_M, q);
    items.push(
      {
        key: "meter:val", reveal: "meter", layer: 5, kind: "text",
        at: [752, 126], text: `AQ + QB = ${total.toFixed(2)}`,
        anchor: "middle", size: 31, bold: true, family: "sans", color: amber,
      },
      {
        key: "meter:q", reveal: "meter", layer: 5, kind: "text",
        at: [752, 168], text: `Qx = ${qx.toFixed(2)}`,
        anchor: "middle", size: 23, family: "sans", color: inkMuted,
      },
    );

    // --- the reflection: BF ⊥ l, extended to B′ -----------------------------
    items.push(
      { key: "drop:line", reveal: "drop", layer: 2, kind: "line", from: pt(...B_M), to: pt(...BP_M), stroke: violet, width: 2.6, dash: "9 7" },
      { key: "pt:F", reveal: "drop", layer: 4, kind: "marker", at: pt(...F_M), r: 5, fill: ink },
      {
        key: "lab:F", reveal: "drop", layer: 4, kind: "text",
        at: [pt(...F_M)[0] + 28, pt(...F_M)[1] - 16],
        text: "F", italic: true, family: "serif", size: 26, color: inkMuted,
      },
      { key: "pt:Bp", reveal: "drop", layer: 4, kind: "marker", at: pt(...BP_M), r: 8, fill: violet, ring: violet },
      {
        key: "lab:Bp", reveal: "drop", layer: 4, kind: "text",
        at: [pt(...BP_M)[0] + 30, pt(...BP_M)[1] + 4],
        text: "B′", italic: true, family: "serif", size: 32, bold: true, color: violet,
      },
      rightAngle(pt(...F_M), pt(3.4, 0), pt(4, -0.35), 22, "ra:F", "drop", violet),
    );

    // --- the straightened route: AB′ and the way through P ------------------
    items.push(
      { key: "best:ABp", reveal: "shortest", layer: 2, kind: "line", from: pt(...A_M), to: pt(...BP_M), stroke: green, width: 4.4, glow: true },
      { key: "best:PBp", reveal: "shortest", layer: 3, kind: "line", from: pt(...P_M), to: pt(...BP_M), stroke: violet, width: 2.8, dash: "9 7" },
      { key: "best:AP", reveal: "shortest", layer: 3, kind: "line", from: pt(...A_M), to: pt(...P_M), stroke: green, width: 4.4, glow: true },
      { key: "best:PB", reveal: "shortest", layer: 3, kind: "line", from: pt(...P_M), to: pt(...B_M), stroke: green, width: 4.4, glow: true },
      { key: "pt:P", reveal: "shortest", layer: 4, kind: "marker", at: pt(...P_M), r: 8, fill: green, ring: green },
      {
        key: "lab:P", reveal: "shortest", layer: 4, kind: "text",
        at: [pt(...P_M)[0] - 4, pt(...P_M)[1] + 42],
        text: "P", italic: true, family: "serif", size: 30, bold: true, color: green,
      },
    );

    // --- PB = PB′: the claim the reflection actually earns -------------------
    items.push(
      tick(pt(...P_M), pt(...B_M), 18, "tick:PB", "ticks", green),
      tick(pt(...P_M), pt(...BP_M), 18, "tick:PBp", "ticks", violet),
    );

    return { width: WIDTH, height: HEIGHT, items };
  };

  /** Only the bank and the two given points are on from frame one. */
  figure.defaults = { bank: 1, pts: 1 };
  return figure;
};
