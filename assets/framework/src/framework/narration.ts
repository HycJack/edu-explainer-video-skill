import type { Narration } from "./narration-types";

/**
 * Measured speech, when there is any.
 *
 * This is the whole point of measuring rather than estimating: a step is only
 * as long as the voice it has to carry. With narration present the compiler
 * stops guessing a line-count hold and uses the real durations; without it, the
 * old estimate stands and the video stays silent.
 */
export type NarrationTrack = {
  readonly stepId: string;
  /** Duration in seconds of each spoken line, in order. */
  readonly durations: readonly number[];
  /** Seconds of silence after the last line, and between lines. */
  readonly gap: number;
  /** Seconds before the first line starts. */
  readonly lead: number;
};

export const trackOf = (
  narration: Narration | undefined,
  stepId: string,
): NarrationTrack | undefined => {
  // The compiler names the opening and closing cards `_statement` / `_outro`;
  // a hand-written script should not have to know that, so both spellings work.
  const table = narration?.steps;
  const step =
    table?.[stepId] ?? (stepId.startsWith("_") ? table?.[stepId.slice(1)] : undefined);
  if (!step || !step.lines?.length) return undefined;
  const durations = step.lines.map((l) => l.duration);
  if (!durations.length || durations.some((d) => !(d > 0))) return undefined;
  return {
    stepId,
    durations,
    gap: narration?.gap ?? 0.25,
    lead: narration?.lead ?? 0.35,
  };
};

/** Total spoken length of a track, including the gaps. */
export const trackLength = (t: NarrationTrack): number => {
  const spoken = t.durations.reduce((a, b) => a + b, 0);
  return spoken + t.gap * Math.max(0, t.durations.length - 1) + t.lead;
};

/**
 * When each line should appear, measured from the start of its step.
 * The tail is what the panel needs to know so the last line does not get
 * clipped by the step's own exit.
 */
export const lineStarts = (t: NarrationTrack): number[] => {
  const out: number[] = [];
  let at = t.lead;
  for (const d of t.durations) {
    out.push(at);
    at += d + t.gap;
  }
  return out;
};
