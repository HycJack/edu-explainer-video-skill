import type { Params, Scene, SceneItem, Vec2 } from "../types";
import { amber, blue, green, ink, inkMuted, violet } from "../theme";

/**
 * ⊙O 是 △ABC 的外接圆，E 是内心，AE 的延长线交 BC 于 F、交 ⊙O 于 D。
 *
 * The angles are chosen so the figure is exact, not eyeballed:
 *   A = 110°, B = 205°, C = 335° on the unit circle
 *   → arc BC not containing A runs 205°→335°, its midpoint is exactly 270°,
 *     so the angle bisector from A meets the circle again at D(270°) —
 *     the arc-midpoint lemma DB = DC = DE is true of this figure, and the
 *     incenter E, computed as the side-length-weighted mean, lies on AD.
 *   F = AD ∩ BC lands between E and D, as the problem orders it (A, E, F, D).
 *
 * Parameter keys (all reveals are switches; nothing here is a measured glide):
 *   circle   ⊙O and its centre          tri    the triangle ABC
 *   e        incenter E, segment AE     ed     segment E→D, so the full line AED
 *   f        point F                    d      point D
 *   bd       segment BD                 be     segment BE
 *   angA     the two half-angles at A   angB   the two half-angles at B
 *   angBED   the angle at E (green)     angDBE the angle at B (green)
 *   patchF   translucent △DBF           patchA translucent △DAB
 *   tick     equal ticks on DB and DE
 */

export const WIDTH = 920;
export const HEIGHT = 660;

const CX = 460;
const CY = 330;
const R = 250;

export type MathPoint = readonly [number, number];

const deg = (d: number): number => (d * Math.PI) / 180;
const onCircle = (a: number): MathPoint => [Math.cos(deg(a)), Math.sin(deg(a))];

/** Screen projection: circle centre (CX, CY), radius R. */
export const sc = (p: MathPoint): Vec2 => [CX + p[0] * R, CY - p[1] * R];

export const A_M = onCircle(110);
export const B_M = onCircle(205);
export const C_M = onCircle(335);
/** Midpoint of arc BC not containing A — where the bisector from A lands. */
export const D_M = onCircle(270);

const dist = (p: MathPoint, q: MathPoint): number => Math.hypot(p[0] - q[0], p[1] - q[1]);

/** Incenter = side-length-weighted mean of the vertices. */
const incenter = (): MathPoint => {
  const a = dist(B_M, C_M);
  const b = dist(C_M, A_M);
  const c = dist(A_M, B_M);
  const s = a + b + c;
  return [
    (a * A_M[0] + b * B_M[0] + c * C_M[0]) / s,
    (a * A_M[1] + b * B_M[1] + c * C_M[1]) / s,
  ];
};

export const E_M = incenter();

/** AD ∩ BC. BC is the horizontal chord y = B_M[1]; solve for t along A→D. */
export const F_M = (): MathPoint => {
  const t = (B_M[1] - A_M[1]) / (D_M[1] - A_M[1]);
  return [A_M[0] + t * (D_M[0] - A_M[0]), B_M[1]];
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const unit = (d: Vec2): Vec2 => {
  const m = Math.hypot(d[0], d[1]) || 1;
  return [d[0] / m, d[1] / m];
};

const offset = (from: Vec2, by: Vec2): Vec2 => [from[0] + by[0], from[1] + by[1]];

/** Label position: a point pushed `r` pixels outward from the circle centre. */
const radial = (p: MathPoint, r: number): Vec2 => {
  const m = Math.hypot(p[0], p[1]) || 1;
  return [CX + (p[0] / m) * r, CY - (p[1] / m) * r];
};

/** The arc at vertex V between the directions of P1 and P2 (smaller sweep). */
const arcPath = (v: Vec2, p1: Vec2, p2: Vec2, r: number): string => {
  const a1 = Math.atan2(p1[1] - v[1], p1[0] - v[0]);
  const a2 = Math.atan2(p2[1] - v[1], p2[0] - v[0]);
  let delta = a2 - a1;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const s: Vec2 = [v[0] + r * Math.cos(a1), v[1] + r * Math.sin(a1)];
  const e: Vec2 = [v[0] + r * Math.cos(a2), v[1] + r * Math.sin(a2)];
  return `M ${s[0].toFixed(2)} ${s[1].toFixed(2)} A ${r} ${r} 0 0 ${delta > 0 ? 1 : 0} ${e[0].toFixed(2)} ${e[1].toFixed(2)}`;
};

/** A bar across the middle of a segment — the "these two are equal" tick. */
const tick = (from: Vec2, to: Vec2, len: number, key: string, color: string): SceneItem => {
  const mid: Vec2 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const u = unit([to[0] - from[0], to[1] - from[1]]);
  const p: Vec2 = [(-u[1] * len) / 2, (u[0] * len) / 2];
  return {
    key,
    layer: 6,
    kind: "line",
    from: offset(mid, [-p[0], -p[1]]),
    to: offset(mid, p),
    stroke: color,
    width: 3.4,
  };
};

// ---------------------------------------------------------------------------

export const circleIncenterFigure = () => {
  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const S = sc; // shorthand
    const FA = F_M();

    // --- the circle and its centre -----------------------------------------
    items.push(
      {
        key: "circle",
        reveal: "circle",
        kind: "circle",
        c: [CX, CY],
        r: R,
        fill: "#EDF2FA",
        stroke: ink,
        width: 3.2,
        layer: 0,
      },
      { key: "pt:O", reveal: "circle", layer: 4, kind: "marker", at: [CX, CY], r: 4.5, fill: inkMuted },
      {
        key: "lab:O", reveal: "circle", layer: 4, kind: "text",
        at: [CX + 24, CY + 26], text: "O", italic: true, family: "serif", size: 28, color: inkMuted,
      },
    );

    // --- the triangle -------------------------------------------------------
    items.push(
      { key: "tri:AB", reveal: "tri", layer: 2, kind: "line", from: S(A_M), to: S(B_M), stroke: ink, width: 3 },
      { key: "tri:BC", reveal: "tri", layer: 2, kind: "line", from: S(B_M), to: S(C_M), stroke: ink, width: 3 },
      { key: "tri:CA", reveal: "tri", layer: 2, kind: "line", from: S(C_M), to: S(A_M), stroke: ink, width: 3 },
      { key: "pt:A", reveal: "tri", layer: 4, kind: "marker", at: S(A_M), r: 5.5, fill: ink },
      { key: "pt:B", reveal: "tri", layer: 4, kind: "marker", at: S(B_M), r: 5.5, fill: ink },
      { key: "pt:C", reveal: "tri", layer: 4, kind: "marker", at: S(C_M), r: 5.5, fill: ink },
      { key: "lab:A", reveal: "tri", layer: 4, kind: "text", at: radial(A_M, R + 36), text: "A", italic: true, family: "serif", size: 34, bold: true, color: ink },
      { key: "lab:B", reveal: "tri", layer: 4, kind: "text", at: radial(B_M, R + 36), text: "B", italic: true, family: "serif", size: 34, bold: true, color: ink },
      { key: "lab:C", reveal: "tri", layer: 4, kind: "text", at: radial(C_M, R + 36), text: "C", italic: true, family: "serif", size: 34, bold: true, color: ink },
    );

    // --- the incenter and the bisector A→E ----------------------------------
    items.push(
      { key: "bis:AE", reveal: "e", layer: 3, kind: "line", from: S(A_M), to: S(E_M), stroke: amber, width: 2.8 },
      { key: "pt:E", reveal: "e", layer: 4, kind: "marker", at: S(E_M), r: 6.5, fill: amber, ring: amber },
      {
        key: "lab:E", reveal: "e", layer: 4, kind: "text",
        at: [S(E_M)[0] + 30, S(E_M)[1] - 8], text: "E", italic: true, family: "serif", size: 32, bold: true, color: amber,
      },
    );

    // --- the rest of the line: E→D, then F on BC and D on the circle ---------
    items.push(
      { key: "bis:ED", reveal: "ed", layer: 3, kind: "line", from: S(E_M), to: S(D_M), stroke: amber, width: 2.8 },
      { key: "pt:F", reveal: "f", layer: 4, kind: "marker", at: S(FA), r: 6, fill: ink },
      {
        key: "lab:F", reveal: "f", layer: 4, kind: "text",
        at: [S(FA)[0] - 34, S(FA)[1] + 34], text: "F", italic: true, family: "serif", size: 30, bold: true, color: ink,
      },
      { key: "pt:D", reveal: "d", layer: 4, kind: "marker", at: S(D_M), r: 7, fill: amber, ring: amber },
      {
        key: "lab:D", reveal: "d", layer: 4, kind: "text",
        at: radial(D_M, R + 38), text: "D", italic: true, family: "serif", size: 34, bold: true, color: amber,
      },
    );

    // --- BD and BE -----------------------------------------------------------
    items.push(
      { key: "seg:BD", reveal: "bd", layer: 3, kind: "line", from: S(B_M), to: S(D_M), stroke: ink, width: 3 },
      { key: "seg:BE", reveal: "be", layer: 3, kind: "line", from: S(B_M), to: S(E_M), stroke: ink, width: 3 },
    );

    // --- the equal half-angles (amber arcs, one per half) --------------------
    items.push(
      { key: "ang:A1", reveal: "angA", layer: 5, kind: "path", d: arcPath(S(A_M), S(B_M), S(E_M), 40), stroke: amber, width: 2.6, fill: "none" },
      { key: "ang:A2", reveal: "angA", layer: 5, kind: "path", d: arcPath(S(A_M), S(E_M), S(C_M), 40), stroke: amber, width: 2.6, fill: "none" },
      { key: "ang:B1", reveal: "angB", layer: 5, kind: "path", d: arcPath(S(B_M), S(A_M), S(E_M), 40), stroke: amber, width: 2.6, fill: "none" },
      { key: "ang:B2", reveal: "angB", layer: 5, kind: "path", d: arcPath(S(B_M), S(E_M), S(C_M), 36), stroke: amber, width: 2.6, fill: "none" },
    );

    // --- the two angles the proof claims equal (green arcs) ------------------
    items.push(
      { key: "ang:BED", reveal: "angBED", layer: 5, kind: "path", d: arcPath(S(E_M), S(B_M), S(D_M), 30), stroke: green, width: 3, fill: "none" },
      { key: "ang:DBE", reveal: "angDBE", layer: 5, kind: "path", d: arcPath(S(B_M), S(D_M), S(E_M), 46), stroke: green, width: 3, fill: "none" },
    );

    // --- the two similar triangles, as translucent patches -------------------
    items.push(
      {
        key: "patch:DBF", reveal: "patchF", layer: 1, kind: "poly",
        points: [S(B_M), S(D_M), S(FA)],
        fill: violet, fillOpacity: 0.16, stroke: violet, strokeOpacity: 0.5, width: 1.6,
      },
      {
        key: "patch:DAB", reveal: "patchA", layer: 1, kind: "poly",
        points: [S(A_M), S(B_M), S(D_M)],
        fill: blue, fillOpacity: 0.13, stroke: blue, strokeOpacity: 0.5, width: 1.6,
      },
    );

    // --- DB = DE: the earned equality ---------------------------------------
    items.push(
      tick(S(B_M), S(D_M), 20, "tick:BD", green),
      tick(S(D_M), S(E_M), 20, "tick:DE", green),
    );

    return { width: WIDTH, height: HEIGHT, items };
  };

  /** The given figure: circle, centre, triangle. Everything else is built up. */
  figure.defaults = { circle: 1, tri: 1 };
  return figure;
};
