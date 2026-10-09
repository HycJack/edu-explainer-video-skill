# Writing a figure builder

A builder is **a pure function from parameters to a list of drawing primitives**.
It contains no animation logic, no frame handling, no React state. Everything
temporal has already been flattened into the parameters by the time it runs.

```ts
export const myFigure = (opts: MyOptions) => {
  const figure = (p: Params): Scene => {
    const items: SceneItem[] = [];
    // … push primitives …
    return { width: 900, height: 600, items };
  };

  figure.defaults = { box: 1 };   // the base figure is on from frame zero
  return figure;
};
```

## Primitives

| `kind` | Fields | Reveal behaviour |
|---|---|---|
| `line` | `from`, `to` | grows from `from` toward `to` |
| `arrow` | `from`, `to`, `head`, `label` | grows, arrowhead scales in |
| `poly` | `points`, `fill`, `stroke`, `fillOpacity` | fades |
| `circle` / `ellipse` | `c`, `r`, `ry` | pops from zero |
| `marker` | `at`, `r`, `fill`, `ring` | pops, with an optional halo |
| `text` | `at`, `text`, `sub`, `size`, `italic`, `bold`, `family` | fades |
| `path` | `d` | fades |

Every item takes:

- `key` — **this is the param name.** `{ key: "aux:x" }` is switched on by
  `params: { "aux:x": 1 }`.
- `reveal` — use a different param to drive this item's reveal. This is how a
  whole group shares one switch: give every label `reveal: "labels"`.
- `layer` — paint order, higher sits on top. Sort is stable, so order within a
  layer is preserved.

## Two rules that matter

**1. Endpoints may depend on the parameters.**

```ts
{ key: "seg", kind: "line", from: pt(A), to: movingPoint(p.t) }
```

This is the whole difference between a figure that fades in and a figure that
*is* the geometry. A point sliding along an edge, a line rotating to a given
slope, a curve whose parameter sweeps — all just a function of `p`.

**2. Nothing is on unless `defaults` or a step says so.**

If you find yourself wondering "should this line be visible?", the answer is no.
A step that explains a line should introduce it. Anything visible before its
step is a spoiler.

## Projection

Do the coordinate maths once, at the top, outside the returned function.

```ts
const raw = ([x, y, z]: P3): Vec2 => [ /* basis vectors */ ];
const OX = WIDTH / 2 - (bounds.minX + bounds.maxX) / 2;   // centre it once
const sc = (p: P3): Vec2 => { const q = raw(p); return [q[0] + OX, q[1] + OY]; };
```

`cuboid.ts` uses an oblique projection with the hidden vertex pushed away, which
is what a textbook draws. Copy that file as the reference for a 3D solid.

## Extras the cuboid builder supports

`cuboidFigure({ aux, patches, points, rightAngles })` shows the pattern for the
pieces a geometry figure needs:

- **`aux`** — named construction lines. `to` may be a function of params, so a
  line can follow a moving endpoint.
- **`points`** — named free points with optional labels, also param-driven.
- **`patches`** — translucent plane patches. Keep `fillOpacity` low; an opaque
  face hides everything under it.
- **`rightAngles`** — right-angle markers at `at`, sized by `size`, using `along`
  and `across` for the two directions.

## No-figure problems

Not every problem needs a diagram. Return an empty scene:

```ts
export const blankFigure = () => {
  const figure = (): Scene => ({ width: 920, height: 780, items: [] });
  return figure;
};
```

The narration carries the whole step. This is worth supporting — inequality and
sequence problems are often clearer without a picture.

## Checklist before rendering

- [ ] Every `key` is a legal JS identifier fragment — it is used as a param name
- [ ] `defaults` lists everything that should be visible before the first step
- [ ] Nothing outside `defaults` appears on frame 0
- [ ] Labels don't collide with lines at the extreme parameter values
- [ ] The scene's aspect ratio roughly matches the 940×800 stage slot
