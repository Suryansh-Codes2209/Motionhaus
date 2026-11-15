Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), `.claude/skills/captions-overlay/SKILL.md`, `.claude/skills/oversized-cursor/SKILL.md`, `.claude/skills/changelog-video/references/script-voice.md` (caption rail).

# Captions and the oversized cursor

## Part 1: The caption model

Two ideas. The **model**: every spoken phrase is `drop`, `rail` or `embed`. The **overlay law**: a caption is a layer composited on top of the film, never a band the layout reserves.

### drop / rail / embed

| Class | What | How it is shown |
|---|---|---|
| **drop** | filler: um/uh, stutters, self-corrections | not shown |
| **rail** | the default: ordinary spoken content, verbatim | clean lower-third subtitle, **in front**, readable. A punch word may get an inline emphasis highlight (accent colour, active-word pop); it stays on the rail. |
| **embed** | a promoted peak: the headline beat | one big word composited **behind the subject** (matte occlusion), with a designed entrance and exit |

Rules:
- **Rail-first** for talking-head and explainer work. The rail carries most of the text. Embedding the whole transcript is the default mistake.
- **Embed is scarce and spaced:** at most 1 per sentence/beat, never two adjacent or co-visible, at least a beat apart, at most one apex.
- A climax is a per-beat peak, not "the single payoff of the entire clip".
- A short clip usually gets one embed. A long explainer gets about one per section.
- A pure-cinematic treatment drops the rail and makes everything embed-style. Use it only when asked for pure cinematic; never for explainer or voice-over where the words must read.

Motionhaus mapping:
- **rail** = the burned-in caption pages on shorts (`captions` presets), the `.srt` on long-form.
- **embed** = `photo` with `behind` + `cutout` (text behind the subject), and the `type` `window` style. Their existing limits (§5b: 3–5 mask edits per long-form, at most one per short, `behind` ≤ 6 characters) already enforce scarcity.
- **emphasis on the rail** = `*emphasis*` in `vo`, the `bigKey` / `pill` / `sweep` / `underline` presets.
- **drop** matters for real footage (reels, headshot takes). Scripted TTS has no filler to drop.

### The overlay law: captions are not a reserved band

The caption line is a small, minimal, word-by-word single line, bottom-centred, occupying roughly the bottom **5–8% of canvas height**, composited over the whole film.

- **Centre the composition on the true vertical centre, y = H / 2** (540 on a 1080-high landscape frame, 960 on a 1920-high portrait frame). Do not shift content up to make room. A composition centred at 0.42 × H with a dead lower band is the bug, not the fix.
- Content may extend to the canvas bottom. Full-bleed subjects, rails and backgrounds are welcome.
- **One soft courtesy rule:** do not park critical small readable text (a URL, a legal line, a sub-caption) in the bottom ~80 px centre span where the caption line sits (~100 px on a 1080 square with a 32 px rail). Large imagery, cards and ambient content under the captions are fine; the caption skin is designed to read over content.
- There is no keep-out check. Judge caption-over-content legibility on stills.
- With captions off, positioning freedom is identical.

Reference rail (1080 × 1080): one line, bottom-centre, top edge at y = 990, 52 px tall, medium-weight sans at 32 px, ink at 0.94 opacity, soft dark text shadow. Words fade in over 0.12 s on their own timestamps. Phrase swaps are instant. One line = one phrase of at most ~40 characters; line grouping is decided when the script is written, not downstream.

Caption timing rules from the same source:
- Each displayed word takes the start time of its first spoken word. A line ends when the next line starts; the last line ends 0.6 s after its last word.
- Captions show the display spelling; the voice reads a phonetic spelling. Never show a phonetic spelling on screen.
- Captions are non-optional once planned: sample 3–4 frames across the spoken span of the render and confirm caption text is visible in each.

### Why the two rules are one doctrine

The rail rides in front; an embed is a rare word composited behind the subject; the caption line is a layer on top of the film. All are layers ADDED to a frame that keeps its full composition:

- Keep the full frame; centre on true centre; let content run to the edges.
- Let the rail carry the verbatim words.
- Promote a word to an embed only at a real peak: scarce, spaced, never two at once.
- Reserve nothing.

### Conflicts with Motionhaus rules

- **Conflict:** HyperFrames puts the caption line in the bottom 5–8% of the canvas and reserves nothing. Motionhaus shorts place captions in the Shorts safe zone, above the platform's bottom title/channel overlay (~20% of height; default top at y ≈ 1390 of 1920) and clear of the right action rail. On Shorts and Reels the platform UI covers the bottom, so the safe zone stays; what carries over is the layout half: centre scenes on y = H / 2 and let content run under the captions.
- **Conflict:** HyperFrames's rail is one verbatim line of up to ~40 characters. Motionhaus caption pages are 1–3 words, restyled per edit style, with a `slam` preset of one giant word at a time.
- **Conflict:** HyperFrames treats captions as non-optional on the render. Motionhaus long-form has no burned-in captions; it uploads an `.srt` (cues of at most 2 lines × 42 characters).

---

## Part 2: The oversized cursor (the eye-carrier)

A deliberately oversized pointer that travels the frame as a visible protagonist: it enters from off-screen, walks the eye to the next point of interest, clicks to cause the next thing, and leaves.

Why: big cursor movement is one of the cheapest high-yield motion sources. One element, transform-only, and it
1. carries the eye across scenes that would otherwise read as dead,
2. gives causal ignition to morphs and transitions ("the click did that"),
3. breaks the eye out of a stale state when a new scene or complex sequence starts.

Bigger is better. An actual-size cursor disappears at video scale.

Use it when: any pointer-led action, kicking off a UI scene, igniting a morph, transition or typing run, or a scene that reads static.

### Size and look

| Property | Value |
|---|---|
| Full-frame scenes | **7% of frame width** (≈ 134 px at 1920 wide) |
| Inside a mock or small frame | 4.6–5.5% of the container width. Never smaller. |
| Geometry | one arrow shape everywhere |
| Fill | white body + black stroke, or near-black body (`#1c1c1c`) + 1.4 px white stroke. Pick per scene contrast; keep it constant across the film. |
| Shadow | drop shadow 0 px / 4 px offset, 6 px blur, black at 0.3 |
| Stacking | above all scene content |
| Resting pose | off-screen (canonical: horizontally near 48%, vertically at 115% of frame height, i.e. below the frame) |

**Brand-motif cursors.** The system arrow is the default, not a mandate. When the subject brand has a recognisable cursor identity (a collaborative design tool's coloured multiplayer arrow with a name tag, a creative suite's precision crosshair, a distinctive product pointer), use that cursor. All laws below apply unchanged. A name-tag variant travels as one rigid unit, tag trailing the arrow. Only when the motif is truly recognisable; otherwise it is just a weird arrow.

### Entry law: physical, never revealed

- The cursor **always enters from off-screen** (canonical: from below, starting at 115–120% of frame height) and travels to its first target in one decelerating glide. It must feel like it entered the room.
- Never fade it in at a resting position. Never mask-reveal it. Both read as a glitch.
- Default path: straight up the y-axis to the target. No fragmented diagonals. A diagonal is fine when it is the story (an off-axis target), but it is one continuous vector.
- Duration **0.4–0.92 s**, quartic-out. Reference: from (48.6%, 115%) to (48.6%, 55%) in 0.85 s, starting 0.25 s into the scene.

### Tip targeting and the click tap

- The hot spot is the arrow TIP, not the box centre. Land the tip on the target's centre.
- Pivot all press scaling on the tip: transform origin **21% 14%** of the cursor box (for the standard arrow drawn in a 24-unit box).
- Click = asymmetric compress and release, 1 : 2:

| Phase | Scale | Duration | Ease |
|---|---|---|---|
| Press | 1 → 0.84 | 0.10 s | cubic-in |
| Release | 0.84 → 1 | 0.22 s | cubic-out |

- The target's reaction is a separate, parallel animation starting on the same frame: a button scales to 0.94 with a pressed colour or shadow; add a click ripple or a press-release spring.
- A cursor-only tap (focusing a text input) gets NO target reaction.

### The click ignites the next beat

Never let a morph, typing run, window transform or scene-defining animation simply start. Park the cursor on the trigger and let the click cause it, on the same frame:

- click → menu or submenu cascade, toggle flip
- click → typing starts in an input
- click → composer morphs down, window shrinks
- click → logo ignition, flight launch
- click → play state flips and the UI in a product mock wakes up

During long beats it does not own (typing, narration), the cursor **drifts aside** over 0.5–0.9 s (cubic-out). It never sits frozen on top of the action and never wobbles idly.

### Exit law and cross-scene handoff

Two sanctioned exits, both physical. Never an opacity fade in place.

1. **Leave the frame:** accelerate off the nearest edge (cubic-in) to 118% right, −12% left or 116% bottom, in 0.5–0.7 s.
2. **Cut-the-curve handoff:** in the final ~0.3 s before a hard cut, the cursor starts accelerating (cubic-in) toward the NEXT scene's first click point, covering the first ~1/3 of that path. The next scene places its cursor at the handoff pose on its first frame and continues (cubic-out, e.g. 0.6 s) at matched velocity. The cursor is the carrier that stitches the seam.

### In Remotion

- One absolutely positioned SVG arrow above the scene content, sized `0.07 × width`, driven by `interpolate` on frame for left/top (as fractions of the frame) and a nested scale wrapper with `transformOrigin: '21% 14%'` for the tap.
- For a handoff, the outgoing scene's last ~9 frames and the incoming scene's first ~18 frames both draw the cursor; the two scenes must agree on the handoff pose. Use a hard cut or a cut-the-curve transition between them, not a blend, or two cursors show at once.
- Fire the click on a VO word; start the caused animation and its click sound on that same frame.
- Motionhaus's `spotlight` scene already has a cursor that glides to `focus`, clicks, and triggers a camera push. Check it against this list before writing a new one.

### Checklist

- [ ] At least 7% of frame width full-frame (4.6–5.5% inside a mock). When unsure, bigger.
- [ ] Enters from off-screen on one continuous vector. No fade or mask reveal.
- [ ] Tip lands on the target centre; press pivots on 21% 14%.
- [ ] Every click causes something, on the same frame.
- [ ] Drifts aside during beats it does not own; zero idle wobble.
- [ ] Exits physically (off-frame or cut-the-curve handoff). No fade in place.
