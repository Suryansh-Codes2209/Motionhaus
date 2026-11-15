# Motion vocabulary

Every name here is a value you can put in `script.json`. Nothing is implied: if a name is not on this page, the renderer does not have it, and `shorts make` prints a `motion:` warning for it. The lists are mirrored in `apps/shorts/src/motion.mjs` and `packages/motion-kit/src/types.ts`.

Times are at 30 fps. "Beat" is one beat of the episode's music (about 0.47 s at 128 BPM).

## 1. Hook variants (`scenes[0].variant`)

The first two seconds decide the swipe. Each variant stages the same ingredients (the product shot, ≤ 2 lines, one keyword) a different way. All of them keep the shot bright and line 1 on screen at frame 0.

| variant | what happens | pick it when |
|---|---|---|
| `rise` (default) | lines rise word by word over the shot | the capture is the whole story and needs no help |
| `build` | snap zoom at 0.1 s; words pop in on shrinking gaps, each 10% bigger than the last | the line itself escalates ("Free. Local. *No account.*") |
| `band` | a flat accent band sweeps across the top 20% in 0.3 s, the shot drops under it, the keyword lands in the band one letter every 2 frames, an impact on the last letter | one noun headlines the short (a product, a number, "BACKDOOR") |
| `echo` | the shot dims to ~45% while the keyword repeats 6 times down the frame as outlines, 2 frames apart, settling on one solid glowing copy; lines sit under the stack | serious or alarming stories with one load-bearing word |
| `card` | full-bleed shot punches in, at 0.3 s it shrinks into a rounded card on the style's backdrop, the giant keyword slams in above it at 0.45 s | the capture is busy and needs framing; design / UI stories |
| `ghost` | a blur pop at 0.2 s drops a giant outlined keyword across the top, cropped by the frame and drifting, with a small solid tag under it | energetic tech stories; the keyword is a brand name |
| `tag` | a torn paper tag with the keyword stamps in top-left at −5°, the whole frame takes the knock (a skew that decays in 0.3 s) | gritty, opinionated, "someone got caught" stories |

`keyword` (optional, ≤ 10 characters, one word): what `band` / `echo` / `card` / `ghost` / `tag` headline. Default: the first `*emphasised*` run of the lines if it is ≤ 12 characters, else its longest word. Set it when the default picks the wrong word.

```jsonc
{"type": "hook", "variant": "band", "keyword": "BACKDOOR", "image": "hook.png",
 "lines": ["Fake Claude Code", "*hid a backdoor*"], "vo": "…"}
```

**Rule: never the same variant as the previous episode** (`shorts make` checks this).

## 2. Type scene styles (`type.style`)

| style | what happens | words |
|---|---|---|
| `slam` (default) | one word per half-beat filling the frame, emphasised words flip to an accent plate, then the line settles | 3–6 |
| `scramble` | characters cycle random glyphs and lock left to right | ≤ 22 characters |
| `stack` | rows of outlined type drifting in alternate directions, middle row solid | 1–3 |
| `build` | words land on gaps of 0.9, 0.6, 0.4, 0.3 beats, each 16% bigger; impact on the last | 3–5, strongest word last |
| `echo` | the keyword as 6 rising outlines settling on a solid copy, the full line under it | any; `*emphasise*` the keyword |
| `boxed` | a plain line; the `*emphasised*` word gets a solid accent box that pops in half a beat after the line | 4–8, exactly one emphasised word |
| `offset` | 1–2 words in the poster face on an offset outline copy (print mis-registration), pulsing on the beat | 1–2 ("NO *WAY*") |
| `wall` | the keyword tiled into 6 rows sliding in from alternate sides, one row in the accent; the line stamps on a plate over it | any; `*emphasise*` the keyword |

## 3. Hits (`hits: [{"fx": "...", "at": <beats>}]`, any scene)

A hit is a few frames long and brings its own sound. `at` is beats from the scene start; put it on the word that earns it. The VO starts about as the scene starts, at ~2.2 words a second, so word n lands near `n / 2.2 × bpm / 60` beats. Check with a still (`--stills`) if it matters.

| fx | frames | what it is | sound | put it on |
|---|---|---|---|---|
| `punch` | 12 | a 14% zoom that snaps in and eases back | impact | the number, the name, the one line that matters |
| `flash` | 7 | a white frame fading out | shutter | a reveal, a cut inside one scene |
| `invert` | 3 | colour negative | glitch | something breaking, a "wait, what" |
| `freeze` | 16 | shutter flash, then the frame goes high-contrast and grey for half a beat | shutter | evidence: a screenshot, a quote, "caught" |
| `strobe` | 8 | four hard light/dark flickers | static | chaos, overload; once per short at most |
| `rgb` | 7 | clean red/cyan channel split | glitch | AI weirdness, hacks, a digital error |
| `jolt` | 8 | the camera knocked sideways with blur | whoosh | a hard turn in the story ("but") |
| `blur` | 9 | a defocus pop, out and back in | whoosh | a soft reset before a new idea |
| `echo` | 10 | two ghost copies of the frame fly outward | whoosh | a big name landing, a drop |

**Budget: 2–5 hits per short, never two in the same half-second, and never one that the VO does not justify.** A short with no hits, `zoom` or `fx` anywhere gets a `flat edit` warning.

## 4. Scene effects and grades

`zoom`, `fx`, `glitchAt`, `broll` and `sfx` are documented in `fx-catalog.md`. Added:

| field | value | what it is |
|---|---|---|
| `fx` | `leak` | a warm light leak drifts across and breathes |
| `fx` | `tiltShift` | top and bottom thirds fall out of focus; the eye stays on the middle band (screenshots, photos) |
| `fx` | `spotlight` | the edges fall dark around the centre |
| `grade` | `tealOrange`, `noir`, `warm`, `cold`, `punchy`, `duotone`, `faded` | a colour grade over the whole scene. `noir` for the past or a verdict, `duotone` (grey + the accent) for a stylised cutaway, `punchy` for product shots that look flat. One graded scene per short is plenty. |

## 5. Transitions (`"transition"` on the scene it leads into)

Each lasts one beat. Leave it out to use the style's rotation. Each style's own (`paper`, `glitch`, `blur`, `pop`, `flip`) and the older any-style ones (`zoomIn`, `zoomOut`, `whip`, `filmBurn`, `iris`, `zoomPunch`, `pushCut`, `slideLeft`, `slideUp`, `wipe`, `fade`) still exist. Added, for any style:

| name | what it is | reads as |
|---|---|---|
| `flash` | hard cut under a white frame | a camera shutter; evidence, a reveal |
| `dip` | down to the background and back | a breath; time passing |
| `rgbSplit` | channels tear apart, the cut hides in the tear | digital, hacked |
| `blinds` | 9 horizontal slats open | retro, tidy |
| `strips` | 6 vertical strips slide in from alternate ends | energetic, graphic |
| `diamond` | a diamond iris opens from the centre | playful, game-like |
| `clock` | a clock-hand wipe | time, "11 hours later" |
| `split` | the old scene parts like doors | opening something up, "inside" |
| `cube` | the scene tips over like a cube's top face | next step, next layer |
| `pageTurn` | the old scene turns like a page | documents, stories, "chapter two" |
| `spin` | both scenes spin through a blur | a twist |
| `stretch` | the frame pulls wide and smears | speed |
| `swirl` | both scenes twist and shrink through a blur | dreamy, strange |
| `lightSweep` | a slanted bar of light crosses, the next scene behind it | premium, a product reveal |
| `whipUp` | a vertical whip pan | going up: growth, "and then" |
| `push` | the next scene pushes the old one off the top | a feed scroll; lists |

**Name a transition when the cut means something** (a `clock` into "eleven hours later"). Otherwise leave it to the rotation. Never name the same one three times.

## 5b. Mask edits (the next thing is cut in through a shape)

Four tools. Use 3–5 across a long-form and at most one in a short; they are the loudest moves in the kit.

| what | how | use it for |
|---|---|---|
| `"transition": "maskText"` + `"maskWord": "WHY"` | the next scene shows through one huge word, then the camera flies through the letters | a chapter turn; the word is the question the chapter answers (≤ 8 letters) |
| `"transition": "maskInk"` | ink blots bloom and run together | a reveal, a change of mood |
| `"transition": "maskBrush"` | five slanted brush strokes paint the scene on | into a statement or a demo |
| `type` style `"window"` + `"video"` or `"image"` | the *emphasised* word fills the frame and its letters are a window onto the footage | the one word the chapter turns on ("Translate it *once*") |
| `photo` with `"behind": "ARM64"` + `"cutout"` | the word sits between the photo and its subject (text behind subject) | the cold hook, a re-hook |

Rules:
- **Mask transitions lead into a full-bleed scene** (`photo`, `type` window, a `hook` with `image`/`video`). Into a scene that starts as an empty canvas the mask reveals nothing and reads as a glitch.
- A cutout comes from `shorts cutout <episode-dir> photos/x.jpg` → `photos/x-cut.png` (Apple Vision, any subject). Pick a photo with one clear subject covering 10–60% of the frame and **read the PNG**.
- The word must show around the subject. For a wide subject raise the word (`"behindAt": 0.2`, the word's centre as a share of the height) and lower the subject (`"focus": {"x": 0.5, "y": 0}`). Check a still.
- `behind` words: ≤ 6 characters ("60 FPS", "ARM64").

## 5c. Custom SVG motion graphics (`svg` scene)

A graphic drawn for this one episode: `{"type": "svg", "file": "graphics/emulator.svg", "caption": "Translating *while you play*", "captionAt": 3, "vo": "…"}`. Write the `.svg` into the episode's `public/graphics/` (viewBox `0 0 1600 700`). Elements animate through data attributes, timed in **beats from the scene start**:

| attribute | does |
|---|---|
| `data-in="draw\|fade\|pop\|rise\|drop\|left\|right\|wipe"` + `data-at` + `data-dur` | how and when the element arrives (`draw` strokes the outline on) |
| `data-out="6"` | fades away at that beat |
| `data-loop="pulse\|spin\|float\|blink\|dash"` + `data-speed` | keeps moving once it is in |
| `data-loop="travel" data-path="#lane" data-period="2"` (`data-once`) | rides along a path; draw the rider around 0,0 |
| `data-count="95" data-suffix="%"` | a `<text>` that counts up |

Colours and fonts follow the episode: `var(--accent)`, `var(--accent2)`, `var(--fg)`, `var(--bg)`, `var(--muted)`; `style="font-family:var(--display)"` (also `--body`, `--mono`). An animated element must not have its own `transform` attribute: wrap it in a positioned `<g>`.

**How much** (web research 2026-11-13; no controlled study exists, the numbers are vendor claims, so let our own retention graphs overrule this):
- Custom graphics help when they **explain a mechanism or a number** the viewer can't picture; decoration and constant motion hurt (cognitive load), and bad graphics hurt more than none.
- **Long-form: 2–4** custom graphics, each on a how-it-works or proof beat, 6–12 s, one idea each. Never two in a row; put a photo or footage between them.
- **Shorts: 1** (2 at most), 3–5 s, on the "wait, really?" beat. Text stays the main layer in a short; the graphic supports it. Never on frame 0 unless it is already moving.
- The graphic shows what the VO says in the same order; labels ≤ 3 words; check a still at 25%, 55% and 90% of the scene for overlaps.
- Draw objects (a console, a phone, a gear, packets moving), not boxes with labels: boxes are cards again.

## 5d. 3D space scenes (`space`)

Real depth, a moving camera and depth of field on a dark stage. See `skills/video-craft/SKILL.md` → "Depth".

```jsonc
{"type": "space", "mode": "swarm", "images": ["photos/a.jpg"], "words": ["Books.", "PDFs.", "Links."], "label": "pages", "total": 12480, "title": "Too much to *read*", "vo": "…"}
{"type": "space", "mode": "gallery", "images": ["readme/1.png", "readme/2.png", "readme/3.png"], "labels": ["Add keys", "Add games", "Build"], "title": "Three *clicks*", "vo": "…"}
{"type": "space", "mode": "vortex", "image": "brand/logo.png", "title": "One *app*", "label": "your whole library", "vo": "…"}
```
- `swarm`: `count` sheets on screen (default 220, max 320); the counter shows up to `total`. Words: 3–6, one or two each. Needs ≥ 10 beats.
- `gallery`: 3–6 images, about 4 beats each; captures and screenshots work best (they are cropped to 5:3 from the top left).
- `vortex`: needs ≥ 8 beats; the flare lands at 55% of the scene, so put the VO's key word there.
- 1–2 per short, 2–4 per long-form, never two in a row.

## 6. Caption presets (top-level `"captions"`)

Default `style`: the edit style's own caption skin. Switch when that skin has run several episodes in a row or the short needs a different energy.

| preset | look | use for |
|---|---|---|
| `style` | the edit style's skin, 3 words a page | most shorts |
| `slam` | one giant condensed word at a time, slammed in, emphasis in the accent | rapid-fire lists, hype, short punchy VO |
| `bigKey` | small lowercase filler, the `*emphasised*` word of each beat at 1.8× in the accent | calm explainers where one word per line carries it; needs emphasis marks in the `vo` |
| `pill` | white bold, a rounded accent pill jumps to the spoken word | the familiar creator look; safe on any footage |
| `sweep` | words turn the accent as they are said and stay lit | quotes, lyric-like lines |
| `underline` | white bold, an accent underline tracks the spoken word | serious or editorial stories |

## 7. Pacing shapes (top-level `"pacing"`)

Review of 2026-11-12: episodes 31–52 were all hook → 2 scenes → cta at 17–21 s, and 53–58 all hook → 3 scenes → cta at 32–37 s with every scene about 7 s. One skeleton, one rhythm, every day. The total stays 30–38 s and 62–84 VO words (retention rule 5), but **how that time is cut must change from one short to the next.**

A quick cut is a scene with ≤ 8 VO words (about 3.5 s). A hold is a scene with ≥ 22 (about 10 s).

| pacing | scenes | rhythm | for |
|---|---|---|---|
| `steady` (default) | 5 | five beats of similar weight, but still one quick cut and one that breathes | a plain "here is a tool" story |
| `staccato` | 6–7 | hook, then ≥ 3 quick cuts (`type`, `stat`, `photo`, `tiles`), one longer scene that pays them off, the question | lists, feature bursts, hype |
| `slowBurn` | 5 | short hook and set-up, then one hold of ≥ 22 words on the evidence (`document`, `code`, `log`, `comment`, `clip`), a quick verdict, the question | controversy, security, "read what it says" |
| `countdown` | 6 | hook, three numbered beats of falling length, the reveal, the question | "3 things", rankings, steps |
| `coldOpen` | 5–6 | scene 1 is the evidence itself (a `hook` with `video`, `clip`, `screenshot`) under ≤ 6 words; the name and claim land in scene 2 | a demo that speaks for itself |

`shorts make` prints `pacing:` warnings when:

- the shape's own rule is broken (scene count, quick cuts, hold, cold-open length);
- the body scenes all carry about the same number of words (longest ÷ shortest under 1.6): "even pacing";
- the shape, the scene-type order, or the length (total VO words within ±4) **matches the previous episode**.

So alternate the ends of the range too: after a 64-word short, write a 78-word one.

## 8. Building blocks for new scenes

`packages/motion-kit/src/components/fx/moves.tsx`:

- `moveStyle(move, t, ease?)`: CSS for a named entrance at progress 0..1. Moves: `fade`, `rise`, `drop`, `slideLeft`, `slideRight`, `pop`, `slam`, `scale`, `blur`, `riseBlur`, `maskUp`, `wipe`, `flip`, `flipY`, `stretch`, `squeeze`, `spin`, `swing`, `roll`, `jelly`, `zoomIn`, `shrink`, `flicker`, `glitch`. Eases: `linear`, `out`, `inOut`, `expo`, `back`, `elastic`, `snap`.
- `<MotionText text size move split="words|chars|line" order="forward|reverse|center|edges|random" at stagger dur loop gaps grow outline stroke …>`: kinetic text from those moves. Loops: `float`, `pulse`, `shake`, `wobble`, `wave`, `heartbeat`, `breathe`, `swing`.
- `keywordOf(text)`: the headline word of a line.
- `impactFamily` (`fonts.ts`): the condensed poster face (Anton) for giant keywords.

Use these instead of hand-rolled springs when writing or porting a scene (see `library.md`).

## A worked example

```jsonc
{
  "style": "terminal", "captions": "pill", "pacing": "slowBurn",
  "scenes": [
    {"type": "hook", "variant": "band", "keyword": "BACKDOOR", "image": "hook.png",
     "lines": ["Fake Claude Code", "*hid a backdoor*"], "vo": "A fake Claude Code update hid a *backdoor.*"},
    {"type": "type", "style": "scramble", "text": "2.1.312 + 2.1.313", "transition": "rgbSplit",
     "hits": [{"fx": "freeze", "at": 5}], "vo": "…"},
    {"type": "code", "terminal": true, "code": "…", "zoom": "in", "vo": "…"},
    {"type": "stat", "value": 11, "suffix": " h", "label": "before anyone *noticed*", "transition": "clock",
     "hits": [{"fx": "punch", "at": 2}], "vo": "…"},
    {"type": "type", "style": "boxed", "text": "Do you *check* updates?", "vo": "Do you check your updates?"}
  ]
}
```

Five scenes, one hook variant, two named transitions that mean something, two hits, one zoom. That is the density to aim for.
