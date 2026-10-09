import type { FigureFn, Params, Scene, SceneItem, Vec2 } from "../types";
import { amber, blue, green, ink, inkFaint, inkMuted, red, violet } from "../theme";

/**
 * 杠杆平衡 —— 关键在于让"力臂"真的被算出来，而不是画一条看着像的线段。
 *
 * 力的方向恒竖直向下，所以力臂是支点到力的作用线的**水平**距离，等于臂长×cosθ。
 * 于是倾斜杠杆时两条力臂**同比例缩短**，而它们的比值不变 —— 平衡条件
 * F₁l₁ = F₂l₂ 与倾角无关。这一点靠十几帧画面说不清楚，但让 θ 连续滑动就清清楚楚：
 * 两个力矩一起变小，杠杆照样不动。
 *
 *   L₁ = 2（阻力臂），L₂ = 3（动力臂），G = 60 N → 平衡时 F = 40 N。
 *
 * Parameter keys:
 *   frame 支架与支点        bar   杠杆本身
 *   load  阻力 G（左端）    effort 动力 F（右端）
 *   arms  两条力臂（水平，实算）  values 力臂与力矩的数值
 *   concl 结论 F·L₂ = G·L₁，且与 θ 无关
 *
 * Continuous: `alpha`（杠杆倾角，度）、`F`（动力，N）。
 */

export const WIDTH = 980;
export const HEIGHT = 660;

export type LeverOpts = {
  /** 阻力臂格数。 */ readonly L1?: number;
  /** 动力臂格数。 */ readonly L2?: number;
  /** 阻力大小 N。 */ readonly G?: number;
};

const num = (v: number, d = 1) => v.toFixed(d);

export const leverFigure = (opts: LeverOpts = {}): FigureFn => {
  const L1 = opts.L1 ?? 2;
  const L2 = opts.L2 ?? 3;
  const G = opts.G ?? 60;
  /** 每格多少像素：让 L1 + L2 = 5 格占 560 px。 */
  const U = 112;

  const OX = 470;
  const OY = 360;

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const on = (k: string) => (p[k] ?? 0) > 0;

    const alpha = Math.max(-32, Math.min(32, p.alpha ?? 0));
    const a = (alpha * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);

    // alpha > 0：左端下沉。屏幕 y 向下，所以 A 的 y 增加。
    const A: Vec2 = [OX - L1 * U * cos, OY + L1 * U * sin];
    const B: Vec2 = [OX + L2 * U * cos, OY - L2 * U * sin];

    /** 平衡所需的动力。 */
    const Fbal = (G * L1) / L2;
    const F = p.F ?? Fbal;

    /** 力臂 = 支点到力的作用线的水平距离 = 臂长 × cosθ。都是竖直力。 */
    const arm1 = L1 * cos;
    const arm2 = L2 * cos;
    const M1 = G * arm1;
    const M2 = F * arm2;
    const balanced = Math.abs(M1 - M2) < 1e-6;

    const K = 0.55; // px per newton, 箭头长度

    // --- the pivot and the support -------------------------------------------
    items.push(
      { key: "frame:post", reveal: "frame", layer: 1, kind: "line", from: [OX, OY], to: [OX, OY + 150], stroke: ink, width: 5 },
      { key: "frame:base", reveal: "frame", layer: 1, kind: "line", from: [OX - 84, OY + 150], to: [OX + 84, OY + 150], stroke: ink, width: 5 },
      // the classic pivot triangle, kept upright whatever the bar does
      {
        key: "frame:tri", reveal: "frame", layer: 2, kind: "poly",
        points: [[OX, OY + 2], [OX - 26, OY + 46], [OX + 26, OY + 46]],
        fill: "#FFFFFF", stroke: ink, width: 3,
      },
      { key: "pt:O", reveal: "frame", layer: 7, kind: "marker", at: [OX, OY], r: 6.5, fill: ink, ring: "#FFFFFF", ringWidth: 2 },
      { key: "lab:O", reveal: "frame", layer: 7, kind: "text", at: [OX + 34, OY - 18], text: "O", size: 27, italic: true, family: "serif", bold: true, color: ink },
    );

    // --- the bar --------------------------------------------------------------
    items.push(
      { key: "bar", reveal: "bar", layer: 3, kind: "line", from: A, to: B, stroke: ink, width: 11 },
      { key: "pt:A", reveal: "bar", layer: 7, kind: "marker", at: A, r: 5, fill: ink },
      { key: "pt:B", reveal: "bar", layer: 7, kind: "marker", at: B, r: 5, fill: ink },
      { key: "lab:A", reveal: "bar", layer: 7, kind: "text", at: [A[0] - 30, A[1] + 12], text: "A", size: 28, italic: true, family: "serif", bold: true, color: ink },
      { key: "lab:B", reveal: "bar", layer: 7, kind: "text", at: [B[0] + 30, B[1] + 12], text: "B", size: 28, italic: true, family: "serif", bold: true, color: ink },
    );

    // grid ticks along the bar at each unit
    for (let k = -L1; k <= L2; k++) {
      if (k === 0) continue;
      const q: Vec2 = [OX + k * U * cos, OY - k * U * sin];
      items.push({
        key: `tick:${k}`, reveal: "bar", layer: 4, kind: "line",
        from: [q[0] - 7 * sin, q[1] - 7 * cos], to: [q[0] + 7 * sin, q[1] + 7 * cos],
        stroke: inkFaint, width: 2.2,
      });
    }

    // --- the resisting load at A ----------------------------------------------
    if (on("load")) {
      const gLen = G * K;
      items.push(
        { key: "load:box", reveal: "load", layer: 3, kind: "poly", close: true, points: [[A[0] - 40, A[1]], [A[0] + 40, A[1]], [A[0] + 40, A[1] + 54], [A[0] - 40, A[1] + 54]], fill: violet, fillOpacity: 0.18, stroke: violet, width: 3 },
        { key: "load:hook", reveal: "load", layer: 3, kind: "line", from: A, to: [A[0], A[1] + 12], stroke: ink, width: 3 },
        { key: "load:arrow", reveal: "load", layer: 5, kind: "arrow", from: [A[0], A[1] + 54], to: [A[0], A[1] + 54 + gLen], stroke: violet, width: 4, head: 14, glow: true },
        {
          key: "load:lab", reveal: "load", layer: 7, kind: "text",
          at: [A[0] - 62, A[1] + 54 + gLen / 2], text: `G = ${num(G, 0)} N`, size: 26, bold: true, color: violet, anchor: "end",
        },
      );
    }

    // --- the effort at B -------------------------------------------------------
    if (on("effort")) {
      const fLen = F * K;
      items.push(
        { key: "eff:arrow", reveal: "effort", layer: 5, kind: "arrow", from: [B[0], B[1]], to: [B[0], B[1] + fLen], stroke: blue, width: 4, head: 14, glow: true },
        {
          key: "eff:lab", reveal: "effort", layer: 7, kind: "text",
          at: [B[0] + 74, B[1] + fLen / 2], text: `F = ${num(F)} N`, size: 26, bold: true, color: blue, anchor: "start",
        },
      );
    }

    // --- the moment arms: horizontal distance to each vertical line of action --
    if (on("arms")) {
      items.push(
        // A 的作用线是一条竖线，力臂是从 O 到这条线的水平段
        { key: "arm1:line", reveal: "arms", layer: 2, kind: "line", from: [A[0], OY], to: [A[0], A[1] + 74], stroke: violet, width: 1.8, dash: "6 5" },
        { key: "arm1", reveal: "arms", layer: 4, kind: "line", from: [OX, OY + 22], to: [A[0], OY + 22], stroke: violet, width: 4 },
        { key: "arm1:a", reveal: "arms", layer: 5, kind: "line", from: [A[0], OY + 14], to: [A[0], OY + 30], stroke: violet, width: 3 },
        { key: "arm1:b", reveal: "arms", layer: 5, kind: "line", from: [OX, OY + 14], to: [OX, OY + 30], stroke: violet, width: 3 },
        {
          key: "arm1:lab", reveal: "arms", layer: 7, kind: "text",
          at: [(OX + A[0]) / 2, OY + 46], text: `l₁ = ${num(arm1, 2)}`, size: 25, bold: true, color: violet,
        },

        { key: "arm2:line", reveal: "arms", layer: 2, kind: "line", from: [B[0], OY], to: [B[0], B[1] + 74], stroke: blue, width: 1.8, dash: "6 5" },
        { key: "arm2", reveal: "arms", layer: 4, kind: "line", from: [OX, OY + 22], to: [B[0], OY + 22], stroke: blue, width: 4 },
        { key: "arm2:a", reveal: "arms", layer: 5, kind: "line", from: [B[0], OY + 14], to: [B[0], OY + 30], stroke: blue, width: 3 },
        {
          key: "arm2:lab", reveal: "arms", layer: 7, kind: "text",
          at: [(OX + B[0]) / 2, OY + 46], text: `l₂ = ${num(arm2, 2)}`, size: 25, bold: true, color: blue,
        },
      );
    }

    // --- the numbers: two moments that move together ---------------------------
    if (on("values")) {
      items.push(
        {
          key: "val:1", reveal: "values", layer: 8, kind: "text",
          at: [300, 108], text: `阻力 × 阻力臂 = ${num(G, 0)} × ${num(arm1, 2)} = ${num(M1)} N·m`,
          size: 26, color: violet, bold: true, anchor: "start",
        },
        {
          key: "val:2", reveal: "values", layer: 8, kind: "text",
          at: [300, 148], text: `动力 × 动力臂 = ${num(F)} × ${num(arm2, 2)} = ${num(M2)} N·m`,
          size: 26, color: blue, bold: true, anchor: "start",
        },
        {
          key: "val:state", reveal: "values", layer: 8, kind: "text",
          at: [300, 196], text: balanced ? "两者相等 —— 杠杆平衡。" : (M2 > M1 ? "动力矩更大 —— B 端下沉。" : "阻力矩更大 —— A 端下沉。"),
          size: 25, color: balanced ? green : red, anchor: "start",
        },
        {
          key: "val:ratio", reveal: "values", layer: 8, kind: "text",
          at: [300, 64], text: `倾角 θ = ${num(alpha)}°，两条力臂同时乘上 cos θ = ${num(cos, 3)}`,
          size: 25, color: inkMuted, anchor: "start",
        },
      );
    }

    // --- the conclusion ---------------------------------------------------------
    if (on("concl")) {
      items.push({
        key: "concl", reveal: "concl", layer: 9, kind: "text",
        at: [OX, HEIGHT - 46],
        text: `F·L₂ = G·L₁  ⟹  F = ${num(Fbal)} N，与倾角 θ 无关`,
        size: 30, bold: true, color: green,
      });
    }

    return { width: WIDTH, height: HEIGHT, items };
  };

  figure.defaults = { frame: 1, bar: 1, load: 1 };
  figure.continuous = ["alpha", "F"];
  return figure;
};
