import type { Params, Scene, SceneItem, Vec2 } from "../types";

/**
 * A cuboid, drawn the way a textbook draws it: an oblique projection with the
 * hidden vertex A pushed away from the viewer.
 *
 * The projection is fixed; the figure's SHAPE never changes, so the only thing
 * a content file controls is which edges and constructions are showing. That
 * makes this a good default, and a useful reference for what a builder looks
 * like.
 *
 * Parameter keys (all 0-1 reveals unless noted):
 *   box          the visible outline
 *   hidden       the dashed edges meeting at A
 *   axes         the coordinate tripod at A
 *   aux:<name>   a named construction line, e.g. aux:AD1
 *   label:<key>  a vertex label
 *   patch:<name> a translucent plane patch
 */

export const AB_DRAWN = 1.5;
export const AD = 1;
export const AA1 = 1;

export type P3 = readonly [number, number, number];

const S = 300;
const UX = -0.78;
const UY = 0.36;
const VX = 0.92;
const VY = -0.22;
const WY = -0.95;

export const V = {
  A: [0, 0, 0] as P3,
  B: [AB_DRAWN, 0, 0] as P3,
  C: [AB_DRAWN, 1, 0] as P3,
  D: [0, 1, 0] as P3,
  A1: [0, 0, 1] as P3,
  B1: [AB_DRAWN, 0, 1] as P3,
  C1: [AB_DRAWN, 1, 1] as P3,
  D1: [0, 1, 1] as P3,
  E: [AB_DRAWN / 2, 1, 0] as P3,
} satisfies Record<string, P3>;

export const WIDTH = 920;
export const HEIGHT = 780;

const raw = ([x, y, z]: P3): Vec2 => [
  x * AB_DRAWN * UX * S + y * AD * VX * S,
  x * AB_DRAWN * UY * S + y * AD * VY * S + z * AA1 * WY * S,
];

const bounds = (() => {
  const pts = Object.values(V).map(raw);
  return {
    minX: Math.min(...pts.map((q) => q[0])),
    maxX: Math.max(...pts.map((q) => q[0])),
    minY: Math.min(...pts.map((q) => q[1])),
    maxY: Math.max(...pts.map((q) => q[1])),
  };
})();

const OX = WIDTH / 2 - (bounds.minX + bounds.maxX) / 2;
const OY = HEIGHT / 2 - (bounds.minY + bounds.maxY) / 2;

export const sc = (p: P3): Vec2 => {
  const q = raw(p);
  return [q[0] + OX, q[1] + OY];
};

const sub3 = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];

export const along = (a: P3, b: P3, t: number): Vec2 =>
  sc([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);

export const onEdge = (t: number): P3 => [0, 0, t];

/** Label placement, tuned by hand so nothing collides with a line. */
export const LABELS: Record<
  string,
  { at: P3; text: string; sub?: string; dx: number; dy: number }
> = {
  A: { at: V.A, text: "A", dx: 13, dy: 26 },
  B: { at: V.B, text: "B", dx: -30, dy: 26 },
  C: { at: V.C, text: "C", dx: 2, dy: 32 },
  D: { at: V.D, text: "D", dx: 18, dy: 6 },
  A1: { at: V.A1, text: "A", sub: "1", dx: -10, dy: -20 },
  B1: { at: V.B1, text: "B", sub: "1", dx: -46, dy: -8 },
  C1: { at: V.C1, text: "C", sub: "1", dx: 4, dy: -20 },
  D1: { at: V.D1, text: "D", sub: "1", dx: 14, dy: -14 },
  E: { at: V.E, text: "E", dx: 18, dy: 6 },
};

const EDGES_SOLID: readonly (readonly [P3, P3])[] = [
  [V.B, V.C], [V.C, V.D], [V.B, V.B1], [V.C, V.C1], [V.D, V.D1],
  [V.B1, V.C1], [V.C1, V.D1], [V.D1, V.A1], [V.A1, V.B1],
];

const EDGES_HIDDEN: readonly (readonly [P3, P3])[] = [
  [V.A, V.B], [V.A, V.D], [V.A, V.A1], [V.A, V.C], [V.A, V.D1],
];

const FILL = {
  top: "#FFFFFF",
  topTo: "#F0F5FA",
  front: "#E4EBF2",
  frontTo: "#D3DEE9",
  side: "#C3D1DE",
  sideTo: "#B2C3D3",
};

type Dyn = P3 | ((p: Params) => P3);

export type CuboidOptions = {
  /**
   * Named construction lines. `to` may be a function of the parameters, which
   * is how a point that slides along an edge is animated.
   */
  readonly aux?: Record<
    string,
    {
      from: Dyn;
      to: Dyn;
      stroke: string;
      width?: number;
      dash?: string;
      /** render as a vector with an arrowhead instead of a plain line */
      arrow?: boolean;
      label?: string;
      labelDx?: number;
      labelDy?: number;
    }
  >;
  /** Named plane patches. */
  readonly patches?: Record<
    string,
    {
      points: P3[];
      color: string;
      fillOpacity?: number;
      /** A caption printed inside the patch. */
      caption?: string;
      at?: Vec2;
    }
  >;
  /** Right-angle markers, drawn where two named lines meet. */
  readonly rightAngles?: readonly { key: string; at: P3; along: P3; across: P3; size?: number; color?: string }[];
  /** Named free points, optionally carrying a label. */
  readonly points?: Record<
    string,
    { at: Dyn; fill: string; r?: number; ring?: string; label?: string; labelDx?: number; labelDy?: number }
  >;
};

export const cuboidFigure = (opts: CuboidOptions = {}) => {
  const aux = opts.aux ?? {};
  const patches = opts.patches ?? {};
  const free = opts.points ?? {};
  const resolve = (d: Dyn, p: Params): P3 => (typeof d === "function" ? d(p) : d);

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];

    // --- faces, painted back to front, all under one reveal ---
    const A = sc(V.A);
    const B = sc(V.B);
    const C = sc(V.C);
    const D = sc(V.D);
    const A1 = sc(V.A1);
    const B1 = sc(V.B1);
    const C1 = sc(V.C1);
    const D1 = sc(V.D1);

    items.push(
      {
        key: "face:front",
        reveal: "box",
        kind: "poly",
        points: [B, C, C1, B1],
        fill: FILL.front,
        opacity: 1,
      },
      {
        key: "face:side",
        reveal: "box",
        kind: "poly",
        points: [C, D, D1, C1],
        fill: FILL.side,
        opacity: 1,
      },
      {
        key: "face:top",
        reveal: "box",
        kind: "poly",
        points: [A1, B1, C1, D1],
        fill: FILL.top,
        opacity: 1,
      },
    );

    // --- plane patches, under the lines that lie in them ---
    for (const [name, patch] of Object.entries(patches)) {
      items.push({
        key: `patch:${name}`,
        kind: "poly",
        points: patch.points.map(sc),
        fill: patch.color,
        fillOpacity: 0.22,
        stroke: patch.color,
        strokeOpacity: 0.95,
        width: 2.8,
        dash: "10 7",
        layer: 1,
      });
    }

    // --- outline ---
    EDGES_SOLID.forEach(([a, b], i) => {
      items.push({
        key: `edge:solid:${i}`,
        reveal: "box",
        kind: "line",
        from: sc(a),
        to: sc(b),
        stroke: "#16202B",
        width: 2.6,
      });
    });

    EDGES_HIDDEN.forEach(([a, b], i) => {
      items.push({
        key: `edge:hidden:${i}`,
        reveal: "hidden",
        kind: "line",
        from: sc(a),
        to: sc(b),
        stroke: "#64707E",
        width: 2,
        dash: "8 7",
      });
    });

    for (const ra of opts.rightAngles ?? []) {
      const c = sc(ra.at);
      const u = sub3(sc(ra.along), c);
      const v = sub3(sc(ra.across), c);
      const k = (ra.size ?? 19) / (Math.hypot(u[0], u[1]) || 1);
      const m = ra.size ?? 19;
      const ux = u[0] * k;
      const uy = u[1] * k;
      const jx = v[0] * k;
      const jy = v[1] * k;
      items.push({
        key: `rightAngle:${ra.key}`,
        kind: "poly",
        points: [
          c,
          [c[0] + ux, c[1] + uy],
          [c[0] + ux + jx, c[1] + uy + jy],
          [c[0] + jx, c[1] + jy],
        ],
        fill: ra.color ?? "#334155",
        fillOpacity: 0.2,
        stroke: ra.color ?? "#334155",
        width: 2.4,
        layer: 3,
      });
      void m;
    }

    // --- named constructions ---
    for (const [name, line] of Object.entries(aux)) {
      const item = {
        key: `aux:${name}`,
        kind: (line.arrow ? "arrow" : "line") as "arrow" | "line",
        from: sc(resolve(line.from, p)) as Vec2,
        to: sc(resolve(line.to, p)) as Vec2,
        stroke: line.stroke,
        width: line.width ?? 4,
        dash: line.dash,
        glow: true,
        ...(line.arrow ? { label: line.label, labelDx: line.labelDx, labelDy: line.labelDy } : {}),
      };
      items.push(item as SceneItem);
    }

    for (const [name, pt] of Object.entries(free)) {
      const at = sc(resolve(pt.at, p));
      items.push(
        { key: `pt:${name}`, kind: "marker", at, r: pt.r ?? 9, fill: pt.fill, ring: pt.ring },
        ...(pt.label
          ? [
              {
                key: `pt:${name}:lab`,
                kind: "text" as const,
                at: [at[0] + (pt.labelDx ?? 26), at[1] + (pt.labelDy ?? 0)] as Vec2,
                text: pt.label,
                italic: true,
                family: "serif" as const,
                size: 30,
                bold: true,
                color: pt.fill,
              },
            ]
          : []),
      );
    }

    // --- coordinate tripod at A ---
    const axisLen = 96;
    const axes: readonly (readonly [Vec2, string])[] = [
      [[A[0] + -0.78 * axisLen, A[1] + 0.36 * axisLen], "#DC2626"],
      [[A[0] + 0.92 * axisLen, A[1] - 0.22 * axisLen], "#16A34A"],
      [[A[0], A[1] - axisLen], "#2563EB"],
    ];
    axes.forEach(([to], i) => {
      items.push({
        key: `axis:${i}`,
        reveal: "axes",
        kind: "line",
        from: A,
        to: [to[0], to[1]],
        stroke: axes[i][1],
        width: 2.6,
      });
    });
    items.push(
      { key: "axis:x", reveal: "axes", kind: "text", at: [A[0] - 0.78 * axisLen - 6, A[1] + 0.36 * axisLen + 24], text: "x", color: "#DC2626", italic: true, family: "serif", size: 24 },
      { key: "axis:y", reveal: "axes", kind: "text", at: [A[0] + 0.92 * axisLen + 16, A[1] - 0.22 * axisLen + 4], text: "y", color: "#16A34A", italic: true, family: "serif", size: 24 },
      { key: "axis:z", reveal: "axes", kind: "text", at: [A[0], A[1] - axisLen - 12], text: "z", color: "#2563EB", italic: true, family: "serif", size: 24 },
      { key: "axis:o", reveal: "axes", kind: "marker", at: A, r: 5, fill: "#16202B" },
    );

    // --- vertex labels ---
    for (const [key, l] of Object.entries(LABELS)) {
      const at = sc(l.at);
      items.push({
        key: `label:${key}`,
        reveal: key === "A" ? "hidden" : "labels",
        kind: "text",
        at: [at[0] + l.dx, at[1] + l.dy],
        text: l.text,
        sub: l.sub,
        size: 30,
        bold: true,
        italic: true,
        family: "serif",
        color: "#16202B",
        opacity: 0.88,
      });
    }

    return { width: WIDTH, height: HEIGHT, items };
  };

  /** The solid and its labels are on from frame one; constructions start off. */
  figure.defaults = { box: 1, hidden: 1, labels: 1 };
  return figure;
};