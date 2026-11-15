Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), `.claude/skills/motion-doctrine/` (SKILL.md, references/seam-gate.md, scripts/), `.claude/skills/seam-craft/SKILL.md`, `.claude/skills/README.md`.

# Continuity: one camera move, not a stack of slides

Read before choosing any transition or writing a scene's first and last beat. It decides WHAT happens at each seam; `seams.md` has the techniques and numbers.

The failure this prevents: scenes written in isolation. The eye's momentum dies at every cut, and scenes wobble in place between entry and exit.

Terms: a **seam** is the boundary between two scenes. In Motionhaus it is the one-beat transition window plus the last frames of the outgoing scene and the first frames of the incoming one. **Exit** = what the outgoing scene does into the seam. **Entry** = what the incoming scene does out of it.

## 1. The vector law

> How scene A exits determines how scene B enters: same axis, same direction, matched speed, cut mid-motion on both sides.

| # | Rule | Detail |
|---|---|---|
| 1 | **Axis** | x stays x, y stays y, Z stays Z. Never trade axes across a cut. |
| 2 | **Direction** | Never mirror. On Z, direction is the SIGN of the scale change (see below). |
| 3 | **Speed** | Entry initial velocity ≈ exit final velocity. Use mirrored eases: exit accelerates (quartic-in), entry decelerates (quartic-out), same distance and duration. The incoming side picks up ≥ 50% of the way through the notional path. |
| 4 | **Phase** | The cut lands mid-motion on BOTH sides. Settling to rest before the cut, or starting from rest after it, is a dead beat. |

### The Z scale-sign rule

"Same axis" is not enough on Z. The sign of d(scale)/dt must match across the cut.

| Z vector | Exit scale | Entry scale | Meaning |
|---|---|---|---|
| Push (camera forward) | growing, 1 → 1.2 | growing, 0.75 → 1 | going deeper into the same thought |
| Pull (camera back) | shrinking, 1 → 0.8 | shrinking, 1.25 → 1 | arrival: something bigger lands |

Banned mirrors:
- A receding exit answered by a grow-from-small entry (pull flips to push). The most common violation, because grow-from-small is the default element entrance.
- A push exit answered by an oversized retraction.

The rule binds the incoming scene's OWN entrances during the seam window (cut + ~0.5 s), not only the transition component. Either hold the incoming frame composed, or author its entrance to match the sign. Staged entrances start after the seam settles, or start at scale ≥ 1 and retract.

Motionhaus note: the transition window overlaps the incoming scene's first beat, so a scene whose elements `pop`/`scale`/`zoomIn` from small at frame 0 is fighting a `zoomOut` transition. Delay those entrances by one beat or switch them to a shrinking move.

## 2. The current

Every film picks ONE dominant direction (HyperFrames house default: LEFT). Every ordinary seam uses it. Other vectors are reserved; spending one means something.

| Vector | Meaning | Motionhaus transitions that carry it |
|---|---|---|
| The current (left) | "next beat", neutral forward progress | `whip`, `slideLeft`, a partial-travel cut-the-curve (see `seams.md`) |
| Upward | elevation: a conclusion or reveal rises above what came before | `whipUp`, `slideUp`, `push` |
| Z forward (zoom-through) | pushing deeper into the same thought | `zoomIn`, `zoomPunch`, `maskText` fly-through |
| Z backward (inverse zoom) | arrival: something bigger lands | `zoomOut` |
| Scale-burst (explode out) | leaving a world; a surface blasts past camera | `zoomPunch` at full strength |

- Never run consecutive seams in opposing directions. Ping-pong reads as an error.
- A direction change needs a visible cause (click, bounce, impact) or a chapter boundary.
- Reserved vectors are not variety. Default to the current.

## 3. The vector ledger

Write it before the script's transitions are chosen. One row per seam:

| Field | Content |
|---|---|
| seam | from scene → to scene |
| cut | the frame the incoming side ignites |
| technique | e.g. cut-the-curve LEFT, inverse zoom-through |
| exit vector | axis (x / y / z) + signed direction (x −1 = left, y −1 = up, z +1 = push/growing, z −1 = pull/shrinking) |
| entry vector | same fields |
| carrier | the element that carries the motion on each side (optional on plain cuts, required on match cuts and morphs) |

Exit and entry must match. If a row mismatches, fix the plan, not the easing.

Seam types: `cut` (full vector checks), `match-cut` / `morph` (carrier continuity and no overlap only; motion may start AT the boundary).

## 4. Carriers

The eye follows objects, not abstractions. The strongest seams hand a concrete carrier across the cut at matched position AND velocity:

- a cursor mid-path,
- a container that shrinks or docks into the next layout,
- a mark that flies into its exact slot,
- the word group of a waterfall cut.

With no natural carrier, the scene heroes carry it: partial travel plus an early fade, entry mid-flight. A crossfade has no carrier at all.

Carrier continuity tolerance: the out and in rectangles must match at cut ± 1 frame within **12 px centre offset** and **5% size**, ancestor scale included.

## 5. Causal motion

Chain motion so each move is visibly launched by the last: click → squash → release spring → flight → impact → recoil → reveal.

- Effects start ON the causing frame. Same frame, never "shortly after".
- Reactions scale with implied mass: big elements rebound slower, small ones snap.
- A force is a licence to change direction. An uncaused flip is a ping-pong.

## 6. The seam gate (checklist per seam)

HyperFrames enforces these numerically with a script; here they are a review checklist. Check at cut ± 0.1 s on stills or a frame strip.

| Check | Pass condition | Threshold |
|---|---|---|
| Ledger | exit and entry vectors match in the plan (axis + direction) | n/a |
| Exit moving | outgoing carrier still moving at the cut, not settled | faster than 15 px/s (x/y) or 0.04 scale units/s (z) |
| Entry moving | incoming carrier mid-flight at the cut, never from rest | same thresholds |
| Direction | measured sign of motion equals the ledger's on both sides | n/a |
| Speed match (warning) | entry speed ≈ exit speed | ratio within 1/3× to 3× |
| Zero overlap | one side visible per frame; the cut is not a dissolve | a side counts as invisible below 0.04 cumulative opacity |
| Z sign | d(scale)/dt has the same sign both sides; the incoming scene's own entrances are scanned too | n/a |
| Carrier | carrier rectangle continuous across the cut, ancestor scale included | 12 px / 5% |

Rules a checker cannot see:

1. **Edits re-open the seam.** Any change to a scene's first or last ~1 s, including re-timing to new VO, invalidates that boundary. Re-check it.
2. **Audio is the clock.** Re-time scenes to the VO's real word timestamps; never rush a read to fit a slot. A VO regeneration re-opens its seams.
3. **Usual cause of an overlap failure:** the incoming scene becomes visible before its entry starts. It must be fully hidden until the cut frame and become visible exactly at the cut, never earlier.
4. If every seam fails the same way with zero motion measured, the samples were taken at t = 0, not at the cut. Fix the sampling before the film.

## 7. Performance: the scene keeps performing

### No idle wobble

Idle sine loops (breathe, float, drift, glow pulse) are banned as sustained motion. They read as "the video is waiting". A scene that finishes entering with seconds left is a planning bug: add story, not wobble.

Every phase between entry and exit is owned by one route. Name the route in the plan.

| Route | What it is | Motionhaus scenes that do it |
|---|---|---|
| **Staged reveals** | hold content back; pay it off on narration beats. Default for ≥ 2 content groups. | `steps`, `features`, `flow`, `photo` collage (one print per beat), `svg` with `data-at` |
| **Camera with intent** | a mapped scale + pan path: establish wide → travel → arrive on the subject | long-form `sceneCamera`, `zoom`, `spotlight`, `photo` creeping to `focus` |
| **Sequenced UI life** | the product behaves over time: progress advances, highlights step, counts tick | `stat`, `code`, `log`, `svg` `data-count` |
| **Animated sequences** | elements act out a beat: a card files into a stack, an item is dragged, a result assembles | `svg`, `crack`, `clip` |
| **Cursor-led action** | an oversized cursor walks the eye to a trigger; its click ignites the next beat | `spotlight` (see `captions-and-cursor.md`) |

Test: pause at any second. Something meaningful must be mid-flight (a reveal landing, the camera travelling, the UI doing what the narration says).

### Stillness before climax

Schedule a **0.3–0.75 s pause** between the major action and its result. A scene that jumps straight from action to result loses the dramatic comma.

### Timing intents

- Single entry ≤ ~800 ms. A longer build-up is a multi-element stagger, not one slow element.
- Exit ≈ 75% of entry. Exception: cut-the-curve inverts this (entry ~127% of exit).
- Total stagger ≤ 500 ms. With 8+ elements, tighten the per-item delay or stagger only the first few.
- Forbidden eases: bounce-out and elastic-out. A back-out entry overshoot of 1.4–1.7 is fine.
- Similar elements share one ease + duration. Never a unique pair per element.

### Transition vocabulary

Use only **2–3 inter-scene transitions per film and repeat them**. The default boundary is cut-the-curve in the current's direction. Hand-written shared-element morphs do not count against the budget; neither does a waterfall cut inside a text block.

## 8. Seam correctness: what makes a cut or crossfade composite cleanly

### The white-flash problem

Several seams open a window where the two scenes' summed opacity is below 1: the cut-the-curve mid-window cut, the zoom-through's 0.15 opacity floor, a plain crossfade's dip. Whatever is BEHIND the scenes shows through during that window. If nothing opaque is painted there, the renderer composites the dip over its default white: a white flash at every seam, glaring on dark films.

**Rule: the stage paints an opaque ground in the film's deepest background colour, under every scene, for the whole film.**

Motionhaus status:
- `Short.tsx` paints `config.brand.colors.bg` on the root, and `LaunchVideo.tsx` renders `StyleBackground` under the series. Keep both.
- Scenes are transparent over the shared backdrop. A scene that is masked, split or moved as a sheet needs its own copy of the backdrop under it (the `Solid` wrapper in `transitions/index.tsx`), or the other scene shows through.
- When `look.backdrop === false` or the layout is `split`, nothing is painted for you. A new seam with an opacity dip must be checked on a still at the cut frame in that mode.
- The deliberate white frame in the `flash` transition and `flash` hit is a different thing: it is authored, lasts 7 frames, and carries a shutter sound.

### How an overlap transition must be built

- The outgoing scene **holds its final frame** for the length of the window; the incoming scene starts **early** by the same length. That overlap is the window.
- The incoming scene composites **on top** of the outgoing one.
- The transition animates only the two scene wrappers: transform, opacity, filter. No injected overlay elements, no cooperation needed from inside the scenes.
- Overlay families (staggered blocks, blinds, light leak, grid dissolve, page burn) and shader transitions are a separate, heavier class. Use them as named accents, not as the default boundary.
- Blur the wrapper, never its children. Use the same peak blur and the same opacity on both sides at the swap frame.
- Never animate blur and opacity together in one tween on one element in a headless render (compositing bug). Put them on nested wrappers. Never blur a video element directly; wrap it.

## 9. Anti-patterns

| Don't | Instead |
|---|---|
| Author each scene's entrance in isolation | Write the vector ledger first |
| Crossfade between scenes | Cut-the-curve in the current's direction |
| Exit completes, THEN the scene changes | Cut mid-motion on both sides |
| Entry starts from rest after a cut | Enter ≥ 50% through the notional path |
| Inverse-zoom exit → grow-from-small entry (or push → oversized retraction) | Match the scale-velocity sign |
| Incoming scene's own pop-in intro under a Z seam | Hold its opening frame composed, or match the sign |
| Idle wobble / breathe / float to fill time | Assign a sustained-motion route, or add story |
| Direction flip without a cause | Spend a force, or keep the current |
| Reserved vectors used as variety | Default to the current; spend them on meaning |
| Reaction a few frames after its cause | Same-frame ignition |
| Action jumps straight to result | Schedule stillness before climax (0.3–0.75 s) |
| Unpainted stage behind a mid-window cut | Opaque stage ground |

## 10. Conflicts with Motionhaus rules

- **Conflict:** HyperFrames allows only 2–3 transitions per film, repeated, with cut-the-curve as the default. Motionhaus rotates through ~35 transitions per style, `shorts designs` pushes what has never been used, and `motion-vocabulary.md` says "never name the same one three times".
- **Conflict:** HyperFrames bans crossfades between scenes. Motionhaus ships `fade`, `blur` (a crossfade through blur, the `explainer` style's own) and `dip`.
- **Conflict:** HyperFrames wants one current and no opposing consecutive seams. Motionhaus's long-form 3D camera makes each scene arrive "at a slight angle, alternating sides", and `strips` slides in from alternate ends.
- **Conflict:** HyperFrames bans idle loops as sustained motion. Motionhaus offers `MotionText` loops (`float`, `pulse`, `wobble`, `wave`, `breathe`, `swing`), SVG `data-loop`, the `leak` fx that "drifts across and breathes", drifting backdrops and slowly moving plates. Reading that keeps both: loops are fine on backgrounds and ambience; they do not count as the scene's sustained-motion route.
- **Conflict:** HyperFrames forbids bounce and elastic eases. Motionhaus has an `elastic` ease and a `jelly` move in `moves.tsx`.
- **Conflict:** the Z sign rule. Motionhaus's `pop` transition shrinks the old scene (1 → 0.82) and grows the new one from small (0.7 → 1.06 → 1): a mirrored Z vector by HyperFrames's definition. `zoomIn`, `zoomOut`, `zoomPunch` and `blur` obey the sign.
- **Conflict:** total stagger ≤ 500 ms. The `build` type style lands words on gaps of 0.9, 0.6, 0.4 and 0.3 beats (about 1 s in total at 128 BPM).
- **Conflict:** zero overlap (one side visible per frame). Most Motionhaus transitions blend both scenes for part of the window (`zoomIn`, `zoomOut`, `zoomPunch`, `blur`, `fade`). `whip`, `whipUp`, `glitch`, `filmBurn`, `flash` and `rgbSplit` already hard-swap at progress 0.5.
