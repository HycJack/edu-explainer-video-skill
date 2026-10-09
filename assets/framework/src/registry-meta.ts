export const FPS = 30;
/** Only used by the "registry" placeholder composition. */
export const TOTAL = 60;

/**
 * Every film is bookended by a statement card and an outro card, and those
 * cards live OUTSIDE the compiled steps. A composition that reserves only the
 * step total gets truncated mid-argument — the closing lines and the whole
 * outro never reach the screen. Both the renderer and the composition length
 * read these, so there is one source of truth for how long a card is.
 */
export const CARD_SECONDS = 8.1;

export const cardFrames = (fps: number): number => Math.round(CARD_SECONDS * fps);

/** Statement card + every step + outro card (when the content has one). */
export const totalFrames = (steps: number, fps: number, hasOutro: boolean): number =>
  steps + cardFrames(fps) * (hasOutro ? 2 : 1);
