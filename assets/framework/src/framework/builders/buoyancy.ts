import type { FigureFn, Params, Scene, SceneItem } from "../types";
import { amber, blue, green, ink, inkMuted, red, violet } from "../theme";

/**
 * 浮力：一只溢水杯，一个能被按进水里的方块，两支共用同一把比例尺的力箭头。
 *
 * 取 V = 1 dm³、ρ水 = 1.0×10³ kg/m³，则排开一整杯方块的水重正好 10 N：
 *   F浮 = ρ水 g V排 = 10f N，G = ρ物 g V = 10ρ N，f 是浸入的体积分数。
 * 两支箭头必须共用比例尺才好比较 —— 箭头长度不一致的受力图比没有受力图更糟。
 *
 * 拖动 f 是把方块按下去的过程：F浮 随排开的体积线性长大。松手往哪边走，由 ρ 决定，
 * 而不是由你怎么按决定 —— 这一点是这个图唯一想说的事。
 *
 * Parameter keys:
 *   glass  溢水杯          water  水与液面
 *   block  方块            arrows G 与 F浮（同一比例尺）
 *   spill  排开的水进入小烧杯   values  ρ、V排、G、F浮 的数值
 *   verdict 上浮 / 悬浮 / 下沉
 *
 * Continuous: `rho`（ρ物/ρ水，0.3–2.5）、`depth`（浸入体积分数 0–1）。
 */

export const WIDTH = 1000;
export const HEIGHT = 700;

export type BuoyancyOpts = {
  /** 方块排开的水重 N（V = 1 dm³ 时为 10 N）。 */ readonly fullN?: number;
};

const num = (v: number, d = 1) => v.toFixed(d);

export const buoyancyFigure = (opts: BuoyancyOpts = {}): FigureFn => {
  const FULL = opts.fullN ?? 10; // 完全浸没时的浮力
  /** 同一把比例尺：两支箭头都用。px per newton。 */
  const K = 4.4;

  const GL = 190;
  const GR = 590;
  const BT = 200; // 杯口
  const BB = 590; // 杯底
  const WY = 300; // 水面
  const B = 152; // 方块边长
  const CXb = 390; // 方块水平中心

  const JX = 700; // 小烧杯左
  const JR = 860; // 小烧杯右
  const JB = 590; // 小烧杯底
  const JH = 250; // 小烧杯高（满量程对应 V 排）

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const on = (k: string) => (p[k] ?? 0) > 0;

    const rho = Math.max(0.3, Math.min(2.5, p.rho ?? 0.6));
    const f = Math.max(0, Math.min(1, p.depth ?? 0));

    const G = rho * FULL;
    const FB = f * FULL;

    // 方块位置：完全浸没在 f = 1 时顶面刚好触到水面
    const yTop = WY + f * B - B;
    const yBot = yTop + B;

    // --- beaker ---------------------------------------------------------------
    items.push(
      { key: "glass:l", reveal: "glass", layer: 3, kind: "line", from: [GL, BT], to: [GL, BB], stroke: ink, width: 3.4 },
      { key: "glass:r", reveal: "glass", layer: 3, kind: "line", from: [GR, BT], to: [GR, BB], stroke: ink, width: 3.4 },
      { key: "glass:b", reveal: "glass", layer: 3, kind: "line", from: [GL, BB], to: [GR, BB], stroke: ink, width: 3.4 },
      // the overflow spout
      { key: "spout:1", reveal: "glass", layer: 3, kind: "line", from: [GR, WY - 16], to: [GR + 54, WY + 6], stroke: ink, width: 3 },
      { key: "spout:2", reveal: "glass", layer: 3, kind: "line", from: [GR + 54, WY + 6], to: [GR + 54, WY - 26], stroke: ink, width: 3 },
    );

    // --- water -----------------------------------------------------------------
    if (on("water")) {
      items.push(
        {
          key: "water", reveal: "water", layer: 1, kind: "poly", close: true,
          points: [[GL + 3, WY], [GR + 3, WY], [GR - 3, BB - 2], [GL + 3, BB - 2]],
          fill: "#BFE3F5", fillOpacity: 0.65, stroke: "none",
        },
        { key: "water:top", reveal: "water", layer: 2, kind: "line", from: [GL + 3, WY], to: [GR + 3, WY], stroke: blue, width: 2.6 },
        { key: "water:lab", reveal: "water", layer: 7, kind: "text", at: [GL + 22, WY + 26], text: "水面", size: 22, color: blue, anchor: "start" },
      );
    }

    // --- the block ---------------------------------------------------------------
    if (on("block")) {
      items.push({
        key: "block", reveal: "block", layer: 4, kind: "poly", close: true,
        points: [[CXb - B / 2, yTop], [CXb + B / 2, yTop], [CXb + B / 2, yBot], [CXb - B / 2, yBot]],
        fill: amber, fillOpacity: 0.22, stroke: amber, width: 3.4,
      });
      // how much of it is under water, shaded
      if (f > 0.001) {
        items.push({
          key: "block:wet", reveal: "block", layer: 2, kind: "poly", close: true,
          points: [[CXb - B / 2, Math.max(yTop, WY)], [CXb + B / 2, Math.max(yTop, WY)], [CXb + B / 2, yBot], [CXb - B / 2, yBot]],
          fill: "#BFE3F5", fillOpacity: 0.55, stroke: "none",
        });
      }
      items.push({
        key: "block:lab", reveal: "block", layer: 8, kind: "text",
        at: [CXb, yTop - 26], text: `V = 1 dm³`, size: 24, bold: true, color: amber,
      });
    }

    // --- the two forces, one scale --------------------------------------------------
    if (on("arrows")) {
      const cy = yTop + B / 2;
      items.push(
        { key: "arr:G", reveal: "arrows", layer: 6, kind: "arrow", from: [CXb, cy], to: [CXb, cy + G * K], stroke: violet, width: 4, head: 14, glow: true },
        {
          key: "arr:G:lab", reveal: "arrows", layer: 8, kind: "text",
          at: [CXb - 64, cy + G * K * 0.55], text: `G = ${num(G)} N`, size: 26, bold: true, color: violet, anchor: "end",
        },
        { key: "arr:F", reveal: "arrows", layer: 6, kind: "arrow", from: [CXb, cy], to: [CXb, cy - FB * K], stroke: green, width: 4, head: 14, glow: true },
        {
          key: "arr:F:lab", reveal: "arrows", layer: 8, kind: "text",
          at: [CXb + 66, cy - FB * K * 0.6], text: `F浮 = ${num(FB)} N`, size: 26, bold: true, color: green, anchor: "start",
        },
        { key: "arr:pt", reveal: "arrows", layer: 8, kind: "marker", at: [CXb, cy], r: 5, fill: ink },
      );
    }

    // --- displaced water, collected ---------------------------------------------------
    if (on("spill")) {
      const dropY = JB - f * JH;
      if (f > 0.001) {
        items.push(
          {
            key: "jar:water", reveal: "spill", layer: 1, kind: "poly", close: true,
            points: [[JX + 3, dropY], [JR - 3, dropY], [JR - 3, JB - 2], [JX + 3, JB - 2]],
            fill: "#BFE3F5", fillOpacity: 0.7, stroke: "none",
          },
          { key: "jar:line", reveal: "spill", layer: 2, kind: "line", from: [JX + 3, dropY], to: [JR - 3, dropY], stroke: blue, width: 2.4 },
        );
      }
      // the stream falling out of the spout into the little jar
      if (f > 0.02) {
        items.push({
          key: "stream", reveal: "spill", layer: 1, kind: "line",
          from: [GR + 54, WY + 6], to: [(GR + 54 + (JX + JR) / 2) / 2, dropY],
          stroke: blue, width: 3.2,
        });
      }
      items.push(
        { key: "jar:l", reveal: "spill", layer: 3, kind: "line", from: [JX, JB - JH], to: [JX, JB], stroke: ink, width: 3.2 },
        { key: "jar:r", reveal: "spill", layer: 3, kind: "line", from: [JR, JB - JH], to: [JR, JB], stroke: ink, width: 3.2 },
        { key: "jar:b", reveal: "spill", layer: 3, kind: "line", from: [JX, JB], to: [JR, JB], stroke: ink, width: 3.2 },
        {
          key: "jar:lab", reveal: "spill", layer: 8, kind: "text",
          at: [(JX + JR) / 2, JB + 34], text: `排开的水 ${num(f * 1, 2)} dm³`, size: 25, bold: true, color: blue,
        },
      );
    }

    // --- the numbers ---------------------------------------------------------------------
    if (on("values")) {
      items.push(
        {
          key: "val:rho", reveal: "values", layer: 8, kind: "text",
          at: [180, 96], text: `ρ物 / ρ水 = ${num(rho, 2)}`, size: 27, bold: true, color: ink, anchor: "start",
        },
        {
          key: "val:G", reveal: "values", layer: 8, kind: "text",
          at: [180, 138], text: `G = ρ物 g V = ${num(G)} N`, size: 25, color: violet, anchor: "start",
        },
        {
          key: "val:F", reveal: "values", layer: 8, kind: "text",
          at: [180, 176], text: `F浮 = ρ水 g V排 = ${num(FB)} N`, size: 25, color: green, anchor: "start",
        },
      );
    }

    // --- where it ends up once you let go ----------------------------------------------------
    if (on("verdict")) {
      const floats = rho < 1;
      const sinks = rho > 1;
      const verdict = floats ? "松手后上浮，最后漂浮" : sinks ? "松手后下沉，最终沉底" : "任意深度都能停留 —— 悬浮";
      const detail = floats
        ? `漂浮时 V排/V = ρ物/ρ水 = ${num(rho, 2)}，露出 ${num((1 - rho) * 100, 0)}%`
        : sinks
          ? `沉底时 F浮 = ${num(FULL)} N < G = ${num(G)} N`
          : `悬浮时 ρ物 = ρ水`;
      items.push(
        {
          key: "verdict", reveal: "verdict", layer: 9, kind: "text",
          at: [WIDTH / 2, HEIGHT - 78], text: verdict, size: 30, bold: true, color: floats ? green : sinks ? red : blue,
        },
        { key: "verdict:d", reveal: "verdict", layer: 9, kind: "text", at: [WIDTH / 2, HEIGHT - 42], text: detail, size: 25, color: inkMuted },
      );
    }

    return { width: WIDTH, height: HEIGHT, items };
  };

  figure.defaults = { glass: 1, water: 1, block: 1 };
  figure.continuous = ["rho", "depth"];
  return figure;
};
