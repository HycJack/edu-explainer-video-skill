import { interpolate } from "remotion";
import { lineStarts, trackLength, trackOf, type NarrationTrack } from "./narration";
import type { Narration } from "./narration-types";
import { TIMING, type Chapter, type Content, type Params, type Step } from "./types";

/**
 * Content in, timeline out.
 *
 * This is the whole reason the framework exists: no step in a content file ever
 * mentions a frame number. Step durations come from how much text a step has,
 * and the figure's parameters glide from one step to the next automatically.
 *
 * With narration the same is true, only the numbers come from somewhere else:
 * the clock is the measured length of the speech, not a guess about reading
 * speed. See narration.ts.
 */

export type CompiledStep = {
  readonly step: Step;
  /** Render with the card component instead of the narration panel. */
  readonly card: boolean;
  readonly chapter: Chapter;
  readonly chapterIndex: number;
  readonly index: number;
  readonly from: number;
  readonly dur: number;
  /** The params this step settles on, after inheriting the previous step's. */
  readonly params: Params;
  /** The params in force when the step begins. */
  readonly fromParams: Params;
  readonly stagger: number;
  /** Frames the figure takes to travel to this step's numbers. */
  readonly glide: number;
  /** Measured narration for this step, if the problem has any. */
  readonly track?: NarrationTrack;
  /** When each line should appear, in frames from the step's own start. */
  readonly lineAt: readonly number[];
};

export type CompiledChapter = {
  readonly chapter: Chapter;
  readonly index: number;
  readonly from: number;
  readonly to: number;
};

export type Timeline = {
  readonly steps: readonly CompiledStep[];
  readonly chapters: readonly CompiledChapter[];
  readonly total: number;
  readonly defaults: Params;
  /**
   * Frames of opening statement card that precede the first body step. The
   * Rail needs it to translate composition frames onto the step clock, and it
   * is no longer always the same number — a narrated card is as long as its
   * speech.
   */
  readonly lead: number;
  /** Frames of body steps, excluding the cards. */
  readonly body: number;
  /** The frame rate this timeline was compiled at. */
  readonly fps: number;
  /** Keys carrying a measured quantity, so they glide; everything else switches. */
  readonly continuous: ReadonlySet<string>;
  /**
   * Whether the figure named any `continuous` keys at all. The earlier
   * single-scene figures don't bother: every one of their parameters is a
   * drawn quantity, so everything glides — which is how those films were timed.
   */
  readonly continuousDeclared: boolean;
};

/** Inherit-and-merge: a step only declares what it changes. */
const mergeParams = (base: Params, next?: Params): Params => {
  if (!next) return { ...base };
  const out: Params = { ...base };
  for (const [k, v] of Object.entries(next)) out[k] = v;
  return out;
};

/** How long a step runs, derived from how much narration it carries. */
const stepDuration = (step: Step): number => {
  if (step.frames !== undefined) return step.frames;
  const lines = step.lines?.length ?? 0;
  const stagger = step.stagger ?? TIMING.stagger;
  const hold = step.hold ?? 28;
  const reveal = lines === 0 ? 0 : (lines - 1) * stagger + TIMING.lineFade;
  return Math.max(TIMING.minStep, reveal + hold + TIMING.exit);
};

/** The statement and outro cards both run this long, at 9 × 0.9 s. */
export const CARD_FRAMES = (fps: number) => Math.round(0.9 * fps * 9);

/** Pseudo chapters so every compiled step belongs to something. */
const OPENING: Chapter = { id: "_open", label: "", steps: [] };
const CLOSING: Chapter = { id: "_close", label: "", steps: [] };

/**
 * The compiler lays out the ENTIRE film — opening card, body, closing card — so
 * that every consumer agrees on where each step starts. Splitting the layout in
 * two once put the figure a step ahead of its own narration.
 *
 * Without narration the numbers come out exactly where they used to, so every
 * already-shipped silent film recompiles unchanged.
 */
export const compile = (content: Content, narration?: Narration, fps = 30): Timeline => {
  const steps: CompiledStep[] = [];
  const chapters: CompiledChapter[] = [];

  let cursor = 0;
  let carried: Params = { ...(content.figure.defaults ?? {}) };
  let flat = 0;

  const push = (step: Step, chapter: Chapter, chapterIndex: number, card: boolean) => {
    const fromParams = carried;
    const params = mergeParams(carried, step.params);
    const lines = step.lines?.length ?? 0;

    // Speech wins: with narration a step lasts exactly as long as its voice
    // needs, plus a beat at each end. Without it the old line-count estimate
    // stands, and the film stays silent.
    const track = trackOf(narration, step.id);
    const dur = track
      ? Math.round((trackLength(track) + (card ? 0.9 : 0.7)) * fps)
      : card
        ? CARD_FRAMES(fps)
        : stepDuration(step);

    // Every reveal reads the same clock the audio was mixed against. This is
    // the value that keeps a sentence and its screen line in lockstep; the
    // fallback is the old fixed stagger.
    const lineAt = track
      ? lineStarts(track).map((s) => Math.round(s * fps))
      : Array.from({ length: lines }, (_, i) =>
          card
            ? Math.round(0.6 * fps + i * 22)
            : Math.round(0.7 * fps + i * (step.stagger ?? TIMING.stagger)),
        );

    steps.push({
      step,
      card,
      chapter,
      chapterIndex,
      index: flat++,
      from: cursor,
      dur,
      params,
      fromParams,
      stagger: step.stagger ?? TIMING.stagger,
      glide: step.glide ?? TIMING.transition,
      track,
      lineAt,
    });
    carried = params;
    cursor += dur;
  };

  if (content.statement.length > 0) {
    push(
      { id: "_statement", eyebrow: content.series, heading: content.title, lines: content.statement },
      OPENING,
      0,
      true,
    );
  }
  const lead = cursor;

  content.chapters.forEach((chapter, chapterIndex) => {
    const chapterFrom = cursor - lead;
    for (const step of chapter.steps) push(step, chapter, chapterIndex, false);
    chapters.push({ chapter, index: chapterIndex, from: chapterFrom, to: cursor - lead });
  });
  const body = cursor - lead;

  if (content.outro && content.outro.length > 0) {
    push(
      {
        id: "_outro",
        eyebrow: "总结",
        heading: content.outroHeading ?? content.title,
        lines: content.outro,
      },
      CLOSING,
      chapters.length,
      true,
    );
  }

  return {
    steps,
    chapters,
    total: cursor,
    lead,
    body,
    fps,
    defaults: { ...(content.figure.defaults ?? {}) },
    continuous: new Set(content.figure.continuous ?? []),
    continuousDeclared: content.figure.continuous !== undefined,
  };
};

/** Frames the opening statement card occupies before the first step. */
export const statementFrames = CARD_FRAMES;

/** Frames the closing card occupies, or zero when the content has none. */
export const outroFrames = (content: Content, fps: number) => (content.outro ? CARD_FRAMES(fps) : 0);

/**
 * The runtime of the whole film, cards included.
 *
 * Pass the narration when the film has one: a narrated step is longer than its
 * silent estimate, and a Composition timed without it would cut the last
 * sentence off mid-word.
 */
export const filmFrames = (content: Content, fps: number, narration?: Narration) =>
  compile(content, narration, fps).total;

/** The step in force at a given frame. */
export const stepAt = (timeline: Timeline, frame: number): CompiledStep | undefined =>
  timeline.steps.find((s) => frame >= s.from && frame < s.from + s.dur);

/** Parameters at an arbitrary frame, gliding between the steps on either side. */
export const paramsAt = (
  timeline: Timeline,
  frame: number,
  transition = TIMING.transition,
): Params => {
  const idx = timeline.steps.findIndex((s) => frame >= s.from && frame < s.from + s.dur);
  if (idx < 0) {
    return timeline.steps.length
      ? { ...(timeline.steps[timeline.steps.length - 1].params) }
      : { ...(timeline.defaults ?? {}) };
  }
  const s = timeline.steps[idx];

  // For the very first step the starting point is the figure's own defaults, so
  // the opening move (title-card hero fading out, first scene fading in) is an
  // animation rather than a jump.
  const from: Params = { ...s.fromParams };
  const out: Params = { ...from };
  const keys = new Set([...Object.keys(from), ...Object.keys(s.params)]);
  for (const k of keys) {
    const a = from[k] ?? 0;
    const b = s.params[k] ?? a;
    // A measured quantity — a block's position, a force's magnitude — glides
    // across the step's full `glide` so the motion can actually be watched. A
    // switch turns an element on or off, and the two directions must differ.
    //
    // Removing cuts. Holding the outgoing element up while the incoming one
    // fades in puts two contradictory scenes on screen at the same time — the
    // "frictionless" label sitting directly under the "rough" one — and the
    // eye reads that as ghosting. Drop it at once and the new scene is the
    // only thing there while it fades up.
    //
    // Adding fades in over `TIMING.switch` frames, which draws the eye to the
    // new element. Stretched across the whole `glide` — the original bug —
    // either direction leaves two whole scenes overlaid at full strength for
    // seconds.
    // Does this key carry a measured quantity? A figure that declares
    // `continuous` names them, and everything else is a switch. A figure that
    // declares none — the earlier single-scene ones, where every number is
    // something that gets drawn — animates all of them, which is how those
    // films were already timed.
    const measured = timeline.continuousDeclared
      ? timeline.continuous.has(k)
      : true;
    const span = measured
      ? s.glide ?? transition
      : b < a
        ? 1
        : TIMING.switch;
    const t = interpolate(frame, [s.from, s.from + span], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    out[k] = a + (b - a) * t;
  }
  return out;
};

/**
 * Reveal amount for one element.
 *
 * The ramp is linear, and that is the point. A switch takes one element from 1
 * to 0 while a sibling goes 0 to 1, and for a linear ramp f(v) + f(1 - v) = 1:
 * the total ink on screen stays constant all the way through, so the two read
 * as a clean crossfade. Any hard knee, such as the old [0, 0.02, 1] snap, drove
 * both sides to full strength within the same couple of frames, so two whole
 * scenes sat solid on top of each other and the eye read it as ghosting.
 */
export const revealAt = (p: Params, key: string, revealKey?: string): number => {
  const k = revealKey ?? key;
  const v = p[k];
  if (v === undefined) return 0;
  return Math.min(1, Math.max(0, v));
};