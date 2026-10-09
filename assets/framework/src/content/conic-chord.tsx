import React from "react";
import { conicFigure, K_OPT } from "../framework/builders/conic";
import { Key, Say } from "../framework/Panel";
import { M, Nm, Tup, Vv } from "../framework/Math";
import { blue, green, ink, inkMuted, violet } from "../framework/theme";
import { registerContent } from "../framework/registry";
import type { Content } from "../framework/types";

/**
 * 椭圆 C: x²/4 + y² = 1，直线 l: y = kx + 1 与 C 交于 M、N 两点，求 |MN| 的最大值。
 *
 * This is the framework's stress test: a different figure builder (2D conic, no
 * cuboid anywhere), and steps that animate a CONTINUOUS parameter — k — so the
 * chord physically swings round to the optimal slope instead of just appearing.
 */

const figure = conicFigure();

const content: Content = {
  id: "conic-chord",
  series: "解析几何 · 圆锥曲线",
  title: "椭圆上定过点弦长的最值",
  figure,

  statement: [
    {
      mark: "题",
      node: (
        <Say size={26}>
          已知椭圆 <M size={30} color={blue}><Vv>c</Vv> : <Tup><Vv>x</Vv>, 0</Tup> 满足方程</M>
          <br />
          <M size={32} color={ink}>
            <Tup><Vv>x</Vv></Tup> / 4 + <Tup><Vv>y</Vv></Tup> = 1
          </M>
        </Say>
      ),
    },
    {
      mark: "·",
      node: (
        <Say size={26}>
          直线 <M size={29} color={violet}><Vv>l</Vv> : <Vv>y</Vv> = <Vv>k</Vv><Vv>x</Vv> + 1</M>{" "}
          与 <M size={29}><Vv>c</Vv></M> 交于 <M size={29} color={green}><Nm>M</Nm></M>、
          <M size={29} color={green}><Nm>N</Nm></M> 两点，斜率为 <M size={29}><Vv>k</Vv></M>。
        </Say>
      ),
    },
    {
      mark: "问",
      emphasis: true,
      node: <Say size={27}>求弦长 <M size={31} color={green}><Nm>M</Nm><Nm>N</Nm></M> 的最大值。</Say>,
    },
  ],

  chapters: [
    {
      id: "read",
      label: "审图",
      steps: [
        {
          id: "curve",
          heading: "先把椭圆和定点画出来",
          hold: 40,
          params: { curve: 1, fixed: 1, k: 0 },
          lines: [
            {
              mark: "1",
              node: (
                <Say size={26}>
                  由 <M size={28}><Tup><Vv>x</Vv></Tup> / 4 + <Tup><Vv>y</Vv></Tup> = 1</M>{" "}
                  得 <M size={28}>a = 2, b = 1</M>，<Key tone={blue}>离心率 e = √3 / 2 &lt; 1</Key>，确为椭圆。
                </Say>
              ),
            },
            {
              mark: "2",
              gap: 6,
              node: (
                <Say size={26}>
                  四个顶点分别是 <M size={28} color={blue}>A₁(−2, 0)</M>、<M size={28} color={blue}>A₂(2, 0)</M>、
                  <M size={28} color={blue}>B₁(0, 1)</M>、<M size={28} color={blue}>B₂(0, −1)</M>。
                </Say>
              ),
            },
            {
              mark: "3",
              gap: 6,
              node: (
                <Say size={26}>
                  直线 <M size={28} color={violet}><Vv>l</Vv></M> 恒过 <Key tone={violet}>B₁(0, 1)</Key>——
                  令 <M size={28}><Vv>x</Vv> = 0</M> 即得。所以 <Key tone={green}><Nm>M</Nm> 恒为上顶点</Key>。
                </Say>
              ),
            },
          ],
        },
      ],
    },

    {
      id: "chord",
      label: "求弦长",
      steps: [
        {
          id: "sub",
          eyebrow: "第一步 · 联立",
          heading: "把直线方程代入椭圆方程",
          params: { chord: 1, seg: 1, "at:M": 1, "at:N": 1, k: 0.7071 },
          lines: [
            {
              mark: "1",
              node: (
                <Say size={25}>
                  把 <M size={27}><Vv>y</Vv> = <Vv>k</Vv><Vv>x</Vv> + 1</M> 代入{" "}
                  <M size={27}><Tup><Vv>x</Vv></Tup> / 4 + <Tup><Vv>y</Vv></Tup> = 1</M>，整理得
                </Say>
              ),
            },
            {
              mark: "2",
              gap: 8,
              node: (
                <M size={31} color={ink}>
                  ( <Tup>1</Tup> / 4 + <Vv>k</Vv>² ) <Tup><Vv>x</Vv></Tup>² + 2<Vv>k</Vv><Tup><Vv>x</Vv></Tup> = 0
                </M>
              ),
            },
            {
              mark: "3",
              gap: 8,
              node: (
                <Say size={25}>
                  左边<b style={{ color: ink }}>提出公因式</b> <M size={27}><Tup><Vv>x</Vv></Tup></M>，
                  所以 <M size={27}><Tup><Vv>x</Vv></Tup> = 0</M> 或 <M size={27}><Tup><Vv>x</Vv></Tup> = <Tup>−2<Vv>k</Vv> / (1/4 + <Vv>k</Vv>²)</Tup></M>
                </Say>
              ),
            },
            {
              mark: "4",
              emphasis: true,
              gap: 6,
              node: (
                <M size={30} color={green}>
                  <Nm>N</Nm> = <Tup>−8<Vv>k</Vv> / (1 + 4<Vv>k</Vv>²), <Vv>y</Vv><sub>N</sub></Tup>
                </M>
              ),
            },
          ],
        },
        {
          id: "length",
          eyebrow: "第二步 · 化简",
          heading: "写出 |MN| 关于 k 的表达式",
          hold: 40,
          params: { k: 1 },
          lines: [
            {
              mark: "5",
              node: (
                <Say size={25}>
                  因为 <M size={27}><Vv>k</Vv> = <Vv>y</Vv><sub style={{ fontSize: "0.62em" }}>M</sub></M>，弦长就是纵坐标之差乘上{" "}
                  <M size={27}>√(1 + <Vv>k</Vv>²)</M>
                </Say>
              ),
            },
            {
              mark: "6",
              gap: 8,
              node: (
                <M size={31} color={ink}>
                  |<Nm>M</Nm><Nm>N</Nm>| = √(1 + <Vv>k</Vv>²) · 8|<Vv>k</Vv>| / (1 + 4<Vv>k</Vv>²)
                </M>
              ),
            },
            {
              mark: "·",
              gap: 6,
              node: (
                <Say size={25}>
                  这就是一个<b style={{ color: ink }}>只含 <M size={27}><Vv>k</Vv></M> 的函数</b>，问题化为求最值。
                </Say>
              ),
            },
          ],
        },
      ],
    },

    {
      id: "max",
      label: "求最值",
      steps: [
        {
          id: "square",
          eyebrow: "第三步 · 配方",
          heading: "两边平方，把问题变成一个非负式",
          params: { k: 0.4 },
          lines: [
            {
              mark: "1",
              node: (
                <Say size={25}>
                  令 <M size={28}><Vv>u</Vv> = <Vv>k</Vv>² &gt; 0</M>，则{" "}
                  <M size={28}>|<Nm>M</Nm><Nm>N</Nm>|² = 64<Vv>u</Vv>(1 + <Vv>u</Vv>) / (1 + 4<Vv>u</Vv>)²</M>
                </Say>
              ),
            },
            {
              mark: "2",
              gap: 10,
              node: (
                <Say size={25}>
                  关键一步 —— 分子分母同时展开，<b style={{ color: violet }}>差恰好是一个完全平方</b>
                </Say>
              ),
            },
            {
              mark: "3",
              gap: 6,
              node: (
                <M size={30} color={ink}>
                  (1 + 4<Vv>u</Vv>)² − 12<Vv>u</Vv>(1 + <Vv>u</Vv>) = <span style={{ color: violet }}>(2<Vv>u</Vv> − 1)²</span> ≥ 0
                </M>
              ),
            },
            {
              mark: "4",
              emphasis: true,
              gap: 8,
              node: (
                <M size={31} color={green}>
                  <Vv>u</Vv>(1 + <Vv>u</Vv>) / (1 + 4<Vv>u</Vv>)² ≤ <Vv>k</Vv> 1 / 12
                </M>
              ),
            },
          ],
        },
        {
          id: "answer",
          eyebrow: "第四步 · 取等",
          heading: "等号什么时候成立",
          hold: 48,
          params: { k: 1.6 },
          lines: [
            {
              mark: "1",
              node: (
                <Say size={26}>
                  当且仅当 <M size={29} color={green}>2<Vv>u</Vv> − 1 = 0</M> 取等号，即{" "}
                  <M size={29} color={green}><Vv>u</Vv> = 1/2</M>，所以 <M size={29} color={green}><Vv>k</Vv> = ±√2 / 2</M>
                </Say>
              ),
            },
            {
              mark: "2",
              gap: 8,
              node: (
                <Say size={26}>
                  代回：<M size={29}>|<Nm>M</Nm><Nm>N</Nm>|² = 64 / 12 = 16/3</M>
                </Say>
              ),
            },
            {
              mark: "3",
              emphasis: true,
              gap: 12,
              node: (
                <M size={36} color={green}>
                  |<Nm>M</Nm><Nm>N</Nm>|<sub>max</sub> = <Vv>k</Vv> 4√3 / 3
                </M>
              ),
            },
            {
              mark: "·",
              gap: 8,
              node: (
                <Say size={25}>
                  注意这是<b style={{ color: ink }}>能取到的最大值</b>，不是上确界 —— 因为 <M size={27}><Vv>k</Vv> = ±√2/2</M> 确实是存在的斜率。
                </Say>
              ),
            },
          ],
        },
      ],
    },
  ],

  outroHeading: "最大值 4√3 / 3",
  outro: [
    {
      mark: "结",
      tone: blue,
      node: (
        <Say size={26}>
          方法：<Key tone={blue}>联立 → 因式分解 → 配方成完全平方</Key>。
          凡是<span style={{ color: violet }}>只含一个参数</span>的最值题，先把分式的分母也
          展开，常常能配成平方。
        </Say>
      ),
    },
    {
      mark: "答",
      tone: green,
      emphasis: true,
      node: (
        <Say size={27}>
          <M size={31} color={green}>|<Nm>M</Nm><Nm>N</Nm>|<sub>max</sub> = 4√3/3</M>
          ，当 <M size={29} color={green}><Vv>k</Vv> = ±√2/2</M> 时取到。
        </Say>
      ),
    },
  ],
};

registerContent(content);
export default content;