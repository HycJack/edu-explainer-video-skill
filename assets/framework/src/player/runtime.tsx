import React from "react";

/**
 * A Remotion-compatible runtime, about 200 lines, for the browser player.
 *
 * The render pipeline still uses Remotion. This exists so the web player does
 * not: the composition only ever asked for a handful of primitives —
 * a frame number, a video config, `interpolate`, and two layout wrappers —
 * and all of them are specified behaviour, not secret machinery.
 *
 * esbuild aliases `remotion` to this file, so `ProofVideo` is unchanged and
 * byte-identical between the two surfaces.
 */

// ---------------------------------------------------------------- context

type VideoConfig = {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
};

const FrameContext = React.createContext<number>(0);
const ConfigContext = React.createContext<VideoConfig>({
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 1,
});

export const useCurrentFrame = (): number => React.useContext(FrameContext);
export const useVideoConfig = (): VideoConfig => React.useContext(ConfigContext);

// ---------------------------------------------------------------- easing

const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  // CSS `cubic-bezier()`: solve x(t) = progress for t, then read y(t). Newton
  // first, bisection when it does not converge — the same solver browsers use.
  const A = (a: number, b: number) => 1 - 3 * b + 3 * a;
  const B = (a: number, b: number) => 3 * b - 6 * a;
  const C = (a: number) => 3 * a;
  const calc = (t: number, a: number, b: number) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t: number, a: number, b: number) =>
    3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);

  const tForX = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = slope(t, x1, x2);
      if (d === 0) break;
      t -= (calc(t, x1, x2) - x) / d;
    }
    if (t < 0 || t > 1) {
      let lo = 0;
      let hi = 1;
      t = x;
      for (let i = 0; i < 20; i++) {
        t = (lo + hi) / 2;
        if (calc(t, x1, x2) < x) lo = t;
        else hi = t;
      }
    }
    return t;
  };

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return calc(tForX(x), y1, y2);
  };
};

type EasingFn = (t: number) => number;

export const Easing = {
  bezier: (x1: number, y1: number, x2: number, y2: number): EasingFn => bezier(x1, y1, x2, y2),
  linear: (): EasingFn => (t) => t,
  quad: (): EasingFn => (t) => t * t,
  cubic: (): EasingFn => (t) => t * t * t,
  inOut: (fn: EasingFn) => fn,
  identity: (): EasingFn => (t) => t,
};

// ---------------------------------------------------------------- interpolate

type Extrapolate = "extend" | "identity" | "clamp";

type InterpolateOptions = {
  easing?: EasingFn;
  extrapolateLeft?: Extrapolate;
  extrapolateRight?: Extrapolate;
};

/** Remotion interpolates unit-carrying strings too: "0%" → "12.5%", "0px" → "4px". */
const splitUnit = (value: string | number): [number, string] => {
  if (typeof value === "number") return [value, ""];
  const match = /^\s*([+-]?(?:\d+\.?\d*|\.\d+))(.*)$/.exec(value);
  if (!match) return [0, ""];
  return [Number(match[1]), match[2] ?? ""];
};

export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly (number | string)[],
  options: InterpolateOptions = {},
): number | string {
  const { easing = (t) => t, extrapolateLeft = "extend", extrapolateRight = "extend" } = options;
  if (inputRange.length === 0) throw new Error("interpolate: inputRange is empty");

  const last = inputRange.length - 1;

  // Extrapolation is only a question for input OUTSIDE the range. Applying it
  // inside as well is the bug that turns a perfectly ordinary mid-range lookup
  // into the endpoint value.
  const outsideLeft = input < inputRange[0];
  const outsideRight = input > inputRange[last];
  // "identity" returns the INPUT unchanged, not the output endpoint. Easy to
  // guess as outputRange[0] and wrong in a way no type checker sees.
  if (outsideLeft && extrapolateLeft === "identity") return input;
  if (outsideRight && extrapolateRight === "identity") return input;

  let i = 0;
  while (i < last - 1 && input >= inputRange[i + 1]) i++;

  const x0 = inputRange[i];
  const x1 = inputRange[i + 1] ?? x0;
  const y0 = outputRange[i];
  const y1 = outputRange[i + 1] ?? y0;

  let t = x1 === x0 ? 0 : (input - x0) / (x1 - x0);
  const mode: Extrapolate = outsideLeft ? extrapolateLeft : outsideRight ? extrapolateRight : "extend";
  if (mode === "clamp") t = Math.max(0, Math.min(1, t));
  // "extend" leaves t outside [0,1] on purpose; the easing itself may still
  // bend it, which is what the framework's bezier easings rely on.
  t = easing(t);

  // Numeric in, numeric out stays a NUMBER. Returning "0.5" breaks every
  // caller that does arithmetic or `.toFixed()` on the result — and the
  // framework does both, in compile.ts and in every animated style.
  if (typeof y0 === "number" && typeof y1 === "number") {
    return y0 + (y1 - y0) * t;
  }

  const [ay, au] = splitUnit(y0);
  const [by, bu] = splitUnit(y1);
  const unit = au || bu;
  // Remotion rounds unit strings to 6 decimals before stringifying; matching
  // that keeps the two implementations literally interchangeable.
  return `${Number((ay + (by - ay) * t).toFixed(6))}${unit}`;
}

// ---------------------------------------------------------------- layout

export const AbsoluteFill: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      ...style,
    }}
  >
    {children}
  </div>
);

type SequenceProps = {
  children?: React.ReactNode;
  from?: number;
  durationInFrames?: number;
  premountFor?: number;
  name?: string;
  /** Series injects the offset it computed. */
  __from?: number;
};

/**
 * Mounts children only inside their window, and rebases the frame so they see
 * their own zero. Rebasing is the whole contract — every reveal animation in
 * the framework is written against "frames since my step started".
 */
const SequenceInner: React.FC<SequenceProps> = ({
  children,
  from = 0,
  durationInFrames,
  premountFor = 0,
  __from,
}) => {
  const frame = useCurrentFrame();
  const cfg = useVideoConfig();
  const start = (__from ?? 0) + from;
  const end = durationInFrames === undefined ? Infinity : start + durationInFrames;
  // premountFor widens the mount window without shifting the rebased frame, so
  // a child mounted early still animates from its own frame 0.
  const open = frame >= start - premountFor && frame < end;

  if (!open) return null;
  // A Sequence also restates the VIDEO CONFIG: within one, `useVideoConfig()`
  // reports the sequence's own durationInFrames, not the composition's. The
  // panel's exit fade is written against exactly that number, so without this
  // every step would hard-cut instead of fading out at its own end.
  const inner = React.useMemo(
    () => (durationInFrames === undefined ? cfg : { ...cfg, durationInFrames }),
    [cfg, durationInFrames],
  );
  return (
    <ConfigContext.Provider value={inner}>
      <FrameContext.Provider value={frame - start}>{children}</FrameContext.Provider>
    </ConfigContext.Provider>
  );
};

export const Sequence = Object.assign(SequenceInner, { Sequence: SequenceInner });

/**
 * Lays children end to end. Remotion does this by reading each child's
 * durationInFrames and handing it a computed offset; so does this.
 */
const SeriesInner: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const items = React.Children.toArray(children).filter((c) => React.isValidElement(c));
  let cursor = 0;
  return (
    <>
      {items.map((child, i) => {
        const props = (child as React.ReactElement<SequenceProps>).props;
        const dur = props.durationInFrames ?? 0;
        const el = React.cloneElement(child as React.ReactElement<SequenceProps>, { __from: cursor });
        cursor += dur;
        return React.cloneElement(el, { key: (child as React.ReactElement).key ?? i });
      })}
    </>
  );
};
export const Series = Object.assign(SeriesInner, { Sequence: Sequence });

// ---------------------------------------------------------------- assets

export const staticFile = (path: string): string => `./${String(path).replace(/^\//, "")}`;

// ---------------------------------------------------------------- interactivity

/**
 * `Interactive` is Remotion Studio's editing affordance — named, draggable
 * layers. In a player it only has to render the element it wraps. The wrappers
 * pass props straight through, so the composition is unchanged.
 */
const passthrough = (tag: "div" | "svg") =>
  function InteractiveEl<T extends Record<string, unknown>>({
    name,
    style,
    children,
    ...rest
  }: { name?: string; style?: React.CSSProperties; children?: React.ReactNode } & T) {
    if (tag === "svg") {
      const { viewBox, width, height, ...svgRest } = rest as Record<string, unknown>;
      return (
        <svg viewBox={viewBox as string} width={width as string} height={height as string} style={style} {...svgRest}>
          {children}
        </svg>
      );
    }
    return (
      <div style={style} {...rest}>
        {children}
      </div>
    );
  };

export const Interactive = {
  Div: passthrough("div"),
  Svg: passthrough("svg"),
  withSchema: <P,>(opts: {
    Component: React.ComponentType<P>;
    componentName?: string;
    schema?: unknown;
    wrapInSequence?: boolean;
    supportsEffects?: boolean;
  }) => {
    // wrapInSequence is a Studio convenience that starts the component at the
    // sequence's own frame 0. Everything that uses it here is already inside a
    // Sequence, so it is a no-op.
    const Wrapped = opts.Component;
    const display = (opts.componentName ?? opts.Component.name ?? "Component").replace(/[<>]/g, "");
    Wrapped.displayName = display;
    return Wrapped as React.ComponentType<P>;
  },
};

// ---------------------------------------------------------------- render tree

export const RemotionProvider: React.FC<{
  fps: number;
  durationInFrames: number;
  width?: number;
  height?: number;
  frame: number;
  children: React.ReactNode;
}> = ({ fps, durationInFrames, width = 1920, height = 1080, frame, children }) => (
  <ConfigContext.Provider
    value={React.useMemo(
      () => ({ width, height, fps, durationInFrames }),
      [width, height, fps, durationInFrames],
    )}
  >
    <FrameContext.Provider value={frame}>{children}</FrameContext.Provider>
  </ConfigContext.Provider>
);

export const useSafeRemotionContext = () => ({
  fps: useVideoConfig().fps,
  durationInFrames: useVideoConfig().durationInFrames,
});

export type InteractivitySchema = Record<string, unknown>;
export default { useCurrentFrame, useVideoConfig };