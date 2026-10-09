import type { Params, Scene, SceneItem, Vec2 } from "../types";
import { blue, green, ink, inkMuted, red, violet } from "../theme";
import { arcPath, offset } from "../geometry";

/**
 * Geometric optics — 光的反射与折射 figure.
 *
 * ai is the angle of incidence in degrees and it is CONTINUOUS: the incident
 * ray sweeps, the reflected ray mirrors it, and the refracted ray obeys Snell
 * live — sin θ₂ = (n₁/n₂)·sin θ₁. Past the critical angle the refracted ray
 * disappears (total internal reflection) because the maths says so, and the
 * read-out says TIR.
 *
 * Parameter keys:
 *   media   the two media regions and their n labels
 *   normal  the dashed normal through the incidence point
 *   rays    incident + reflected + refracted rays (angles follow CONTINUOUS ai)
 *   angles  the angle arcs θ₁, θ₂ with live degree read-outs
 */

export const WIDTH = 880;
export const HEIGHT = 640;

export type OpticsOptions = {
  n1: number;
  n2: number;
  /** Distance of the ray origin from the interface, in px. */
  arm?: number;
  width?: number;
  height?: number;
};

const DEG = Math.PI / 180;

export const opticsFigure = (opts: OpticsOptions) => {
  const W = opts.width ?? WIDTH;
  const H = opts.height ?? HEIGHT;
  const arm = opts.arm ?? 300;
  const I: Vec2 = [W / 2, H / 2]; // incidence point

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const ai = p.ai ?? 40;
    const th1 = ai * DEG;
    const sin2 = (opts.n1 / opts.n2) * Math.sin(th1);
    const tir = sin2 > 1;
    const th2 = Math.asin(Math.min(1, sin2));

    // --- the media -------------------------------------------------------------
    items.push(
      { key: "med1", reveal: "media", layer: 0, kind: "poly", points: [[0, 0], [W, 0], [W, I[1]], [0, I[1]]], fill: "#F0F5FB", fillOpacity: 0.9, stroke: "none" },
      { key: "med2", reveal: "media", layer: 0, kind: "poly", points: [[0, I[1]], [W, I[1]], [W, H], [0, H]], fill: "#DCE9F2", fillOpacity: 0.9, stroke: "none" },
      { key: "iface", reveal: "media", layer: 2, kind: "line", from: [0, I[1]], to: [W, I[1]], stroke: ink, width: 2.8 },
      {
        key: "med1:lab", reveal: "media", layer: 2, kind: "text",
        at: [78, 52], text: `n₁ = ${opts.n1}`,
        size: 27, bold: true, family: "sans", color: blue,
      },
      {
        key: "med2:lab", reveal: "media", layer: 2, kind: "text",
        at: [78, H - 46], text: `n₂ = ${opts.n2}`,
        size: 27, bold: true, family: "sans", color: violet,
      },
    );

    // --- the normal ---------------------------------------------------------------
    items.push(
      { key: "normal", reveal: "normal", layer: 1, kind: "line", from: [I[0], 36], to: [I[0], H - 36], stroke: inkMuted, width: 2, dash: "10 8" },
      { key: "pt:I", reveal: "normal", layer: 4, kind: "marker", at: I, r: 6, fill: ink },
    );

    // --- the rays -------------------------------------------------------------------
    const incidentFrom: Vec2 = [I[0] - arm * Math.sin(th1), I[1] - arm * Math.cos(th1)];
    const reflTo: Vec2 = [I[0] + arm * Math.sin(th1), I[1] - arm * Math.cos(th1)];
    const arm2 = arm * 0.82;
    const refrTo: Vec2 = [I[0] + arm2 * Math.sin(th2), I[1] + arm2 * Math.cos(th2)];
    items.push(
      { key: "ray:in", reveal: "rays", layer: 3, kind: "arrow", from: incidentFrom, to: I, stroke: red, width: 4, head: 15, glow: true },
      { key: "ray:out", reveal: "rays", layer: 3, kind: "arrow", from: I, to: reflTo, stroke: red, width: 4, head: 15, glow: true },
      // Total internal reflection collapses the refracted ray to nothing —
      // the item is rebuilt every frame, so hiding it here is honest.
      { key: "ray:ref", reveal: "rays", layer: 3, kind: "arrow", from: I, to: tir ? I : refrTo, stroke: violet, width: 4, head: tir ? 0.001 : 15, glow: !tir, opacity: tir ? 0 : 1 },
    );

    // --- angle arcs with live read-outs ------------------------------------------------
    const up: Vec2 = [I[0], I[1] - 110];
    const down: Vec2 = [I[0], I[1] + 96];
    items.push(
      { key: "arc:1", reveal: "angles", layer: 4, kind: "path", d: arcPath(I, up, incidentFrom, 64), stroke: inkMuted, width: 2, fill: "none" },
      { key: "arc:2", reveal: "angles", layer: 4, kind: "path", d: arcPath(I, down, tir ? reflTo : refrTo, 52), stroke: inkMuted, width: 2, fill: "none" },
      {
        key: "arc:1v", reveal: "angles", layer: 5, kind: "text",
        at: offset(I, [-118, -70]), text: `θ₁ = ${ai.toFixed(0)}°`,
        size: 25, bold: true, family: "sans", color: red,
      },
      {
        key: "arc:2v", reveal: "angles", layer: 5, kind: "text",
        at: offset(I, [116, 64]),
        text: tir ? "全反射" : `θ₂ = ${(th2 / DEG).toFixed(1)}°`,
        size: 25, bold: true, family: "sans", color: tir ? red : violet,
      },
    );

    return { width: W, height: H, items };
  };

  figure.defaults = { media: 1, normal: 1 };
  figure.continuous = ["ai"];
  return figure;
};
