/**
 * `@remotion/fonts` replacement for the browser bundle.
 *
 * The real one calls `loadFont` from the bundler's asset pipeline; the player
 * declares the same two faces itself with `@font-face` in index.html, because
 * the files are served as plain static files rather than through Remotion's
 * bundle. Swallowing it here is what lets `fonts.ts` stay untouched.
 */

export const loadFont = (): Promise<void> => Promise.resolve();
export const getAvailableFonts = (): never[] => [];
export default { loadFont, getAvailableFonts };
