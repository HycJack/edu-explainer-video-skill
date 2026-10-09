import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/**
 * Self-hosted CJK subsets so rendering never depends on Google Fonts.
 *
 * The `text=` subset API returns one variable file per family, so a single
 * @font-face covers the whole weight range. Noto Serif SC ships no true italic,
 * so math variables get a synthesised oblique — the usual treatment for
 * geometric text faces, and it reads correctly for single-letter variables.
 *
 * `loadFont` returns a promise and rejects on a later tick. Outside a browser —
 * the timeline/tts scripts run in plain Node — `staticFile` yields a path with
 * no origin and the fetch fails; an unhandled rejection there takes out every
 * module that imported this one, and surfaces two layers away as
 * "No content registered". So swallow both the throw and the rejection; the
 * fonts are cosmetic in those contexts and still load normally in the render.
 */
const registerFont = (opts: Parameters<typeof loadFont>[0]): void => {
  try {
    const p = loadFont(opts);
    if (p && typeof (p as Promise<unknown>).catch === "function") {
      (p as Promise<unknown>).catch(() => {});
    }
  } catch {
    /* non-browser context: nothing to load */
  }
};

registerFont({
  family: "Noto Sans SC",
  url: staticFile("fonts/sans-400.woff2"),
  format: "woff2",
  weight: "400 900",
  display: "block",
});

registerFont({
  family: "Noto Serif SC",
  url: staticFile("fonts/serif-400.woff2"),
  format: "woff2",
  weight: "400 900",
  display: "block",
});

export const sans = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
export const serif = '"Noto Serif SC", "Songti SC", Georgia, serif';
