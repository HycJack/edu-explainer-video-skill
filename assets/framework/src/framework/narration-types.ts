/** Shape of the JSON that scripts/tts.mjs writes into src/narration/. */
export type NarrationLine = {
  readonly text: string;
  /** Public path of the clip, relative to the project root. */
  readonly file: string;
  /** Measured length in seconds. */
  readonly duration: number;
};

export type Narration = {
  readonly id: string;
  readonly voice?: string;
  readonly speed?: number;
  readonly gap?: number;
  readonly lead?: number;
  readonly steps: Record<string, { lines: NarrationLine[]; gap?: number }>;
};
