import React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  type InteractivitySchema,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { sans } from "./fonts";
import { M, Pt, Tup, Vec, Vv } from "./Math";
import { ink, inkFaint, inkMuted, line } from "./theme";
import type { CompiledChapter } from "./compile";

/**
 * Frame furniture: the chapter rail across the top and the progress rule at the
 * bottom, so the viewer always knows how far through the proof they are.
 */

const RailInner: React.FC<{
  chapters: readonly CompiledChapter[];
  total: number;
  series: string;
  /** Frames of statement card that precede the first step. */
  offset: number;
}> = ({
  chapters: CHAPTERS,
  total: DURATION,
  series,
  offset: OFFSET,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Chapter boundaries are measured on the step clock, which starts after the
  // statement card — so compare against the shifted frame, not the raw one.
  const stepFrame = Math.max(0, frame - OFFSET);
  const active = Math.max(0, CHAPTERS.findIndex((c) => stepFrame >= c.from && stepFrame < c.to));

  const progress = interpolate(frame, [0, Math.max(1, DURATION - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: interpolate(frame, [0, 0.25 * fps], [0, 1]) }}>
      <Interactive.Div
        name="Title"
        style={{
          position: "absolute",
          left: 80,
          top: 54,
          fontFamily: sans,
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 4,
          color: ink,
        }}
      >
        {series}
      </Interactive.Div>

      <Interactive.Div
        name="Chapter rail"
        style={{
          position: "absolute",
          right: 80,
          top: 52,
          display: "flex",
          alignItems: "center",
          gap: 0,
        }}
      >
        {CHAPTERS.map((c, i) => {
          const on = i <= active;
          const current = i === active;
          return (
            <div key={c.chapter.label} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 ? (
                <div
                  style={{
                    width: 34,
                    height: 2,
                    backgroundColor: i <= active ? "#2563EB" : line,
                    margin: "0 12px",
                  }}
                />
              ) : null}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  fontFamily: sans,
                  fontSize: 21,
                  fontWeight: current ? 800 : 600,
                  color: current ? "#2563EB" : on ? inkMuted : inkFaint,
                  scale: current ? "1" : "0.97",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: current ? "#2563EB" : on ? "#93B4F5" : line,
                  }}
                />
                {c.chapter.label}
              </div>
            </div>
          );
        })}
      </Interactive.Div>

      <Interactive.Div
        name="Progress"
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 110,
          height: 2,
          backgroundColor: line,
        }}
      >
        <div
          style={{
            width: `${(progress * 100).toFixed(2)}%`,
            height: "100%",
            backgroundColor: "#2563EB",
          }}
        />
      </Interactive.Div>
    </AbsoluteFill>
  );
};

export const Rail = Interactive.withSchema({
  Component: RailInner,
  componentName: "<Rail>",
  schema: {} as const,
  wrapInSequence: false,
  supportsEffects: false,
});
