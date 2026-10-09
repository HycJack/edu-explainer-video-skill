# Lessons learned

Four bugs that made it through a type check, a bundler and most of a render.
Every one produced a rule. Read this before your first render.

---

## 1. It drew a right angle between two lines that never meet

**What happened.** Proving `B₁E ⊥ AD₁` in a cuboid. The vectors were right, the
dot product was zero, the conclusion was right. The figure put a right-angle
marker at the crossing point of `AD₁` and `B₁E`.

Those two segments are **skew**. Solving the two parametric lines simultaneously
gives `t = 2` and `t = -1` — no shared point exists. The segment `AD₁` does not
intersect the segment `B₁E` anywhere.

**Why it happened.** Perpendicularity in 3D is a statement about *directions*, not
about intersection. The drawing assumed the school-desktop picture where
perpendicular lines cross.

**The fix, and the rule.** For skew lines, run one parallel to the other through
a point on it, and put the angle there. In this case: through the midpoint of
`AD₁`, draw a line parallel to `B₁E`.

> **Rule 1.** When a figure asserts a geometric fact, solve the geometry yourself
> before you look at the picture. A figure that is *plausible* is not a figure
> that is *right*, and a plausible wrong figure is the most expensive kind of
> wrong — it reads as proof.

---

## 2. Undefined parameter defaulted to "visible"

**What happened.** After the figure became parameter-driven, an auxiliary line
belonging to step 8 was on screen from step 3.

**Why it happened.** Undefined resolved to fully revealed. Defensible as a
default — it is one less thing to write. Fatal for a narrated video, where every
frame is an argument: a line before its explanation is a spoiler.

**The rule.** Anything not explicitly switched on is **off**. The figure declares
what is on from frame zero in `defaults`; every construction waits for its step.

> **Rule 2.** Defaults are product decisions, not implementation details. A
> default you did not choose is a decision the code made for you.

---

## 3. 97 characters that would never render

**What happened.** Chinese text uses a Google Fonts `text=` subset — 365
characters, 76 KB, instead of a 10 MB family file. A script compared the
characters in the sources against the characters in the subset and found 97
missing, all from copy added after the subset was last built.

Missing glyphs render as tofu boxes. This appears nowhere in the code, nowhere
in the type checker, and only partway through a render.

**The rule.** Subset by *what you actually wrote*, checked mechanically.

```bash
npm run fonts    # scan sources, rebuild subset
npm run check    # fail if sources use a character the subset lacks
```

> **Rule 3.** The last mile of a pipeline — fonts, encoding, codecs, export — is
> where bugs hide, because nothing validates it until the artefact exists. Put a
> cheap gate in front of it and let CI run it.

---

## 4. `fillOpacity` and reveal opacity were the same number

**What happened.** Moving from hand-written SVG to a shared primitive renderer
introduced a plane patch that rendered opaque instead of translucent, burying
every line inside it.

**Why it happened.** One field did two jobs: *how visible is this* and *how
opaque is the paint*. Those are unrelated quantities.

**The rule.** If a primitive has both a reveal and a visual alpha, they are two
fields. A renderer that conflates them will look fine until an element is drawn
at full opacity and nothing under it shows.

> **Rule 4.** The abstraction is where coupling hides. Check that a shared
> primitive cannot silently collapse two independent parameters into one.

---

## 5. The composition ran on a different clock than the figure

**What happened.** A six-chapter film rendered with its statement card and its
whole outro missing — the last lines of the argument never reached the screen.

**Why it happened.** `<Series>` gives every child a *local* clock, but the figure
read the composition's *global* `frame`. Once the statement card was sequenced in
front of the steps, the global clock ran one card ahead of the timeline the
compiler produced. Three places disagreed: the composition's
`durationInFrames` (steps only), the figure's `paramsAt`, and the chapter rail's
`active` index.

**The rule.** When a sequence wraps the body, the body is the one that is offset.
`durationInFrames` must be `compile(content).total + statementFrames + outroFrames`,
and every consumer of the step clock subtracts the same offset.

> **Rule 5.** A `<Sequence>` / `<Series>` wrapper silently renumbers time for
> everything inside it. Any frame number that crosses that boundary needs the
> offset applied — and the composition length needs it too.

---

## 6. Switches and measured quantities cannot share one clock

**What happened.** A physics film showed the "frictionless" label directly under
the "rough surface" label for seconds at a time; another looked like every
element was briefly printed twice.

**Why it happened.** Two bugs sharing one cause. First, every parameter was
interpolated across the step's full `glide`, including parameters that only turn
a scene element on or off — so a whole outgoing scene stayed at full strength
while a whole incoming scene faded up. Second, the reveal ramp had a hard knee at
`[0, 0.02, 1]`, which drove both sides of a crossfade to full opacity within two
frames. For a linear ramp `f(v) + f(1 - v) = 1`, so the total ink on screen stays
constant and the eye reads a clean handover; any knee breaks that.

**The rule.** A figure declares which keys carry a *measured* quantity
(`continuous`). Those glide across the step. Everything else is a switch: turning
it **off** cuts in one frame, turning it **on** fades over `TIMING.switch`
(≈ 12 frames) — never the long glide. Reveal stays linear.

> **Rule 6.** "How long does this take" is not one number. A value that moves has
> to be watchable; a value that turns on and off has to get out of the way.

---

## 7. A glow filter silently deleted axis-aligned lines

**What happened.** Lines flagged `glow: true` rendered normally at most angles and
disappeared entirely when horizontal or vertical.

**Why it happened.** SVG filter regions default to `objectBoundingBox` units. A
perfectly horizontal line has a zero-height bbox, so the `220%` region collapsed
to nothing and the element was clipped away.

**The rule.** Size filter regions in user space against the scene, not against the
element: `filterUnits="userSpaceOnUse"` with `x/y/width/height` derived from the
scene box.

> **Rule 7.** Percentage geometry on a degenerate bounding box is zero. Anything
> measured in fractions of an element must have a plan for a flat one.

---

## The pattern

None of these lived in the syntax layer, the type layer, or the algorithm layer.

All seven lived in **something nobody thought to declare**: an offset, a second
clock, a unit.

That is the whole argument for the framework's core rule: *no frame numbers in
content, every parameter explicit*. It is not about tidiness. It is about forcing
the undeclared things to become declared.

---

## Render discipline

Two of these were invisible until late in a render. Do not skip the cheap checks.

```bash
npm run check                                                  # charset + tsc

npx remotion still my-problem out/f420.png --frame=420         # look at one frame

npx remotion render my-problem out/frames \
  --frames=0,120,300,480,700 --image-format=png                # sample the arc
f=0,120,300,480,700; \
  ffmpeg -v error $(for t in $f; do echo -n "-i out/frames/element-$t.png "; done) \
  -filter_complex "[0][1][2][3]hstack=inputs=4[a];[4]pad=w=iw*4:h=ih:color=white[c];[a][c]vstack=inputs=2" \
  out/frames/contact.jpg -y
```

A contact sheet across the whole timeline catches leakage, premature reveals and
occlusion in seconds. A full render catches none of them until too late.
