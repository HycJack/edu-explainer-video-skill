import type { FigureFn, Params, Scene, SceneItem, Vec2 } from "../types";
import { amber, blue, green, ink, inkFaint, inkMuted, red, violet } from "../theme";

/**
 * 原子结构示意图：核电荷数决定了电子数，电子数决定了怎么分层，分层决定了它
 * 容不容易得失电子 —— 整张图由 Z 和 A 两个数推出来，没有任何一处是手画的。
 *
 * 排布按 2 / 8 / 8 / 18…（最外层不超过 8），而不是抄某个元素的排布表：
 * 换 opts.Z 就能换元素，图仍然自洽。
 *
 * Parameter keys:
 *   nucleus 原子核（质子数、中子数、正电荷）  shells  电子层
 *   elect   电子                              config  核电荷数与分层文字 "+11 2 8 1"
 *   shelln  层序数标注                        lose    失去最外层一个电子（成阳离子）
 *   gain    得到一个电子（成阴离子）          charge  离子符号与所带电荷
 *
 * Continuous: `spin`（各层电子缓慢转动，内层快外层慢 —— 只是让图活着，不掺假信息）。
 */

export const WIDTH = 980;
export const HEIGHT = 680;

export type AtomOpts = {
  /** 核电荷数（= 质子数 = 中性原子的电子数）。 */ readonly Z?: number;
  /** 质量数 A（默认取常见同位素）。 */ readonly A?: number;
  readonly symbol?: string;
  readonly name?: string;
};

/** 按 2/8/8/18 排布，给出每层电子数。 */
const shellCounts = (n: number): number[] => {
  const caps = [2, 8, 8, 18, 18, 32];
  const out: number[] = [];
  let left = n;
  for (const c of caps) {
    if (left <= 0) break;
    const take = Math.min(c, left);
    out.push(take);
    left -= take;
  }
  return out;
};

const ELECTRON_R = 7.5;

export const atomFigure = (opts: AtomOpts = {}): FigureFn => {
  const Z = opts.Z ?? 11;
  const A = opts.A ?? Math.round(Z * 2.2);
  const symbol = opts.symbol ?? "Na";
  const name = opts.name ?? "钠";

  const CX = 452;
  const CY = 330;
  const shellsRaw = shellCounts(Z);
  const SHELL_R = [86, 142, 198, 250, 296];

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const on = (k: string) => (p[k] ?? 0) > 0;

    const spin = p.spin ?? 0;
    const lost = on("lose") ? 1 : 0;
    const gained = on("gain") ? 1 : 0;

    const shells = [...shellsRaw];
    // 变成离子：最外层少一个（或多一个）
    if (lost && shells.length > 0) {
      shells[shells.length - 1] -= 1;
      if (shells[shells.length - 1] === 0) shells.pop();
    }
    if (gained && shells.length > 0) {
      shells[shells.length - 1] += 1;
    }

    const total = shells.reduce((a, b) => a + b, 0);
    const charge = Z - total; // >0 阳离子，<0 阴离子

    // --- the nucleus -------------------------------------------------------------
    if (on("nucleus")) {
      items.push(
        { key: "nuc", reveal: "nucleus", layer: 3, kind: "circle", c: [CX, CY], r: 38, fill: red, fillOpacity: 0.18, stroke: red, width: 3 },
        { key: "nuc:plus", reveal: "nucleus", layer: 4, kind: "text", at: [CX, CY - 8], text: `+${Z}`, size: 27, bold: true, color: red },
        {
          key: "nuc:sub", reveal: "nucleus", layer: 4, kind: "text",
          at: [CX, CY + 18], text: `${A - Z}n ${Z}p`, size: 20, color: inkMuted,
        },
        {
          key: "nuc:lab", reveal: "nucleus", layer: 7, kind: "text",
          at: [CX, CY + 62], text: "原子核", size: 24, color: inkMuted,
        },
      );
    }

    // --- the shells ------------------------------------------------------------------
    if (on("shells")) {
      shells.forEach((_, i) => {
        items.push({
          key: `shell:${i}`, reveal: "shells", layer: 2, kind: "circle",
          c: [CX, CY], r: SHELL_R[i], fill: "none", stroke: i === shells.length - 1 ? violet : inkFaint, width: i === shells.length - 1 ? 3.2 : 2.4,
        });
      });
    }

    // --- knock out which shell is which ------------------------------------------------
    if (on("shelln")) {
      shells.forEach((_, i) => {
        items.push({
          key: `shelln:${i}`, reveal: "shelln", layer: 7, kind: "text",
          at: [CX + SHELL_R[i] + 18, CY - 8], text: ["K", "L", "M", "N", "O"][i] ?? "", size: 22, color: inkMuted,
        });
      });
    }

    // --- the electrons ---------------------------------------------------------------------
    if (on("elect")) {
      shells.forEach((count, i) => {
        const r = SHELL_R[i];
        // outer shells drift slower: nothing physical, just keeps the picture alive
        const speed = 1 / (i + 1);
        for (let k = 0; k < count; k++) {
          const a = (2 * Math.PI * k) / Math.max(1, count) + spin * speed * (i % 2 === 0 ? 1 : -1);
          const at: Vec2 = [CX + r * Math.cos(a), CY - r * Math.sin(a)];
          items.push({
            key: `e:${i}:${k}`, reveal: "elect", layer: 5, kind: "circle",
            c: at, r: ELECTRON_R, fill: blue, stroke: "#FFFFFF", width: 2,
          });
        }
      });
    }

    // --- the configuration written out ---------------------------------------------------------
    if (on("config")) {
      items.push(
        {
          key: "cfg:box", reveal: "config", layer: 7, kind: "poly", close: true,
          points: [[712, 210], [946, 210], [946, 430], [712, 430]],
          fill: "#FFFFFF", fillOpacity: 0.7, stroke: inkFaint, width: 1.8,
        },
        {
          key: "cfg:sym", reveal: "config", layer: 8, kind: "text",
          at: [829, 246], text: `${symbol}  ${name}`, size: 30, bold: true, color: ink,
        },
        {
          key: "cfg:z", reveal: "config", layer: 8, kind: "text",
          at: [829, 292], text: `核电荷数 ${Z}`, size: 24, color: inkMuted,
        },
        {
          key: "cfg:layers", reveal: "config", layer: 8, kind: "text",
          at: [829, 336], text: shells.join("  "), size: 28, bold: true, color: violet,
        },
        {
          key: "cfg:note", reveal: "config", layer: 8, kind: "text",
          at: [829, 382], text: shells.length ? `最外层 ${shells[shells.length - 1]} 个电子` : "", size: 23, color: inkMuted,
        },
      );
    }

    // --- becoming an ion -------------------------------------------------------------------------------
    const outer = shells.length ? SHELL_R[shells.length - 1] : null;
    if (on("lose") && outer) {
      const a = (spin * 1) % (2 * Math.PI);
      const from: Vec2 = [CX + outer * Math.cos(a), CY - outer * Math.sin(a)];
      items.push(
        { key: "lose:e", reveal: "lose", layer: 6, kind: "circle", c: [from[0] + 66, from[1] - 54], r: ELECTRON_R, fill: blue, stroke: "#FFFFFF", width: 2 },
        { key: "lose:arrow", reveal: "lose", layer: 5, kind: "arrow", from: [from[0] + 14, from[1] - 12], to: [from[0] + 58, from[1] - 46], stroke: green, width: 3, head: 11 },
        {
          key: "lose:lab", reveal: "lose", layer: 8, kind: "text",
          at: [from[0] + 92, from[1] - 74], text: "失去 1 个电子", size: 23, color: green, anchor: "start",
        },
      );
    }
    if (on("gain")) {
      items.push(
        { key: "gain:e", reveal: "gain", layer: 6, kind: "circle", c: [CX + 300, CY - 230], r: ELECTRON_R, fill: green, stroke: "#FFFFFF", width: 2 },
        { key: "gain:arrow", reveal: "gain", layer: 5, kind: "arrow", from: [CX + 292, CY - 216], to: [CX + SHELL_R[Math.min(shells.length - 1, 2)] + 22, CY - 120], stroke: green, width: 3, head: 11 },
        {
          key: "gain:lab", reveal: "gain", layer: 8, kind: "text",
          at: [CX + 306, CY - 262], text: "得到 1 个电子", size: 23, color: green, anchor: "start",
        },
      );
    }

    if (on("charge")) {
      const sign = charge > 0 ? "+" : charge < 0 ? "−" : "";
      const n = charge !== 0 ? Math.abs(charge) : "";
      items.push(
        {
          key: "charge:box", reveal: "charge", layer: 8, kind: "poly", close: true,
          points: [[712, 462], [946, 462], [946, 578], [712, 578]],
          fill: sign === "+" ? red : green, fillOpacity: 0.08, stroke: sign === "+" ? red : green, width: 2.4,
        },
        {
          key: "charge:sym", reveal: "charge", layer: 9, kind: "text",
          at: [829, 508],
          text: charge === 0 ? `${symbol}（电中性）` : `${symbol}${n}${sign}`,
          size: 32, bold: true, color: sign === "+" ? red : green,
        },
        {
          key: "charge:why", reveal: "charge", layer: 9, kind: "text",
          at: [829, 552],
          text: charge === 0 ? "质子数 = 核外电子数" : `质子 ${Z}，电子 ${total}`,
          size: 24, color: inkMuted,
        },
      );
    }

    return { width: WIDTH, height: HEIGHT, items };
  };

  figure.defaults = { nucleus: 1, shells: 1, elect: 1 };
  figure.continuous = ["spin"];
  return figure;
};
