import type { SceneItem, Vec2 } from "./types";

/**
 * Small geometry helpers shared by the newer builders. The older builders
 * (river, circle) each carry their own copies — left alone on purpose; new
 * builders should import from here.
 */

export const unit = (d: Vec2): Vec2 => {
  const m = Math.hypot(d[0], d[1]) || 1;
  return [d[0] / m, d[1] / m];
};

export const offset = (from: Vec2, by: Vec2): Vec2 => [from[0] + by[0], from[1] + by[1]];

export const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: Vec2, k: number): Vec2 => [a[0] * k, a[1] * k];
export const mid = (a: Vec2, b: Vec2): Vec2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

export const rot = (v: Vec2, ang: number): Vec2 => [
  v[0] * Math.cos(ang) - v[1] * Math.sin(ang),
  v[0] * Math.sin(ang) + v[1] * Math.cos(ang),
];

/** Screen-space lerp between two points at parameter t. */
export const lerp2 = (a: Vec2, b: Vec2, t: number): Vec2 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

/** A bar across the middle of a segment — the "these two are equal" tick. */
export const tick = (
  from: Vec2,
  to: Vec2,
  len: number,
  key: string,
  color: string,
  reveal?: string,
): SceneItem => {
  const m = mid(from, to);
  const u = unit([to[0] - from[0], to[1] - from[1]]);
  const p: Vec2 = [(-u[1] * len) / 2, (u[0] * len) / 2];
  return {
    key,
    reveal,
    layer: 6,
    kind: "line",
    from: offset(m, [-p[0], -p[1]]),
    to: offset(m, p),
    stroke: color,
    width: 3.2,
  };
};

/**
 * The arc at vertex V between the directions of P1 and P2, taking the smaller
 * sweep. Returns an SVG path in screen coordinates (y down).
 */
export const arcPath = (v: Vec2, p1: Vec2, p2: Vec2, r: number): string => {
  const a1 = Math.atan2(p1[1] - v[1], p1[0] - v[0]);
  const a2 = Math.atan2(p2[1] - v[1], p2[0] - v[0]);
  let delta = a2 - a1;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const s: Vec2 = [v[0] + r * Math.cos(a1), v[1] + r * Math.sin(a1)];
  const e: Vec2 = [v[0] + r * Math.cos(a2), v[1] + r * Math.sin(a2)];
  return `M ${s[0].toFixed(2)} ${s[1].toFixed(2)} A ${r} ${r} 0 0 ${delta > 0 ? 1 : 0} ${e[0].toFixed(2)} ${e[1].toFixed(2)}`;
};

/** Arc of an axis-aligned ellipse from angle θ1 to θ2 (screen coords). */
export const ellipseArcPath = (
  c: Vec2,
  rx: number,
  ry: number,
  th1: number,
  th2: number,
): string => {
  const pt = (th: number): Vec2 => [c[0] + rx * Math.cos(th), c[1] + ry * Math.sin(th)];
  const s = pt(th1);
  const e = pt(th2);
  return `M ${s[0].toFixed(2)} ${s[1].toFixed(2)} A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 0 ${th2 > th1 ? 1 : 0} ${e[0].toFixed(2)} ${e[1].toFixed(2)}`;
};

/** The little square at a corner, from the two directions that meet there. */
export const rightAngleMark = (
  corner: Vec2,
  along: Vec2,
  across: Vec2,
  size: number,
  key: string,
  color: string,
  reveal?: string,
): SceneItem => {
  const u = unit(sub(along, corner));
  const v = unit(sub(across, corner));
  const a = mul(u, size);
  const b = mul(v, size);
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

/** An arrow parallel mark: a small chevron on a segment reading "∥". */
export const parallelMark = (
  from: Vec2,
  to: Vec2,
  atT: number,
  size: number,
  key: string,
  color: string,
  reveal?: string,
): SceneItem => {
  const u = unit(sub(to, from));
  const p = lerp2(from, to, atT);
  const n: Vec2 = [-u[1], u[0]];
  const tip = offset(offset(p, mul(u, size / 2)), mul(n, 0));
  return {
    key,
    reveal,
    layer: 6,
    kind: "poly",
    close: false,
    points: [offset(offset(p, mul(u, -size / 2)), mul(n, size / 2)), tip, offset(offset(p, mul(u, -size / 2)), mul(n, -size / 2))],
    stroke: color,
    width: 2.6,
  };
};

/** Intersection of line P+t·d with line Q+s·e, or null when parallel. */
export const lineIntersect = (P: Vec2, d: Vec2, Q: Vec2, e: Vec2): Vec2 | null => {
  const den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((Q[0] - P[0]) * e[1] - (Q[1] - P[1]) * e[0]) / den;
  return [P[0] + d[0] * t, P[1] + d[1] * t];
};

/** Sample a function into an SVG polyline path across [x0, x1]. */
export const fnPath = (
  f: (x: number) => number,
  x0: number,
  x1: number,
  toScreen: (x: number, y: number) => Vec2,
  samples = 120,
): string => {
  const parts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = x0 + ((x1 - x0) * i) / samples;
    const [sx, sy] = toScreen(x, f(x));
    parts.push(`${i === 0 ? "M" : "L"} ${sx.toFixed(2)} ${sy.toFixed(2)}`);
  }
  return parts.join(" ");
};

/** Closed region between f and the x-axis over [a, b], as a fill path. */
export const regionPath = (
  f: (x: number) => number,
  a: number,
  b: number,
  toScreen: (x: number, y: number) => Vec2,
  samples = 90,
): string => {
  const top: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = a + ((b - a) * i) / samples;
    const [sx, sy] = toScreen(x, f(x));
    top.push(`${i === 0 ? "M" : "L"} ${sx.toFixed(2)} ${sy.toFixed(2)}`);
  }
  const [bx0, by0] = toScreen(b, 0);
  const [cx0, cy0] = toScreen(a, 0);
  return `${top.join(" ")} L ${bx0.toFixed(2)} ${by0.toFixed(2)} L ${cx0.toFixed(2)} ${cy0.toFixed(2)} Z`;
};
