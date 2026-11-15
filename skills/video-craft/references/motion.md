Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), skills/hyperframes/references/motion.md, path-tracing.md, overlays.md, film.md, spec.md.

# Motion

Numbers were measured frame by frame on shipped launch films. They are defaults: a reference the user gave, or a moment that breaks them on purpose, wins for its own beat. Names for Motionhaus moves, hits and transitions live in `skills/short-styles/references/motion-vocabulary.md`; this file says how a good one behaves.

## 1. Easing by role

The same ease-out at 0.5 s on everything is the flat default that makes a film feel generated.

| Role | Curve | cubic-bezier (approx.) | Remotion |
|---|---|---|---|
| Arrival (long tail) | expo out | `0.16, 1, 0.3, 1` | `Easing.out(Easing.exp)` |
| Arrival | quint out | `0.22, 1, 0.36, 1` | `Easing.out(Easing.poly(5))` |
| Morph, snap-in | quart out | `0.25, 1, 0.5, 1` | `Easing.out(Easing.poly(4))` |
| Soft fade-in (cards) | cubic out | `0.33, 1, 0.68, 1` | `Easing.out(Easing.cubic)` |
| Camera move, colour flood | cubic in-out | `0.65, 0, 0.35, 1` | `Easing.inOut(Easing.cubic)` |
| Card fade-out | cubic in | `0.32, 0, 0.67, 0` | `Easing.in(Easing.cubic)` |
| Zoom-through, exit (accelerates) | quart in | `0.5, 0, 0.75, 0` | `Easing.in(Easing.poly(4))` |
| Overshoot | back out, s = 1.4–2.6 | `0.34, 1.56, 0.64, 1` at s ≈ 1.7 | `Easing.out(Easing.back(s))` |

- Linear only for rotation, progress bars and constant speed that is the point.
- **Arrive slow, leave clean.** Landing takes longer than leaving. An exit is one smooth motion, never slide, stop, then leave.
- Exits are 40–50% shorter than their entrances.
- Entrances that are too snappy read as glitches; slowing the whole video by about a second often fixes it.
- At a handoff between two moves, mirror the ease (quart in out, quart out in) so speeds match across the seam.

### Springs (by damping ratio ζ)

| ζ | Reads as | Remotion `spring` at mass 1, stiffness 100 |
|---|---|---|
| 1.0 | never bounces | damping 20 |
| 0.7–0.85 | premium | damping 14–17 |
| 0.4–0.6 | playful | damping 8–12 |
| < 0.3 | cartoon | damping < 6 |

ζ = damping ÷ (2 × √(stiffness × mass)). Position and size may bounce; **opacity and colour never do.** "Playful" also means 10–30% exaggerated poses.

## 2. Timing numbers

| Thing | Value |
|---|---|
| Fast move | 0.3–0.6 s, one continuous tween |
| Motion blur at the fastest frame | 6–12 px on text-sized elements, 15–20 px full-frame; along the direction of travel only |
| Overlap | next element starts when the previous is 30–50% done |
| Stagger | letters 1 frame; words 60–120 ms; list items 40–80 ms |
| Secondary moves | travel 50–70% as far as the hero move, start 100–200 ms after it; everything else holds still |
| Montage cuts | every 0.13–0.8 s |
| Demo hold | one framing for 7–10 s while the UI acts |
| Average shot | 1.8–3 s with motion inside it |
| Hold before the payoff | 0.3–0.75 s; payoff plays at normal speed |
| Background stage orbit | 3–5° per second |
| Something new on screen | every 2–4 s; a new layout every bar (4 beats) with music |
| Count-up | 1.2–1.6 s, then hold |
| Kinetic type | 3–7 words per scene |
| One treatment | goes stale after ~6 s: add a hold or a new treatment, never slow the tweens |

- Fully sequential looks robotic; everything at once looks cheap.
- **One hero move per shot.**
- Rhythm is contrast of speeds: the process runs fast, the payoff does not.
- A film that feels busy: remove a third of the motion and keep the moves that lead the eye.

Conflict: HyperFrames flags as generated: breathing / floating / pulsing loops, titles that drift after landing, a slow creeping scale, a slow push late in a scene. Motionhaus `launch-video` says "Nothing static for more than a beat: the camera drifts, screens scroll/zoom, text springs", and ships `MotionText` loops (`float`, `pulse`, `breathe`), the pulsing `offset` type style, the drifting `ghost` keyword and the creeping `photo` camera.

Conflict: HyperFrames says vary entrances, no bounce on UI. Motionhaus `launch-video`: "Every reveal: mask + blur + slight overshoot — never a plain fade."

## 3. Beat grid and music timing

- Frames per beat = fps × 60 ÷ BPM. Compute beat *n* as `round(n × framesPerBeat)`; never add a rounded beat repeatedly (128 BPM at 30 fps drifts 2 frames in 32 beats).
- Cut on the beat; change the layout on the bar.
- A move that must land on a hit **starts 40–190 ms early**; a reaction starts 0–45 ms after. The hit itself is an instant state change: easing a hit kills it.
- A word meant to be read holds at least one beat.
- Rhythmic sections: one clip per strong beat. Calm sections: one slow push from 1.0 to 1.08 scale.
- Trust detected beats only on rhythmic stretches; on calm music trackers invent a metronome, often at double tempo. Cut there on phrase and energy changes.
- Scenes tile the track with no gaps.
- Narrated film: the voice is the clock, cuts follow the motion, not the drums. "Every cut on every beat" is a tell.

## 4. Cuts

- Cut at the fastest frame of a move, with matching direction and speed on both sides.
- A click into a new screen is a match cut on the click's rebound; the new screen comes in slightly large and settles.
- Hard cuts belong inside a scene (punch-ins). At most a third of the seams between beats are hard cuts.
- Worlds never crossfade into each other.
- A jump at a cut means the outgoing and incoming states differ at the seam: compare the frames just before and after.

## 5. Titles

- A landed title is **dead still**; motion moves to the next element, the camera or the world behind.
- Vary the entrance within a film; never fade-and-slide-up for each:

| Entrance | Recipe |
|---|---|
| Per-word blur-in | blur 6 px → 0 and opacity 0 → 1 in 0.13 s, words 0.067 s apart, no translate |
| Per-word ink-in | each word goes light grey → ink, 0.07–0.1 s apart, no position change |
| Whole-line blur-in | blur 8 px → 0 in 0.13–0.2 s |
| Per-letter (a name) | 0.1 s apart, opacity 0.3 → 1 with a slight blur |
| Behind the subject | the title sits between the plate and a cutout of the person |
| Slot machine | one word of the sentence rolls through options, ~0.1 s a roll |

- **Hold**: 0.5 s + 0.3 s per word; the film's last line ≥ 2 s; a one- or two-word chapter line may hold 0.4 s.
- **Exit**: blur-out and fade of 0.13–0.25 s, word by word, or with the scene's move.
- **Size**: 4–9% of frame height, one or two lines. Quiet lines 2.5–4% against hero words filling 60–90% of the width.
- One highlighted word in the accent colour, and it carries meaning.

## 6. Transitions with a cause

Use 3–5 kinds in a film, each caused by something on screen.

| Transition | Build |
|---|---|
| Zoom through a button | camera tracks to the button with blur (0.6 s); the button scales from ~8% to ~250% of the frame in 0.35 s, strong ease-in; its fill becomes the next frame |
| Object becomes the world | a pill or card grows past the frame in 0.65 s, ease-in-out, its radius shrinking; surroundings blur ~15 px and fade in 0.3 s; new content fades in while it still grows |
| Morph | one container widens into the next (~110 → ~880 px in 0.2 s, quart out) with horizontal blur 12 → 0 px |
| Carry across | the result shrinks 1 → 0.6 with blur peaking at 6 px mid-move and lands inside the next app as it builds around it |
| Colour flood | the hero object stays while the whole ground changes colour in ~0.4 s, cubic in-out |
| Whip | a horizontal or vertical smear of 0.13–0.3 s; the arriving element lands blurred and sharpens in ~0.13 s |
| Iris from the click | a circle mask opens from the clicked point onto the next world in 0.15 s |
| Dip cut | the outgoing frame darkens ~40% for 3 frames before a hard cut, so the cut reads as meant |
| Blur swap on one stage | out: opacity → 0 with ~8 px blur in 0.13–0.2 s; in: blur → 0 in 0.13 s; the ground never cuts |

Conflict: HyperFrames times each transition by type (0.13–0.65 s). Motionhaus makes every transition exactly one beat (~0.47–0.5 s).

Conflict: HyperFrames wants 3–5 transition kinds per film, each caused by an on-screen object. Motionhaus leaves unnamed transitions to the style's rotation and names one only "when the cut means something"; its kit includes `fade` (a crossfade between scenes).

## 7. Camera on stills and footage

| Request | Mechanism |
|---|---|
| Punch-in, zoom, pan, Ken Burns, reframe | scale and translate a wrapper around the media, never the media's own timing; chain the framings in one sequence |
| Crop or mask reveal | animate a clip-path or mask on an inner wrapper; source time untouched |
| Constant speed change | playback rate 0.1–10× |
| Speed ramp | a rate curve over clip time |
| Hold or freeze | hold the final frame; a freeze mid-source is an exported still placed as its own clip |

- A point in an image guessed directly misses by 16–24% of the frame. Narrow it with a numbered 9×9 grid, then 6×6 on the crop, then a check render (~2% error). Use this for `spotlight` / `focus` coordinates.
- Line draw-on with round caps: hide the line with a gap longer than the path (dash 100, gap 120, offset 110 on a normalised length of 100), not dash = gap = offset, which leaves a dot at the end on some curves. Give draw-ons a fallback when path length measures 0.
- A highlighter that wraps across lines animates a background band per line fragment, not one rectangle.

## 8. Feedback → fix

| The user says | Change |
|---|---|
| "too fast" | slow every zoom and pan to 0.7× of its speed, nothing else |
| "speed this up" | speed the content and shorten the beat by the same amount; later beats move up |
| "the titles move" | land them, then hold them dead still until they leave |
| "it feels like slides" | enter the next scene through an object on screen; cut a move mid-flight |

## 9. Intent you can assert on stills

Check these on rendered frames rather than by eye: element **appears by** t; A **before** B; element **stays in frame**; something **keeps moving** within the scene (no frozen stretch).

## 10. Cards over talking-head footage (`headshot`, reels)

Placement at 1920×1080 and 1080×1920; scale others.

| Layout | Landscape (x, y, w×h) | Portrait (x, y, w×h) |
|---|---|---|
| Split, video beside the card | 960, 0, 960×1080 | 0, 960, 1080×960 |
| Stack, video above | 14, 14, 1892×548 | 0, 0, 1080×844 |
| Overlay | full frame | full frame |

Picture-in-picture, 28 px from the edges (bottom-right: y = H − h − 28):

| Canvas | Source | Rectangle |
|---|---|---|
| Landscape | 16:9 | 1432, 28, 460×258 |
| Landscape | 9:16 | 1644, 28, 248×440 |
| Portrait | 16:9 | 690, 28, 360×203 |
| Portrait | 9:16 | 738, 28, 312×555 |

- Card zones: a lower third is the bottom 30%; a side panel the right 42% (landscape) or bottom 40% (portrait). Glass card slots: 48, 460, 660×540 landscape; 24, 1280, 1032×564 portrait.
- Portrait type = landscape × 1.3 (titles × 1.35, stats × 1.4); padding drops from 40–64 px to 24–36 px.
- Size a rectangle to its source's aspect; a cover fit crops a portrait source in a landscape box.
- Cards fade in over 0.4 s (cubic out) and out over 0.35 s (cubic in).
- Re-frame the video (0.5–0.7 s) only in a gap between cards.
- A static card goes dead after ~8 s; past ~15 s it needs a staged reveal.
- Density: one card per 6–8 s under a minute; 8–12 s up to 3 min; 12–20 s up to 10 min.
- A transcript's last word can end past the media: clamp card ends and total length to the file's real duration, or the render ends in black.
- Glass over bright footage goes white on white: put a dark scrim behind it (about 55% black fading out from the top, 72% at the bottom) and a dark glass base (`rgba(15,16,22,.78)` with a 22 px backdrop blur).
- Footage with keyframes more than ~1 s apart freezes on seek: re-encode with a keyframe every second.

## 11. Path-traced 3D (for `3d` style hero shots)

- Path tracing gives real soft shadows, bounced light and inter-reflections. Use it only when those are the point of the shot.
- Cost: an 8 s 720p clip took 10.8 s rasterised and 810.5 s path-traced (32 samples, 6 bounces): about 75×.
- Noise falls with the square root of samples: halving it costs 4× the samples. Each extra bounce lengthens every path. Start at 64 samples, 4 bounces.
- Preview and time in raster; path-trace once, for the final export.
- Without a hardware GPU, test at a few hundred pixels wide and 1–2 samples, and raise timeouts (the first shader run alone can take a minute).
- Determinism:
  - every visible thing is a function of frame time; accumulate exactly N samples from zero per frame, never "until converged" or by elapsed time;
  - disable the tracer's own fades, delays and dynamic resolution; use stable noise;
  - seed randomness while building the scene, or grain differs between render workers and jumps where their frames meet;
  - keep the set of lights and material features fixed over time (a change recompiles shaders mid-render);
  - draw one throwaway frame during setup: a renderer's first frame differs from later ones.
- Verify: render frame t, an earlier frame, then t again; the two t frames must be byte-identical. Then look at the frames, not the exit code.
