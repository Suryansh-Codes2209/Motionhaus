Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), `.claude/skills/cut-the-curve/` (SKILL.md, examples/gsap-implementation.md), `.claude/skills/motion-doctrine/scripts/seam-stamp.mjs`.

# Seams: the technique catalogue

Five seams and two in-scene techniques. One principle: **cut at peak velocity, and match direction and speed on both sides of the cut.** The law (vector law, the current, the ledger) is in `continuity.md`; read it first. This file is parameters and mechanics.

## Catalogue

| # | Technique | Scope | Axis | Use for | One-beat window? | In Motionhaus today |
|---|---|---|---|---|---|---|
| 1 | **Zoom-through** (forward) | text swap inside a scene, or scene to scene | Z, toward viewer | going deeper into the same thought | compressed only (native 0.7 s) | near: `zoomIn`, `zoomPunch` |
| 2 | **Inverse zoom-through** | arrival / payoff beat | Z, away from viewer | something bigger lands | compressed only (native 0.7 s) | near: `zoomOut` |
| 3 | **Cut the curve** | between scenes | X / Y | the default boundary, in the film's current | yes | cousin: `whip`, `whipUp` (full travel); partial-travel version is new |
| 4 | **Waterfall cut** | text-to-text seam | X, per word | word-level handoff between big-text beats | no: in-scene frames both sides | new |
| 5 | **Rack-focus blur-cut** | state swap of the same surface | X / Y / Z | the one cut you want SEEN: a DSLR focus pull | compressed only (native 0.65 s) | near: `blur` transition, `blur` hit; hard-cut version is new |
| 6 | **Waterfall entry** | in-scene arrival, no seam | Y, from below | title cards, segment openers, list intros | not a transition | partial: hook `rise`, type `build`, `MotionText` stagger |
| 7 | **Nudge curve** | in-scene group slide, no seam | X / Y | repositioning a composed group to make room | not a transition | new |

## Shared mechanics

### Easing names

HyperFrames numbers are quoted in GSAP ease names. Engine-neutral equivalents:

| Source name | Curve | Remotion |
|---|---|---|
| `none` | linear | no easing |
| `power1.in/out` | quadratic | `Easing.in(Easing.quad)` / `Easing.out(Easing.quad)` |
| `power2.in/out` | cubic | `Easing.in(Easing.cubic)` / `Easing.out(Easing.cubic)` |
| `power3.in/out` | quartic | `Easing.in(Easing.poly(4))` / `Easing.out(Easing.poly(4))` |
| `power4.in/out` | quintic | `Easing.in(Easing.poly(5))` / `Easing.out(Easing.poly(5))` |
| `power5.out` | sextic out | `Easing.out(Easing.poly(6))` |
| `expo.out` | `1 − 2^(−10t)` | `Easing.out(Easing.exp)` |
| `back.out(1.4–1.7)` | overshoot | `Easing.out(Easing.back(1.4))` |

### Our transition clock already is the mirrored pair

Motionhaus runs every transition on `cubic-bezier(0.83, 0, 0.17, 1)`. That is ease-in-out-quint: the same curve as GSAP `power4.inOut`. HyperFrames builds cut-the-curve from "the two halves of one `power4.inOut`". So:

- A transition component that **hard-swaps at `presentationProgress` = 0.5** gets a quintic-in exit over the first half beat and a quintic-out entry over the second half beat, with velocity matched exactly at the swap. No extra easing is needed.
- Let `p` be `presentationProgress`. Exit amount `qOut = min(1, 2p)` runs 0 → 1 accelerating. Entry remainder `qIn = min(1, 2(1 − p))` runs 1 → 0 decelerating.
- For a value that must be linear in time, or for a swap that is not at the midpoint, recover linear time `τ` (0 → 1 across the window): `τ = p < 0.5 ? 0.5·(2p)^0.2 : 1 − 0.5·(2(1 − p))^0.2`. The `even` helper in `transitions/index.tsx` does a rougher version of this.
- At 128 BPM a beat is 0.47 s, about 14 frames at 30 fps. Each half is about 7 frames.

### Blur by subject size (all Z variants)

| Subject | Peak blur | Why |
|---|---|---|
| Text-scale (headline, word group) | **10 px** | 20 px smears letterforms; the cut reads as a glitch, not speed |
| Full-frame surface (window, card, screenshot, whole scene) | **18–20 px** | lighter blur on a big surface reads as a rendering hiccup |

- Same peak blur on both sides at the swap frame.
- Blur the wrapper, never its children.

### Stage ground

Every seam here opens a moment where the two sides' summed opacity is below 1. The stage must be opaque under the scenes or the seam flashes white. See `continuity.md` §8. Wrap each side in the `Solid` helper when the scene is transparent over the shared backdrop.

---

## 1. Zoom-through (forward)

**Looks like:** the outgoing text accelerates toward camera and blurs; a hard swap hides at peak blur; the incoming text keeps growing into the focal plane. Everything GROWS. The two texts are never visible together.

**Use when:** the next line goes deeper into the same thought. Headlines and short phrases only, never body text.

| Phase | Scale | Blur | Opacity | Ease | Duration |
|---|---|---|---|---|---|
| Exit | 1 → 1.2 | 0 → 10 px | 1 → 0.15 | quartic-in for scale and blur; opacity on its own **linear** ramp | 0.2 s |
| Cut (instant) | incoming set to 0.75 | 10 px both | outgoing 0, incoming 0.15 | none | 0 |
| Entry | 0.75 → 1 | 10 → 0 px | 0.15 → 1 | expo-out, all properties together | 0.5 s |

- The exit opacity MUST be a separate linear ramp. On the quartic-in curve it stays near 1 for too long.
- Tuning: exit scale 1.2 ± 0.1; entry scale 0.75 ± 0.1; opacity at the cut 0.1–0.2; exit 0.15–0.3 s; entry 0.4–0.6 s.
- Scene-to-scene (full-frame) preset used by HyperFrames's generator: exit 0.21 s, entry 0.5 s, entry from scale 0.78, blur 18 px. Its older whole-scene template: exit 1 → 2.5 with blur 8 px fading to 0, entry 0.5 → 1, both over the full window (quartic in / out).
- The source states "total ≈ 0.4 s" in one place and 0.2 s + 0.5 s in the table; the table is the working value.

**In Remotion:**
- As a transition component: swap at `τ = 0.3` (30% exit / 70% entry). Exit local `u = τ / 0.3`: scale `1 + 0.2·u⁴`, blur `B·u⁴`, opacity `1 − 0.85·u`, hidden once `τ ≥ 0.3`. Entry local `v = (τ − 0.3) / 0.7`, `e = 1 − 2^(−10v)`: scale `0.75 + 0.25·e`, blur `B·(1 − e)`, opacity `0.15 + 0.85·e`, hidden while `τ < 0.3`. `B` = 10 for a text scene, 18–20 for a full-bleed one.
- As an in-scene text swap (its native scope): two text wrappers in one scene, driven by frame: exit over 6 frames, set at the cut frame, entry over 15 frames.
- **Window fit:** native length is 0.7 s. Inside one beat (~0.47 s) it compresses to about 0.14 s exit / 0.33 s entry, under the tuning ranges. To keep the full 0.5 s settle, do the swap in-scene.
- **Existing:** `zoomIn` (exit 1 → 3.2, entry 0.35 → 1, blur 30 / 16 px) and `zoomPunch` (exit 1 → 1.9, entry 0.75 → 1, blur 26 / 22 px) are the same vector with the sign right, but both blend the two scenes instead of hard-swapping, and blur past the 18–20 px ceiling.

## 2. Inverse zoom-through (backward)

**Looks like:** the pull-back mirror. The outgoing element RECEDES; the incoming one arrives OVERSIZED, as if just behind the camera, and retracts into the focal plane. Everything SHRINKS.

**Use when:** an arrival or payoff beat: a payoff line, a giant reply, a held end state. Never an ordinary boundary.

| Phase | Scale | Blur | Opacity | Ease | Duration |
|---|---|---|---|---|---|
| Exit | 1 → 0.8 | 0 → 10 px | 1 → 0.15 | quartic-in; opacity on its own linear ramp | ~0.2 s |
| Cut (instant) | incoming set to 1.25 | 10 px both | outgoing 0, incoming 0.15 | none | 0 |
| Entry | 1.25 → 1 | 10 → 0 px | 0.15 → 1 | expo-out | ~0.5 s |

- Total ≈ 0.7 s, split 30% exit / 70% entry.
- Blur is 10 px at text scale; 18–20 px only when both sides are full-bleed surfaces.
- Tuning: exit scale 0.8 ± 0.1; entry scale 1.25 ± 0.1; other ranges as §1.
- **Sign discipline:** the incoming scene arrives as a composed frame inside the retracting wrapper. No grow-from-small intro in the seam window. Staged entrances happen after the retraction settles, or start at ≥ 1 and retract.

**In Remotion:** the §1 recipe with the scales flipped: exit `1 − 0.2·u⁴`, entry `1.25 − 0.25·e`. **Window fit:** as §1.
**Existing:** `zoomOut` (exit 1 → 0.3 into a rounded card, entry 2.4 → 1, blur 8 / 24 px) has the right sign, blends rather than hard-swaps, and uses far larger scale travel.

## 3. Cut the curve (the default scene boundary)

**Looks like:** the outgoing hero accelerates in one direction and fades early; the cut lands mid-motion; the incoming hero continues in the SAME direction and decelerates to rest. The viewer feels carried sideways, not shown a slide change.

**Use when:** every ordinary scene-to-scene boundary, in the film's current (default LEFT). It is the default, not an accent.

| Direction | Exit | Entry start → end |
|---|---|---|
| Leftward | x: 0 → −230 | x: +230 → 0 |
| Rightward | x: 0 → +230 | x: −230 → 0 |
| Upward | y: 0 → −230 | y: +230 → 0 |
| Downward | y: 0 → +230 | y: −230 → 0 |

| Parameter | Default | Range |
|---|---|---|
| Travel | 230 px (~12% of a 1920 frame width; ~21% of a 1080 height) | 150–300 px |
| Exit ease / entry ease | quintic-in / quintic-out, same distance and duration | never an in-out curve on either side |
| Exit duration | 0.33 s | 0.2–0.4 s |
| Entry duration | 0.33–0.42 s | ≥ exit |
| Blur at the cut (optional) | 8 px | 6–10 px |
| Total | ≈ 0.6 s | n/a |

- **Partial travel.** Never a full off-screen move.
- **The fade trick.** The exit's opacity finishes at about 25–30% of its travel (fade ≈ 0.18–0.3 s against motion of 0.3–0.34 s). The entry ignites at about **0.35 opacity**, mid-path. Time the last fading element to die right at the cut; a gap where nothing moves reads as dead air.
- Whole-scene preset: outgoing fades 1 → 0 on a cubic-in curve from 3% to 50% of the window; incoming appears at the midpoint at 0.35 opacity and rises to 1 while it travels. Generator defaults: exit 12% travel over 0.34 s; entry 10% travel (8% for a soft entry) over 0.42 s.
- Full push/slide transitions violate partial travel and mid-motion phase; prefer cut-the-curve.

**Combined cut-the-curve + zoom.** The scale component obeys the Z sign rule: both sides SHRINK. Exit: x −230, scale 1 → 0.92, blur 8 px, 0.33 s quintic-in. Entry: from x +230, scale 1.08, blur 8 px to rest in 0.42 s quintic-out. Never pair a shrinking exit with a grow-from-small entry.

**In Remotion (transition component, new):**
- Hard-swap at `p = 0.5`. `D` = travel in px (230; try 130–150 on a 1080-wide vertical frame), `s` = −1 for left/up.
- Exiting: `translate = s·D·qOut`; opacity `1 − (τ/0.5)³` for a whole scene; blur `8·qOut`; render nothing once `p ≥ 0.5`.
- Entering: render nothing while `p < 0.5`; `translate = −s·D·qIn`; opacity `0.35 + 0.65·(1 − qIn)`; blur `8·qIn`.
- Put blur and opacity on nested wrappers. Wrap in `Solid`.
- **Window fit:** yes. One beat gives 0.235 s per side: inside the 0.2–0.4 s exit range, entry equal to exit (the minimum allowed).
- The hero version (only the scene's main element travels while the background holds) needs in-scene frames: the outgoing scene's last ~10 frames and the incoming scene's first ~10–13.
- **Existing:** `whip` and `whipUp` already hard-swap at 0.5 with the same direction on both sides, but travel 110% of the frame with a smear. `slideLeft`, `slideUp` and `push` are full push-slides.

## 4. Waterfall cut (word-by-word cut-the-curve)

**Looks like:** the outgoing line peels away word by word, each word accelerating out and vanishing early; the incoming words cascade in already moving, on shrinking gaps. A wave the eye rides across the seam. The strongest leftward cut for text-to-text seams.

**Use when:** two big-text beats follow each other (`type` → `type`, hook line → next line).

| Parameter | Value | Why |
|---|---|---|
| Travel | ±230 px (~12% of frame) | partial travel; more apparent velocity than a full-frame push |
| Exit | 0.34 s, quintic-in | the acceleration IS the cut |
| Exit start | 0.32 s before the cut | exits begin before the cut |
| Exit fade | 0.18 s, quadratic-in, starts with the move | word gone by ~25–30% of travel; no smear |
| Exit stagger | +0.022 s per word, reading order | the line peels; it is not a block slide |
| Layer swap | hard, at the cut | one text layer visible at a time |
| Entry | 0.3 s, quintic-out, from +230 px | back half of the composite curve; velocity match |
| Entry start opacity | 0.35 | mid-path ignition; a binary 0 → 1 pops |
| Entry gaps | first gap 0.05 s, each next gap × 0.84 | accelerating cascade that resolves composed |
| Blur | none | n/a |

Rules:
- One direction per chain, riding the current. Inverse zoom is the chain's ARRIVAL beat only.
- Every incoming word is hidden at its +230 px start position from the first frame. Words that have not started must not sit visible at rest.
- A short first beat may exit as a whole line: 0.34 s quintic-in, its fade ending ~0.02 s before the cut so it is still streaking when the next words ignite. No dead gap.
- Transform and opacity only. Opaque stage ground.
- It does not count against the 2–3 transition budget. The boundary into and out of the text block still gets a normal transition.

**In Remotion (in-scene, new):**
- Build as one scene or type style holding two stacked full-frame text layers, each word in its own inline-block span. Cut frame `C` is a VO word timestamp.
- Per word `i` of the outgoing line: start `C − 0.32 + 0.022·i` s; x = `interpolate(t, [start, start + 0.34], [0, −230], quintic-in)`; opacity over `[start, start + 0.18]` 1 → 0 quadratic-in.
- At `C`: outgoing layer off, incoming layer on.
- Per word `j` of the incoming line: start `C + Σ gaps` where gaps are 0.05, 0.042, 0.035, …; x from +230 → 0 over 0.3 s quintic-out; opacity 0.35 → 1 over the same span; fully hidden before its start.
- Compute from `frame / fps` in seconds, so the 0.022 s stagger (under one frame at 30 fps) still resolves.
- **Window fit:** no. It needs about 10 frames before the cut and 9+ after, inside the scene. Use no transition component between the two beats.

## 5. Rack-focus blur-cut (the visible cut)

**Looks like:** a defocus blur SPIKE hides a single-frame hard swap, like a handheld DSLR focus pull. The one variant where the cut is meant to be seen.

**Use when:** an occasional flourish for a state swap of the SAME surface inside one visual theme (before → after of one screenshot, one card changing state). Never the default boundary.

| Phase | Offset | Scale | Blur | Opacity | Ease | Duration |
|---|---|---|---|---|---|---|
| Exit | x 0 → −80 px | 1 → 1.06 | 0 → 12 px | stays 1 | cubic-in | 0.3 s |
| Cut (instant) | incoming at x +80 px | 1.06 | 12 px | outgoing 0, incoming 1 | none | 0 |
| Entry | +80 → 0 px | 1.06 → 1 | 12 → 0 px | 1 | cubic-out | 0.35 s |

- Z dolly variant: drop the x offset; use scale 0.92 on the way out and 1.08 on the way in.
- The outgoing side stays FULLY OPAQUE until the cut. The blur hides the swap; there is no early fade.
- Cubic eases: soft optics, not momentum.
- Fire only at a narrative beat, **at most once per ~8 s**; never mid-caption or during a hold.
- Cut at PEAK blur: at least 6 px, peak 8–12 px, 16–18 px maximum. Swapping on the way up shows the cut.
- The ~1.06 scale is lens breathing; it sells the move as optics.
- Same direction on both sides. Entry ≥ exit duration.
- Blur the wrapper. Never blur and fade one element in one tween. Never blur a video element directly.

**In Remotion (transition component, new):** swap at `τ = 0.46`. Exit `u = τ/0.46`, `k = u³`: x `−80·k`, scale `1 + 0.06·k`, blur `12·k`, opacity 1, then hidden. Entry `v = (τ − 0.46)/0.54`, `k = (1 − v)³`: x `80·k`, scale `1 + 0.06·k`, blur `12·k`, opacity 1.
- **Window fit:** native 0.65 s; one beat compresses it to about 0.22 s / 0.25 s. Acceptable for a flourish. In-scene (one scene swapping its own image) keeps the native timing.
- **Existing:** the `blur` transition (18 px, opacity crossfade, scale 1.04 → 1 / 1 → 0.98) is a dissolve through blur, not a hard cut at peak. The `blur` hit is a 9-frame defocus pop with no swap.

---

## 6. Waterfall entry (in-scene arrival, not a seam)

**Looks like:** words or elements whip in from below, each starting before the previous one settles: an accelerating wave that resolves into a composed layout.

**Use when:** title cards, segment openers, list and feature intros.

Do not mix its rules with §4:

| | §6 Entry (arrival) | §4 Waterfall cut (seam) |
|---|---|---|
| Opacity | BINARY 0 → 1 at the entry frame; never a fade | ignites at 0.35 mid-path; the fade IS the velocity trick |
| Axis default | Y, from below | X, riding the current |
| Outgoing side | none | words ramp out on the mirrored quintic-in |

Choreography:
- **Overlap, don't queue.** The next element starts within ±2 frames (at 60 fps; ±1 frame at 30 fps, ~0.03 s) of the previous one settling. Gaps SHRINK across the cascade. The last element snaps.
- **Velocity varies by weight:**

| Parameter | Anchor / heavy | Normal word | Light / punctuation |
|---|---|---|---|
| Y offset | 60–80 px | 40–50 px | 30–48 px |
| Duration | 0.16–0.20 s | 0.13–0.16 s | 0.10–0.13 s |
| Start relative to previous settle | 0–2 frame gap | 1 frame overlap | 1–2 frame overlap |

- Ease quintic-out (expo-out for extra snap). Never an in-out curve on an entry.
- One direction per cascade.
- Split the FINAL word into fragments to extend the climax; fragments travel further (~70 px) and take the tightest overlap.
- Scheduling: `nextStart = prevStart + prevDuration − overlap`. Positive overlap is a cascade; negative is a deliberate gap.
- After it settles, the group usually slides to make room for the next beat. That is §7.

Reference cascade (60 fps frame = 0.0167 s; first element at 0.1 s):

| Element | Y offset | Duration | Starts |
|---|---|---|---|
| Anchor | 80 px | 0.18 s | t0 |
| Normal word | 45 px | 0.15 s | 2 frames after the anchor settles |
| Light word | 40 px | 0.14 s | 1 frame before the previous settles |
| Final-word fragment A | 70 px | 0.16 s | 1 frame before the previous settles |
| Final-word fragment B | 70 px | 0.15 s | 1 frame overlap |
| Punctuation | 48 px | 0.12 s | 2 frames overlap |

**In Remotion (in-scene):** per element, render nothing before its start frame, then `translateY = offset·(1 − Easing.out(Easing.poly(5))(local))` with opacity 1 from the first frame. At 30 fps the durations are 3–6 frames. `MotionText` with `split="words"`, a rise move and `gaps` is the closest existing tool; what is new is the per-weight offsets and durations and the binary opacity. Hook `rise` and type `build` (shrinking gaps) are cousins.

## 7. Nudge curve (in-scene group slide, not a seam)

**Looks like:** a composed group (word row, card stack, list) barely stirs, bursts across, then creeps to rest. Slow-fast-slow.

**Use when:** a settled group must move to reveal content or make room. No single built-in ease produces it: an in-out quintic smacks to a stop.

Chain three segments on one property:

| Phase | Ease | Distance | Time | Feel |
|---|---|---|---|---|
| 1 ramp-in | quartic-in | ~10% | ~20% | barely moves; motion registers with no jolt |
| 2 burst | linear | ~65% | ~18% | about 2× the average px per frame; purposeful |
| 3 tail | quintic-out | ~25% | ~62% | decaying creep to rest; kills the smack |

Reference: a 270 px slide in 0.57 s:

| Segment | From → to | Duration |
|---|---|---|
| Ramp-in | 0 → 30 px | 0.12 s |
| Burst | 30 → 210 px | 0.10 s |
| Tail | 210 → 270 px | 0.35 s |

150 px variant: 15 / 115 / 150 px at the same times.

Rules:
- The tail is at least **3× the ramp-in in TIME**. If it still smacks, extend the tail's time (not its distance) or use a sextic-out tail.
- Phase 2 stays linear. Easing it loses the burst contrast.
- Reveal new content DURING phase 2; the burst masks its appearance.
- Same ratios vertically. Scale distances proportionally; keep the time ratios.
- Start it after the content has settled.

**In Remotion (in-scene, new):** three chained `interpolate` calls on the group's translate, one per segment with its own easing, each clamped; sum or select by time. At 30 fps the reference is about 4 + 3 + 10 frames.

---

## Choosing a variant

| | Zoom-through | Inverse zoom | Cut the curve | Waterfall cut |
|---|---|---|---|---|
| Scope | text swap in a scene | arrival / payoff beat | between scenes | text-to-text seam |
| Z sign / axis | growing (push) | shrinking (pull) | X / Y | X, per word |
| Travel / scale | 1 → 1.2, then 0.75 → 1 | 1 → 0.8, then 1.25 → 1 | ±230 px | ±230 px |
| Peak blur | 10 px text / 18–20 full-frame | 10 px text / 18–20 full-frame | 8–10 px optional | none |
| Eases | quartic-in / expo-out | quartic-in / expo-out | quintic-in / quintic-out | quintic-in / quintic-out |
| Feel | progressing through | arriving at | carried sideways | a wave across the seam |

## Anti-patterns

| Don't | Instead |
|---|---|
| Two texts visible during a zoom-through | Hard cut at the blur peak; one text at a time |
| 20 px blur on text-scale subjects | 10 px for text; 18–20 px only full-frame |
| Inverse-zoom exit → grow-from-small entry (or push → oversized retraction) | Match the scale-velocity SIGN; verify at cut ± 0.1 s |
| The incoming scene's own scale-up intro under a Z seam | Arrive composed; stage entrances after the seam settles, or match the sign |
| Mismatched blur or opacity at the swap | Identical values at the cut frame |
| Gentle entry easing (cubic-out) | Mirror the exit: quintic-out or expo-out |
| Full off-screen exits and entries | Partial travel (~12%) + early fade |
| In-out eases on either side of a cut | Mirrored quintic-in / quintic-out |
| A lone element fading long before its cut | Fade ends ~0.02 s before the cut, or use a word cascade |
| Equal gaps across a waterfall cascade | Shrink gaps × 0.84 per word |
| Zoom-through on body text | Headlines and short phrases only |
| Scene cuts without cut-the-curve | It is the default boundary |
| Consecutive boundaries in opposing directions | One current; reserved vectors spent on meaning |
| An unpainted stage behind a mid-window cut | Opaque stage ground |
| Queued entries (each waits for the previous to settle) | Overlap ±1–2 frames; the cascade is a wave, not a queue |
| Same offset and duration for every cascade element | Vary by weight: anchors travel further, punctuation snaps |
| A gradual opacity fade on a §6 arrival | Binary 0 → 1; fading fights the snap (seam cuts fade; arrivals don't) |
| A single ease for a group slide | The §7 three-phase chain |
| A nudge tail shorter than 3× the ramp-in | Extend the tail's TIME, not its distance |

## Conflicts with Motionhaus rules

- **Conflict:** HyperFrames seam durations are 0.6–0.7 s with asymmetric halves (zoom-through 0.2 s out / 0.5 s in; cut-the-curve entry 0.33–0.42 s ≥ exit; rack-focus 0.3 / 0.35 s). Motionhaus transitions last exactly one beat (~0.45–0.5 s). Inside the window the Z seams and rack-focus run compressed; the native timings need in-scene frames.
- **Conflict:** HyperFrames forbids in-out eases on either side of a cut. Motionhaus drives every transition with one in-out bezier. They agree only when the component hard-swaps at progress 0.5 (see "Our transition clock"); a component that blends across the whole window is on an in-out curve by HyperFrames's definition.
- **Conflict:** HyperFrames wants partial travel (~12%) and calls full push-slides a violation. Motionhaus's `whip`, `whipUp`, `slideLeft`, `slideUp` and `push` travel 100–110% of the frame.
- **Conflict:** peak blur ceilings (10 px text, 18–20 px full-frame). `zoomIn` peaks at 30 px, `zoomPunch` at 26 px, `zoomOut` at 24 px.
- **Conflict:** rack-focus at most once per ~8 s and never mid-caption. Motionhaus shorts caption continuously, so every in-window use is "mid-caption"; and the hit budget allows a `blur` hit anywhere the VO justifies it (2–5 hits per short, none within the same half-second).
