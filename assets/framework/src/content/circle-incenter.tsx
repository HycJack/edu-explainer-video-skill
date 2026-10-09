import React from "react";
import { circleIncenterFigure } from "../framework/builders/circle";
import { Key, Say } from "../framework/Panel";
import { M, Nm, Vv } from "../framework/Math";
import { amber, blue, green, ink, violet } from "../framework/theme";
import { registerContent } from "../framework/registry";
import type { Content } from "../framework/types";

/**
 * ⊙O 是 △ABC 的外接圆，E 是内心，AE 的延长线交 BC 于 F、交 ⊙O 于 D。
 * (1) 求证 DB = DE；(2) AE = 3, DF = 4，求 DB。
 *
 * 答案链：内心给出两组半角 → 外角 + 同弧等角拼出 ∠DBE = ∠BED → 等角对等边；
 * 再用 △DBF ∽ △DAB 得 DB² = DA·DF，而 DA = AE + DE = 3 + x，
 * 解 x² = 4(3+x) 得 x = 6。
 */

const figure = circleIncenterFigure();

const content: Content = {
  id: "circle-incenter",
  series: "圆 · 内心与弧中点",
  title: "内心、延长线与 DB = DE",
  figure,

  statement: [
    {
      mark: "题",
      node: (
        <Say size={26}>
          如图，<M size={30} color={ink}>⊙<Nm>O</Nm></M> 是 <M size={30}>△<Nm>A</Nm><Nm>B</Nm><Nm>C</Nm></M> 的外接圆，
          点 <M size={30} color={amber}><Nm>E</Nm></M> 是 <M size={30}>△<Nm>A</Nm><Nm>B</Nm><Nm>C</Nm></M> 的内心，
          <M size={30} color={amber}><Nm>A</Nm><Nm>E</Nm></M> 的延长线交 <M size={30}><Nm>B</Nm><Nm>C</Nm></M> 于点 <M size={30}><Nm>F</Nm></M>，
          交 <M size={30}>⊙<Nm>O</Nm></M> 于点 <M size={30} color={amber}><Nm>D</Nm></M>，连接 <M size={30}><Nm>B</Nm><Nm>D</Nm></M>、<M size={30}><Nm>B</Nm><Nm>E</Nm></M>。
        </Say>
      ),
    },
    {
      mark: "问",
      emphasis: true,
      node: (
        <Say size={27}>
          (1) 求证：<M size={31} color={green}><Nm>D</Nm><Nm>B</Nm> = <Nm>D</Nm><Nm>E</Nm></M>；
          &nbsp;(2) 若 <M size={31}><Nm>A</Nm><Nm>E</Nm> = 3</M>，<M size={31}><Nm>D</Nm><Nm>F</Nm> = 4</M>，求 <M size={31} color={green}><Nm>D</Nm><Nm>B</Nm></M> 的长。
        </Say>
      ),
    },
  ],

  chapters: [
    {
      id: "read",
      label: "审图",
      steps: [
        {
          id: "setup",
          heading: "外接圆与三角形",
          hold: 36,
          lines: [
            {
              mark: "1",
              node: (
                <Say size={26}>
                  <M size={28}>⊙<Nm>O</Nm></M> 是 <M size={28}>△<Nm>A</Nm><Nm>B</Nm><Nm>C</Nm></M> 的外接圆：
                  三个顶点都在圆上，圆心 <M size={28}><Nm>O</Nm></M> 在三角形内部。
                </Say>
              ),
            },
            {
              mark: "2",
              gap: 6,
              node: (
                <Say size={26}>
                  注意题目的关键角色 —— <Key tone={amber}>内心 <M size={28}><Nm>E</Nm></M></Key>：
                  三条角平分线的交点。
                </Say>
              ),
            },
          ],
        },
        {
          id: "bisect",
          heading: "内心给出两组相等的角",
          params: { e: 1, angA: 1, angB: 1, be: 1 },
          lines: [
            {
              mark: "1",
              node: (
                <Say size={26}>
                  <M size={28} color={amber}><Nm>A</Nm><Nm>E</Nm></M> 平分 ∠<Nm>B</Nm><Nm>A</Nm><Nm>C</Nm>，
                  <M size={28} color={amber}><Nm>B</Nm><Nm>E</Nm></M> 平分 ∠<Nm>A</Nm><Nm>B</Nm><Nm>C</Nm>。
                </Say>
              ),
            },
            {
              mark: "2",
              gap: 6,
              node: (
                <M size={30} color={amber}>
                  ∠<Nm>B</Nm><Nm>A</Nm><Nm>E</Nm> = ∠<Nm>E</Nm><Nm>A</Nm><Nm>C</Nm> = ½∠<Nm>A</Nm>，
                  &nbsp;∠<Nm>A</Nm><Nm>B</Nm><Nm>E</Nm> = ∠<Nm>E</Nm><Nm>B</Nm><Nm>C</Nm> = ½∠<Nm>B</Nm>
                </M>
              ),
            },
          ],
        },
        {
          id: "extend",
          heading: "延长 AE，得到 F 与 D",
          params: { ed: 1, f: 1, d: 1, bd: 1 },
          hold: 36,
          lines: [
            {
              mark: "1",
              node: (
                <Say size={26}>
                  <M size={28} color={amber}><Nm>A</Nm><Nm>E</Nm></M> 的延长线交 <M size={28}><Nm>B</Nm><Nm>C</Nm></M> 于{" "}
                  <M size={28}><Nm>F</Nm></M>，交外接圆于 <M size={28} color={amber}><Nm>D</Nm></M> ——
                  于是 <M size={28}>∠<Nm>B</Nm><Nm>A</Nm><Nm>E</Nm></M> 也可以写成 ∠<Nm>B</Nm><Nm>A</Nm><Nm>D</Nm>。
                </Say>
              ),
            },
            {
              mark: "2",
              gap: 6,
              node: (
                <Say size={26}>
                  连接 <M size={28}><Nm>B</Nm><Nm>D</Nm></M>。<Key tone={violet}>要证 <M size={28} color={green}><Nm>D</Nm><Nm>B</Nm> = <Nm>D</Nm><Nm>E</Nm></M>，就盯着 △<Nm>B</Nm><Nm>D</Nm><Nm>E</Nm> 的两个底角。</Key>
                </Say>
              ),
            },
          ],
        },
      ],
    },

    {
      id: "why",
      label: "证 DB = DE",
      steps: [
        {
          id: "exterior",
          eyebrow: "第一问 · 第 1 步",
          heading: "∠BED 是 △ABE 的外角",
          params: { angBED: 1 },
          lines: [
            {
              mark: "1",
              node: (
                <Say size={26}>
                  <M size={28}><Nm>A</Nm>、<Nm>E</Nm>、<Nm>D</Nm></M> 共线，
                  <M size={28} color={green}>∠<Nm>B</Nm><Nm>E</Nm><Nm>D</Nm></M> 是 △<Nm>A</Nm><Nm>B</Nm><Nm>E</Nm> 的外角：
                </Say>
              ),
            },
            {
              mark: "2",
              gap: 8,
              node: (
                <M size={31}>
                  ∠<Nm>B</Nm><Nm>E</Nm><Nm>D</Nm> = ∠<Nm>B</Nm><Nm>A</Nm><Nm>E</Nm> + ∠<Nm>A</Nm><Nm>B</Nm><Nm>E</Nm> = <span style={{ color: amber }}>½∠<Nm>A</Nm> + ½∠<Nm>B</Nm></span>
                </M>
              ),
            },
          ],
        },
        {
          id: "inscribed",
          eyebrow: "第一问 · 第 2 步",
          heading: "∠DBE 拆成两段，恰好相同",
          params: { angDBE: 1 },
          hold: 44,
          lines: [
            {
              mark: "1",
              node: (
                <Say size={26}>
                  在 <M size={28}><Nm>B</Nm></M> 处借 <M size={28}><Nm>B</Nm><Nm>C</Nm></M> 拆开：
                  <M size={28}>∠<Nm>D</Nm><Nm>B</Nm><Nm>E</Nm> = ∠<Nm>D</Nm><Nm>B</Nm><Nm>C</Nm> + ∠<Nm>C</Nm><Nm>B</Nm><Nm>E</Nm></M>
                </Say>
              ),
            },
            {
              mark: "2",
              gap: 6,
              node: (
                <Say size={26}>
                  <Key tone={blue}>同弧等角</Key>：∠<Nm>D</Nm><Nm>B</Nm><Nm>C</Nm> 与 ∠<Nm>D</Nm><Nm>A</Nm><Nm>C</Nm> 同对{" "}
                  <M size={28}>弧 <Nm>D</Nm><Nm>C</Nm></M>，都等于 <M size={28} color={amber}>½∠<Nm>A</Nm></M>；而 ∠<Nm>C</Nm><Nm>B</Nm><Nm>E</Nm> = ½∠<Nm>B</Nm>。
                </Say>
              ),
            },
            {
              mark: "3",
              gap: 8,
              node: (
                <M size={31} color={green}>
                  ∠<Nm>D</Nm><Nm>B</Nm><Nm>E</Nm> = ½∠<Nm>A</Nm> + ½∠<Nm>B</Nm> = ∠<Nm>B</Nm><Nm>E</Nm><Nm>D</Nm>
                </M>
              ),
            },
            {
              mark: "✓",
              emphasis: true,
              gap: 10,
              node: (
                <Say size={27} tone={green}>
                  等角对等边：<M size={31} color={green}><Nm>D</Nm><Nm>B</Nm> = <Nm>D</Nm><Nm>E</Nm></M>。
                </Say>
              ),
            },
          ],
        },
      ],
    },

    {
      id: "compute",
      label: "求 DB",
      steps: [
        {
          id: "similar",
          eyebrow: "第二问 · 第 1 步",
          heading: "△DBF ∽ △DAB",
          params: { patchF: 1, patchA: 1 },
          lines: [
            {
              mark: "1",
              node: (
                <Say size={26}>
                  公共角 <M size={28}>∠<Nm>B</Nm><Nm>D</Nm><Nm>F</Nm> = ∠<Nm>B</Nm><Nm>D</Nm><Nm>A</Nm></M>；
                  再看 <M size={28} color={violet}>∠<Nm>D</Nm><Nm>B</Nm><Nm>F</Nm></M> 与 <M size={28} color={blue}>∠<Nm>D</Nm><Nm>A</Nm><Nm>B</Nm></M>。
                </Say>
              ),
            },
            {
              mark: "2",
              gap: 6,
              node: (
                <Say size={26}>
                  <M size={28}>∠<Nm>D</Nm><Nm>B</Nm><Nm>F</Nm> = ∠<Nm>D</Nm><Nm>B</Nm><Nm>C</Nm> = ∠<Nm>D</Nm><Nm>A</Nm><Nm>C</Nm> = ½∠<Nm>A</Nm></M>，
                  <M size={28}>∠<Nm>D</Nm><Nm>A</Nm><Nm>B</Nm> = ∠<Nm>B</Nm><Nm>A</Nm><Nm>E</Nm> = ½∠<Nm>A</Nm></M> —— 相等。
                </Say>
              ),
            },
            {
              mark: "3",
              gap: 8,
              node: (
                <M size={31} color={violet}>
                  △<Nm>D</Nm><Nm>B</Nm><Nm>F</Nm> ∽ △<Nm>D</Nm><Nm>A</Nm><Nm>B</Nm> ⟹ <Nm>D</Nm><Nm>B</Nm>² = <Nm>D</Nm><Nm>A</Nm> · <Nm>D</Nm><Nm>F</Nm>
                </M>
              ),
            },
          ],
        },
        {
          id: "substitute",
          eyebrow: "第二问 · 第 2 步",
          heading: "把 DB 换成 DE，用上 AE = 3",
          params: { patchF: 0, patchA: 0, tick: 1 },
          lines: [
            {
              mark: "1",
              node: (
                <Say size={26}>
                  由第一问 <M size={28} color={green}><Nm>D</Nm><Nm>B</Nm> = <Nm>D</Nm><Nm>E</Nm></M>，
                  设 <M size={28}><Nm>D</Nm><Nm>E</Nm> = <Vv>x</Vv></M>，则 <M size={28}><Nm>D</Nm><Nm>B</Nm> = <Vv>x</Vv></M>。
                </Say>
              ),
            },
            {
              mark: "2",
              gap: 6,
              node: (
                <Say size={26}>
                  <M size={28}><Nm>A</Nm>、<Nm>E</Nm>、<Nm>D</Nm></M> 依次共线：
                  <M size={28}><Nm>D</Nm><Nm>A</Nm> = <Nm>A</Nm><Nm>E</Nm> + <Nm>E</Nm><Nm>D</Nm> = 3 + <Vv>x</Vv></M>
                </Say>
              ),
            },
            {
              mark: "3",
              gap: 8,
              node: (
                <M size={31}>
                  <Vv>x</Vv>² = 4 ( 3 + <Vv>x</Vv> )
                </M>
              ),
            },
          ],
        },
        {
          id: "solve",
          eyebrow: "第二问 · 第 3 步",
          heading: "解一个一元二次方程",
          hold: 48,
          lines: [
            {
              mark: "1",
              node: (
                <M size={31}>
                  <Vv>x</Vv>² − 4<Vv>x</Vv> − 12 = 0 &nbsp;⟹&nbsp; ( <Vv>x</Vv> − 6 )( <Vv>x</Vv> + 2 ) = 0
                </M>
              ),
            },
            {
              mark: "2",
              gap: 8,
              node: (
                <Say size={26}>
                  <M size={28}><Vv>x</Vv> = −2</M> 舍去（线段长为正），所以 <M size={28} color={green}><Vv>x</Vv> = 6</M>。
                </Say>
              ),
            },
            {
              mark: "★",
              emphasis: true,
              gap: 10,
              node: (
                <M size={36} color={green}>
                  <Nm>D</Nm><Nm>B</Nm> = <Nm>D</Nm><Nm>E</Nm> = 6
                </M>
              ),
            },
          ],
        },
      ],
    },
  ],

  outroHeading: "DB = 6",
  outro: [
    {
      mark: "结",
      tone: blue,
      node: (
        <Say size={26}>
          方法链：<Key tone={amber}>内心 → 两组半角</Key> →{" "}
          <Key tone={green}>外角 + 同弧等角拼出等腰</Key> →{" "}
          <Key tone={violet}>△DBF ∽ △DAB 得 DB² = DA·DF</Key>。
        </Say>
      ),
    },
    {
      mark: "·",
      gap: 6,
      node: (
        <Say size={25}>
          顺带一个经典结论：这里的 <M size={27} color={amber}><Nm>D</Nm></M> 是弧 <M size={27}><Nm>B</Nm><Nm>C</Nm></M> 的中点，
          它到 <M size={27}><Nm>B</Nm>、<Nm>C</Nm>、<Nm>E</Nm></M> 三点等距 —— <M size={27}><Nm>D</Nm><Nm>B</Nm> = <Nm>D</Nm><Nm>C</Nm> = <Nm>D</Nm><Nm>E</Nm></M>。
        </Say>
      ),
    },
    {
      mark: "答",
      tone: green,
      emphasis: true,
      node: (
        <Say size={27}>
          (1) <M size={31} color={green}><Nm>D</Nm><Nm>B</Nm> = <Nm>D</Nm><Nm>E</Nm></M>；
          (2) <M size={31} color={green}><Nm>D</Nm><Nm>B</Nm> = 6</M>。
        </Say>
      ),
    },
  ],
};

registerContent(content);
export default content;
