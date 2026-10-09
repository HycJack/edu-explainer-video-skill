import type { FigureFn, Params, Scene, SceneItem, Vec2 } from "../types";
import { amber, blue, green, ink, inkMuted, red, violet } from "../theme";

/**
 * 分子模型：同一个分子可以同时是球棍模型、电子式、带极性的成键图。
 *
 * 键长、键角、原子种类都写在 (x, y) 的分子数据里 —— 单位是 Å，画的时候乘一个
 * 常数。所以摆出来的形状是真的（水就是弯的、二氧化碳就是直的），比例也不会
 * 因为换个分子就散架。
 *
 * Parameter keys:
 *   balls 原子（元素符号，大小按原子半径）  bonds 共价键（单 / 双 / 三）
 *   shared 共用电子对                     lone   最外层孤对电子
 *   angle  键角                           polar  δ+ / δ− 与极性方向
 *   ionic  离子键：电子得失与静电作用（NaCl 一类）
 *   label  分子式、名称与构型说明
 *
 * Continuous: `spin`（整体自转 —— 换个角度看水还是弯的，这个事实不是画出来的）；
 *             `scale (%)`。
 */

export const WIDTH = 1000;
export const HEIGHT = 700;

export type AtomSite = {
  readonly el: string;
  /** Å，分子坐标系：x 向右、y 向上。 */
  readonly x: number;
  readonly y: number;
  /** 共价半径的相对大小。 */
  readonly scale?: number;
  /** 形式电荷（离子化合物用）。 */ readonly charge?: number;
  /** 孤对电子画在哪几个方向（度，0 = 右，逆时针为正）。 */ readonly loneAngles?: readonly number[];
  /** 极性标记。 */ readonly delta?: "+" | "-";
};

export type BondSpec = { readonly a: number; readonly b: number; readonly order?: 1 | 2 | 3 };

export type MoleculeSpec = {
  readonly name: string;
  readonly formula: string;
  readonly sites: readonly AtomSite[];
  readonly bonds: readonly BondSpec[];
  /** 键角：顶点、两边的原子下标、角度。 */ readonly angle?: readonly [number, number, number, string];
  readonly note?: string;
  /** 离子化合物：谁的电子给了谁。 */ readonly transfer?: readonly [number, number];
};

/** 常见元素的配色，沿用中学课本习惯：氢白、氧红、碳墨、氮蓝、氯绿、钠紫。 */
const EL_COLOR: Record<string, string> = {
  H: "#FFFFFF", O: red, C: "#475569", N: blue, Cl: green, Na: violet, S: amber, C_std: "#334155",
};
const EL_SIZE: Record<string, number> = { H: 26, O: 36, C: 34, N: 33, Cl: 37, Na: 36, S: 35 };

// 键长按真实值（Å），键角也照真实几何摆，这样水弯、二氧化碳直，是算出来的不是画出来的。
export const MOLECULES: Record<string, MoleculeSpec> = {
  water: {
    name: "水",
    formula: "H₂O",
    sites: [
      { el: "O", x: 0, y: 0.12, scale: 1, loneAngles: [42, 138, 90, -90], delta: "-" },
      { el: "H", x: -0.759, y: -0.468, scale: 1, delta: "+" },
      { el: "H", x: 0.759, y: -0.468, scale: 1, delta: "+" },
    ],
    bonds: [{ a: 0, b: 1 }, { a: 0, b: 2 }],
    angle: [0, 1, 2, "104.5°"],
    note: "V 形（角形）分子 —— 正负电荷中心不重合，是极性分子",
  },
  co2: {
    name: "二氧化碳",
    formula: "CO₂",
    sites: [
      { el: "C", x: 0, y: 0, scale: 1 },
      { el: "O", x: -1.16, y: 0, scale: 1, delta: "-" },
      { el: "O", x: 1.16, y: 0, scale: 1, delta: "-" },
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 2 },
    ],
    angle: [0, 1, 2, "180°"],
    note: "直线形，两个 C=O 的极性大小相等方向相反 —— 非极性分子",
  },
  methane: {
    name: "甲烷",
    formula: "CH₄",
    sites: [
      { el: "C", x: 0, y: 0, scale: 1 },
      { el: "H", x: 0.63, y: 0.89, scale: 1 },
      { el: "H", x: -0.63, y: 0.89, scale: 1 },
      { el: "H", x: 0.63, y: -0.89, scale: 1 },
      { el: "H", x: -0.63, y: -0.89, scale: 1 },
    ],
    bonds: [
      { a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 3 }, { a: 0, b: 4 },
    ],
    note: "正四面体，键角 109°28′ —— 它不是平面四边形",
  },
  ammonia: {
    name: "氨",
    formula: "NH₃",
    sites: [
      { el: "N", x: 0, y: 0, scale: 1, loneAngles: [90], delta: "-" },
      { el: "H", x: 0, y: 0.95, scale: 1, delta: "+" },
      { el: "H", x: -0.89, y: -0.44, scale: 1, delta: "+" },
      { el: "H", x: 0.89, y: -0.44, scale: 1, delta: "+" },
    ],
    bonds: [{ a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 3 }],
    note: "三角锥形，有一对孤对电子；氮上的孤对电子让它容易结合 H⁺",
  },
  salt: {
    name: "氯化钠",
    formula: "NaCl",
    sites: [
      { el: "Na", x: -1.35, y: 0, scale: 1, charge: 1 },
      { el: "Cl", x: 1.35, y: 0, scale: 1, charge: -1, loneAngles: [180, 150, 210, 30] },
    ],
    bonds: [],
    transfer: [0, 1],
    note: "没有共用电子对 —— 钠把最外层那一个电子整个给了氯，靠静电作用结合",
  },
};

const RAD = (deg: number) => (deg * Math.PI) / 180;

export const moleculeFigure = (spec: MoleculeSpec = MOLECULES.water): FigureFn => {
  const CX = 470;
  const CY = 352;
  const SC = 150; // px per Å

  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const on = (k: string) => (p[k] ?? 0) > 0;

    const spin = ((p.spin ?? 0) * Math.PI) / 180;
    const zoom = (p.zoom ?? 100) / 100;

    /** 分子坐标 → 屏幕坐标，自转绕分子中心。 */
    const P = (s: AtomSite): Vec2 => {
      const x = s.x * Math.cos(spin) - s.y * Math.sin(spin);
      const y = s.x * Math.sin(spin) + s.y * Math.cos(spin);
      return [CX + x * SC * zoom, CY - y * SC * zoom];
    };

    const R = (s: AtomSite) => (EL_SIZE[s.el] ?? 32) * (s.scale ?? 1) * (0.55 + 0.45 * zoom);

    // --- the bonds first, so the atoms sit on top of them -----------------------------
    if (on("bonds")) {
      spec.bonds.forEach((b, bi) => {
        const A = P(spec.sites[b.a]);
        const B = P(spec.sites[b.b]);
        const n = b.order ?? 1;
        // multiple bonds drawn as parallel lines at right angles to the bond
        const nx = -(B[1] - A[1]);
        const ny = B[0] - A[0];
        const m = Math.hypot(nx, ny) || 1;
        for (let k = 0; k < n; k++) {
          const off = (k - (n - 1) / 2) * 9;
          const d: Vec2 = [(nx / m) * off, (ny / m) * off];
          items.push({
            key: `bond:${bi}:${k}`, reveal: "bonds", layer: 3, kind: "line",
            from: [A[0] + d[0], A[1] + d[1]], to: [B[0] + d[0], B[1] + d[1]],
            stroke: ink, width: n > 1 ? 4 : 5.5,
          });
        }
      });
    }

    // --- shared electron pairs, sitting on each bond -----------------------------------
    if (on("shared")) {
      spec.bonds.forEach((b, bi) => {
        const A = P(spec.sites[b.a]);
        const B = P(spec.sites[b.b]);
        const n = b.order ?? 1;
        const ux = (B[0] - A[0]) / (Math.hypot(B[0] - A[0], B[1] - A[1]) || 1);
        const uy = (B[1] - A[1]) / (Math.hypot(B[0] - A[0], B[1] - A[1]) || 1);
        // one pair per bond order, placed along the bond, offset to its side
        for (let k = 0; k < n; k++) {
          const t = 0.42 + k * 0.16;
          const px = -uy * (n > 1 ? 13 : 0);
          const py = ux * (n > 1 ? 13 : 0);
          items.push({
            key: `pair:${bi}:${k}:a`, reveal: "shared", layer: 5, kind: "circle",
            c: [A[0] + (B[0] - A[0]) * t + px - 5, A[1] + (B[1] - A[1]) * t + py], r: 5.2, fill: green, stroke: "none",
          });
          items.push({
            key: `pair:${bi}:${k}:b`, reveal: "shared", layer: 5, kind: "circle",
            c: [A[0] + (B[0] - A[0]) * t + px + 5, A[1] + (B[1] - A[1]) * t + py], r: 5.2, fill: green, stroke: "none",
          });
        }
      });
    }

    // --- lone pairs ---------------------------------------------------------------------
    if (on("lone")) {
      spec.sites.forEach((s, si) => {
        const at = P(s);
        const rr = R(s);
        (s.loneAngles ?? []).forEach((deg, li) => {
          const a = RAD(deg) - spin;
          const px = at[0] + Math.cos(a) * (rr + 22);
          const py = at[1] - Math.sin(a) * (rr + 22);
          items.push(
            { key: `lone:${si}:${li}:a`, reveal: "lone", layer: 5, kind: "circle", c: [px - 5, py], r: 5.2, fill: violet, stroke: "none" },
            { key: `lone:${si}:${li}:b`, reveal: "lone", layer: 5, kind: "circle", c: [px + 5, py], r: 5.2, fill: violet, stroke: "none" },
          );
        });
      });
    }

    // --- the atoms ------------------------------------------------------------------------
    if (on("balls")) {
      spec.sites.forEach((s, si) => {
        const at = P(s);
        const rr = R(s);
        items.push({
          key: `a:${si}`, reveal: "balls", layer: 6, kind: "circle",
          c: at, r: rr, fill: EL_COLOR[s.el] ?? "#E2DDD3", fillOpacity: s.el === "H" ? 0.95 : 0.85,
          stroke: ink, width: s.el === "H" ? 2.2 : 3,
        });
        items.push({
          key: `a:lab:${si}`, reveal: "balls", layer: 7, kind: "text",
          at: [at[0], at[1] + 1], text: s.el, size: rr * 0.92, bold: true,
          color: ["H", "C", "N"].includes(s.el) && s.el === "C" ? "#FFFFFF" : ink,
        });
      });
    }

    // --- bond angle --------------------------------------------------------------------------
    if (on("angle") && spec.angle) {
      const [v, i1, i2, label] = spec.angle;
      const V = P(spec.sites[v]);
      const P1 = P(spec.sites[i1]);
      const P2 = P(spec.sites[i2]);
      const a1 = Math.atan2(P1[1] - V[1], P1[0] - V[0]);
      const a2 = Math.atan2(P2[1] - V[1], P2[0] - V[0]);
      let d = a2 - a1;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      const rArc = 54;
      const s1: Vec2 = [V[0] + rArc * Math.cos(a1), V[1] + rArc * Math.sin(a1)];
      const s2: Vec2 = [V[0] + rArc * Math.cos(a2), V[1] + rArc * Math.sin(a2)];
      items.push({
        key: "ang:arc", reveal: "angle", layer: 5, kind: "path",
        d: `M ${s1[0].toFixed(1)} ${s1[1].toFixed(1)} A ${rArc} ${rArc} 0 0 ${d > 0 ? 1 : 0} ${s2[0].toFixed(1)} ${s2[1].toFixed(1)}`,
        stroke: green, width: 2.8, fill: "none",
      });
      const am = (a1 + a2) / 2;
      items.push({
        key: "ang:lab", reveal: "angle", layer: 8, kind: "text",
        at: [V[0] + Math.cos(am) * (rArc + 40), V[1] + Math.sin(am) * (rArc + 40)],
        text: label, size: 27, bold: true, color: green,
      });
    }

    // --- polarity: partial charges and the direction they pull ---------------------------------
    if (on("polar")) {
      spec.sites.forEach((s, si) => {
        if (!s.delta) return;
        const at = P(s);
        const rr = R(s);
        const up = s.delta === "+" ? -1 : 1;
        items.push({
          key: `d:${si}`, reveal: "polar", layer: 8, kind: "text",
          at: [at[0] + rr + 26, at[1] + up * (rr + 26)],
          text: `δ${s.delta}`, size: 25, bold: true, color: s.delta === "+" ? red : blue,
        });
      });
      // the molecular dipole: toward the electron-hungry end
      const neg = spec.sites.find((s) => s.delta === "-");
      const pos = spec.sites.find((s) => s.delta === "+");
      if (neg && pos) {
        const N = P(neg);
        const O = P(pos);
        items.push({
          key: "polar:arr", reveal: "polar", layer: 4, kind: "arrow",
          from: [O[0], O[1] - 74], to: [N[0], N[1] - 74], stroke: blue, width: 2.8, head: 12, dash: "1 0",
        });
        items.push({
          key: "polar:lab", reveal: "polar", layer: 8, kind: "text",
          at: [(O[0] + N[0]) / 2, O[1] - 104], text: "偶极方向", size: 22, color: blue,
        });
      }
    }

    // --- ionic bonding: the electron changing hands ----------------------------------------------
    if (on("ionic") && spec.transfer) {
      const [i0, i1] = spec.transfer;
      const S0 = P(spec.sites[i0]);
      const S1 = P(spec.sites[i1]);
      const r0 = R(spec.sites[i0]);
      const r1 = R(spec.sites[i1]);
      items.push(
        { key: "ion:e", reveal: "ionic", layer: 6, kind: "circle", c: [(S0[0] + S1[0]) / 2, S0[1] - r0 - 46], r: 7, fill: green, stroke: "#FFFFFF", width: 2 },
        {
          key: "ion:arrow", reveal: "ionic", layer: 5, kind: "arrow",
          from: [S0[0] + r0 * 0.7, S0[1] - r0 * 0.7], to: [S1[0] - r1 * 0.7 - 6, S1[1] - r1 * 0.7],
          stroke: green, width: 3.4, head: 13,
        },
        {
          key: "ion:lab", reveal: "ionic", layer: 8, kind: "text",
          at: [(S0[0] + S1[0]) / 2, S0[1] - r0 - 78], text: "电子转移", size: 24, bold: true, color: green,
        },
        {
          key: "ion:static", reveal: "ionic", layer: 2, kind: "line",
          from: [S0[0] + r0, S0[1] + r0 + 34], to: [S1[0] - r1, S1[1] + r1 + 34], stroke: violet, width: 2.4, dash: "6 5",
        },
        {
          key: "ion:static:lab", reveal: "ionic", layer: 8, kind: "text",
          at: [(S0[0] + S1[0]) / 2, S0[1] + r0 + 62], text: "静电作用（阴阳离子相互吸引）", size: 23, color: violet,
        },
      );
      spec.sites.forEach((s, si) => {
        if (!s.charge) return;
        const at = P(s);
        const rr = R(s);
        items.push({
          key: `ion:q:${si}`, reveal: "ionic", layer: 8, kind: "text",
          at: [at[0] + rr + 24, at[1] - rr - 12],
          text: `${s.el}${Math.abs(s.charge)}${s.charge > 0 ? "⁺" : "⁻"}`,
          size: 27, bold: true, color: s.charge > 0 ? red : blue,
        });
      });
    }

    // --- labels ---------------------------------------------------------------------------------------
    if (on("label")) {
      items.push(
        {
          key: "lab:formula", reveal: "label", layer: 8, kind: "text",
          at: [858, 128], text: spec.formula, size: 40, bold: true, color: ink,
        },
        {
          key: "lab:name", reveal: "label", layer: 8, kind: "text",
          at: [858, 180], text: spec.name, size: 27, color: inkMuted,
        },
      );
      if (spec.note) {
        items.push({
          key: "lab:note", reveal: "label", layer: 8, kind: "text",
          at: [858, 620], text: spec.note, size: 24, color: green,
        });
      }
    }

    return { width: WIDTH, height: HEIGHT, items };
  };

  figure.defaults = { balls: 1, bonds: 1 };
  figure.continuous = ["spin", "zoom"];
  return figure;
};
