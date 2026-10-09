import type React from "react";

/**
 * The content contract.
 *
 * A problem is DATA. You declare chapters, steps, the words on screen and the
 * numbers that drive the figure — never frame numbers. The compiler turns that
 * into a timeline, and ProofVideo turns that into a movie.
 */

// ---------------------------------------------------------------------------
// The figure
// ---------------------------------------------------------------------------

export type Vec2 = readonly [number, number];

type Common = {
  /** Identity for reveal state. Defaults to `key`. */
  readonly key: string;
  /** Which parameter drives this element's reveal. Defaults to `key`. */
  readonly reveal?: string;
  /** Paint order. Higher sits on top. Defaults to 0. */
  readonly layer?: number;
};

export type SceneItem =
  | (Common & {
      readonly kind: "line";
      readonly from: Vec2;
      readonly to: Vec2;
      readonly stroke?: string;
      readonly width?: number;
      readonly dash?: string;
      readonly glow?: boolean;
      readonly opacity?: number;
    })
  | (Common & {
      readonly kind: "poly";
      readonly points: Vec2[];
      readonly fill?: string;
      /** Paint alpha, multiplied by the reveal. Defaults to 1. */
      readonly fillOpacity?: number;
      readonly stroke?: string;
      readonly strokeOpacity?: number;
      readonly width?: number;
      readonly dash?: string;
      readonly opacity?: number;
      readonly close?: boolean;
    })
  | (Common & {
      readonly kind: "circle" | "ellipse";
      readonly c: Vec2;
      readonly r: number;
      readonly ry?: number;
      readonly fill?: string;
      /** Paint alpha of the fill, multiplied by the reveal. Defaults to 1. */
      readonly fillOpacity?: number;
      readonly stroke?: string;
      readonly width?: number;
      readonly dash?: string;
      readonly opacity?: number;
      readonly rotate?: number;
    })
  | (Common & {
      readonly kind: "arrow";
      readonly from: Vec2;
      readonly to: Vec2;
      readonly stroke?: string;
      readonly width?: number;
      readonly head?: number;
      readonly dash?: string;
      readonly glow?: boolean;
      readonly opacity?: number;
      readonly label?: string;
      readonly labelDx?: number;
      readonly labelDy?: number;
      readonly labelColor?: string;
    })
  | (Common & {
      readonly kind: "marker";
      readonly at: Vec2;
      readonly r?: number;
      readonly fill: string;
      readonly ring?: string;
      readonly ringWidth?: number;
    })
  | (Common & {
      readonly kind: "text";
      readonly at: Vec2;
      readonly text: string;
      readonly sub?: string;
      readonly size?: number;
      readonly color?: string;
      readonly anchor?: "start" | "middle" | "end";
      readonly baseline?: "middle" | "auto";
      readonly italic?: boolean;
      readonly bold?: boolean;
      readonly family?: "sans" | "serif";
      readonly opacity?: number;
    })
  | (Common & {
      readonly kind: "path";
      readonly d: string;
      readonly fill?: string;
      /** Paint alpha of the fill, multiplied by the reveal. Defaults to 1. */
      readonly fillOpacity?: number;
      readonly stroke?: string;
      readonly width?: number;
      readonly dash?: string;
      readonly opacity?: number;
    });

export type Scene = {
  readonly width: number;
  readonly height: number;
  /** Faint graph-paper backdrop, drawn behind everything. */
  readonly grid?: number;
  readonly background?: string;
  readonly items: readonly SceneItem[];
};

/**
 * A figure is a pure function of the interpolated parameters. It runs again on
 * every frame, which is what lets a step animate geometry — not just fade it —
 * by changing a single number.
 */
export type FigureFn = ((p: Params) => Scene) & {
  /**
   * Parameters this figure starts switched on — the solid itself, its labels,
   * anything that is not a construction. Everything not listed here is OFF
   * until a step turns it on, which is what stops a later step's line from
   * leaking into an earlier one.
   */
  defaults?: Params;
  /**
   * Parameter keys that carry a *measured* quantity — a block's position, a
   * force's magnitude — and should therefore glide for the step's full `glide`
   * so the motion can be watched. Everything not listed here is a switch, and
   * switches run on a short clock of their own: a removal cuts, so the outgoing
   * scene is gone before the incoming one fades up, and an addition fades over
   * `TIMING.switch` frames. Sharing the long glide would leave two different
   * scenes both fully visible for seconds at once, which reads as ghosting.
   *
   * Opt-in. A figure that declares none of them animates every key across the
   * glide, which is how the earlier single-scene films were timed.
   */
  continuous?: readonly string[];
};

export type Params = Record<string, number>;

// ---------------------------------------------------------------------------
// The narration
// ---------------------------------------------------------------------------

export type NarrationLine = {
  /** Gutter mark, e.g. "1", "①", "✓". */
  readonly mark?: string;
  readonly node: React.ReactNode;
  readonly emphasis?: boolean;
  readonly tone?: string;
  /** Extra space above this line, in px. */
  readonly gap?: number;
};

export type Step = {
  readonly id: string;
  /** Small caps above the heading. Defaults to the chapter label. */
  readonly eyebrow?: string;
  readonly heading?: string;
  readonly lines?: readonly NarrationLine[];
  /**
   * The numbers this step drives the figure to. Anything not listed is
   * inherited from the previous step, so a step only says what it changes.
   */
  readonly params?: Params;
  /**
   * Frames the figure takes to travel from the previous step's numbers to
   * this step's. Defaults to TIMING.transition, which is a fine fade-in but
   * far too fast to *watch* a block accelerate — raise it for physics.
   */
  readonly glide?: number;
  /** Frames the narration rests once every line has appeared. */
  readonly hold?: number;
  /** Frames between successive line reveals. */
  readonly stagger?: number;
  /** Override the whole duration if the auto-timing is wrong for this step. */
  readonly frames?: number;
};

export type Chapter = {
  readonly id: string;
  /** Rail label. */
  readonly label: string;
  readonly steps: readonly Step[];
};

export type Content = {
  readonly id: string;
  /** Composition title, shown top-left. */
  readonly series: string;
  readonly title: string;
  readonly statement: readonly NarrationLine[];
  readonly figure: FigureFn;
  readonly chapters: readonly Chapter[];
  /** A closing card drawn over the finished figure. */
  readonly outro?: readonly NarrationLine[];
  readonly outroHeading?: string;
};

// ---------------------------------------------------------------------------
// Timing constants — the knobs a new problem rarely needs to touch
// ---------------------------------------------------------------------------

export const TIMING = {
  /** Frames a single narration line takes to fade in. */
  lineFade: 20,
  /** Frames between two narration lines. */
  stagger: 26,
  /** Frames the narration fades out at the end of a step. */
  exit: 14,
  /** Frames the figure takes to travel from one step's params to this step's. */
  transition: 26,
  /**
   * Frames an element takes to fade in when a switch turns it on. Kept far
   * shorter than `transition` on purpose: a switch turns one scene out and
   * another in, and sharing the long glide would leave two whole scenes
   * overlaid at full strength for seconds, which the eye reads as ghosting.
   * Turning a switch *off* does not use this at all — it cuts, because holding
   * the outgoing scene up while the incoming one fades in is exactly the ghost.
   * Measured quantities still use the step's full `glide`.
   */
  switch: 12,
  /** Never let a step run shorter than this. */
  minStep: 60,
} as const;