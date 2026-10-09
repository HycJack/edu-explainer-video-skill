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
import { ink, inkFaint, inkMuted, line } from "./theme";

/**
 * The narration layer: a right-hand panel that reveals its lines one at a time,
 * and the statement / outro cards that bookend the film.
 */

export type PanelLine = {
  readonly node: React.ReactNode;
  readonly mark?: string;
  readonly emphasis?: boolean;
  readonly tone?: string;
  readonly gap?: number;
};

type PanelProps = {
  readonly eyebrow: string;
  readonly heading: string;
  readonly lines: readonly PanelLine[];
  /**
   * Frame each line appears at, measured from this step's own start. Without it
   * the lines fall out at a fixed stagger; with it they arrive exactly as they
   * are spoken.
   */
  readonly lineAt?: readonly number[];
  readonly stagger: number;
  readonly tone: string;
  readonly style?: React.CSSProperties;
};

const PanelInner: React.FC<PanelProps> = ({
  eyebrow,
  heading,
  lines,
  lineAt,
  stagger,
  tone,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = interpolate(frame, [0.1 * fps, 0.6 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(frame, [durationInFrames - 0.28 * fps, durationInFrames], [0, 1], {
    easing: Easing.bezier(0.4, 0, 1, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const life = enter * (1 - exit);

  return (
    <div
      style={{
        position: "absolute",
        left: 1060,
        top: 168,
        width: 800,
        height: 820,
        ...style,
      }}
    >
      <Interactive.Div
        name="Panel eyebrow"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: life,
          translate: `${interpolate(enter, [0, 1], [-24, 0]).toFixed(1)}px 0px`,
        }}
      >
        <div style={{ width: 40, height: 3, backgroundColor: tone }} />
        <div
          style={{
            fontFamily: sans,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
            color: tone,
          }}
        >
          {eyebrow}
        </div>
      </Interactive.Div>

      {heading ? (
        <Interactive.Div
          name="Panel heading"
          style={{
            marginTop: 20,
            fontFamily: sans,
            fontSize: 46,
            fontWeight: 700,
            lineHeight: 1.28,
            letterSpacing: -0.5,
            color: ink,
            opacity: life,
            translate: `${interpolate(enter, [0, 1], [-24, 0]).toFixed(1)}px 0px`,
          }}
        >
          {heading}
        </Interactive.Div>
      ) : null}

      {lines.map((l, i) => {
        const at = lineAt?.[i] ?? Math.round(0.7 * fps + i * stagger);
        const t = interpolate(frame, [at, at + 20], [0, 1], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <Interactive.Div
            key={i}
            name={`Panel row ${i + 1}`}
            style={{
              marginTop: (l.gap ?? 0) + 30,
              display: "flex",
              gap: 18,
              alignItems: "flex-start",
              opacity: t * life,
              translate: `${interpolate(t, [0, 1], [26, 0]).toFixed(1)}px 0px`,
            }}
          >
            <div
              style={{
                width: 34,
                flex: "0 0 34px",
                paddingTop: 7,
                fontFamily: sans,
                fontSize: 21,
                fontWeight: 700,
                color: l.emphasis ? tone : inkFaint,
                letterSpacing: 0.5,
              }}
            >
              {l.mark ?? ""}
            </div>
            <div
              style={{
                flex: 1,
                paddingBottom: 18,
                borderBottom: `1px solid ${line}`,
                fontFamily: sans,
                fontSize: 28,
                fontWeight: l.emphasis ? 700 : 500,
                lineHeight: 1.55,
                color: l.tone ?? (l.emphasis ? ink : inkMuted),
              }}
            >
              {l.node}
            </div>
          </Interactive.Div>
        );
      })}
    </div>
  );
};

const schema = {
  eyebrow: { type: "text-content", default: "", description: "Eyebrow" },
  heading: { type: "text-content", default: "", description: "Heading" },
  stagger: { type: "number", default: 26, min: 1, max: 120, description: "Reveal stagger", hiddenFromList: false },
  tone: { type: "color", default: "#2563EB", description: "Accent colour" },
} as const satisfies InteractivitySchema;

export const Panel = Interactive.withSchema({
  Component: PanelInner,
  componentName: "<Panel>",
  schema,
  wrapInSequence: true,
});

// ---------------------------------------------------------------------------

type StatementProps = {
  readonly series: string;
  readonly title: string;
  readonly lines: readonly PanelLine[];
  /** Same contract as the panel's: each line's cue frame, from this card's start. */
  readonly lineAt?: readonly number[];
  readonly outro?: boolean;
};

/**
 * The opening and closing cards. Everything sits inside one paper-coloured card
 * so a long statement still reads as a single object.
 */
export const StatementCard: React.FC<StatementProps> = ({
  series,
  title,
  lines,
  lineAt,
  outro,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = interpolate(frame, [0.08 * fps, 0.55 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(frame, [durationInFrames - 0.25 * fps, durationInFrames], [0, 1], {
    easing: Easing.bezier(0.4, 0, 1, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const life = enter * (1 - exit);

  return (
    <div style={{ position: "absolute", left: 1060, top: 168, width: 800, opacity: life }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 40, height: 3, backgroundColor: "#2563EB" }} />
        <div
          style={{
            fontFamily: sans,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
            color: "#2563EB",
          }}
        >
          {series}
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          marginBottom: 34,
          fontFamily: sans,
          fontSize: outro ? 50 : 54,
          fontWeight: 800,
          lineHeight: 1.26,
          letterSpacing: -1,
          color: ink,
        }}
      >
        {title}
      </div>

      <div
        style={{
          padding: "30px 34px",
          backgroundColor: "#FFFFFF",
          border: `1px solid ${line}`,
          borderRadius: 20,
        }}
      >
        {lines.map((l, i) => {
          const at = lineAt?.[i] ?? Math.round(0.6 * fps + i * 22);
          const t = interpolate(frame, [at, at + 20], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                opacity: t,
                translate: `${interpolate(t, [0, 1], [22, 0]).toFixed(1)}px 0px`,
                display: "flex",
                gap: 16,
                alignItems: "baseline",
                marginTop: i === 0 ? 0 : 16,
              }}
            >
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 22,
                  fontWeight: 800,
                  color: l.tone ?? inkFaint,
                  minWidth: 34,
                }}
              >
                {l.mark ?? ""}
              </div>
              <div
                style={{
                  flex: 1,
                  fontFamily: sans,
                  fontSize: 28,
                  fontWeight: l.emphasis ? 800 : 500,
                  lineHeight: 1.6,
                  color: l.tone ?? inkMuted,
                }}
              >
                {l.node}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** A short hand-written sentence, set in the body face. */
export const Say: React.FC<{ children: React.ReactNode; size?: number; tone?: string }> = ({
  children,
  size = 28,
  tone = inkMuted,
}) => (
  <span style={{ fontFamily: sans, fontSize: size, fontWeight: 500, color: tone }}>
    {children}
  </span>
);

/** Bold lead-in inside a line. */
export const Key: React.FC<{ children: React.ReactNode; tone?: string }> = ({
  children,
  tone = ink,
}) => <span style={{ fontFamily: sans, fontWeight: 800, color: tone }}>{children}</span>;