import type { Params, Scene, SceneItem, Vec2 } from "../types";
import { amber, blue, green, ink, inkFaint, inkMuted, red, violet } from "../theme";

/**
 * 锐角三角形 + 绕 E 旋转 —— 平面几何的「手拉手」模型。
 *
 * This is the framework's first figure where the ANIMATED PARAMETER IS THE
 * GEOMETRY ITSELF rather than a slope attached to it: `theta` is the angle △CDE
 * has been turned about E, and C and D are drawn at `rot(P, theta)`. Nothing is
 * cross-faded between the "before" and "after" picture — the same segments simply
 * arrive at new coordinates. At theta = 0 this reproduces the textbook figure; at
 * theta = -60 it reproduces the rotated one.
 *
 * Parameter keys:
 *   base      AB, BE, EA, AC, EC, ED  — the given figure (A, B, E never move)
 *   labels    the five point names
 *   cd        CD, the segment the problem tells us to draw
 *   leg1      AE = BE in green, with one tick on each
 *   leg2      DE = CE in violet, with two ticks on each
 *   angB      the 45 degree wedge at B
 *   angC      the 45 degree wedge at C
 *   rot90     the two dashed 90 degree arcs about E (EC->ED, EA->EB)
 *   segBD     the segment BD
 *   segAC     AC drawn on top of the thin base line
 *   ghost     the empty positions C and D were rotated out of
 *   sweep     the arc C has travelled through, with an arrowhead
 *   tick      one tick on AC and one on BD: AC = BD
 *   perp      the right-angle marker at AC ∩ BD
 *   theta     how far △CDE has turned — animated, not a reveal
 */

/** AE = BE. */
export const A_LEN = 4;
/** CE = DE. Smaller than A_LEN, which is what keeps △ABC acute. */
export const C_LEN = 2.4;

export const WIDTH = 940;
export const HEIGHT = 800;

const SCALE = 88;
/** Centre of the drawing, in maths coordinates. */
const MID_X = -1.0;
const MID_Y = 1.1;

const OX = WIDTH / 2 - MID_X * SCALE;
const OY = HEIGHT / 2 + MID_Y * SCALE;

/** Maths coordinates -> screen. y is flipped; that is the only projection here. */
export const pt = (x: number, y: number): Vec2 => [OX + x * SCALE, OY - y * SCALE];

/** The two rotation angles the content drives the figure to. */
export const THETA_HALF = -Math.PI / 6; // -30°
export const THETA_FULL = -Math.PI / 3; // -60°

// --- fixed points ----------------------------------------------------------
export const P_E: Vec2 = [0, 0];
export const P_A: Vec2 = [0, A_LEN];
export const P_B: Vec2 = [-A_LEN, 0];
export const P_C0: Vec2 = [C_LEN, 0];
export const P_D0: Vec2 = [0, C_LEN];

const vsub = (p: Vec2, q: Vec2): Vec2 => [p[0] - q[0], p[1] - q[1]];
const cross = (p: Vec2, q: Vec2): number => p[0] * q[1] - p[1] * q[0];
const unit = (p: Vec2): Vec2 => {
  const n = Math.hypot(p[0], p[1]) || 1;
  return [p[0] / n, p[1] / n];
};

/** Rotate a maths-coordinate point about the origin by t radians. */
const rot = (p: Vec2, t: number): Vec2 => {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
};

export const P_C = (t: number): Vec2 => rot(P_C0, t);
export const P_D = (t: number): Vec2 => rot(P_D0, t);

/**
 * Where lines AC₁ and BD₁ meet.
 *
 * Worth computing rather than eyeballing: at theta = 0 the two SEGMENTS do not
 * cross — the crossing is at t = 1.18 along B->D, i.e. past D, which is why
 * line BD is drawn with a short dashed extension and the right-angle marker is
 * only ever drawn at this computed point, never at a guessed pixel.
 */
export const meet = (t: number): { point: Vec2; alongAC: number; alongBD: number } | null => {
  const A = pt(P_A[0], P_A[1]);
  const B = pt(P_B[0], P_B[1]);
  const C = pt(P_C(t)[0], P_C(t)[1]);
  const D = pt(P_D(t)[0], P_D(t)[1]);
  const u = vsub(C, A);
  const v = vsub(D, B);
  const w = vsub(B, A);
  const den = cross(u, v);
  if (Math.abs(den) < 1e-9) return null;
  const s = cross(w, v) / den;
  return { point: [A[0] + s * u[0], A[1] + s * u[1]], alongAC: s, alongBD: cross(w, u) / den };
};

/** An arc in maths coordinates, emitted as an SVG path in screen coordinates. */
const arcPath = (c: Vec2, r: number, a0: number, a1: number): string => {
  const n = 26;
  const out: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    const q = pt(c[0] + r * Math.cos(a), c[1] + r * Math.sin(a));
    out.push(`${i === 0 ? "M" : "L"}${q[0].toFixed(2)},${q[1].toFixed(2)}`);
  }
  return out.join(" ");
};

/** A solid arrowhead sitting on the end of an arc. */
const arcHead = (c: Vec2, r: number, a: number, ccw: boolean): Vec2[] => {
  const tip: Vec2 = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  const d: Vec2 = ccw ? [-Math.sin(a), Math.cos(a)] : [Math.sin(a), -Math.cos(a)];
  const bx = tip[0] - d[0] * 0.3;
  const by = tip[1] - d[1] * 0.3;
  const n: Vec2 = [d[1], -d[0]];
  return [
    [tip[0] + n[0] * 0.17, tip[1] + n[1] * 0.17],
    [bx, by],
    [tip[0] - n[0] * 0.17, tip[1] - n[1] * 0.17],
  ].map((q) => pt(q[0], q[1]));
};

/** The point halfway between two points. NOT `p + (q - p) / 2` when p is already an end. */
const midOf = (p: Vec2, q: Vec2): Vec2 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];

/** n parallel slash marks crossing a segment, the textbook "these two are equal". */
const slashes = (
  mid: Vec2,
  dir: Vec2,
  n: number,
  half: number,
  along: number,
): [Vec2, Vec2][] => {
  const d = unit(dir);
  const p: Vec2 = [-d[1], d[0]];
  const out: [Vec2, Vec2][] = [];
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * along;
    const c: Vec2 = [mid[0] + d[0] * off, mid[1] + d[1] * off];
    out.push([
      [c[0] - p[0] * half, c[1] - p[1] * half],
      [c[0] + p[0] * half, c[1] + p[1] * half],
    ]);
  }
  return out;
};

const L_BASE = 2;
const L_MARK = 4;
const L_HI = 6;

export const rotateFigure = () => {
  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const th = p.theta ?? 0;
    const moved = Math.abs(th) > 1e-3;

    const A = pt(P_A[0], P_A[1]);
    const B = pt(P_B[0], P_B[1]);
    const E = pt(P_E[0], P_E[1]);
    const C = pt(...P_C(th));
    const D = pt(...P_D(th));

    // --- the given figure. A, B, E are fixed; C and D ride on theta. --------
    items.push(
      { layer: L_BASE, key: "g:AB", reveal: "base", kind: "line", from: B, to: A, stroke: ink, width: 3.2 },
      { layer: L_BASE, key: "g:BE", reveal: "base", kind: "line", from: B, to: E, stroke: ink, width: 3.2 },
      { layer: L_BASE, key: "g:EA", reveal: "base", kind: "line", from: E, to: A, stroke: ink, width: 3.2 },
      { layer: L_BASE, key: "g:AC", reveal: "base", kind: "line", from: A, to: C, stroke: ink, width: 3.2 },
      { layer: L_BASE, key: "g:EC", reveal: "base", kind: "line", from: E, to: C, stroke: ink, width: 3.2 },
      { layer: L_BASE, key: "g:ED", reveal: "base", kind: "line", from: E, to: D, stroke: ink, width: 3.2 },
      { layer: L_BASE + 1, key: "g:CD", reveal: "cd", kind: "line", from: C, to: D, stroke: ink, width: 3.2 },
    );

    // --- AE ⊥ BC, given: the right-angle mark at E --------------------------
    {
      const s = 0.44 * SCALE;
      const a: Vec2 = [E[0] - s, E[1]];
      const b: Vec2 = [E[0] - s, E[1] - s];
      const c: Vec2 = [E[0], E[1] - s];
      items.push(
        { layer: L_MARK, key: "ra:E1", reveal: "base", kind: "line", from: a, to: b, stroke: inkMuted, width: 2.2 },
        { layer: L_MARK, key: "ra:E2", reveal: "base", kind: "line", from: b, to: c, stroke: inkMuted, width: 2.2 },
      );
    }

    // --- leg one: AE = BE ---------------------------------------------------
    items.push(
      { layer: L_BASE + 1, key: "l1:AE", reveal: "leg1", kind: "line", from: A, to: E, stroke: green, width: 5, glow: true },
      { layer: L_BASE + 1, key: "l1:BE", reveal: "leg1", kind: "line", from: B, to: E, stroke: green, width: 5, glow: true },
    );
    for (const [i, seg] of [[A, E], [B, E]].entries()) {
      const [s0, s1] = slashes(midOf(seg[0], seg[1]), vsub(seg[1], seg[0]), 1, 0.17 * SCALE, 0)[0];
      items.push({ layer: L_MARK, key: `l1t:${i}`, reveal: "leg1", kind: "line", from: s0, to: s1, stroke: green, width: 3 });
    }

    // --- leg two: DE = CE (rides on theta) ----------------------------------
    items.push(
      { layer: L_BASE + 1, key: "l2:ED", reveal: "leg2", kind: "line", from: E, to: D, stroke: violet, width: 5, glow: true },
      { layer: L_BASE + 1, key: "l2:EC", reveal: "leg2", kind: "line", from: E, to: C, stroke: violet, width: 5, glow: true },
    );
    for (const [i, seg] of [[E, D], [E, C]].entries()) {
      for (const [k, [s0, s1]] of slashes(midOf(seg[0], seg[1]), vsub(seg[1], seg[0]), 2, 0.16 * SCALE, 0.19 * SCALE).entries()) {
        items.push({ layer: L_MARK, key: `l2t:${i}:${k}`, reveal: "leg2", kind: "line", from: s0, to: s1, stroke: violet, width: 3 });
      }
    }

    // --- the two 45 degree wedges ------------------------------------------
    items.push(
      { layer: L_MARK, key: "angB", reveal: "angB", kind: "path", d: arcPath(P_B, 1.08, 0, Math.PI / 4), stroke: green, width: 2.6 },
      { layer: L_MARK, key: "angC", reveal: "angC", kind: "path", d: arcPath(P_C(th), 0.95, (3 * Math.PI) / 4, Math.PI), stroke: violet, width: 2.6 },
    );

    // --- one 90 degree turn about E does both A->B and C->D ------------------
    items.push(
      { layer: L_MARK, key: "r90a", reveal: "rot90", kind: "path", d: arcPath(P_E, 1.2, 0, Math.PI / 2), stroke: blue, width: 2.4, dash: "7 6" },
      { layer: L_MARK, key: "r90ah", reveal: "rot90", kind: "poly", points: arcHead(P_E, 1.2, Math.PI / 2, true), fill: blue },
      { layer: L_MARK, key: "r90b", reveal: "rot90", kind: "path", d: arcPath(P_E, 1.95, Math.PI / 2, Math.PI), stroke: blue, width: 2.4, dash: "7 6" },
      { layer: L_MARK, key: "r90bh", reveal: "rot90", kind: "poly", points: arcHead(P_E, 1.95, Math.PI, true), fill: blue },
      { layer: L_MARK, key: "r90ta", reveal: "rot90", kind: "text", at: pt(1.2 * Math.SQRT1_2 + 0.3, 1.2 * Math.SQRT1_2 + 0.24), text: "90°", size: 23, color: blue, family: "sans" },
      { layer: L_MARK, key: "r90tb", reveal: "rot90", kind: "text", at: pt(-1.95 * Math.SQRT1_2 - 0.16, 1.95 * Math.SQRT1_2 + 0.22), text: "90°", size: 23, color: blue, family: "sans" },
    );

    // --- the positions C and D rotated out of -------------------------------
    items.push(
      { layer: L_BASE, key: "ghC", reveal: "ghost", kind: "circle", c: pt(P_C0[0], P_C0[1]), r: 10, fill: "none", stroke: inkFaint, width: 2.4, dash: "5 5" },
      { layer: L_BASE, key: "ghD", reveal: "ghost", kind: "circle", c: pt(P_D0[0], P_D0[1]), r: 10, fill: "none", stroke: inkFaint, width: 2.4, dash: "5 5" },
    );

    // --- the arc C actually travelled through -------------------------------
    if (Math.abs(th) > 1e-3) {
      const r = C_LEN + 0.62;
      items.push(
        { layer: L_MARK, key: "sweep", reveal: "sweep", kind: "path", d: arcPath(P_E, r, 0, th), stroke: violet, width: 2.4, dash: "6 6" },
        { layer: L_MARK, key: "sweeph", reveal: "sweep", kind: "poly", points: arcHead(P_E, r, th, th > 0), fill: violet },
      );
    }

    // --- the two segments under discussion ----------------------------------
    items.push(
      { layer: L_BASE + 1, key: "g:BD", reveal: "segBD", kind: "line", from: B, to: D, stroke: ink, width: 3.2 },
      { layer: L_HI, key: "h:AC", reveal: "segAC", kind: "line", from: A, to: C, stroke: blue, width: 5.5, glow: true },
      { layer: L_HI, key: "h:BD", reveal: "segBD", kind: "line", from: B, to: D, stroke: amber, width: 5.5, glow: true },
    );

    // --- line BD needs extending: at theta = 0 the segments do not meet -----
    const m = meet(th);
    if (m) {
      const ext = Math.max(1.06, Math.min(1.6, m.alongBD * 1.18));
      items.push({
        layer: L_BASE + 1,
        key: "g:BDx",
        reveal: "segBD",
        kind: "line",
        from: D,
        to: [B[0] + (D[0] - B[0]) * ext, B[1] + (D[1] - B[1]) * ext],
        stroke: inkFaint,
        width: 2.4,
        dash: "8 7",
      });

      // one slash on each of AC and BD: the two are equal
      const targets: [Vec2, Vec2][] = [
        [midOf(A, C), vsub(C, A)],
        [midOf(B, D), vsub(D, B)],
      ];
      for (const [i, [at, seg]] of targets.entries()) {
        const [s0, s1] = slashes(at, seg, 1, 0.17 * SCALE, 0)[0];
        items.push({
          layer: L_HI + 1,
          key: `eqt:${i}`,
          reveal: "tick",
          kind: "line",
          from: s0,
          to: s1,
          stroke: i === 0 ? blue : amber,
          width: 3.4,
        });
      }

      // the right angle, drawn only at the point the geometry actually puts it
      const u = unit(vsub(C, A));
      let nrm: Vec2 = [-u[1], u[0]];
      if (cross(vsub(C, A), vsub(B, A)) < 0) nrm = [-nrm[0], -nrm[1]];
      const len = 0.34 * SCALE;
      const q1: Vec2 = [m.point[0] + nrm[0] * len, m.point[1] + nrm[1] * len];
      const q2: Vec2 = [q1[0] + u[0] * len, q1[1] + u[1] * len];
      const q3: Vec2 = [m.point[0] + u[0] * len, m.point[1] + u[1] * len];
      // Push the label along the bisector of the marked corner, clear of the
      // square — dropped on top of it, the glyph hides the very thing it names.
      const bis: Vec2 = unit([nrm[0] + u[0], nrm[1] + u[1]]);
      const lab: Vec2 = [q2[0] + bis[0] * 26, q2[1] + bis[1] * 26];
      items.push(
        { layer: L_HI + 2, key: "ra:F1", reveal: "perp", kind: "line", from: q1, to: q2, stroke: red, width: 3.2 },
        { layer: L_HI + 2, key: "ra:F2", reveal: "perp", kind: "line", from: q2, to: q3, stroke: red, width: 3.2 },
        { layer: L_HI + 2, key: "ra:Fl", reveal: "perp", kind: "text", at: lab, text: "90°", size: 24, color: red, family: "sans" },
      );
    }

    // --- points and names ---------------------------------------------------
    const name = (key: string, text: string, at: Vec2, dx: number, dy: number, subText?: string) => {
      items.push(
        { layer: L_HI + 3, key: `${key}d`, reveal: "labels", kind: "marker", at, r: 6, fill: ink },
        {
          layer: L_HI + 3,
          key: `${key}l`,
          reveal: "labels",
          kind: "text",
          at: [at[0] + dx, at[1] + dy],
          text,
          sub: subText,
          size: 30,
          bold: true,
          italic: true,
          family: "serif",
          color: ink,
        },
      );
    };
    name("pA", "A", A, -4, -26);
    name("pB", "B", B, -24, 18);
    name("pE", "E", E, -28, 30);
    name("pC", "C", C, 10, 32, moved ? "1" : undefined);
    name("pD", "D", D, 30, -4, moved ? "1" : undefined);

    return { width: WIDTH, height: HEIGHT, items };
  };

  figure.defaults = { base: 1, labels: 1, theta: 0 };
  return figure;
};