import type { FigureFn, Params, Scene, SceneItem, Vec2 } from "../types";
import { amber, blue, green, ink, inkMuted, red, violet } from "../theme";

/**
 * 化学实验装置图 —— opts.preset 选一套：
 *
 *   "gas"    加热固体制气体 + 排水法收集（试管口略向下、导管刚露出橡皮塞、
 *            气泡连续均匀时才开始收集，这三件事在图上都有对应位置）
 *   "filter" 过滤（一贴二低三靠）
 *   "evap"   蒸发结晶（玻璃棒搅拌，出现较多固体时停止加热）
 *
 * 一个 builder 三套装置，是因为它们在课本里总是一起出现：制气 → 除杂 → 收集，
 * 或者溶解 → 过滤 → 蒸发。拆成三个文件反而要重复画酒精灯和铁架台。
 *
 * Parameter keys（gas）: stand 铁架台 / tube 试管与药品 / lamp 酒精灯 / flame 火焰
 *   stopper 橡皮塞与导管 / trough 水槽与水 / bottle 集气瓶 / bubbles 气泡 / note 注意事项
 * Continuous（gas）: `gas`（收集到的气体，0 → 满）
 */

export const WIDTH = 1020;
export const HEIGHT = 700;

export type LabPreset = "gas" | "filter" | "evap";

/** 一段管路 / 器皿轮廓的辅助：把点列转成 poly。 */
const poly = (key: string, reveal: string, layer: number, points: Vec2[], o: {
  fill?: string; fillOpacity?: number; stroke?: string; width?: number; dash?: string; close?: boolean;
}): SceneItem => ({
  key, reveal, layer, kind: "poly", points,
  ...(o.fill ? { fill: o.fill } : {}),
  ...(o.fillOpacity !== undefined ? { fillOpacity: o.fillOpacity } : {}),
  ...(o.stroke ? { stroke: o.stroke } : {}),
  ...(o.width !== undefined ? { width: o.width } : {}),
  ...(o.dash ? { dash: o.dash } : {}),
  ...(o.close !== undefined ? { close: o.close } : {}),
});

const line = (key: string, reveal: string, layer: number, from: Vec2, to: Vec2, stroke: string, width = 3, dash?: string): SceneItem => ({
  key, reveal, layer, kind: "line", from, to, stroke, width, ...(dash ? { dash } : {}),
});

const txt = (key: string, reveal: string, at: Vec2, text: string, size: number, color: string, anchor: "start" | "middle" | "end" = "middle", bold = false): SceneItem => ({
  key, reveal, layer: 9, kind: "text", at, text, size, color, anchor, bold,
});

/** 酒精灯：灯身 + 灯芯 + 三层火焰，位置坐在 (x, baseY) 上。 */
const alcoholLamp = (revealFlame: string, x: number, baseY: number, on: (k: string) => boolean): SceneItem[] => {
  const out: SceneItem[] = [];
  // body
  out.push({
    key: "lamp:body", reveal: revealFlame, layer: 3, kind: "path",
    d: `M ${x - 40} ${baseY - 96} Q ${x - 56} ${baseY - 44} ${x - 40} ${baseY - 16} L ${x + 40} ${baseY - 16} Q ${x + 56} ${baseY - 44} ${x + 40} ${baseY - 96} Z`,
    fill: "#FFFFFF", fillOpacity: 0.9, stroke: ink, width: 3,
  });
  out.push(line("lamp:base", revealFlame, 3, [x - 34, baseY - 16], [x + 34, baseY - 16], ink, 4));
  // the wick holder and wick
  out.push(poly("lamp:collar", revealFlame, 4, [[x - 15, baseY - 96], [x + 15, baseY - 96], [x + 11, baseY - 112], [x - 11, baseY - 112]], { fill: "#E2DDD3", stroke: ink, width: 2.4, close: true }));
  out.push(line("lamp:wick", revealFlame, 4, [x, baseY - 112], [x, baseY - 126], "#94A3B8", 5));
  out.push(txt("lamp:liquid", revealFlame, [x, baseY - 52], "酒精", 20, inkMuted));

  // three-zone flame — only once it is lit
  if (on("flame")) {
    const tipY = baseY - 250;
    out.push({
      key: "flame:outer", reveal: "flame", layer: 5, kind: "path",
      d: `M ${x} ${tipY} Q ${x + 34} ${tipY + 62} ${x + 26} ${baseY - 118} L ${x - 26} ${baseY - 118} Q ${x - 34} ${tipY + 62} ${x} ${tipY} Z`,
      fill: amber, fillOpacity: 0.4, stroke: amber, width: 2.4,
    });
    out.push({
      key: "flame:inner", reveal: "flame", layer: 6, kind: "path",
      d: `M ${x} ${tipY + 36} Q ${x + 18} ${tipY + 74} ${x + 14} ${baseY - 118} L ${x - 14} ${baseY - 118} Q ${x - 18} ${tipY + 74} ${x} ${tipY + 36} Z`,
      fill: blue, fillOpacity: 0.35, stroke: blue, width: 2,
    });
    out.push(txt("flame:z1", "flame", [x + 66, tipY + 34], "外焰（温度最高，用这层加热）", 21, red, "start", true));
    out.push(txt("flame:z2", "flame", [x + 66, tipY + 70], "内焰", 20, inkMuted, "start"));
    out.push(txt("flame:z3", "flame", [x + 66, tipY + 102], "焰心", 20, inkMuted, "start"));
  }
  return out;
};

/** 铁架台：底座 + 立柱，立柱顶到 columnTop。 */
const stand = (reveal: string, baseX: number, baseY: number, columnTop: number): SceneItem[] => [
  poly("stand:base", reveal, 2, [[baseX - 76, baseY - 18], [baseX + 76, baseY - 18], [baseX + 76, baseY], [baseX - 76, baseY]], { fill: "#FFFFFF", stroke: ink, width: 3, close: true }),
  line("stand:col", reveal, 2, [baseX, columnTop], [baseX, baseY - 18], ink, 6),
];

export const labFigure = (preset: LabPreset = "gas"): FigureFn => {
  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    const on = (k: string) => (p[k] ?? 0) > 0;

    if (preset === "gas") {
      const gasFill = Math.max(0, Math.min(1, p.gas ?? 0));

      // the test tube: axis from (tx0, ty0) lower-left to the mouth at the lower-right,
      // so the mouth really does point slightly downward
      const T0: Vec2 = [268, 292];
      const T1: Vec2 = [556, 338];
      const ang = Math.atan2(T1[1] - T0[1], T1[0] - T0[0]);
      const halfW = 34;
      const nx = -Math.sin(ang) * halfW;
      const ny = Math.cos(ang) * halfW;
      const closed: Vec2 = [T0[0] - nx * 0.2, T0[1] - ny * 0.2];

      items.push(
        ...stand("stand", 218, 664, 214),
        // the clamp holding the tube
        line("clamp:1", "stand", 3, [218, 300], [T0[0] - 6, 296], ink, 5),
        line("clamp:2", "stand", 3, [T0[0] - 6, 296], [T0[0] + 26, 318], ink, 5),
      );

      if (on("tube")) {
        items.push(
          poly("tube", "tube", 3, [
            [closed[0] + nx, closed[1] + ny],
            [T1[0] + nx, T1[1] + ny],
            [T1[0] - nx, T1[1] - ny],
            [closed[0] - nx, closed[1] - ny],
          ], { fill: "#FFFFFF", fillOpacity: 0.75, stroke: ink, width: 3.2, close: true }),
          // the rounded closed end
          {
            key: "tube:end", reveal: "tube", layer: 3, kind: "path",
            d: `M ${closed[0] + nx} ${closed[1] + ny} Q ${closed[0] - nx * 1.9} ${(closed[1] + ny + closed[1] - ny) / 2} ${closed[0] - nx} ${closed[1] - ny}`,
            stroke: ink, width: 3.2, fill: "none",
          },
        );
        // the solid reagent in the closed end of the tube
        items.push(
          poly("tube:solid", "tube", 2, [
            [closed[0] + nx * 0.92, closed[1] + ny * 0.92],
            [T0[0] + (T1[0] - T0[0]) * 0.26 + nx * 0.92, T0[1] + (T1[1] - T0[1]) * 0.26 + ny * 0.92],
            [T0[0] + (T1[0] - T0[0]) * 0.26 - nx * 0.92, T0[1] + (T1[1] - T0[1]) * 0.26 - ny * 0.92],
            [closed[0] - nx * 0.92, closed[1] - ny * 0.92],
          ], { fill: violet, fillOpacity: 0.45, stroke: "none", close: true }),
        );
        items.push(txt("tube:lab", "tube", [330, 258], "固体药品（如 KMnO₄ / KClO₃）", 22, violet, "start"));
      }

      if (on("lamp")) {
        items.push(...alcoholLamp("lamp", 350, 664, on));
      }

      if (on("stopper")) {
        const mouth: Vec2 = [T1[0], T1[1]];
        items.push(
          poly("stopper", "stopper", 4, [
            [mouth[0] - 4, mouth[1] + ny * 1.05], [mouth[0] + 22, mouth[1] + ny * 1.05],
            [mouth[0] + 22, mouth[1] - ny * 1.05], [mouth[0] - 4, mouth[1] - ny * 1.05],
          ], { fill: "#E2DDD3", stroke: ink, width: 2.6, close: true }),
          // the delivery tube: out of the stopper, then a bend down into the trough
          {
            key: "deliver", reveal: "stopper", layer: 3, kind: "path",
            d: `M ${mouth[0] + 22} ${mouth[1]} L 742 ${mouth[1] + 6} Q 786 ${mouth[1] + 6} 786 ${mouth[1] + 52} L 786 604`,
            stroke: blue, width: 6, fill: "none",
          },
          txt("stopper:lab", "stopper", [mouth[0] - 12, mouth[1] - 62], "导管只需刚露出橡皮塞", 21, green, "end", true),
        );
      }

      if (on("trough")) {
        items.push(
          poly("trough", "trough", 3, [[662, 496], [986, 496], [986, 660], [662, 660]], { fill: "none", stroke: ink, width: 3.4, close: true }),
          poly("trough:water", "trough", 1, [[665, 528], [983, 528], [983, 657], [665, 657]], { fill: "#BFE3F5", fillOpacity: 0.55, stroke: "none", close: true }),
          line("trough:surf", "trough", 2, [665, 528], [983, 528], blue, 2.4),
          txt("trough:lab", "trough", [986, 682], "水槽（排水法）", 22, inkMuted, "end"),
        );
      }

      if (on("bottle")) {
        const BL = 736;
        const BR = 872;
        const top = 420;
        const bottom = 636;
        // gas collects at the top of the inverted bottle, pushing the water down
        const waterTop = top + (bottom - top) * gasFill;
        items.push(
          poly("bottle", "bottle", 4, [[BL, top], [BR, top], [BR, bottom], [BL, bottom]], { fill: "#FFFFFF", fillOpacity: 0.35, stroke: ink, width: 3.4, close: true }),
          poly("bottle:neck", "bottle", 4, [[BL + 52, top - 26], [BR - 52, top - 26], [BR - 52, top], [BL + 52, top]], { fill: "#FFFFFF", fillOpacity: 0.35, stroke: ink, width: 3.4, close: true }),
        );
        if (gasFill > 0.001) {
          items.push(poly("bottle:gas", "bottle", 1, [[BL + 3, top + 3], [BR - 3, top + 3], [BR - 3, waterTop], [BL + 3, waterTop]], { fill: amber, fillOpacity: 0.28, stroke: "none", close: true }));
        }
        items.push(
          poly("bottle:water", "bottle", 1, [[BL + 3, waterTop], [BR - 3, waterTop], [BR - 3, bottom - 3], [BL + 3, bottom - 3]], { fill: "#BFE3F5", fillOpacity: 0.5, stroke: "none", close: true }),
        );
        items.push(txt("bottle:gas:lab", "bottle", [804, top + 30], "收集到的气体", 23, amber, "middle", true));
      }

      if (on("bubbles") && gasFill < 0.999) {
        for (let i = 0; i < 4; i++) {
          items.push({
            key: `bub:${i}`, reveal: "bubbles", layer: 6, kind: "circle",
            c: [786 + (i % 2 ? 12 : -12), 596 - i * 26], r: 6 + (i % 3), fill: "none", stroke: blue, width: 2.2,
          });
        }
        items.push(txt("bubbles:lab", "bubbles", [812, 556], "气泡连续均匀冒出时才开始收集", 21, green, "start", true));
      }

      if (on("note")) {
        items.push(
          txt("note:1", "note", [92, 120], "① 试管口要略向下倾斜 —— 防止冷凝水倒流炸裂试管", 24, red, "start", true),
          txt("note:2", "note", [92, 160], "② 导管只需露出橡皮塞一点点 —— 便于气体排出", 24, red, "start"),
          txt("note:3", "note", [92, 200], "③ 先撤导管再熄灯 —— 防止水倒吸", 24, red, "start"),
          txt("note:4", "note", [92, 248], "④ 用酒精灯外焰加热", 24, red, "start"),
        );
      }
    }

    if (preset === "filter") {
      items.push(...stand("stand", 320, 668, 250));
      // the iron ring holding the funnel
      items.push(
        line("ring:arm", "stand", 3, [320, 356], [470, 356], ink, 5),
        {
          key: "ring", reveal: "stand", layer: 3, kind: "ellipse",
          c: [470, 356], r: 62, ry: 14, fill: "none", stroke: ink, width: 3.4,
        },
      );

      if (on("funnel")) {
        items.push(
          poly("funnel", "funnel", 3, [[392, 356], [548, 356], [478, 500], [462, 500]], { fill: "#FFFFFF", fillOpacity: 0.8, stroke: ink, width: 3.2, close: true }),
          line("funnel:stem", "funnel", 3, [462, 500], [478, 500], ink, 3.2),
          poly("funnel:stem2", "funnel", 3, [[462, 500], [478, 500], [474, 552], [466, 552]], { fill: "#FFFFFF", fillOpacity: 0.8, stroke: ink, width: 3, close: true }),
          // filter paper, folded: three layers one side, one the other
          poly("filter:paper", "funnel", 2, [[398, 360], [542, 360], [476, 496], [464, 496]], { fill: "#FFFFFF", fillOpacity: 1, stroke: "#94A3B8", width: 1.8, dash: "5 4", close: true }),
        );
      }

      if (on("mud")) {
        const level = Math.max(0, Math.min(1, p.mud ?? 0.6));
        const topY = 496 - (496 - 366) * level;
        items.push(
          poly("mud:liquid", "mud", 1, [[404, topY], [536, topY], [477, 494], [463, 494]], { fill: amber, fillOpacity: 0.35, stroke: "none", close: true }),
          poly("mud:solid", "mud", 2, [[420, 430], [520, 430], [477, 492], [463, 492]], { fill: violet, fillOpacity: 0.4, stroke: "none", close: true }),
          txt("mud:lab", "mud", [612, 396], "待过滤的浑浊液", 22, amber, "start"),
          // the glass rod,引流
          line("rod", "mud", 4, [560, 372], [620, 300], blue, 5),
          txt("rod:lab", "mud", [632, 292], "玻璃棒引流", 21, blue, "start", true),
        );
      }

      if (on("beaker")) {
        items.push(
          poly("beaker", "beaker", 3, [[406, 556], [534, 556], [526, 664], [414, 664]], { fill: "none", stroke: ink, width: 3.4, close: true }),
          poly("beaker:filtrate", "beaker", 1, [[410, 604], [530, 604], [524, 661], [416, 661]], { fill: "#BFE3F5", fillOpacity: 0.5, stroke: "none", close: true }),
          line("beaker:surf", "beaker", 2, [410, 604], [530, 604], blue, 2.2),
          txt("beaker:lab", "beaker", [470, 690], "烧杯（承接滤液）", 22, inkMuted),
        );
        // the stem tip touching the beaker wall
        items.push(txt("note:touch", "beaker", [556, 566], "漏斗下端紧靠烧杯内壁", 21, green, "start", true));
      }

      if (on("note")) {
        items.push(
          txt("note:1", "note", [92, 120], "一贴：滤纸紧贴漏斗内壁，中间不留气泡", 24, red, "start", true),
          txt("note:2", "note", [92, 160], "二低：滤纸边缘低于漏斗口；液面低于滤纸边缘", 24, red, "start"),
          txt("note:3", "note", [92, 200], "三靠：烧杯嘴紧靠玻璃棒；玻璃棒轻靠三层滤纸；漏斗下端紧靠烧杯内壁", 24, red, "start"),
        );
      }
    }

    if (preset === "evap") {
      items.push(
        poly("tri:top", "stand", 2, [[300, 470], [620, 470], [560, 500], [360, 500]], { fill: "#FFFFFF", stroke: ink, width: 3, close: true }),
        line("tri:l", "stand", 2, [340, 470], [310, 620], ink, 4),
        line("tri:r", "stand", 2, [580, 470], [610, 620], ink, 4),
        txt("tri:lab", "stand", [460, 520], "泥三角 / 三脚架", 21, inkMuted),
      );

      if (on("dish")) {
        items.push(
          {
            key: "dish", reveal: "dish", layer: 3, kind: "path",
            d: `M 340 470 L 580 470 Q 540 424 460 424 Q 380 424 340 470 Z`,
            fill: "#FFFFFF", fillOpacity: 0.9, stroke: ink, width: 3.2,
          },
          {
            key: "dish:liquid", reveal: "dish", layer: 2, kind: "path",
            d: `M 352 462 L 568 462 Q 536 436 460 436 Q 384 436 352 462 Z`,
            fill: "#BFE3F5", fillOpacity: 0.6, stroke: "none",
          },
          txt("dish:lab", "dish", [460, 410], "蒸发皿", 22, inkMuted),
        );
        if ((p.crystal ?? 0) > 0.02) {
          // crystals appear along the rim as it dries out
          const k = Math.max(0, Math.min(1, p.crystal ?? 0));
          for (let i = 0; i < 7; i++) {
            const a = Math.PI * (0.12 + (0.76 * i) / 6);
            items.push({
              key: `cr:${i}`, reveal: "dish", layer: 4, kind: "marker",
              at: [460 - Math.cos(a) * 88 * k, 460 - Math.sin(a) * 30 * k + 8],
              r: 3.4 + (i % 3), fill: "#FFFFFF", ring: ink, ringWidth: 1.6,
            });
          }
        }
      }

      items.push(...alcoholLamp("lamp", 460, 664, on));

      if (on("rod")) {
        items.push(
          line("rod", "rod", 5, [486, 436], [528, 356], blue, 5),
          txt("rod:lab", "rod", [548, 344], "玻璃棒不断搅拌 —— 防止局部过热液滴飞溅", 22, blue, "start", true),
        );
      }

      if (on("note")) {
        items.push(
          txt("note:1", "note", [92, 120], "出现较多固体时停止加热，用余热蒸干", 24, red, "start", true),
          txt("note:2", "note", [92, 160], "不要直接用手取蒸发皿 —— 坩埚钳", 24, red, "start"),
        );
      }
    }

    return { width: WIDTH, height: HEIGHT, items };
  };

  const defaults: Params =
    preset === "filter" ? { stand: 1, funnel: 1 }
      : preset === "evap" ? { stand: 1, dish: 1 }
        : { stand: 1, tube: 1 };
  figure.defaults = defaults;
  figure.continuous = preset === "gas" ? ["gas"] : preset === "evap" ? ["crystal"] : ["mud"];
  return figure;
};
