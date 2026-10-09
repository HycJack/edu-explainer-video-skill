import React from "react";
import {
  Interactive,
  interpolate,
  type InteractivitySchema,
} from "remotion";
import { sans, serif } from "./fonts";
import { ink, paper } from "./theme";
import { revealAt } from "./compile";
import type { Params, Scene, SceneItem, Vec2 } from "./types";

/**
 * One SVG primitive layer for every figure in the framework.
 *
 * Adding a new kind of diagram means writing a builder that emits these items,
 * not writing a component. Each item's reveal is read straight out of the
 * interpolated parameters, so "draw this line when we get to it" is one number
 * in the content file.
 */

const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

const ItemView: React.FC<{ item: SceneItem; p: Params }> = ({ item, p }) => {
  const t = revealAt(p, item.key, item.reveal);

  switch (item.kind) {
    case "line": {
      const tip = lerp(item.from, item.to, t);
      return (
        <line
          x1={item.from[0]}
          y1={item.from[1]}
          x2={tip[0]}
          y2={tip[1]}
          stroke={item.stroke ?? ink}
          strokeWidth={item.width ?? 2.4}
          strokeLinecap="round"
          strokeDasharray={item.dash}
          // Without this a not-yet-revealed line collapses to zero length and
          // round caps draw it as a visible dot at `from`.
          opacity={(item.opacity ?? 1) * t}
          filter={item.glow && t > 0.5 ? "url(#figGlow)" : undefined}
        />
      );
    }

    case "arrow": {
      const tip = lerp(item.from, item.to, t);
      const dx = tip[0] - item.from[0];
      const dy = tip[1] - item.from[1];
      const len = Math.hypot(dx, dy) || 1;
      const hx = dx / len;
      const hy = dy / len;
      const head = (item.head ?? 15) * t;
      const bx = tip[0] - hx * head;
      const by = tip[1] - hy * head;
      return (
        <g opacity={(item.opacity ?? 1) * t}>
          <line
            x1={item.from[0]}
            y1={item.from[1]}
            x2={bx}
            y2={by}
            stroke={item.stroke ?? ink}
            strokeWidth={item.width ?? 3.4}
            strokeLinecap="round"
            strokeDasharray={item.dash}
            filter={item.glow ? "url(#figGlowSm)" : undefined}
          />
          <polygon
            points={[
              `${tip[0]},${tip[1]}`,
              `${bx - hy * head * 0.45},${by + hx * head * 0.45}`,
              `${bx + hy * head * 0.45},${by - hx * head * 0.45}`,
            ].join(" ")}
            fill={item.stroke ?? ink}
          />
          {item.label ? (
            <text
              x={tip[0] + (item.labelDx ?? 16)}
              y={tip[1] + (item.labelDy ?? 0)}
              fontSize={30}
              fontStyle="italic"
              fill={item.labelColor ?? item.stroke ?? ink}
              dominantBaseline="middle"
              style={{ fontFamily: "serif" }}
            >
              {item.label}
            </text>
          ) : null}
        </g>
      );
    }

    case "poly": {
      // A <polygon> always closes back to its first point, so an open polyline
      // has to be a <polyline> or it silently draws itself shut.
      const open = item.close === false;
      const shared = {
        points: item.points.map((q) => `${q[0]},${q[1]}`).join(" "),
        stroke: item.stroke ?? "none",
        strokeWidth: item.width ?? 2,
        strokeDasharray: item.dash,
        strokeOpacity: (item.strokeOpacity ?? 1) * t,
        opacity: item.opacity ?? 1,
        filter: item.stroke && t > 0.5 ? "url(#figGlow)" : undefined,
      };
      return open ? (
        <polyline {...shared} fill="none" />
      ) : (
        <polygon
          {...shared}
          fill={item.fill ?? "none"}
          fillOpacity={(item.fillOpacity ?? 1) * t}
        />
      );
    }

    case "circle":
    case "ellipse": {
      const isCircle = item.kind === "circle" || item.ry === undefined;
      const rx = item.r * t;
      const ry = (item.ry ?? item.r) * t;
      return isCircle ? (
        <circle
          cx={item.c[0]}
          cy={item.c[1]}
          r={rx}
        fill={item.fill ?? "none"}
        fillOpacity={(item.fillOpacity ?? 1) * t}
        stroke={item.stroke ?? "none"}
        strokeWidth={item.width ?? 2}
        strokeDasharray={item.dash}
        strokeOpacity={t}
        opacity={item.opacity ?? 1}
      />
    ) : (
      <ellipse
        cx={item.c[0]}
        cy={item.c[1]}
        rx={rx}
        ry={ry}
        transform={item.rotate ? `rotate(${item.rotate} ${item.c[0]} ${item.c[1]})` : undefined}
        fill={item.fill ?? "none"}
        fillOpacity={(item.fillOpacity ?? 1) * t}
          stroke={item.stroke ?? "none"}
          strokeWidth={item.width ?? 2}
          strokeDasharray={item.dash}
          strokeOpacity={t}
          opacity={item.opacity ?? 1}
          filter={item.stroke && t > 0.5 ? "url(#figGlow)" : undefined}
        />
      );
    }

    case "marker": {
      const r = (item.r ?? 8) * t;
      return (
        <g opacity={t}>
          {item.ring ? (
            <circle
              cx={item.at[0]}
              cy={item.at[1]}
              r={r * 1.9}
              fill="none"
              stroke={item.ring}
              strokeWidth={item.ringWidth ?? 2}
              strokeOpacity="0.4"
            />
          ) : null}
          <circle cx={item.at[0]} cy={item.at[1]} r={r} fill={item.fill} />
        </g>
      );
    }

    case "text": {
      const fam = item.family === "serif" ? serif : sans;
      return (
        <text
          x={item.at[0]}
          y={item.at[1]}
          fontSize={item.size ?? 30}
          fontWeight={item.bold ? 600 : 400}
          fontStyle={item.italic ? "italic" : "normal"}
          fill={item.color ?? ink}
          textAnchor={item.anchor ?? "middle"}
          dominantBaseline={item.baseline ?? "middle"}
          opacity={(item.opacity ?? 1) * t}
          style={{ fontFamily: fam, fontVariantNumeric: "lining-nums tabular-nums" }}
        >
          {item.text}
          {item.sub ? (
            <tspan baselineShift="sub" fontSize={(item.size ?? 30) * 0.62} dy="4">
              {item.sub}
            </tspan>
          ) : null}
        </text>
      );
    }

    case "path":
      return (
        <path
          d={item.d}
          fill={item.fill ?? "none"}
          fillOpacity={(item.fillOpacity ?? 1) * t}
          stroke={item.stroke ?? "none"}
          strokeWidth={item.width ?? 2}
          strokeDasharray={item.dash}
          strokeOpacity={t}
          opacity={item.opacity ?? 1}
        />
      );

    default:
      return null;
  }
};

type SceneProps = {
  readonly scene: Scene;
  readonly params: Params;
  readonly style?: React.CSSProperties;
};

const SceneInner: React.FC<SceneProps> = ({ scene, params, style }) => (
  <Interactive.Svg
    name="Scene"
    viewBox={`0 0 ${scene.width} ${scene.height}`}
    width="100%"
    height="100%"
    style={style}
  >
    <defs>
      {/*
        The glow filters MUST be sized in user space. With the default
        objectBoundingBox units a perfectly horizontal or vertical line has a
        zero-height or zero-width bbox, so the 220% filter region collapses to
        nothing and the element is clipped away entirely — a `glow: true` line
        that happens to be axis-aligned simply never appears. Sizing the region
        against the scene makes the glow work at every angle.
      */}
      <filter
        id="figGlow"
        filterUnits="userSpaceOnUse"
        x={-scene.width / 2}
        y={-scene.height / 2}
        width={scene.width * 2}
        height={scene.height * 2}
      >
        <feGaussianBlur stdDeviation="6" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter
        id="figGlowSm"
        filterUnits="userSpaceOnUse"
        x={-scene.width / 2}
        y={-scene.height / 2}
        width={scene.width * 2}
        height={scene.height * 2}
      >
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {scene.grid ? (
      <rect
        x={0}
        y={0}
        width={scene.width}
        height={scene.height}
        fill={scene.background ?? paper}
      />
    ) : null}
    {[...scene.items]
      .map((item, i) => ({ item, i }))
      .sort((a, b) => (a.item.layer ?? 0) - (b.item.layer ?? 0) || a.i - b.i)
      .map(({ item }) => (
        <ItemView key={item.key} item={item} p={params} />
      ))}
  </Interactive.Svg>
);

export const SceneView = Interactive.withSchema({
  Component: SceneInner,
  componentName: "<SceneView>",
  schema: {} as unknown as Record<string, never>,
  wrapInSequence: false,
  supportsEffects: false,
});