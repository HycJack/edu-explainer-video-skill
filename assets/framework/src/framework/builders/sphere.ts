import type { Params, Scene, SceneItem, Vec2 } from "../types";
import { blue, green, ink, inkMuted, violet } from "../theme";
import { ellipseArcPath } from "../geometry";

/**
 * The sphere with a moving cross-section — 外接球/截面 figure, 2.5D.
 *
 * h is the signed height of the section plane over the equator, in units of
 * the sphere radius, and it is CONTINUOUS: the section circle travels up and
 * down the axis while its radius follows √(1 − h²) — the fact every 球的截面
 * problem leans on, made watchable.
 *
 * Parameter keys:
 *   ball     the outline, centre O, equator (front solid / back dashed)
 *   axis     the polar axis through N and S
 *   section  the section circle at height h (continuous), its centre M and
 *            the radius segment M→P with its live length read-out
 *   radius   the equatorial radius segment O→R labelled with the set radius
 */

export const WIDTH = 760;
export const HEIGHT = 700;

export type SphereOptions = {
  radius: number;
  /** Screen radius for the given sphere radius. */
  scale?: number;
  /** Viewing tilt: how open the ellipses are, 0…1 (default 0.32). */
  tilt?: number;
  width?: number;
  height?: number;
};

export const sphereFigure = (opts: SphereOptions) => {
  const W = opts.width ?? WIDTH;
  const H = opts.height ?? HEIGHT;
  const R = opts.scale ?? 240;
  const tilt = opts.tilt ?? 0.32;
  const C: Vec2 = [W / 2, H / 2 + 10];

  // Screen: a point at height z·R sits at C.y − z·R·cos(tiltAngle); the
  // foreshortening of horizontal circles is sin(tiltAngle) — here expressed
  // through the single `tilt` number for simplicity.
  const flat = tilt; // ellipse ry / r
  const lift = Math.sqrt(1 - flat * flat) * 0.92; // vertical scale for height

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const h = p.h ?? 0;

    // --- the sphere ----------------------------------------------------------
    items.push(
      { key: "ball", reveal: "ball", layer: 2, kind: "circle", c: C, r: R, fill: "#EDF2FA", fillOpacity: 0.5, stroke: ink, width: 3.4 },
      { key: "eq:back", reveal: "ball", layer: 1, kind: "path", d: ellipseArcPath(C, R, R * flat, Math.PI, 2 * Math.PI), stroke: inkMuted, width: 2, dash: "8 7", fill: "none" },
      { key: "eq:front", reveal: "ball", layer: 3, kind: "path", d: ellipseArcPath(C, R, R * flat, 0, Math.PI), stroke: ink, width: 2.8, fill: "none" },
      { key: "pt:O", reveal: "ball", layer: 4, kind: "marker", at: C, r: 5, fill: ink },
      { key: "lab:O", reveal: "ball", layer: 4, kind: "text", at: [C[0] - 30, C[1] + 8], text: "O", italic: true, family: "serif", size: 30, bold: true, color: ink },
    );

    // --- the polar axis --------------------------------------------------------
    items.push(
      { key: "ax", reveal: "axis", layer: 1, kind: "line", from: [C[0], C[1] + R + 34], to: [C[0], C[1] - R - 34], stroke: inkMuted, width: 2, dash: "9 7" },
      { key: "lab:S", reveal: "axis", layer: 4, kind: "text", at: [C[0] + 26, C[1] + R + 22], text: "S", italic: true, family: "serif", size: 28, bold: true, color: inkMuted },
      { key: "lab:N", reveal: "axis", layer: 4, kind: "text", at: [C[0] + 26, C[1] - R - 22], text: "N", italic: true, family: "serif", size: 28, bold: true, color: inkMuted },
    );

    // --- the equatorial radius --------------------------------------------------
    const Rr: Vec2 = [C[0] + R, C[1]];
    items.push(
      { key: "rad", reveal: "radius", layer: 4, kind: "line", from: C, to: Rr, stroke: blue, width: 3 },
      { key: "rad:lab", reveal: "radius", layer: 4, kind: "text", at: [C[0] + R / 2, C[1] + 26], text: String(opts.radius), italic: true, family: "serif", size: 28, bold: true, color: blue },
    );

    // --- the moving section -------------------------------------------------------
    const clamped = Math.max(-0.985, Math.min(0.985, h));
    const rSec = Math.sqrt(1 - clamped * clamped); // in units of R
    const cy = C[1] - clamped * R * lift;
    const cx: Vec2 = [C[0], cy];
    const rx = rSec * R;
    const ry = rSec * R * flat;
    const Pr: Vec2 = [C[0] + rx, cy];
    const showSection = Math.abs(clamped) < 0.985;
    items.push(
      ...(showSection
        ? ([
            { key: "sec:back", reveal: "section", layer: 2, kind: "path" as const, d: ellipseArcPath(cx, rx, ry, Math.PI, 2 * Math.PI), stroke: violet, width: 2, dash: "7 6", fill: "none" },
            { key: "sec:front", reveal: "section", layer: 3, kind: "path" as const, d: ellipseArcPath(cx, rx, ry, 0, Math.PI), stroke: violet, width: 3, fill: "none" },
            { key: "sec:fill", reveal: "section", layer: 2, kind: "ellipse" as const, c: cx, r: rx, ry, fill: "#E7E4FA", fillOpacity: 0.55, stroke: "none" },
            { key: "sec:M", reveal: "section", layer: 4, kind: "marker" as const, at: cx, r: 5, fill: violet },
            { key: "sec:Ml", reveal: "section", layer: 4, kind: "text" as const, at: [cx[0] - 30, cy], text: "M", italic: true, family: "serif", size: 28, bold: true, color: violet },
            { key: "sec:rad", reveal: "section", layer: 4, kind: "line" as const, from: cx, to: Pr, stroke: violet, width: 2.6 },
            { key: "sec:P", reveal: "section", layer: 4, kind: "marker" as const, at: Pr, r: 5, fill: violet },
            {
              key: "sec:val", reveal: "section", layer: 5, kind: "text" as const,
              at: [W - 96, 64],
              text: `r = ${(rSec * opts.radius).toFixed(2)}`,
              size: 28, bold: true, family: "sans", color: violet,
            },
            {
              key: "sec:h", reveal: "section", layer: 5, kind: "text" as const,
              at: [W - 96, 106],
              text: `h = ${(clamped * opts.radius).toFixed(2)}`,
              size: 24, family: "sans", color: inkMuted,
            },
          ] as SceneItem[])
        : []),
    );

    // --- the dashed connector from O to the section centre -----------------------
    items.push(
      { key: "OM", reveal: "section", layer: 3, kind: "line", from: C, to: cx, stroke: violet, width: 2, dash: "6 6" },
    );

    return { width: W, height: H, items };
  };

  figure.defaults = { ball: 1 };
  figure.continuous = ["h"];
  return figure;
};
