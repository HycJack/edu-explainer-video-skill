import type { FigureFn, Params, Scene, SceneItem, Vec2 } from "../types";
import { amber, blue, green, ink, inkFaint, inkMuted, red, violet } from "../theme";

/**
 * 一个能"拧"的电路：开关可以慢慢合上，滑片可以连续移动，电流、灯泡亮度、
 * 两块表的读数都由 U / (R_L + R) 当场算出来。
 *
 *   U = 6 V，灯泡 5 Ω，滑变 R = 2 + 18p Ω。
 *   电流 I = U / (R_L + R)；灯泡的亮度按 I² 给，电压表读灯泡两端电压。
 *
 * 于是"滑片挪一点，灯就亮一点"不再是一句解说词：箭头、亮度、表盘读数
 * 全都跟着同一个 I 变，谁也抢不到谁前面去。
 *
 * Parameter keys:
 *   wires 四条导线          cell   电池（含正负极）
 *   lamp  灯泡              rheo   滑动变阻器
 *   ksw   开关（sw 控制刀闸） amps   电流表与读数
 *   volt  电压表与读数       flow   电流方向箭头
 *   nums  数值面板（U、R、I、P）
 *
 * Continuous: `sw`（0 断开 → 1 闭合）、`p`（滑片位置，0 → 1）。
 */

export const WIDTH = 1010;
export const HEIGHT = 700;

export type CircuitOpts = {
  readonly U?: number;
  /** 灯泡电阻 Ω。 */ readonly RL?: number;
  readonly Rmin?: number;
  readonly Rmax?: number;
};

const num = (v: number, d = 2) => v.toFixed(d);

export const circuitFigure = (opts: CircuitOpts = {}): FigureFn => {
  const U = opts.U ?? 6;
  const RL = opts.RL ?? 5;
  const Rmin = opts.Rmin ?? 2;
  const Rmax = opts.Rmax ?? 20;

  // The loop: corners of the rectangle, and where each component sits on it.
  const LX = 250;
  const RX = 790;
  const TY = 180;
  const BY = 570;

  const A_CY = 300; // 电流表在左边
  const A_R = 36;
  const K_CX = 400; // 开关在顶边
  const L_CY = 300; // 灯泡在右边
  const L_R = 36;
  const R_X0 = 470; // 滑变在底边，横向
  const R_X1 = 700;
  const R_TOP = 534;
  const R_BOT = 606;
  const C_CX = 350; // 电池在底边左段
  const V_CX = 930; // 电压表，接在灯泡两端外侧

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const on = (k: string) => (p[k] ?? 0) > 0;

    const sw = Math.max(0, Math.min(1, p.sw ?? 0));
    const pp = Math.max(0, Math.min(1, p.p ?? 0));

    const Rslide = Rmin + (Rmax - Rmin) * pp;
    const I = sw > 0.99 ? U / (RL + Rslide) : 0; // 断开就没有电流
    const UL = I * RL;
    const P = I * I * RL;
    const glow = Math.min(1, (P / (RL * (U / (RL + Rmin)) ** 2)) * 1.15);

    // --- wires -----------------------------------------------------------------
    // left side, split around the ammeter
    items.push(
      { key: "w:l1", reveal: "wires", layer: 2, kind: "line", from: [LX, TY], to: [LX, A_CY - A_R], stroke: ink, width: 3.2 },
      { key: "w:l2", reveal: "wires", layer: 2, kind: "line", from: [LX, A_CY + A_R], to: [LX, BY], stroke: ink, width: 3.2 },
    );
    // top, split around the switch
    items.push(
      { key: "w:t1", reveal: "wires", layer: 2, kind: "line", from: [LX, TY], to: [K_CX - 34, TY], stroke: ink, width: 3.2 },
      { key: "w:t2", reveal: "wires", layer: 2, kind: "line", from: [K_CX + 34, TY], to: [RX, TY], stroke: ink, width: 3.2 },
    );
    // right side, split around the lamp
    items.push(
      { key: "w:r1", reveal: "wires", layer: 2, kind: "line", from: [RX, TY], to: [RX, L_CY - L_R], stroke: ink, width: 3.2 },
      { key: "w:r2", reveal: "wires", layer: 2, kind: "line", from: [RX, L_CY + L_R], to: [RX, BY], stroke: ink, width: 3.2 },
    );
    // bottom, split around the cell and the rheostat
    items.push(
      { key: "w:b1", reveal: "wires", layer: 2, kind: "line", from: [LX, BY], to: [C_CX - 26, BY], stroke: ink, width: 3.2 },
      { key: "w:b2", reveal: "wires", layer: 2, kind: "line", from: [C_CX + 26, BY], to: [R_X0, BY], stroke: ink, width: 3.2 },
      { key: "w:b3", reveal: "wires", layer: 2, kind: "line", from: [R_X1, BY], to: [RX, BY], stroke: ink, width: 3.2 },
    );
    // corners, filled solid
    for (const c of [[LX, TY], [RX, TY], [RX, BY], [LX, BY]] as Vec2[]) {
      items.push({ key: `dot:${c[0]},${c[1]}`, reveal: "wires", layer: 3, kind: "marker", at: c, r: 4.5, fill: ink });
    }

    // --- the cell ----------------------------------------------------------------
    if (on("cell")) {
      items.push(
        { key: "cell:pos", reveal: "cell", layer: 3, kind: "line", from: [C_CX - 12, BY - 26], to: [C_CX - 12, BY + 26], stroke: red, width: 5 },
        { key: "cell:neg", reveal: "cell", layer: 3, kind: "line", from: [C_CX + 12, BY - 14], to: [C_CX + 12, BY + 14], stroke: ink, width: 5 },
        { key: "cell:plus", reveal: "cell", layer: 7, kind: "text", at: [C_CX - 40, BY - 40], text: "+", size: 26, bold: true, color: red },
        { key: "cell:lab", reveal: "cell", layer: 7, kind: "text", at: [C_CX, BY + 62], text: `U = ${num(U, 0)} V`, size: 25, bold: true, color: ink },
      );
    }

    // --- the switch, opened or closed ---------------------------------------------
    if (on("ksw")) {
      const angle = -38 * (1 - sw); // degrees; 0 when fully closed
      const a = (angle * Math.PI) / 180;
      const len = 62;
      const tip: Vec2 = [K_CX + 34 + Math.sin(a) * len, TY - Math.cos(a) * len];
      items.push(
        { key: "ksw:a", reveal: "ksw", layer: 4, kind: "marker", at: [K_CX - 34, TY], r: 6, fill: ink },
        { key: "ksw:b", reveal: "ksw", layer: 4, kind: "marker", at: [K_CX + 34, TY], r: 6, fill: ink },
        { key: "ksw:blade", reveal: "ksw", layer: 5, kind: "line", from: [K_CX - 34, TY], to: tip, stroke: green, width: 4.6 },
        {
          key: "ksw:lab", reveal: "ksw", layer: 7, kind: "text",
          at: [K_CX, TY - 88], text: sw > 0.99 ? "闭合" : sw < 0.01 ? "断开" : "合上中…", size: 25, bold: true, color: green,
        },
      );
    }

    // --- the lamp ----------------------------------------------------------------------
    if (on("lamp")) {
      items.push(
        { key: "lamp:bulb", reveal: "lamp", layer: 3, kind: "circle", c: [RX, L_CY], r: L_R, fill: "#FDE68A", fillOpacity: 0.12 + 0.86 * glow, stroke: ink, width: 3.2 },
        // the filament, as an X inside the glass
        { key: "lamp:x1", reveal: "lamp", layer: 4, kind: "line", from: [RX - 17, L_CY - 17], to: [RX + 17, L_CY + 17], stroke: amber, width: 2.6 },
        { key: "lamp:x2", reveal: "lamp", layer: 4, kind: "line", from: [RX - 17, L_CY + 17], to: [RX + 17, L_CY - 17], stroke: amber, width: 2.6 },
        { key: "lamp:lab", reveal: "lamp", layer: 7, kind: "text", at: [RX + 70, L_CY - 52], text: "L", size: 28, italic: true, family: "serif", bold: true, color: ink, anchor: "end" },
        {
          key: "lamp:p", reveal: "lamp", layer: 7, kind: "text",
          at: [RX - 74, L_CY + 56], text: `实际功率 ${num(P)} W`, size: 24, color: amber, anchor: "end",
        },
      );
    }

    // --- the rheostat --------------------------------------------------------------------
    if (on("rheo")) {
      const sliderX = R_X0 + 22 + (R_X1 - R_X0 - 44) * pp;
      items.push(
        {
          key: "rheo:box", reveal: "rheo", layer: 2, kind: "poly", close: true,
          points: [[R_X0, R_TOP], [R_X1, R_TOP], [R_X1, R_BOT], [R_X0, R_BOT]],
          fill: "none", stroke: ink, width: 2.4, dash: "0",
        },
        // the resistance wire: coils across the box
        {
          key: "rheo:coil", reveal: "rheo", layer: 3, kind: "path",
          d: (() => {
            const y = (R_TOP + R_BOT) / 2;
            const n = 11;
            const w = (R_X1 - R_X0 - 40) / n;
            let d = `M ${R_X0 + 20} ${y}`;
            for (let i = 1; i <= n; i++) {
              d += ` L ${R_X0 + 20 + w * (i - 0.5)} ${y + (i % 2 ? -16 : 16)}`;
              d += ` L ${R_X0 + 20 + w * i} ${y}`;
            }
            return d;
          })(),
          stroke: blue, width: 3, fill: "none",
        },
        // the slider riding on it, with its own arrow
        { key: "rheo:stem", reveal: "rheo", layer: 4, kind: "line", from: [sliderX, R_TOP - 34], to: [sliderX, R_TOP], stroke: violet, width: 4 },
        { key: "rheo:knob", reveal: "rheo", layer: 5, kind: "marker", at: [sliderX, R_TOP - 40], r: 9, fill: violet, ring: violet },
        { key: "rheo:p", reveal: "rheo", layer: 4, kind: "arrow", from: [sliderX - 46, R_TOP - 40], to: [sliderX - 12, R_TOP - 40], stroke: violet, width: 3.4, head: 11 },
        {
          key: "rheo:lab", reveal: "rheo", layer: 7, kind: "text",
          at: [(R_X0 + R_X1) / 2, R_BOT + 44], text: `R = ${num(Rslide, 1)} Ω`, size: 26, bold: true, color: blue,
        },
      );
    }

    // --- the ammeter ------------------------------------------------------------------------
    if (on("amps")) {
      items.push(
        { key: "A:circle", reveal: "amps", layer: 3, kind: "circle", c: [LX, A_CY], r: A_R, fill: "#FFFFFF", stroke: ink, width: 3.4 },
        { key: "A:letter", reveal: "amps", layer: 4, kind: "text", at: [LX - 12, A_CY + 2], text: "A", size: 30, bold: true, family: "serif", color: ink },
        {
          key: "A:read", reveal: "amps", layer: 7, kind: "text",
          at: [LX - 76, A_CY], text: `${num(I)} A`, size: 27, bold: true, color: green, anchor: "end",
        },
      );
    }

    // --- the voltmeter across the lamp ---------------------------------------------------------
    if (on("volt")) {
      items.push(
        { key: "V:tap1", reveal: "volt", layer: 2, kind: "line", from: [RX, L_CY - L_R], to: [V_CX, L_CY - L_R], stroke: inkFaint, width: 2.2, dash: "6 5" },
        { key: "V:tap2", reveal: "volt", layer: 2, kind: "line", from: [RX, L_CY + L_R], to: [V_CX, L_CY + L_R], stroke: inkFaint, width: 2.2, dash: "6 5" },
        { key: "V:circle", reveal: "volt", layer: 3, kind: "circle", c: [V_CX, L_CY], r: 34, fill: "#FFFFFF", stroke: ink, width: 3.4 },
        { key: "V:letter", reveal: "volt", layer: 4, kind: "text", at: [V_CX - 10, L_CY + 2], text: "V", size: 28, bold: true, family: "serif", color: ink },
        {
          key: "V:read", reveal: "volt", layer: 7, kind: "text",
          at: [V_CX + 8, L_CY + 76], text: `${num(UL)} V`, size: 26, bold: true, color: blue,
        },
      );
    }

    // --- current direction -------------------------------------------------------------------------
    if (on("flow") && I > 0.001) {
      // a few small triangles marching round the loop, clockwise: up the left,
      // along the top, down the right, back along the bottom
      const tip = (at: Vec2, dir: Vec2): SceneItem => ({
        key: `flow:${at[0]},${at[1]},${dir[0]}`, reveal: "flow", layer: 6, kind: "poly", close: true,
        points: [
          [at[0] + dir[0] * 11, at[1] + dir[1] * 11],
          [at[0] - dir[1] * 8, at[1] + dir[0] * 8],
          [at[0] + dir[1] * 8, at[1] - dir[0] * 8],
        ],
        fill: green, stroke: "none",
      });
      items.push(
        tip([LX, A_CY - A_R - 46], [0, -1]), // 左边向上
        tip([K_CX + 120, TY], [1, 0]), // 顶边向右
        tip([RX, L_CY + L_R + 46], [0, 1]), // 右边向下
        tip([R_X1 + 46, BY], [-1, 0]), // 底边向左
        {
          key: "flow:note", reveal: "flow", layer: 7, kind: "text",
          at: [LX + 8, TY + 62], text: "电流：电源正极 → 用电器 → 负极", size: 23, color: green, anchor: "start",
        },
      );
    }

    // --- the numbers -----------------------------------------------------------------------------------
    if (on("nums")) {
      items.push(
        {
          key: "nums:1", reveal: "nums", layer: 8, kind: "text",
          at: [196, 108], text: `U = ${num(U, 0)} V　R_L = ${num(RL, 0)} Ω　R滑 = ${num(Rslide, 1)} Ω`,
          size: 26, color: ink, anchor: "start",
        },
        {
          key: "nums:2", reveal: "nums", layer: 8, kind: "text",
          at: [196, 150], text: `I = U / (R_L + R滑) = ${num(U, 0)} / ${num(RL + Rslide, 1)} = ${num(I)} A`,
          size: 27, bold: true, color: green, anchor: "start",
        },
        {
          key: "nums:3", reveal: "nums", layer: 8, kind: "text",
          at: [196, 192], text: sw > 0.99 ? `滑片右移 → R 变大 → I 变小 → 灯变暗` : `开关断开，电路中无电流`,
          size: 25, color: inkMuted, anchor: "start",
        },
      );
    }

    return { width: WIDTH, height: HEIGHT, items };
  };

  figure.defaults = { wires: 1, cell: 1, lamp: 1 };
  figure.continuous = ["sw", "p"];
  return figure;
};
