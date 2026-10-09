import React from "react";
import { cuboidFigure, onEdge, V, type P3 } from "../framework/builders/cuboid";
import { Key, Say, type PanelLine } from "../framework/Panel";
import { M, Nm, Tup, Vec, Vv } from "../framework/Math";
import { amber, blue, green, ink, inkMuted, violet } from "../framework/theme";
import { registerContent } from "../framework/registry";
import type { Content } from "../framework/types";

/**
 * 长方体 ABCD-A₁B₁C₁D₁，AA₁ = AD = 1，E 为 CD 中点。
 * (1) 证 B₁E ⊥ AD₁   (2) 棱 AA₁ 上是否存在 P 使 DP ∥ 平面 B₁AE
 *
 * Note what is NOT here: a single frame number. Durations come from how many
 * lines a step has, and the figure glides from one step's params to the next.
 */

const A: P3 = V.A;

/** The auxiliary line that makes a skew-line perpendicular visible. */
const parallelThroughMidpoint = (p: Record<string, number>): [P3, P3] => {
  const du: P3 = [V.B1[0] - V.E[0], V.B1[1] - V.E[1], V.B1[2] - V.E[2]];
  const len = Math.hypot(du[0], du[1], du[2]) || 1;
  const m: P3 = [0, 0.5, 0.5];
  const k = 0.3;
  return [
    [m[0] - (du[0] / len) * k, m[1] - (du[1] / len) * k, m[2] - (du[2] / len) * k],
    [m[0] + (du[0] / len) * k, m[1] + (du[1] / len) * k, m[2] + (du[2] / len) * k],
  ];
};

const figure = cuboidFigure({
  aux: {
    AD1: { from: V.A, to: V.D1, stroke: amber, width: 4, dash: "11 8" },
    B1E: { from: V.B1, to: V.E, stroke: blue, width: 4 },
    AB1: { from: V.A, to: V.B1, stroke: violet, width: 3.2 },
    AE: { from: V.A, to: V.E, stroke: violet, width: 3.2 },
    CD: { from: V.C, to: V.D, stroke: "#0EA5E9", width: 3.4 },
    parallel: { from: parallelThroughMidpoint({})[0], to: parallelThroughMidpoint({})[1], stroke: "#334155", width: 2.8 },
  },
  patches: {
    B1AE: { points: [V.A, V.B1, V.E], color: violet },
  },
  rightAngles: [
    // At AD₁'s midpoint, between AD₁ and the parallel to B₁E running through it.
    {
      key: "AD1-parallel",
      at: [0, 0.5, 0.5],
      along: [0, 1, 1],
      across: parallelThroughMidpoint({})[0],
      size: 20,
    },
  ],
});

const content: Content = {
  id: "cuboid-perpendicular",
  series: "立体几何 · 空间向量法",
  title: "长方体中的垂直与平行",
  figure,

  statement: [
    {
      mark: "题",
      node: (
        <Say size={27}>
          在长方体{" "}
          <M size={30} color={ink}>
            <Nm>A</Nm><Nm>B</Nm><Nm>C</Nm><Nm>D</Nm>
            <span style={{ margin: "0 6px" }}>−</span>
            <Nm sub="1">A</Nm><Nm sub="1">B</Nm><Nm sub="1">C</Nm><Nm sub="1">D</Nm>
          </M>{" "}
          中，<M size={30} color={ink}><Nm>A</Nm><Nm sub="1">A</Nm> = <Nm>D</Nm><Nm>A</Nm> = 1</M>
          <br />
          <Key tone={blue}>E 为 CD 的中点</Key>。
        </Say>
      ),
    },
    {
      mark: "(1)",
      tone: amber,
      node: (
        <Say size={27}>
          求证 <M size={31} color={amber}><Nm sub="1">B</Nm><Nm>E</Nm> ⊥ <Nm>A</Nm><Nm sub="1">D</Nm></M>
        </Say>
      ),
    },
    {
      mark: "(2)",
      tone: green,
      node: (
        <Say size={26}>
          棱 <M size={29}><Nm>A</Nm><Nm sub="1">A</Nm></M> 上是否存在一点 <M size={29} color={green}><Nm>P</Nm></M>，使得{" "}
          <M size={29} color={green}><Nm>D</Nm><Nm>P</Nm> ∥ 平面 <Nm sub="1">B</Nm><Nm>A</Nm><Nm>E</Nm></M>？若存在求{" "}
          <M size={29}><Nm>A</Nm><Nm>P</Nm></M> 的长。
        </Say>
      ),
    },
  ],

  chapters: [
    {
      id: "setup",
      label: "建系",
      steps: [
        {
          id: "axes",
          heading: "以 A 为原点，建立空间直角坐标系",
          params: { box: 1, hidden: 1, axes: 1 },
          lines: [
            {
              mark: "1",
              node: (
                <Say size={27}>
                  以 <M size={29} color={blue}><Nm>A</Nm></M> 为原点，分别以{" "}
                  <M size={29}><Nm>A</Nm><Nm>B</Nm></M>、<M size={29}><Nm>A</Nm><Nm>D</Nm></M>、
                  <M size={29}><Nm>A</Nm><Nm sub="1">A</Nm></M> 所在直线为 <M size={29}><Vv>x</Vv></M>、
                  <M size={29}><Vv>y</Vv></M>、<M size={29}><Vv>z</Vv></M> 轴
                </Say>
              ),
            },
            { mark: "2", node: <Say size={27}>长方体保证三轴两两垂直 —— 这正是能用坐标的前提</Say> },
            {
              mark: "3",
              node: (
                <Say size={27}>
                  设 <M size={29}><Nm>A</Nm><Nm>B</Nm> = <Vv>a</Vv></M>，其中 <M size={29}><Vv>a</Vv> &gt; 0</M>
                </Say>
              ),
            },
          ],
        },
        {
          id: "coords",
          eyebrow: "第二步",
          heading: "写出各顶点的坐标",
          params: { axes: 0 },
          lines: [
            {
              mark: "4",
              node: (
                <Say size={26}>
                  已知 <M size={28}><Nm>A</Nm><Nm>D</Nm> = 1</M>、<M size={28}><Nm>A</Nm><Nm sub="1">A</Nm> = 1</M>，底面四点立刻可得
                </Say>
              ),
            },
            {
              mark: "·",
              node: (
                <M size={30} color={ink}>
                  <span style={{ display: "block" }}>
                    <Nm>A</Nm><Tup>0, 0, 0</Tup>　<Nm>B</Nm><Tup><Vv>a</Vv>, 0, 0</Tup>
                  </span>
                  <span style={{ display: "block" }}>
                    <Nm>D</Nm><Tup>0, 1, 0</Tup>　<Nm>C</Nm><Tup><Vv>a</Vv>, 1, 0</Tup>
                  </span>
                </M>
              ),
            },
            { mark: "5", gap: 6, node: <Say size={27}><Key tone={blue}>E 是 CD 的中点</Key>，由中点坐标公式</Say> },
            {
              mark: "E",
              emphasis: true,
              node: <M size={37} color={blue}><Nm>E</Nm> = <Tup><Vv>a</Vv>/2, 1, 0</Tup></M>,
            },
          ],
        },
      ],
    },

    {
      id: "prove",
      label: "证垂直",
      steps: [
        {
          id: "eb1",
          eyebrow: "证垂直 · 第 1 步",
          heading: "先求向量 B₁E",
          params: { "aux:CD": 1 },
          lines: [
            { mark: "①", node: <Say size={27}>向量一律<b style={{ color: ink }}>末坐标减起坐标</b></Say> },
            {
              mark: "1",
              gap: 10,
              node: <M size={33} color={ink}><Vec><Nm>E</Nm><Nm sub="1">B</Nm></Vec> = <Nm sub="1">B</Nm> − <Nm>E</Nm></M>,
            },
            { mark: "2", node: <M size={33} color={ink}>= <Tup><Vv>a</Vv> − <Vv>a</Vv>/2, 0 − 1, 1 − 0</Tup></M> },
            { mark: "3", emphasis: true, node: <M size={37} color={blue}>= <Tup><Vv>a</Vv>/2, −1, 1</Tup></M> },
          ],
        },
        {
          id: "ad1",
          eyebrow: "证垂直 · 第 2 步",
          heading: "再求向量 AD₁，并算数量积",
          params: { "aux:CD": 0, "aux:B1E": 1, "aux:AD1": 1 },
          lines: [
            {
              mark: "4",
              node: (
                <Say size={26}>
                  <M size={28} color={amber}><Nm>A</Nm><Nm sub="1">D</Nm></M> 是侧面{" "}
                  <M size={28} color={amber}><Nm>A</Nm><Nm>D</Nm><Nm sub="1">D</Nm><Nm sub="1">A</Nm></M> 的对角线
                </Say>
              ),
            },
            {
              mark: "5",
              gap: 8,
              node: <M size={33} color={ink}><Vec><Nm>A</Nm><Nm sub="1">D</Nm></Vec> = <Nm sub="1">D</Nm> − <Nm>A</Nm> = <Tup>0, 1, 1</Tup></M>,
            },
            {
              mark: "6",
              gap: 12,
              node: (
                <M size={32} color={ink}>
                  <Vec><Nm>E</Nm><Nm sub="1">B</Nm></Vec> · <Vec><Nm>A</Nm><Nm sub="1">D</Nm></Vec>
                  {" = "}<Vv>a</Vv>/2 · 0 + (−1) · 1 + 1 · 1
                </M>
              ),
            },
            { mark: "7", emphasis: true, node: <M size={37} color={amber}>= 0 − 1 + 1 = 0</M> },
          ],
        },
        {
          id: "conclude",
          eyebrow: "证垂直 · 第 3 步",
          heading: "数量积为零，即得垂直",
          hold: 56,
          params: { "aux:parallel": 1 },
          lines: [
            { mark: "✓", emphasis: true, node: <M size={37} color={amber}><Nm sub="1">B</Nm><Nm>E</Nm> ⊥ <Nm>A</Nm><Nm sub="1">D</Nm></M> },
            {
              mark: "·",
              gap: 14,
              node: (
                <Say size={25}>
                  两条线是<b style={{ color: ink }}>异面</b>的，并不相交。图上画的是过{" "}
                  <M size={27} color={ink}><Nm>A</Nm><Nm sub="1">D</Nm></M>{" "}
                  <b style={{ color: ink }}>中点作 B₁E 的平行线</b>，直角就落在那里。
                </Say>
              ),
            },
            {
              mark: "★",
              gap: 10,
              node: (
                <Say size={25}>
                  整个点积里<b style={{ color: ink }}>没有出现 </b>
                  <M size={28} color={ink}><Vv>a</Vv></M>
                  <b style={{ color: ink }}>，</b>说明结论与棱长{" "}
                  <M size={28}><Nm>A</Nm><Nm>B</Nm></M> <b style={{ color: amber }}>无关</b>。
                </Say>
              ),
            },
          ],
        },
      ],
    },

    {
      id: "point",
      label: "设点",
      steps: [
        {
          id: "setp",
          eyebrow: "第二问 · 设点",
          heading: "把点 P 的位置用一个参数表示",
          params: { k: 0 },
          lines: [
            {
              mark: "1",
              node: (
                <Say size={26}>
                  设 <M size={28} color={green}><Nm>P</Nm></M> 在线段 <M size={28}><Nm>A</Nm><Nm sub="1">A</Nm></M> 上，令{" "}
                  <M size={28} color={green}><Nm>A</Nm><Nm>P</Nm> = <Vv>t</Vv></M>，则 <M size={28}>0 ≤ <Vv>t</Vv> ≤ 1</M>
                </Say>
              ),
            },
            {
              mark: "2",
              gap: 8,
              node: (
                <M size={32} color={ink}>
                  <Nm>P</Nm> = <Tup>0, 0, <Vv>t</Vv></Tup>，　
                  <Vec><Nm>D</Nm><Nm>P</Nm></Vec> = <Nm>P</Nm> − <Nm>D</Nm> = <Tup>0, −1, <Vv>t</Vv></Tup>
                </M>
              ),
            },
            {
              mark: "3",
              gap: 12,
              node: (
                <Say size={25}>
                  于是问题变成：<b style={{ color: ink }}>DP ∥ 平面 B₁AE</b>{" "}
                  <b style={{ color: ink }}>等价于</b>{" "}
                  <M size={28} color={green}><Vec><Nm>D</Nm><Nm>P</Nm></Vec> ⊥ 该平面的法向量</M>
                </Say>
              ),
            },
          ],
        },
        {
          id: "normal",
          eyebrow: "第二问 · 法向量",
          heading: "求平面 B₁AE 的一个法向量",
          hold: 46,
          params: { "patch:B1AE": 1, "aux:AB1": 1, "aux:AE": 1, k: 1 },
          lines: [
            {
              mark: "1",
              node: (
                <Say size={26}>
                  平面内取两个不共线向量{" "}
                  <M size={29} color={violet}><Vec><Nm>A</Nm><Nm sub="1">B</Nm></Vec></M> 与{" "}
                  <M size={29} color={violet}><Vec><Nm>A</Nm><Nm>E</Nm></Vec></M>
                </Say>
              ),
            },
            {
              mark: "2",
              gap: 6,
              node: (
                <M size={31} color={ink}>
                  <span style={{ display: "block" }}>
                    <Vec><Nm>A</Nm><Nm sub="1">B</Nm></Vec> = <Tup><Vv>a</Vv>, 0, 1</Tup>
                  </span>
                  <span style={{ display: "block" }}>
                    <Vec><Nm>A</Nm><Nm>E</Nm></Vec> = <Tup><Vv>a</Vv>/2, 1, 0</Tup>
                  </span>
                </M>
              ),
            },
            {
              mark: "3",
              gap: 12,
              node: (
                <M size={31} color={ink}>
                  <Vec><Nm>n</Nm></Vec> = <Vec><Nm>A</Nm><Nm sub="1">B</Nm></Vec> × <Vec><Nm>A</Nm><Nm>E</Nm></Vec> ={" "}
                  <b style={{ fontSize: "1.6em" }}>|</b>
                  <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "middle", margin: "0 6px", lineHeight: 1.2 }}>
                    <span style={{ width: 126, borderTop: `2.5px solid ${ink}`, paddingTop: 4 }} />
                    <span style={{ display: "flex", gap: 16, paddingTop: 6 }}>
                      <M size={29}><Vv>a</Vv></M><M size={29}>0</M><M size={29}>1</M>
                    </span>
                    <span style={{ display: "flex", gap: 16, paddingTop: 4 }}>
                      <M size={29}><Vv>a</Vv>/2</M><M size={29}>1</M><M size={29}>0</M>
                    </span>
                    <span style={{ width: 126, borderTop: `2.5px solid ${ink}` }} />
                  </span>
                </M>
              ),
            },
            { mark: "4", emphasis: true, gap: 10, node: <M size={35} color={violet}><Vec><Nm>n</Nm></Vec> = <Tup>−1, <Vv>a</Vv>/2, <Vv>a</Vv></Tup></M> },
          ],
        },
      ],
    },

    {
      id: "solve",
      label: "解方程",
      steps: [
        {
          id: "dot",
          eyebrow: "第二问 · 解方程",
          heading: "令 DP 与 n 的数量积为零",
          params: { k: 1 },
          lines: [
            {
              mark: "1",
              node: (
                <M size={32} color={ink}>
                  <Vec><Nm>D</Nm><Nm>P</Nm></Vec> · <Vec><Nm>n</Nm></Vec> ={" "}
                  <Tup>0, −1, <Vv>t</Vv></Tup> · <Tup>−1, <Vv>a</Vv>/2, <Vv>a</Vv></Tup>
                </M>
              ),
            },
            { mark: "2", gap: 8, node: <M size={32} color={ink}>= 0 · (−1) + (−1) · <Vv>a</Vv>/2 + <Vv>t</Vv> · <Vv>a</Vv></M> },
            { mark: "3", gap: 8, node: <M size={32} color={ink}>= −<Vv>a</Vv>/2 + <Vv>a</Vv><Vv>t</Vv> = 0</M> },
            { mark: "4", emphasis: true, gap: 16, node: <M size={36} color={green}>因为 <Vv>a</Vv> &gt; 0，所以 <Vv>t</Vv> = 1/2</M> },
          ],
        },
        {
          id: "verify",
          eyebrow: "第二问 · 验证",
          heading: "别忘了确认这两件事",
          hold: 46,
          params: { k: 2 },
          lines: [
            {
              mark: "①",
              node: (
                <Say size={25}>
                  点在线段上：<M size={29} color={green}>0 &lt; 1/2 &lt; 1</M>，所以 <M size={29} color={green}><Nm>P</Nm></M>{" "}
                  <b style={{ color: ink }}>确实落在棱 AA₁ 之内</b>。
                </Say>
              ),
            },
            {
              mark: "②",
              gap: 18,
              node: (
                <Say size={25}>
                  直线不在平面内：该平面的方程为{" "}
                  <M size={28} color={violet}>−<Vv>x</Vv> + <Vv>a</Vv>/2 · <Vv>y</Vv> + <Vv>a</Vv><Vv>z</Vv> = 0</M>
                </Say>
              ),
            },
            {
              mark: "·",
              node: (
                <Say size={25}>
                  把 <M size={28} color={ink}><Nm>D</Nm><Tup>0, 1, 0</Tup></M> 代入，得{" "}
                  <M size={28} color={ink}><Vv>a</Vv>/2 ≠ 0</M>，故 D <b style={{ color: ink }}>不在</b>该平面内
                </Say>
              ),
            },
            {
              mark: "✓",
              emphasis: true,
              gap: 16,
              node: (
                <Say size={26}>
                  方向垂直且不在平面内 ⟹ <M size={31} color={green}><Nm>D</Nm><Nm>P</Nm> ∥ 平面 <Nm sub="1">B</Nm><Nm>A</Nm><Nm>E</Nm></M> 成立
                </Say>
              ),
            },
          ],
        },
      ],
    },
  ],

  outroHeading: "两问都成立",
  outro: [
    {
      mark: "(1)",
      tone: amber,
      node: (
        <Say size={26}>
          数量积为零，故 <M size={29} color={amber}><Nm sub="1">B</Nm><Nm>E</Nm> ⊥ <Nm>A</Nm><Nm sub="1">D</Nm></M>。
          整个计算里没有出现 <M size={29}><Vv>a</Vv></M>，与棱长无关。
        </Say>
      ),
    },
    {
      mark: "(2)",
      tone: green,
      node: (
        <Say size={26}>
          <Key tone={green}>存在</Key>，且 <M size={29} color={green}><Nm>P</Nm></M> 是{" "}
          <M size={29}><Nm>A</Nm><Nm sub="1">A</Nm></M> 的中点，所以 <M size={33} color={green}><Nm>A</Nm><Nm>P</Nm> = 1/2</M>。
        </Say>
      ),
    },
  ],
};

registerContent(content);
export default content;