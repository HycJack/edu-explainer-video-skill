import type { FigureFn, Params, Scene, SceneItem, Vec2 } from "../types";
import { amber, blue, green, ink, inkFaint, inkMuted, red, violet } from "../theme";
import { fnPath } from "../geometry";

/**
 * 抛体运动：初速度矢量可以更改造抛射角，轨迹、射程、飞行时间、每一时刻的
 * 速度分解全都由 v₀、θ、g 三个数算出来。
 *
 * v₀ = 20 m/s，g = 10 m/s²：45° 时射程恰好 40 m、最高 10 m，所以整幅图的
 * 量程是按真实极值定的，不是贴上去的数量。
 *
 * 分运动那部分（ghost）是这个类最值钱的地方：同一时刻，一个虚影沿水平方向
 * 匀速，另一个沿竖直方向做自由落体 —— 抛体是这两个运动的叠加，看图就知道。
 *
 * Parameter keys:
 *   ground 地面、发射点          v0vel  初速度矢量（可转）
 *   vxy    v₀ 的水平 / 竖直分量  traj   轨迹
 *   ball   运动中的小球（随 t）  vtan   此刻的速度矢量（切向）
 *   vnow   v 的水平 / 竖直分量   apex   最高点与对称性
 *   ghost  两个分运动的虚影      range  射程与飞行时间
 *
 * Continuous: `t`（秒）与 `theta`（度）—— 两个都可以拉着看。
 */

export const WIDTH = 980;
export const HEIGHT = 690;

export type ProjectileOpts = {
  readonly v0?: number;
  readonly g?: number;
};

const num = (v: number, d = 1) => v.toFixed(d);

export const projectileFigure = (opts: ProjectileOpts = {}): FigureFn => {
  const v0 = opts.v0 ?? 20;
  const g = opts.g ?? 10;

  const LEFT = 96;
  const TOP = 62;
  const RIGHT = WIDTH - 76;
  const BOTTOM = HEIGHT - 96;
  const SX = 16.4; // px per metre, horizontal
  const SY = 38; // px per metre, vertical

  const OX = LEFT + 24;
  const OY = BOTTOM - 8;

  const X = (x: number) => OX + x * SX;
  const Y = (y: number) => OY - y * SY;
  const toScreen = (x: number, y: number): Vec2 => [X(x), Y(y)];

  const rad = (deg: number) => (deg * Math.PI) / 180;

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];

    const theta = Math.max(2, Math.min(88, p.theta ?? 45));
    const th = rad(theta);
    const v0x = v0 * Math.cos(th);
    const v0y = v0 * Math.sin(th);
    const T = (2 * v0y) / g; // 飞行时间
    const R = v0x * T; // 射程
    const H = (v0y * v0y) / (2 * g); // 最大高度

    const t = Math.max(0, Math.min(T, p.t ?? 0));
    const x = v0x * t;
    const y = v0y * t - 0.5 * g * t * t;
    const vy = v0y - g * t;
    const v = Math.hypot(v0x, vy);
    const on = (k: string) => (p[k] ?? 0) > 0;

    // --- ground --------------------------------------------------------------
    items.push(
      { key: "ground", reveal: "ground", layer: 0, kind: "line", from: [LEFT - 20, BOTTOM], to: [RIGHT + 30, BOTTOM], stroke: ink, width: 3.4 },
    );
    for (let k = -14; k < RIGHT - LEFT; k += 14) {
      items.push({
        key: `hatch:${k}`, reveal: "ground", layer: 0, kind: "line",
        from: [LEFT + k, BOTTOM + 2], to: [LEFT + k - 10, BOTTOM + 12], stroke: inkFaint, width: 1.8,
      });
    }
    items.push(
      { key: "pt:O", reveal: "ground", layer: 6, kind: "marker", at: [OX, OY], r: 5.5, fill: ink },
      { key: "lab:O", reveal: "ground", layer: 6, kind: "text", at: [OX - 30, OY + 22], text: "发射点", size: 22, color: inkMuted },
      { key: "g:note", reveal: "ground", layer: 6, kind: "text", at: [RIGHT - 6, BOTTOM + 52], text: `g = ${num(g, 0)} m/s²`, size: 24, color: inkMuted, anchor: "end" },
    );

    // --- initial velocity and its components ---------------------------------
    const arrowLen = 84;
    const u: Vec2 = [Math.cos(th), -Math.sin(th)];
    const tip: Vec2 = [OX + u[0] * arrowLen, OY + u[1] * arrowLen];
    if (on("v0vel")) {
      items.push(
        { key: "v0:arrow", reveal: "v0vel", layer: 5, kind: "arrow", from: [OX, OY], to: tip, stroke: red, width: 4, head: 16, glow: true },
        {
          key: "v0:lab", reveal: "v0vel", layer: 6, kind: "text",
          at: [tip[0] + 42, tip[1] - 20], text: `v₀ = ${num(v0, 0)} m/s`, size: 27, bold: true, color: red, anchor: "start",
        },
        {
          key: "v0:ang", reveal: "v0vel", layer: 6, kind: "text",
          at: [OX + 96, OY - 18], text: `θ = ${num(theta)}°`, size: 26, bold: true, color: violet, anchor: "start",
        },
      );
      // the angle arc between the horizontal and v0
      const rArc = 46;
      items.push({
        key: "v0:arc", reveal: "v0vel", layer: 5, kind: "path",
        d: `M ${OX + rArc} ${OY} A ${rArc} ${rArc} 0 0 0 ${(OX + rArc * Math.cos(th)).toFixed(2)} ${(OY - rArc * Math.sin(th)).toFixed(2)}`,
        stroke: violet, width: 2.4, fill: "none",
      });
    }

    if (on("vxy")) {
      items.push(
        {
          key: "v0x", reveal: "vxy", layer: 4, kind: "arrow",
          from: [OX, OY], to: [OX + arrowLen * Math.cos(th), OY], stroke: blue, width: 3, head: 12, dash: "0",
        },
        {
          key: "v0y", reveal: "vxy", layer: 4, kind: "arrow",
          from: [OX, OY], to: [OX, OY - arrowLen * Math.sin(th)], stroke: green, width: 3, head: 12,
        },
        {
          key: "v0x:lab", reveal: "vxy", layer: 6, kind: "text",
          at: [OX + arrowLen * Math.cos(th) / 2, OY + 30], text: `v₀ₓ = ${num(v0x)} m/s`, size: 25, color: blue, bold: true,
        },
        {
          key: "v0y:lab", reveal: "vxy", layer: 6, kind: "text",
          at: [OX - 88, OY - arrowLen * Math.sin(th) / 2], text: `v₀ᵧ = ${num(v0y)} m/s`, size: 25, color: green, bold: true, anchor: "end",
        },
      );
    }

    // --- the trajectory -------------------------------------------------------
    if (on("traj")) {
      items.push({
        key: "traj", reveal: "traj", layer: 2, kind: "path",
        d: fnPath((xx) => (Math.tan(th) * xx - (g * xx * xx) / (2 * v0x * v0x)), 0, R, toScreen, 140),
        stroke: inkMuted, width: 3, fill: "none", dash: "8 6",
      });
    }

    // --- the flying ball ------------------------------------------------------
    if (on("ball")) {
      items.push(
        { key: "ball", reveal: "ball", layer: 8, kind: "circle", c: [X(x), Y(y)], r: 13, fill: amber, stroke: ink, width: 2.4 },
        {
          key: "ball:t", reveal: "ball", layer: 8, kind: "text",
          at: [X(x), Y(y) - 34], text: `t = ${num(t)} s`, size: 25, bold: true, color: amber,
        },
        {
          key: "ball:pos", reveal: "ball", layer: 8, kind: "text",
          at: [X(x), Y(y) - 62], text: `(${num(x)}, ${num(y)}) m`, size: 23, color: inkMuted,
        },
      );
      // the two coordinates read off the axes
      items.push(
        { key: "proj:x", reveal: "ball", layer: 3, kind: "line", from: [X(x), OY], to: [X(x), BOTTOM + 16], stroke: blue, width: 1.8, dash: "6 5" },
        { key: "proj:y", reveal: "ball", layer: 3, kind: "line", from: [OX - 6, Y(y)], to: [X(0), Y(y)], stroke: green, width: 1.8, dash: "6 5" },
      );
    }

    // --- velocity at this instant ---------------------------------------------
    if (on("vtan")) {
      const m = Math.hypot(v0x, -vy) || 1;
      const ux = v0x / m;
      const uy = -vy / m;
      const L = 12 + v * 2.4; // 长度真的按速度大小给
      items.push({
        key: "vnow", reveal: "vtan", layer: 7, kind: "arrow",
        from: [X(x), Y(y)], to: [X(x) + ux * L, Y(y) + uy * L], stroke: red, width: 3.8, head: 14, glow: true,
      });
      items.push({
        key: "vnow:lab", reveal: "vtan", layer: 8, kind: "text",
        at: [X(x) + ux * (L + 42), Y(y) + uy * (L + 30)], text: `v = ${num(v)} m/s`, size: 25, bold: true, color: red,
      });
    }

    if (on("vnow")) {
      const Lx = v0x * 3.2;
      const Ly = vy * 3.2;
      items.push(
        { key: "vnx", reveal: "vnow", layer: 6, kind: "arrow", from: [X(x), Y(y)], to: [X(x) + Lx, Y(y)], stroke: blue, width: 3, head: 11 },
        { key: "vny", reveal: "vnow", layer: 6, kind: "arrow", from: [X(x), Y(y)], to: [X(x), Y(y) - Ly], stroke: green, width: 3, head: 11 },
        {
          key: "vnx:lab", reveal: "vnow", layer: 7, kind: "text",
          at: [X(x) + Lx + 58, Y(y)], text: `vₓ = ${num(v0x)}（不变）`, size: 24, color: blue, anchor: "end",
        },
        {
          key: "vny:lab", reveal: "vnow", layer: 7, kind: "text",
          at: [X(x) - 78, Y(y) - Ly / 2], text: `vᵧ = ${num(vy)}`, size: 24, color: green, anchor: "end",
        },
      );
    }

    // --- apex: height and the symmetry you can lean on -------------------------
    if (on("apex")) {
      items.push(
        { key: "apex:pt", reveal: "apex", layer: 7, kind: "marker", at: toScreen(R / 2, H), r: 6.5, fill: violet, ring: violet },
        { key: "apex:h", reveal: "apex", layer: 6, kind: "line", from: toScreen(R / 2, 0), to: toScreen(R / 2, H), stroke: violet, width: 2.6, dash: "7 5" },
        { key: "apex:top", reveal: "apex", layer: 6, kind: "line", from: [OX, Y(H)], to: [toScreen(R, H)[0], Y(H)], stroke: violet, width: 1.8, dash: "7 5" },
        {
          key: "apex:lab", reveal: "apex", layer: 8, kind: "text",
          at: [toScreen(R / 2, H)[0] + 8, Y(H) - 26],
          text: `最高 ${num(H)} m，到达时间 ${num(T / 2)} s`, size: 25, bold: true, color: violet, anchor: "start",
        },
      );
    }

    // --- component motions: the ball is doing both at once ---------------------
    if (on("ghost")) {
      const freeY = v0y * t - 0.5 * g * t * t; // 竖直方向自由落体（含初速）
      items.push(
        {
          key: "ghost:v", reveal: "ghost", layer: 3, kind: "circle",
          c: [X(0), Y(freeY)], r: 11, fill: "#FFFFFF", stroke: green, width: 2.6, dash: "6 4",
        },
        {
          key: "ghost:h", reveal: "ghost", layer: 3, kind: "circle",
          c: [X(x), OY], r: 11, fill: "#FFFFFF", stroke: blue, width: 2.6, dash: "6 4",
        },
        { key: "ghost:drop", reveal: "ghost", layer: 2, kind: "line", from: [X(0), OY], to: [X(0), TOP], stroke: green, width: 1.8, dash: "5 6" },
        {
          key: "ghost:lab", reveal: "ghost", layer: 7, kind: "text",
          at: [LEFT + 40, TOP + 12],
          text: "虚线球：竖直自由落体、水平匀速 —— 抛体正是两者的叠加", size: 24, color: inkMuted, anchor: "start",
        },
      );
    }

    // --- range ------------------------------------------------------------------
    if (on("range")) {
      items.push(
        { key: "range:pt", reveal: "range", layer: 7, kind: "marker", at: toScreen(R, 0), r: 7, fill: blue, ring: blue },
        { key: "range:bar", reveal: "range", layer: 6, kind: "line", from: [X(R), BOTTOM + 26], to: [OX, BOTTOM + 26], stroke: blue, width: 2.6 },
        {
          key: "range:lab", reveal: "range", layer: 8, kind: "text",
          at: [X(R / 2), BOTTOM + 54], text: `射程 ${num(R)} m`, size: 26, bold: true, color: blue,
        },
        {
          key: "range:T", reveal: "range", layer: 8, kind: "text",
          at: [RIGHT - 4, TOP + 12], text: `飞行时间 ${num(T)} s`, size: 25, color: inkMuted, anchor: "end",
        },
      );
    }

    return { width: WIDTH, height: HEIGHT, items };
  };

  figure.defaults = { ground: 1, v0vel: 1 };
  figure.continuous = ["t", "theta"];
  return figure;
};
