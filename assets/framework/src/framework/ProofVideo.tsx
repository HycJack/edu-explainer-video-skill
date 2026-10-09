import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  Series,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { compile, paramsAt } from "./compile";
import { getContent } from "./registry";
import { getNarration } from "../narration";
import { Panel, StatementCard, type PanelLine } from "./Panel";
import { Rail } from "./Rail";
import { SceneView } from "./Scene";
import { paper } from "./theme";
import type { Content, NarrationLine } from "./types";

/**
 * The one composition. Give it a Content object and you have a film.
 *
 * Everything below the registry call is problem-agnostic: the compiler works out
 * every frame number, the figure glides between steps on its own, and the
 * narration just reads the step it happens to be inside.
 *
 * The timeline now includes the opening and closing cards, so the composition
 * clock and the step clock are the same clock. `bodyFrame` is only used to feed
 * the figure its own coordinates, which still start counting at the first body
 * step.
 *
 * Narration is looked up by content id and may well not exist — every problem
 * ships silent until someone writes `narration/<id>.json`. When it does exist,
 * `compile` takes its measured durations as the authority, so the picture and
 * the voice are two consumers of one set of numbers and cannot drift.
 */

const linesOf = (x?: readonly NarrationLine[]): readonly PanelLine[] => x ?? [];

/**
 * Takes a content ID, never a Content object: a Composition's defaultProps are
 * serialised into the bundle, and a Content carries React nodes and functions
 * that would not survive the trip.
 */
export const ProofVideo: React.FC<{ contentId: string; silent?: boolean }> = ({
  contentId,
  silent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const content: Content = getContent(contentId);
  // `silent` compiles without speech even when a narration track exists: the
  // interactive player offers both cuts of the same problem, and the silent one
  // is a different film, not a muted one — steps are shorter because nothing is
  // waiting on a voice. Same component, same data, two timelines.
  const narration = silent ? undefined : getNarration(contentId);
  const timeline = useMemo(() => compile(content, narration, fps), [content, narration, fps]);
  const bodyFrame = Math.max(0, frame - timeline.lead);
  const params = useMemo(() => paramsAt(timeline, frame), [timeline, frame]);
  const scene = useMemo(() => content.figure(params), [content, params]);

  const step = timeline.steps.find((s) => frame >= s.from && frame < s.from + s.dur);

  const zoom = interpolate(bodyFrame, [0, Math.max(1, timeline.body - 1)], [0.985, 1.02], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: paper }} >
      <Interactive.Div
        name="Grid"
        style={
          {
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(22,32,43,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(22,32,43,0.035) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          } as React.CSSProperties
        }
      />

      <div
        style={
          {
            position: "absolute",
            left: 80,
            top: 150,
            width: 940,
            height: 800,
            scale: zoom,
            transformOrigin: "50% 50%",
          } as React.CSSProperties
        }
      >
        <SceneView scene={scene} params={params} />
      </div>

      <Rail chapters={timeline.chapters} total={timeline.total} series={content.series} offset={timeline.lead} />

      <Series>
        {timeline.steps.map((s) => {
          const lines = linesOf(s.step.lines);
          const name = s.step.heading ?? s.step.id;
          return s.card ? (
            <Series.Sequence key={s.step.id} name={name} durationInFrames={s.dur} premountFor={fps}>
              <StatementCard
                series={s.step.eyebrow ?? ""}
                title={s.step.heading ?? ""}
                lines={lines}
                lineAt={s.lineAt}
                outro={s.step.id === "_outro"}
              />
            </Series.Sequence>
          ) : (
            <Series.Sequence key={s.step.id} name={name} durationInFrames={s.dur} premountFor={fps}>
              <Panel
                eyebrow={s.step.eyebrow ?? s.chapter.label}
                heading={s.step.heading ?? ""}
                lines={lines}
                lineAt={s.lineAt}
                stagger={s.stagger}
                tone={s.step.lines?.find((l) => l.tone)?.tone ?? "#2563EB"}
              />
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
