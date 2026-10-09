import type { FigureFn, Params, Scene, SceneItem } from "../types";
import { amber, blue, green, ink, inkFaint, inkMuted, red, violet } from "../theme";

/**
 * 一定一动的滑轮组：绳子绕法、承重段数、省力一半、费一倍距离，全都画在同一张图上。
 *
 * 几何上绳长是守恒的 —— 动滑轮上升 h，固定端到动滑轮、动滑轮到定滑轮这两段
 * 同时缩短 h，所以自由端必须下降 2h。这个 2 不是印上去的，是总绳长不变推出来的，
 * 拖动 h 的时候能直接看到绳端走得比重物快一倍。
 *
 *   G = 100 N，承重绳段 n = 2 → F = 50 N，s = 2h。
 *
 * Parameter keys:
 *   beam    顶部横梁            pulleys 两个滑轮（含挂钩）
 *   rope    绳子（随 h 变形）   load    重物与它的重力
 *   pull    自由端的拉力箭头    dist    h 与 s = 2h 的距离对照
 *   count   承重绳段数标记      concl   F = G/2、s = 2h
 *
 * Continuous: `h`（重物被提升的高度，米）。
 */

export const WIDTH = 980;
export const HEIGHT = 700;

export type PulleyOpts = {
  /** 物重 N。 */ readonly G?: number;
  /** 承重绳段数（本图按 n = 2 绘制）。 */ readonly n?: number;
};

const num = (v: number, d = 1) => v.toFixed(d);

export const pulleyFigure = (opts: PulleyOpts = {}): FigureFn => {
  const G = opts.G ?? 100;
  const n = opts.n ?? 2;

  const RM = 44; // 动滑轮半径
  const RF = 44; // 定滑轮半径
  const XM = 470; // 动滑轮中心 x
  const XF = XM + RM + RF; // 定滑轮中心 x：让第二段绳子正好竖直
  const TOP = 110; // 横梁
  const YFIXED = 196; // 定滑轮中心
  const YMOVE0 = 430; // 动滑轮中心的初始高度
  const YEND0 = 520; // 绳自由端的初始高度
  const S = 110; // px per metre

  const K = 0.5; // px per newton

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const on = (k: string) => (p[k] ?? 0) > 0;

    const h = Math.max(0, Math.min(1.4, p.h ?? 0));
    const yMove = YMOVE0 - h * S;
    const yEnd = YEND0 + n * h * S; // 绳端走的是 n 倍距离

    const xmL = XM - RM; // 动滑轮左切点
    const xmR = XM + RM; // 动滑轮右切点
    const xfL = XF - RF;
    const xfR = XF + RF;

    const pullValue = G / n;
    const fPull = pullValue * K;

    // --- the beam and its support ---------------------------------------------
    items.push(
      { key: "beam", reveal: "beam", layer: 0, kind: "line", from: [110, TOP], to: [880, TOP], stroke: ink, width: 6 },
    );
    for (let k = 120; k < 880; k += 22) {
      items.push({
        key: `ceil:${k}`, reveal: "beam", layer: 0, kind: "line",
        from: [k, TOP - 2], to: [k + 16, TOP - 18], stroke: inkFaint, width: 2,
      });
    }

    // --- the fixed hanging point ----------------------------------------------
    items.push(
      { key: "anchor", reveal: "rope", layer: 2, kind: "line", from: [xmL, TOP], to: [xmL, yMove], stroke: inkMuted, width: 3 },
      { key: "anchor:pt", reveal: "rope", layer: 6, kind: "marker", at: [xmL, TOP], r: 5, fill: ink },
    );

    // --- the two pulleys --------------------------------------------------------
    if (on("pulleys")) {
      items.push(
        { key: "fix:hook", reveal: "pulleys", layer: 2, kind: "line", from: [XF, TOP], to: [XF, YFIXED - RF], stroke: ink, width: 3.4 },
        { key: "fix:wheel", reveal: "pulleys", layer: 3, kind: "circle", c: [XF, YFIXED], r: RF, fill: "#FFFFFF", stroke: ink, width: 3.4 },
        { key: "fix:hub", reveal: "pulleys", layer: 4, kind: "circle", c: [XF, YFIXED], r: 5, fill: ink },
        {
          key: "fix:lab", reveal: "pulleys", layer: 7, kind: "text",
          at: [XF + 68, YFIXED - 60], text: "定滑轮：改变力的方向", size: 24, color: inkMuted, anchor: "start",
        },

        { key: "mov:wheel", reveal: "pulleys", layer: 3, kind: "circle", c: [XM, yMove], r: RM, fill: "#FFFFFF", stroke: ink, width: 3.4 },
        { key: "mov:hub", reveal: "pulleys", layer: 4, kind: "circle", c: [XM, yMove], r: 5, fill: ink },
        {
          key: "mov:lab", reveal: "pulleys", layer: 7, kind: "text",
          at: [XM - 96, yMove], text: "动滑轮：省一半力", size: 24, color: inkMuted, anchor: "end",
        },
        { key: "mov:hook", reveal: "pulleys", layer: 2, kind: "line", from: [XM, yMove + RM], to: [XM, yMove + RM + 22], stroke: ink, width: 3.4 },
      );
    }

    // --- the rope ----------------------------------------------------------------
    if (on("rope")) {
      items.push({
        key: "rope", reveal: "rope", layer: 2, kind: "path",
        d: [
          `M ${xmL} ${TOP}`,
          `L ${xmL} ${yMove}`,
          `A ${RM} ${RM} 0 0 0 ${xmR} ${yMove}`, // 绕过动滑轮底部
          `L ${xfL} ${YFIXED}`,
          `A ${RF} ${RF} 0 0 1 ${xfR} ${YFIXED}`, // 绕过定滑轮顶部
          `L ${xfR} ${yEnd}`,
        ].join(" "),
        stroke: red, width: 3.2, fill: "none",
      });
      // the free end: a little grip
      items.push(
        { key: "rope:end", reveal: "rope", layer: 6, kind: "marker", at: [xfR, yEnd], r: 6, fill: red },
      );
    }

    // --- the load -----------------------------------------------------------------
    if (on("load")) {
      const top = yMove + RM + 22;
      items.push(
        { key: "load:box", reveal: "load", layer: 3, kind: "poly", close: true, points: [[XM - 62, top], [XM + 62, top], [XM + 62, top + 82], [XM - 62, top + 82]], fill: violet, fillOpacity: 0.2, stroke: violet, width: 3 },
        { key: "load:g", reveal: "load", layer: 5, kind: "arrow", from: [XM, top + 82], to: [XM, top + 82 + G * K], stroke: violet, width: 4, head: 14, glow: true },
        {
          key: "load:lab", reveal: "load", layer: 7, kind: "text",
          at: [XM - 76, top + 82 + G * K * 0.6], text: `G = ${num(G, 0)} N`, size: 26, bold: true, color: violet, anchor: "end",
        },
      );
    }

    // --- the effort on the free end ------------------------------------------------
    if (on("pull")) {
      items.push(
        { key: "pull:arrow", reveal: "pull", layer: 5, kind: "arrow", from: [xfR, yEnd], to: [xfR, yEnd + fPull], stroke: blue, width: 4, head: 14, glow: true },
        {
          key: "pull:lab", reveal: "pull", layer: 7, kind: "text",
          at: [xfR + 86, yEnd + fPull / 2], text: `F = ${num(fPull / K, 0)} N`, size: 27, bold: true, color: blue, anchor: "start",
        },
      );
    }

    // --- the distance the load rose vs the distance the hand travelled ---------------
    if (on("dist")) {
      items.push(
        { key: "dist:h0", reveal: "dist", layer: 3, kind: "line", from: [XM - 130, YMOVE0], to: [XM - 92, YMOVE0], stroke: violet, width: 2.4, dash: "5 4" },
        { key: "dist:h1", reveal: "dist", layer: 3, kind: "line", from: [XM - 130, yMove], to: [XM - 92, yMove], stroke: violet, width: 2.4, dash: "5 4" },
        { key: "dist:ha", reveal: "dist", layer: 5, kind: "arrow", from: [XM - 111, YMOVE0], to: [XM - 111, yMove], stroke: violet, width: 3.2, head: 11 },
        {
          key: "dist:hl", reveal: "dist", layer: 7, kind: "text",
          at: [XM - 150, (YMOVE0 + yMove) / 2], text: `h = ${num(h, 2)} m`, size: 25, bold: true, color: violet, anchor: "end",
        },

        { key: "dist:s0", reveal: "dist", layer: 3, kind: "line", from: [xfR + 26, YEND0], to: [xfR + 62, YEND0], stroke: blue, width: 2.4, dash: "5 4" },
        { key: "dist:s1", reveal: "dist", layer: 3, kind: "line", from: [xfR + 26, yEnd], to: [xfR + 62, yEnd], stroke: blue, width: 2.4, dash: "5 4" },
        { key: "dist:sa", reveal: "dist", layer: 5, kind: "arrow", from: [xfR + 44, YEND0], to: [xfR + 44, yEnd], stroke: blue, width: 3.2, head: 11 },
        {
          key: "dist:sl", reveal: "dist", layer: 7, kind: "text",
          at: [xfR + 74, (YEND0 + yEnd) / 2], text: `s = ${num(n * h, 2)} m`, size: 25, bold: true, color: blue, anchor: "start",
        },
      );
    }

    // --- how many rope segments carry the load ----------------------------------------
    if (on("count")) {
      items.push(
        { key: "cnt:1", reveal: "count", layer: 8, kind: "line", from: [xmL - 22, yMove - 30], to: [xmL + 22, yMove - 30], stroke: green, width: 3.4 },
        { key: "cnt:2", reveal: "count", layer: 8, kind: "line", from: [xmR - 22, yMove - 30], to: [xmR + 22, yMove - 30], stroke: green, width: 3.4 },
        {
          key: "cnt:lab", reveal: "count", layer: 8, kind: "text",
          at: [XM, yMove - 62], text: `承重绳段 n = ${n}`, size: 26, bold: true, color: green,
        },
      );
    }

    // --- conclusion --------------------------------------------------------------------
    if (on("concl")) {
      items.push({
        key: "concl", reveal: "concl", layer: 9, kind: "text",
        at: [WIDTH / 2, HEIGHT - 42],
        text: `F = G/${n} = ${num(G / n, 0)} N　（省力一半），绳端走 s = ${n}h　（费一倍距离）`,
        size: 28, bold: true, color: green,
      });
    }

    return { width: WIDTH, height: HEIGHT, items };
  };

  figure.defaults = { beam: 1, pulleys: 1, rope: 1 };
  figure.continuous = ["h"];
  return figure;
};
