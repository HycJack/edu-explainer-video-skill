# The Content API

A problem is one `Content` object. Everything below is what you can declare.

```ts
type Content = {
  id: string;               // also the Composition id and the registry key
  series: string;           // top-left running title, e.g. "立体几何 · 空间向量法"
  title: string;            // the opening / closing card headline
  statement: NarrationLine[];   // the problem statement card
  figure: FigureFn;             // params -> Scene
  chapters: Chapter[];
  outro?: NarrationLine[];
  outroHeading?: string;
};
```

## Chapter

```ts
{ id: string; label: string; steps: Step[] }
```

`label` is what appears in the top rail. Chapters drive navigation; steps drive
content. Group steps into 3–6 chapters — more than that and the rail gets noisy.

## Step

```ts
{
  id: string;
  eyebrow?: string;              // small caps above the heading; defaults to the chapter label
  heading?: string;
  lines?: NarrationLine[];
  params?: Params;               // what this step CHANGES; rest is inherited

  hold?: number;                 // frames the narration rests after the last line (default 28)
  stagger?: number;              // frames between line reveals (default 26)
  frames?: number;               // override the whole duration; rare

  glide?: number;                // frames the FIGURE takes to travel here (default
                                 // TIMING.transition = 26 — a fine fade-in, far too
                                 // fast to watch a block accelerate; raise it for physics)
}
```

Duration is `(lines.length - 1) × stagger + lineFade + hold + exit`, floored at
`minStep`. If a step feels rushed, raise `hold` — do **not** start writing frame
numbers.

## NarrationLine

```ts
{ mark?: string; node: ReactNode; emphasis?: boolean; tone?: string; gap?: number }
```

- `mark` — the gutter glyph: `"1"`, `"①"`, `"✓"`, `"★"`. Small marks, they must
  not compete with the maths.
- `emphasis` — bold, and coloured with the step tone.
- `tone` — overrides the step's colour for this line. Use it to key a result to
  the colour of the line it refers to on the figure.
- `gap` — extra space above, in px, when a step has a beat to breathe.

## Params

`Record<string, number>`. A param drives one thing:

- a figure element's reveal, if the param name equals that element's `reveal` key
- anything your figure function chooses to read

There is no fixed vocabulary. `params: { k: 1.4142 }` can be a slope your figure
reads directly to place a line. Continuous parameters are what make a figure
*move* rather than fade in.

**Two kinds of key, two clocks** (see lessons-learned #6). A key that carries a
*measured* quantity — a position, a magnitude — glides across the step's full
`glide`. A key that turns an element on or off is a **switch**: it cuts off in one
frame and fades on over `TIMING.switch`. Giving a switch the long glide leaves two
whole scenes overlaid at full strength, which the eye reads as ghosting.

The figure declares which is which via `continuous` (below).

## FigureFn

```ts
type FigureFn = ((p: Params) => Scene) & {
  defaults?: Params;
  continuous?: readonly string[];   // keys carrying a MEASURED quantity
};
```

The function runs on **every frame** with the interpolated parameters. Attach
`defaults` for whatever should be switched on from frame zero — the base figure
itself. **Everything not in `defaults` is off**, and a step turns it on.

`continuous` is **opt-in**. List the keys whose numbers must be watchable while
they travel; every other key is treated as a switch. A figure that declares none
animates every key across the glide, which is how the earlier single-scene films
were already timed — so existing figures keep their behaviour without touching
this field.

## Timing constants

```ts
TIMING = {
  lineFade: 20,    // one line fading in
  stagger: 26,     // gap between lines
  exit: 14,        // narration fading out at the end of a step
  transition: 26,  // figure travelling between two steps
  switch: 12,      // a switch turning ON; turning off cuts in 1 frame
  minStep: 60,
}
```

`switch` is deliberately much shorter than `transition`. A switch hands one scene
over to another, and sharing the long glide leaves both at full strength at once.

Change these once in `src/framework/types.ts` to restyle the whole film.

## Querying the compiled timeline

```ts
import { compile, paramsAt, stepAt } from "./framework/compile";

const tl = compile(content);
tl.total;                 // runtime in frames
tl.chapters;              // rail navigation
tl.steps[i].fromParams;   // what the figure held before this step
```

## Registering

```ts
import { registerContent } from "../framework/registry";
registerContent(content);
```

Module scope, and import the file from `src/index.ts` so the side effect runs
before `registerRoot`.
