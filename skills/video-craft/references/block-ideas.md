Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), registry/ and skills/hyperframes-registry.

# Block ideas: designs worth building from the HyperFrames registry

Read this when a script keeps reaching for the same backdrop, card or move. It is a pool of designs Motionhaus does not have yet, each with the numbers from the original and a recipe for our frame-driven Remotion kit. Nothing here is code to copy: every entry is a description to reimplement in `packages/motion-kit`. Paths are relative to the HyperFrames repo root.

## 1. How the registry is organised

The registry holds 457 items in three kinds. **Blocks** (210, `registry/blocks/<name>/`) are whole scenes with their own timeline, 1920x1080 unless noted, 2–25 s long. **Components** (238, `registry/components/<name>/`) are snippets merged into a host scene: text effects, cursors, camera moves, transitions, textures. **Examples** (9, `registry/examples/`) are full multi-scene projects. Each item is one HTML file plus a `registry-item.json` (title, description, tags, variables, duration). There is no category field; items are found by tag and by English search (`hyperframes catalog --query`). The registry skill groups them as: transitions, overlays and lower thirds, titles and kinetic type, social/chat/UI cards, code/charts/data/maps, 3D/shader/backgrounds (blocks); motion primitives and text effects, caption styles, camera moves, product-demo and UI props, textures/particles/effects (components). The counts below are my grouping by tag and `family`, so treat them as close, not exact.

## 2. Category table

"Ours" names what Motionhaus has today (`packages/motion-kit/src`, `apps/shorts/studio/src/longform/Backdrop.tsx`).

| Registry category | Kind | Count | Motionhaus equivalent |
|---|---|---|---|
| Scene transitions (14 shader, 13 gallery showcases, scribble, clone wall, beat freeze, code-slice) | block | 31 | **yes**: 38 named transitions. Missing: noise/burn dissolves, halftone, paper tear, scribble, word wall, match cuts |
| Scene transitions (iris, whip, halftone, torn paper, curtain, match cuts, pixelate) | component | 22 | **partial**: wipes, iris, whip exist; texture and match-cut families do not |
| WebGPU shader looks (aurora, godrays, voronoi, sun-burst, stripes, plasma, material orbs) | block | 36 | **partial**: `AuroraBackground` only. No rays, cells, stripes, marble, orbs |
| Backgrounds (halftone field, tunnel, galaxy, anamorphic flare, LCD board, soft blobs) | block | 7 | **partial**: `RetroGrid`, `DotPattern`, `Meteors`, `FlickeringGrid`, `PaperTexture`, `DepthStage`, long-form sets `canvas/shapes3d/aurora/floor/rings/plate` |
| Backgrounds (aurora drift, beat pulse, dynamic grid, grain field) | component | 4 | **partial**: grids and aurora yes; beat-pulsed backdrop no |
| Carousels (circle, orbit sphere, path, vision row, text-threaded; 5 styles each) | block | 25 | **no**: `photo` montage/prints only |
| 3D, devices, glass, camera (dolly zoom, rack focus, glass hero, extruded logo, turntable, GLTF devices, liquid glass) | block | 22 | **partial**: `stack` scene, `flip`/`cube` transitions, `Orbit3D`, `PhoneFrame`/`BrowserFrame`. No lens effects, no glass, no extruded type |
| Camera moves (push-in, pull-back, pan stations, focus rack, device dive, shake profiles, filmed screen) | component | 12 | **partial**: `zoom` in/out/punch, `SceneCamera`, `shake`, `tiltShift`. No pan-across-stations, pull-back reveal, device dive |
| Titles, kinetic type, logo (split-flap, weight wave, prism title, logo intro/outro) | block | 7 | **partial**: `type` styles, `hook` variants, `logo` slam/assemble |
| Text effects and title cards | component | 48 | **partial**: `MotionText` covers ~24 entrances; `scramble`, `ShimmerText`, `Typewriter`, `NumberTicker`. No variable-font, split-flap, ticker lock, colour-mapped wipe, gooey morph, particle text |
| Caption styles | component | 16 | **yes**: 6 presets (`style/slam/bigKey/pill/sweep/underline`). No camera-follow, texture-fill, behind-subject captions |
| Code (typing, diff, morph, highlight, scroll, 3D slab, particles, shader dissolve, VS Code/Terminal chrome) | block | 11 | **partial**: `code` typing and `log`. No diff, token morph, line spotlight, long-file scroll |
| Data, maps, diagrams (bar race, line graph, choropleths, hex map, flight route, flowchart, oscilloscope, leaderboard) | block | 18 | **partial**: `chart` bar/line, `stat`, `steps`, `flow`, `versus`. No race, no maps, no instruments |
| Data and proof props (donut, progress ring, number wheel, logo wall, star rating, testimonials) | component | 14 | **partial**: `stat`, `quote`, `NumberTicker`. No ring/donut/wheel/logo wall |
| Social, chat and UI cards (AI exchanges, message thread, notification cascade, X/Reddit/Spotify cards) | block | 18 | **partial**: `chat`, `comment`. No notification stack, no agent tool-step trace |
| Product-demo and UI props (device stages, sheets, toggles, state chips, HUDs, before/after) | component | 40 | **partial**: `screenshot`, `spotlight`, `bento`, `tiles`, `features` |
| Cursors and pointers (agent cursor, zoom-follow, drag-drop, text select, marquee, touch) | component | 15 | **partial**: one click cursor in `spotlight` |
| UI micro-interactions (badge pop, tabs indicator, modal morph, success check) | component | 18 | **no** (rarely needed at video scale) |
| Lower thirds and tickers | block | 13 | **no**: `SeriesBug` only |
| Handwritten family (write-on title, pipeline, bubble, frame, arrows, circles, boil) | block + component | 12 | **partial**: vox `Highlighter`, `clipping` marks, `Tape`. No boil, no handwritten diagrams |
| Overlays and looks (camcorder HUD, flash, freeze dressing, snow, starfield, cinemagraph, light leak) | block | 8 | **partial**: `vhs`, `letterbox`, `flare`, `leak`, `Grain`, `Vignette`, grades |
| Effects, textures, reveals (ASCII, dither, slit-scan, motion blur, echo smear, ink bleed, particle reveal, whiteboard ink) | component | 43 | **partial**: `maskInk`, `maskBrush`, `echo` hit, `ParticleBurst`, `Confetti` |
| Other showcases (ads, mascot walk, media grids) | block | 8 | n/a |
| Examples (kinetic type, NYT graph, swiss grid, vignelli, warm grain, decision tree, product promo, play mode, path-traced 3D) | example | 9 | style references, comparable to our `styles/` |

## 3. The shortlist: 40 designs to build

Conventions used in the recipes:

- `t` = seconds into the scene (`frame / fps`); `p` = a 0..1 progress (`interpolate(frame, [a, b], [0, 1], clamp)`), eased where noted.
- For transitions, `p` is the transition's own 0..1 over one beat. Originals run 1–2.4 s; compress to one beat as: cover in the first 45%, swap scenes at 50%, clear in the last 45%.
- `hash(i)` = our seeded random (`random(seed + i)` from Remotion). Never `Math.random()`.
- Colours: map the original's accent to `brand.colors.accent`/`accent2`, ink to `fg`, board to `bg`.
- Effort: **S** ≤ half a day, CSS/SVG only. **M** about a day, canvas or careful maths. **L** several days, shader or Three.js or baked data.

### Backgrounds and backdrops (8)

**1. `halftone-field`** · `registry/blocks/halftone-field/` · **M**
A black frame covered by a grid of dots; broad bands of light sweep across and the dots swell and change colour where the light passes, like an LED wall.
Source numbers: 10 s loopable; dot cell 6–60 px (default about 34 px); 3D simplex noise field, frequency 0.3–6 (default about 0.9), speed 0.25; brightness raised to a gamma of 0.5–8 (default about 5), which keeps most of the frame dark; four-stop palette `#00AAFF → #C2FF67 → #6600FF → #000000`; dot edge is a 2 px smoothstep; optional snap of time to a 30 fps grid for a stepped look.
In Remotion: a `<canvas>` painted in `useEffect` keyed on `frame`, or a fragment shader in `@remotion/three`. Per cell centre: `v = noise3(x*f, y*f, t*speed)`, `g = pow(v, gamma)`, radius = `g * cell/2`, colour = palette ramp at `v`. Use `simplex-noise` with a seeded PRNG. At 1080x1920 that is ~1,800 cells: fine on 2D canvas.

**2. `gallery-tunnel`** · `registry/blocks/gallery-tunnel/` · **L**
The camera flies down an endless square corridor whose walls, floor and ceiling are tiled with colour slabs and your own screenshots, fading to black at the vanishing point.
Source numbers: 12 s; tunnel 2 wide x 1.8 high, 15 segments of depth 1; flight 3 segments/s; FOV 75; each wall cell split into a grid of 1–4; 50% of slots filled, 50% of filled slots are images (dealt by hash, so an image recurs at several depths); slabs inset to 94% of their cell; fog reaches pure backdrop at 14.25 segments, which is also where segments recycle; palette `#FF6A00, #AB54F7, #EA3737, #0072E3, #00AA3C, #FFB200`; edge lines `#B0B0B0`.
In Remotion: `@remotion/three`. Camera fixed at origin; each segment's `z = -((i - speed*t) mod N) * depth`, so the loop is a pure function of `t`. `MeshBasicMaterial` with `fog: true`, `scene.fog = new Fog(bg, 1, fogFar)`. Feed product screenshots as textures: a long-form backdrop made of the episode's own captures.

**3. `spiral-galaxy`** · `registry/blocks/spiral-galaxy/` · **L**
A spiral galaxy of 20,000 points seen from above and to one side; the core turns faster than the rim, so the arms visibly wind up during the shot.
Source numbers: 10 s; 20,000 stars (2,000–40,000), 3 arms; radius = `ratio^1.5 * 5`; static twist 0.78 rad per unit; angle = `armAngle + twist*r + rate*t*(1 - ratio)`; jitter `pow(u, 3) * 0.2 * radius`, squeezed to 62% across the arm and 30% vertically; core `#ffa575`, rim `#311599`; camera at (0, 2.9, 7.6), FOV 45; a rim-coloured radial halo screen-blended on top.
In Remotion: `@remotion/three` `<points>` with per-star attributes seeded once in `useMemo`; a vertex shader computes the angle from a `uTime` uniform set to `frame / fps` (never integrate frame to frame). Additive blending, point size scaled by camera distance. Good hero backdrop for "scale" stories (parameters, users, tokens).

**4. `vfx-anamorphic-flare`** · `registry/blocks/vfx-anamorphic-flare/` · **M**
About 140 small bright points drift slowly on near-black, each throwing a long horizontal blue-violet streak like an anamorphic cinema lens.
Source numbers: 10 s; 140 emitters, radius `3 + rand^1.6 * 10` px; each moves on its own pair of sines and breathes in brightness (62–100%); streak half-length 12.5% of frame width; tent-shaped falloff along the streak; tint `#7a8aff`; backdrop `#04040a`; highlights above a 0.3 threshold only; time scale 0.5; additive (`lighter`) compositing, streak layer drawn at quarter resolution.
In Remotion: 2D canvas. For each emitter compute `x, y, bright` from `t` with closed-form sines, draw a horizontal linear gradient (transparent → tint → transparent) of height ~2r with `globalCompositeOperation = 'lighter'`, then the core dot. No blur filter needed. Reads as "cinema" behind a product name.

**5. `yt-lcd-background`** · `registry/blocks/yt-lcd-background/` · **S**
A paper-grey board that looks like a physical display: fine scanlines drifting slowly, a faint pixel grid, static grain, and a title that focuses in from blur with a red/blue fringe.
Source numbers: 10 s; scanlines every 3 px at 5% alpha; grid 28 px at 6% alpha; grain 8%; paper `#e9e9e6` / dark `#1c1c1e`; fringe red `#ff2a4d`, blue `#2a7fff`, offset copies at 50% opacity that settle then breathe; text bowed with `perspective(950px) rotateX(7deg)`; entrance from `blur(16px)` on `power2.out`.
In Remotion: three stacked `repeating-linear-gradient` layers; scanline `background-position-y = (t * speed) % 3`. Title = three absolutely stacked copies; red/blue `translateX(±o)` where `o = interpolate(...)` settling to 1–2 px plus `sin(t)` wobble. A new light-mode set for `Backdrop.tsx`.

**6. `mk-background`** · `registry/blocks/mk-background/` · **S**
Two huge soft colour blobs drift on a white or black stage; on cue the whole board shrinks into a rounded card and later grows back to full bleed.
Source numbers: 10 s; blobs ~950 px radius at (28%, 32%) and the opposite corner, 85% opacity, pink `#ff7ac8` + teal `#45d6c8` (dark: violet `#7d5cff` + `#2d1b69`); entrance scale 1.14 → 1 over 1.2 s `power3.out`; drift ±70–84 px on a 2.35 s `sine.inOut` yoyo; board → card over 1.1 s `power3.inOut`, corner radius 40 px, shadow `0 30px 80px`; optional frosted card (`backdrop-filter: blur + saturate(1.4)`).
In Remotion: two radial-gradient divs moved by `sin(2π t / 4.7)`; the board is a div whose `inset` and `borderRadius` interpolate between 0 and the card rect. The useful part for us is the mask: a backdrop that becomes the card the next scene sits on, which removes one cut.

**7. `beat-pulse-background`** · `registry/components/beat-pulse-background/` · **S**
A deep accent-tinted backdrop whose glow brightens and saturates on every beat, then relaxes; strong enough to feel the music, not a strobe.
Source numbers: per beat one attack of 0.08 s (`expo.out`) and one decay of 0.36 s (`power2.in`); glow layer screen-blended; saturation driven by one variable; two strengths (subtle, club); beat times supplied as data.
In Remotion: we already have the beat grid. `since = (frame % framesPerBeat) / fps`; `env = since < 0.08 ? easeOutExpo(since/0.08) : 1 - easeInQuad((since-0.08)/0.36)` clamped; set glow opacity `base + env * k` and `filter: saturate(1 + env * 0.4)`. Drop-in for any style's `Background`.

**8. `starfield`** · `registry/blocks/starfield/` · **S**
A transparent night-sky layer: stars in three sizes twinkle and slide sideways in two parallax layers, with the centre of the frame kept clear for the subject.
Source numbers: 70% of stars 1 px, 25% 1.6 px, 5% 2.6 px with a glow; far stars drift over 2x the clip length, near ones 5x; each star twinkles a whole number of sine cycles per clip (so it loops); stars fade over the first and last 12% of their drift; radial mask clears the centre; tones warm/cool/white; densities sparse/dense.
In Remotion: seed N stars in `useMemo`; per frame `opacity = base + amp * sin(ω t + φ)`, `x = x0 + drift * t`; render as absolutely positioned divs or one canvas; wrap in a div with `mask-image: radial-gradient(transparent 0, #000 60%)`. Works over photos and `hook` images, not only on black. The sibling `snow` block is the same engine falling downward.

### Transitions (8)

**9. `hw-scribble-transition`** · `registry/blocks/hw-scribble-transition/` · **S**
Fat marker zigzags scribble across the frame band by band until it is covered, the scene changes underneath, and the scribble un-draws the other way.
Source numbers: 2.2 s total; each band is one zigzag path with 7 zigs spanning edge to edge; bands draw on over 0.55 s (`power2.in`), 0.04 s apart, alternating direction; a solid backstop snaps in at 0.8 s (0.12 s) and lifts at 1.42 s; bands clear over 0.5 s (`power2.out`); marker colour `#ffb020`.
In Remotion: SVG `<path>`s with thick `stroke`, `strokeDasharray = len`, `strokeDashoffset = len * (1 - ease(p_i))`, sign flipped on odd bands. Build paths from `hash` so the wobble is fixed. Show the old scene until 50%, the new one after. Belongs in `vox` and `toybox` rotations.

**10. `mk-clone-wall-transition`** · `registry/blocks/mk-clone-wall-transition/` · **M**
The outgoing scene shrinks into a rounded card on a wall of one repeated word, the wall flips from ink-on-paper to paper-on-ink in a sweep, the card is put away, and the wall fades to the new scene.
Source numbers: 2.4 s; card shrink 0.2–0.95 s (`power3.inOut`), corner radius 40 px; wall rows brick-offset and drifting sideways over 1.8 s (`sine.inOut`); inversion is a paper-coloured rect with `mix-blend-mode: difference` sliding in over 0.65 s from 0.85 s; card away at 1.35 s (scale 0.6, fade, 0.4 s); wall fades 1.9–2.35 s.
In Remotion: tile `maskWord` (we already have the prop) into rows; old scene `transform: scale()` + `borderRadius`; inversion = a full-size div with `mixBlendMode: 'difference'` and `translateX(interpolate(p, …, [-W, 0]))` inside an `isolation: isolate` wrapper. A chapter-turn alternative to `maskText`.

**11. `halftone-dissolve`** · `registry/components/halftone-dissolve/` · **M**
Accent-coloured dots pop onto a grid over the old scene, each dot opens into a round window onto the new scene, and the windows grow until they merge.
Source numbers: dissolve 1.3 s on `power1.inOut`; grid pitch 1/44, 1/30 or 1/20 of the width, alternate rows offset half a pitch; each dot's threshold comes from a seeded map ordered left-to-right, centre-out or as noise; the windows are one `clip-path` string rebuilt per frame.
In Remotion: per dot `r = maxR * clamp((p - threshold_i) / spread)`. New scene clipped by an SVG `<clipPath>` of circles (or a `mask` canvas); an accent ring `r + 3px` drawn under it gives the ink edge. Thresholds from `hash(i)` or from `x / W`. Print/editorial feel that none of our 38 transitions has.

**12. `torn-paper-rip`** · `registry/components/torn-paper-rip/` · **M**
A ragged paper tear runs across the frame; the old scene is a sheet that lifts away along the tear on a growing shadow, showing a band of white paper core along its edge.
Source numbers: tear travels in 1.0 s; edge sampled on 180 rows; wander 22–58 px and fibre jitter 2–4 px by roughness (default 55 of 20–90); exposed core band 6–14 px with a feathered outer edge; tones cream, kraft, white; grain multiplied over the sheet; left-to-right or right-to-left.
In Remotion: reuse the idea behind our `tornClip`: build the edge polyline once from `hash`, then `clip-path: polygon()` for the old scene with the edge x offset by `p * W`. A second polygon 6–14 px wider in paper colour sits beneath it; the sheet gets `translate + rotate(1–2deg)` and a `drop-shadow` that grow with `p`. Natural for `vox`.

**13. `curtain-reveal`** · `registry/components/curtain-reveal/` · **M**
Two pleated velvet curtains covering the frame gather outward the way real fabric bunches, a fixed valance stays across the top, and a warm spotlight comes up on the scene behind.
Source numbers: open in 1.1 s on `power2.inOut`; each fold narrows to `1 - p*(0.86 - 0.16u)` of its width (`u` = position from centre to edge) and the hem lifts by up to 7%; scalloped hem from a sine sampled at 24 points; four-stop fold gradients, e.g. burgundy `#2b0912, #5c1a2c, #7d2c42, #a04c62`, also red, navy, forest.
In Remotion: each curtain = N vertical strips with a 4-stop horizontal gradient; strip `scaleX` and x-offset from the formula above, so the fabric compresses toward the sides instead of sliding off. Hem via `clip-path: polygon()`. Use once per video for a reveal ("and the winner is"), in brand accent instead of red.

**14. `text-match-cut`** · `registry/components/text-match-cut/` · **S**
One line of text turns into another in mid-move: the first line shrinks toward the viewer, and at the fastest point it is swapped for the second, which finishes the same move. No fade.
Source numbers: one curve for both lines, `cubic-bezier(.85, 0, .15, 1)`; the hard swap is exactly halfway (frame 30 of a 2 s move at 30 fps); modes: scale 170% → 100%, scale 60% → 100%, tracking +0.22 em → −0.05 em, or a same-direction slide; a cyan→blue gradient bar sweeps through the glyphs and crosses centre at the cut; blur peaks at the cut.
In Remotion: `e = Easing.bezier(.85, 0, .15, 1)(p)`; `scale = 1.7 - 0.7e`; render line A when `p < 0.5`, line B after; `filter: blur(k * sin(π p))`. As a transition between two `type` scenes it replaces a cut plus two entrances with one move. Related: `match-cut` (a circle carries the cut) and `type-match-cut` (a headline splits and the next scene grows from the gap).

**15. `cut-the-curve`** · `registry/components/cut-the-curve/` · **S**
The outgoing thing accelerates off in one direction, and at top speed the incoming thing is already flying in from the opposite side on the same line and brakes to rest.
Source numbers: outgoing on `power4.in`, incoming on `power4.out`; cut at 33% of the duration (about a 1:2 split of time and distance, so the speed matches at the seam); blur 12 px and opacity 0.72 at the seam; 1 s default; directions left/right/up/down.
In Remotion: `p < c` (c = 0.33): old scene `x = -D1 * (p/c)^5`; after: new scene `x = D2 * (1 - (1 - (p-c)/(1-c))^5) - D2` with `D2 = D1 * (1-c)/c`. Blur and opacity peak at `p = c`. Unlike our `whip`, the two halves are deliberately unequal, which is what makes it read as momentum and not a pan.

**16. `ridged-burn`** · `registry/blocks/ridged-burn/` · **M**
The old scene burns away along crawling, vein-like edges that glow from dark red through orange and yellow to white, with sparks on the burn line.
Source numbers: threshold = 5-octave ridged noise at 4x UV scale (each octave rotated and scaled 2.02, amplitude halved); edge softness ±0.04 of progress; heat band within 0.12 of the front; colour ramp `(0.4,0,0) → (1,0.4,0) → (1,0.85,0.3) → white`, added at 3.5x; sparks where fine noise exceeds 0.92; 2 s of a 4 s block.
In Remotion: no scene textures needed. Render the noise once to a greyscale canvas (ridged fBm, seeded) and use it as a luminance `mask-image` on the old scene with the mask's contrast window moved by `p` (SVG `feComponentTransfer` with a steep linear slope, intercept from `p`). A second copy of the mask with a narrower window, tinted orange and `mix-blend-mode: screen`, is the glowing edge. Stronger than our `filmBurn`, which is a full-frame wash. The other shader transitions (`domain-warp-dissolve`, `gravitational-lens`, `ripple-waves`, `thermal-distortion`) need per-pixel resampling of both scenes and are not practical on DOM scenes.

### Titles and kinetic type (6)

**17. `split-flap-board`** · `registry/blocks/split-flap-board/` · **M**
An airport departure board: every cell flips through the alphabet in order until it lands on its letter, so letters settle early and digits late, in a left-to-right cascade.
Source numbers: 12 cells (1–24); 40-position drum `" ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,'"`; 0.09 s per flap (0.03–1.2); cells start 0.05 s apart; a flap falls with constant acceleration, `θ = 180 * p²` (no ease-out: it slaps down); the two half-faces hand over at 90°; flap shade `1 - 0.5 sin θ`; `perspective: 900px`; 10 px gap.
In Remotion: per cell `tLocal = t - i*0.05`; `steps = floor(tLocal / 0.09)` capped at the drum distance to the target; `p = frac`. Draw four half-glyph divs (`overflow: hidden`, top/bottom of current and next char); the falling half gets `rotateX(-θ)` until 90°, then the next char's bottom half takes over. New `type` style `flap` for dates, versions, prices, model names. Sound: one tick per flap fits our SFX kit.

**18. `weight-wave`** · `registry/blocks/weight-wave/` · **S**
A wave of boldness travels along a headline: each letter swells from regular to black and leans forward as the crest passes, then relaxes.
Source numbers: weight 400 → 1000 at the crest, slant 0 → −12°; crest 4 characters wide; 0.5 passes per second; `f_i = clamp(1 - |i - crest| / width)`, crest position sweeps from `-width` to `N - 1 + width`; font sized to fit at the heaviest weight so the line never reflows; needs a variable font with `wght` and `slnt` axes (the block bundles Recursive, OFL-1.1).
In Remotion: one `<span>` per character with `fontVariationSettings: '"wght" w, "slnt" s'` computed from `frame`. Load a variable font through `fonts.ts` (Recursive, or Inter/Roboto Flex for weight only). No transforms, so letters stay on the baseline. A calm-but-alive title for long-form chapter cards; `variable-font-flex` and `variable-axis-type` are siblings.

**19. `caption-camera-follow`** · `registry/components/caption-camera-follow/` · **L**
One sentence written across a surface far larger than the frame. Each new word is bigger than everything before it, the camera pulls back to fit it, and earlier words stay lit and shrink into the top-left like handwriting filling a page.
Source numbers: a new word every 0.52 s; each camera move 0.4 s on `cubic-bezier(0.31, 0, 0.11, 1)`; margin 1.36x around the written block; each word sized as a fraction of the current block height and placed alternately to the right or on a new line below; radial motion blur peaking at 2.6% of frame width during each move (rises over 24% and falls over 44% of the move); final wide pull-back at the end; accent `#ffd84d`.
In Remotion: lay out all words once in "world" coordinates (measure with `@remotion/layout-utils`), storing the block's bounding box after each word. Camera = one `transform: translate() scale()` on the world div, interpolated between successive boxes with the bezier. Blur: a per-word `filter: blur()` scaled by distance from the zoom centre is enough. A new caption preset or a `type` style `journey` for one-sentence thesis statements.

**20. `kinetic-center-build`** · `registry/components/kinetic-center-build/` · **S**
Words arrive one at a time from the right and shove the phrase left, so whatever has been said so far is always exactly centred.
Source numbers: first word 10 frames, each following word 13 frames (at 30 fps); ease `cubic-bezier(0.2, 0.8, 0.2, 1)`; entering word starts offset to the right at scale 0.992, opacity 0 and 3.5 px blur; gap between words 10/72 of the font size. MIT, ported from Remocn (which is itself Remotion code).
In Remotion: measure word widths once; for each prefix length compute the centred x of every word; each word's x at `frame` interpolates between its positions in successive prefixes. Fits `MotionText` as `order="center-build"`. Good under VO because the eye never leaves the middle of the frame.

**21. `ticker-takeover`** · `registry/components/ticker-takeover/` · **S**
A small mono ticker spins through four to six candidate words, slows, locks on the last with an accent flash, and that word blows up into the full-frame headline.
Source numbers: 3.15 s in, 0.45 s out; ticker fades in 0.35 s; roll accelerates 0.82 s (`power4.in`) then decelerates 0.93 s (`power4.out`); lock: word scale 1.14 → 1 in 0.3 s (`expo.out`) with a flash from 82% opacity over 0.34 s; promotion: headline from scale 0.22 and 20% lower on `power3.out`; hold drifts 0.7% of height.
In Remotion: a clipped column of words with `translateY` from a two-part eased offset; a flash div; the headline is a second element scaling up as the ticker fades. JSON: `{"type":"type","style":"ticker","options":["faster","cheaper","open"],"text":"*open*"}`. Reads as "of all the things it could be, it is this".

**22. `colorama-wipe`** · `registry/components/colorama-wipe/` · **M**
A headline appears behind a soft, slanted wipe: at the moving edge the letters are blurred and rainbow-mapped, and behind it they settle to clean type; it wipes off the same way.
Source numbers: in 0.75 s, hold 2.0 s, out 0.55 s, `power2.inOut`; front softness 2.4x the text height; five stacked blur levels at 4%, 14%, 30%, 55% and 100% of the maximum radius, chosen by distance to the front; colour from a 256-entry gradient lookup indexed by that distance; leaning front (tilt option).
In Remotion: render the line five times with increasing `filter: blur()`, each masked by a `linear-gradient` band positioned at `front = x0 + (W + F) * ease(p)`; overlay a gradient strip with `mix-blend-mode: color` clipped to the text near the front; the crisp copy is masked to the region behind the front. A premium alternative to `ShimmerText` for product names.

### Data, charts and maps (5)

**23. `bar-chart-race`** · `registry/blocks/bar-chart-race/` · **M**
Ranked horizontal bars grow as time advances and physically overtake one another; the axis ticks slide as the scale grows, and the accent colour jumps to whoever is in front.
Source numbers: 6 visible bars (1–24); 2 s per time period; 10 interpolation keyframes per period; rank position is smoothstepped between keyframes so overtakes slide instead of snapping; row opacity = `clamp(visibleCount - rank)` so entrants fade in from below; track 1180 px wide, plot 760 px high; leader accent `#c8452d`; data as "Name: v1, v2, v3".
In Remotion: `u = t / period`; values = lerp between period columns; ranks computed at each keyframe, `rankPos = lerp(rank[k], rank[k+1], smoothstep(frac))`; `translateY(rankPos * pitch)`, `width = value / max * trackW`. Extend `chart` with `kind: 'race'` and `series: {label, values[]}[]`. Benchmarks over model versions, stars over months, market share by year.

**24. `week-in-merges`** · `registry/blocks/week-in-merges/` · **S**
A leaderboard where each person's avatar bounces back and forth along their row, and how fast it moves is how much they did.
Source numbers: leader speed 300 px/s, others proportional (`300 * value / max`), floor 10 px/s for zero; position is a triangle wave of `speed * t` over the row span; 16 s; header with eyebrow, title, period and total.
In Remotion: `x = tri(speed_i * t, span)` where `tri(d, s) = s - |((d mod 2s) - s)|`. Avatars as initials chips or logos. `chart` `kind: 'pace'`: makes a rate visible, which a static bar cannot (tokens per second across models, requests per second across frameworks).

**25. `us-map-hex`** · `registry/blocks/us-map-hex/` · **M**
A tile map where every region is an equal-size hexagon coloured by its value; the hexes pop in from the centre outward, labels follow, and the top five pulse.
Source numbers: 10 s; flat-top hexes 80 px wide; headline wipe at 0 s, hexes from 0.8 s (0.4 s each, 0.03 s stagger, ordered by distance from the centroid), labels at 3.5 s (0.02 s stagger), legend at 5.0 s, top-five pulse at 6.0 s (0.08 s stagger); label ink flips light/dark by fill luminance.
In Remotion: a `{id: [col, row]}` layout table, SVG `<polygon>` per tile, entrance `moveStyle('pop', p_i)` with `p_i` delayed by sorted distance; colour by `interpolateColors`. The layout table is data: make one for the world's 20 largest economies or for "which countries/companies have X". Geography without map files or projections. The registry's true-shape maps (`us-map`, `world-map`, `spain-map`) pull D3 + topojson from a CDN at run time, which we should not do in a render.

**26. `nyc-paris-flight`** · `registry/blocks/nyc-paris-flight/` · **M**
A realistic map; a pin pops at the origin, a route line draws in an arc while a plane rides its tip, the destination pulses on arrival and a hand-drawn doodle underlines it.
Source numbers: 6 s; map eases in from scale 1.1 over 1.05 s; origin pin at 0.7 s (`back.out(2.8)`); route = three stacked strokes (glow, line, thread) drawing over 2.9–3.1 s from ~1.2 s; plane follows the same path over 3.25 s (`sine.inOut`); map drifts to scale 1.025 during the flight; doodles at 4.18 s and 4.36 s; arrival pulse at 4.64 s (scale 1.5, fade, 0.58 s); plane bounce 1.23 → 0.9 → 1 from 4.96 s.
In Remotion: SVG path with `strokeDashoffset`; rider position from `@remotion/paths` `getPointAtLength` + `getTangentAtLength` at `len * ease(p)`. Our `svg` scene already supports `data-loop="travel"`; this is the composed version. Swap the plane for a packet, a request, a file: "your prompt leaves your laptop, lands in Virginia". The block's map image is its own asset; use a CC0 map (Natural Earth) or a drawn one.

**27. `oscilloscope-trace`** · `registry/blocks/oscilloscope-trace/` · **M**
A CRT oscilloscope: a glowing beam sweeps a waveform across a measurement grid, leaving a fading phosphor tail that is brighter where the beam moves slowly.
Source numbers: 6 s; 10x8 divisions of 100 px; tail brightness `exp(-age / τ)` with τ about 100 ms for the vintage look, drawn back to 3τ; brightness proportional to 1/segment length; segments ~3 px; waveforms sine, triangle and soft square (`tanh(8 sin)`); live readout panel.
In Remotion: canvas; for `age` from 0 to 3τ in small steps, evaluate `y = wave(t - age)` and `x = sweep(t - age)`, stroke short segments with `alpha = exp(-age/τ) * k / segLen`, `globalCompositeOperation = 'lighter'`, accent glow via `shadowBlur`. Feed it real numbers (a latency trace, an audio waveform from `@remotion/media-utils`). A `terminal`/`radar` data look that is not another bar chart.

### Code and UI demos (5)

**28. `code-morph`** · `registry/blocks/code-morph/` · **L**
One code snippet turns into another: tokens that survive glide to their new positions, removed ones fade out, new ones fade in.
Source numbers: 7 s; each morph step 1.2 s on `power2.inOut`, fades 0.45 s, 1.0 s hold between states; tokens matched between states by key using a longest-common-subsequence diff; positions measured once after fonts load.
In Remotion: tokenise both states (Shiki or our existing highlighter), LCS-match tokens, compute each token's (line, column) in both states; in a monospace font position = `col * charW, line * lineH`, so no DOM measuring is needed. Per token: `x, y = lerp(from, to, ease(p))`, opacity for enter/leave. `code` scene gains `"morphTo": "<code>"`. The before/after refactor beat that currently takes two scenes.

**29. `code-diff`** · `registry/blocks/code-diff/` · **M**
An edit shown as a diff: removed lines flash red and collapse to nothing, added lines open up in green.
Source numbers: 6 s; fade in 0.45 s; deletions collapse (height → 0, opacity → 0) over 0.55 s; additions expand over 0.6 s; both `power2.inOut`; red wash `rgba(248,81,73,0.12)` with a 3 px `#f85149` inset bar, green `rgba(63,185,80,0.12)` with `#3fb950`; `+`/`-` gutter marks.
In Remotion: line-level LCS between `code` and `after`; each line div's `height = lineH * k` with `k` from 1 → 0 (removed) or 0 → 1 (added), staged: tint first, collapse, then expand. Time removals and additions to beats. For "the fix was one line" stories and changelog shorts.

**30. `agent-cursor`** · `registry/components/agent-cursor/` · **M**
An AI agent using an interface: a cursor carrying a name tag that types what it is doing, moves to each target, clicks with a small ring, and ends on a tick.
Source numbers: 4.8 s for two targets; enter and "reading" line to 0.95 s; per target 1.35 s = type 0.35 s, move 0.5 s, dwell 0.2 s, click; arc lift `sin(π u) * 0.12` on each move; tag slides to the other side of the tip near the frame edge, averaged over 0.3 s; live dot breathes on a 1.2 s period until the tick; arrow 64 px at 1920; accent `#0a84ff`; eases `power3.out` (enter), `power2.inOut` (moves), `back.out(2.4)` (pops).
In Remotion: targets as 0..1 points over a `screenshot` (same convention as `spotlight.focus`); cursor position = piecewise interpolation between targets with the arc offset; tag text = `steps[i].slice(0, n)`; ring = expanding circle at each click frame. New scene `agent`: `{image, agent: "Claude", steps: [{say, x, y}]}`. Directly on-topic for agent launches.

**31. `cursor-zoom-follow`** · `registry/components/cursor-zoom-follow/` · **M**
The screen-recording look: the camera pushes in toward each click before it happens, trails the cursor smoothly, marks each click with a press and a ring, and eases back out at the end.
Source numbers: 5.8 s; zoom 1.8x (1.2–2.6); zoom in 0.1–0.95 s; clicks at 0.95 s, 2.55 s, 3.65 s; zoom out 4.8–5.8 s; camera on `power3.inOut`, cursor moves 0.5 s with a 0.2 s dwell; click ring grows from 12 to 44 px and fades over 0.35 s; the cursor lives inside the zoomed layer, so it scales with the UI.
In Remotion: `clicks: [{x, y, at}]` in beats. Cursor = eased path through the points. Camera target = low-passed cursor position (average of the cursor path over the previous ~0.3 s, computed in closed form by sampling), `transform: scale(z) translate(...)` with `transformOrigin` at the target. Generalises `spotlight` from one click to a walk-through; pairs with `cursor-drag-drop`, `cursor-text-select` and `cursor-marquee-select` if we want a cursor family.

**32. `claude-exchange`** (the pattern, not the skin) · `registry/blocks/claude-exchange/` · **M**
A phone chat where the assistant visibly works before answering: a thinking line, a search row, the rows collapse into "2 steps", then the answer streams in paragraphs with sources and action buttons.
Source numbers: 21.4 s portrait; typing 0.05 s per character with 0.11 s extra on spaces; send 0.3 s after the last key; spinner leads by 0.45 s; tool rows 0.5 s apart; answer words 0.04 s apart with 0.12 s between paragraphs; steps collapse 0.55 s after the answer starts; tail items 0.4 s apart. The sibling component `streaming-text` lands each word grey and inks it to full colour in uneven bursts.
In Remotion: extend `chat` with `"steps": ["Thinking", "Searching: …"]` and `"sources"`. Everything is index arithmetic on `t`: characters shown = `floor((t - t0) / 0.05)`, rows visible by threshold, row container height animating for the collapse. Build it in our own neutral chat skin: the block reproduces a real product's interface and its template notes say that identity belongs to the product owner.

### 3D and camera moves (4)

**33. `camera-dolly-zoom`** · `registry/blocks/camera-dolly-zoom/` · **M**
The Hitchcock vertigo shot: the subject stays exactly the same size while the background rushes away or collapses toward it.
Source numbers: 4 s; the rule is `distance * tan(FOV/2) = constant`; in CSS 3D, `perspective` in px is the focal length, so keep `perspective / distance` constant; start distance 1400 px (600–3000), end = start x 2 (strength 1.1–4) or ÷ 2; subject on `z = 0`, five background layers at −560, −1120, −1720, −2360 and −3200 px.
In Remotion: wrapper with `perspective: P` and inner rig `translateZ(camZ)`; `d = lerp(d0, d1, ease(p))`, `P = k * d` with `k` fixed, `camZ = P - d` (solve P from d every frame; never keyframe the two separately). In `@remotion/three`: move the camera to distance `d` and set `fov = 2 * atan(h / (2d))`. It only reads with layered depth, so stage it on `stack`, `DepthStage` or a `photo` with a `cutout` (subject on z = 0, photo pushed back). One use per long-form, on the "everything changed" line.

**34. `rack-focus`** · `registry/blocks/rack-focus/` · **L**
A focus pull at night: the near subject is sharp and distant lights are large soft discs; focus travels back, the far subject sharpens and the near lights bloom into polygon-shaped bokeh.
Source numbers: 6 s; pull 3.2 s on `power2.inOut`, interpolated in 1/distance (dioptres), not distance; lights spread from 1.15 m to 90 m; each light drawn as an aperture-shaped sprite sized by its circle of confusion; disc radius capped at 10% of frame height, floor 0.75 px; discs clip to a cat's-eye toward the corners; 36 mm sensor model; tungsten palette `(1, 0.74, 0.45)`.
In Remotion: canvas or `@remotion/three` sprites. Per light: `coc = |1/focus - 1/depth| * k`, draw a hexagon of radius `coc` with alpha proportional to `1/coc²`, additive. Two content layers (near, far) get CSS `blur(coc)`. A cheap two-plane version (S) is the registry's `focus-rack` component: two cards, blur + dim + scale + parallax swapped in one move; do that first for `versus` and for text-over-photo.

**35. `glass-hero`** · `registry/blocks/glass-hero/` · **L**
A solid glass lens or ring rises in front of a giant headline and keeps turning, so the letters bend, magnify and split into colour through it.
Source numbers: 5 s; physical material with transmission 1, thickness 0.6, IOR 1.3, roughness 0.03, dispersion 0.6; shapes: torus (radius 1.25, tube 0.46) or a flattened sphere (radius 1.6); rises from 3.2 units below on a cubic ease-out over 1.8 s, then never stops turning (`0.5 + 0.22 t`, `0.34 t` rad); soft key box overhead and two side strips for reflections; no tone mapping; tint `#cfe9ff`; headline ≤ 12 characters, drawn inside the 3D scene because glass only refracts what is rendered there.
In Remotion: `@remotion/three` + `MeshPhysicalMaterial` (dispersion needs three r164+) or drei's `MeshTransmissionMaterial`; headline as a textured plane behind the mesh; rotation from `frame`. A `logo`/`hook` staging for the `3d` style that is not another floating card.

**36. `carousel-orbit-*`** · `registry/blocks/carousel-orbit-1/` (five styles; also `carousel-circle`, `carousel-path`, `carousel-vision`, `carousel-text-circle`) · **M**
Two dozen image cards spread evenly over an invisible spinning sphere, always facing the camera, larger when near and smaller when far.
Source numbers: 6 s; 21–24 cards on a Fibonacci sphere (`inclination = acos(1 - 2i/n)`, `azimuth = i * π(3 - √5)`); radius 863 px in a 3840-wide world; spin about 175° per second around Y with a 26° roll; cards billboarded; size by depth; motion on a cubic in-out. Circle = cards on a ring with fast-slow-fast swings; path = cards riding an arc, V, wave or S-curve with tangent rotation; vision = a tilted row of large cards; text-circle = the ring threads through a headline.
In Remotion: pure CSS 3D or plain maths: rotate each sphere point by `angle(t)`, project (`s = f / (f + z)`), set `translate + scale` and `zIndex` by depth. No WebGL. New scene `gallery` with `layout: 'orbit' | 'circle' | 'path' | 'row'` for screenshots, logos, avatars, CC photos: the "lots of things" beat (integrations, community, examples) that `tiles` and `bento` now carry alone.

### Overlays and looks (4)

**37. `camcorder-hud`** · `registry/blocks/camcorder-hud/` · **S**
Home-video viewfinder furniture over the frame: blinking REC dot, battery icon, a tape-mode label and a running timecode.
Source numbers: white text with accent `#f12c2c`; inset 5% of the short side; font 3.7% of the short side; corners: REC, battery, date, and "SP · 16:9" with a `00:00:00` counter driven by clip time.
In Remotion: four absolutely positioned corners in a mono face; counter from `frame / fps`; dot `opacity = floor(t * 2) % 2`. Add as `fx: 'camcorder'`; combine with `vhs`. For "found footage", leaks, behind-the-scenes and demo-recording beats. Related registry looks: `editorial-flash-overlay` (camera-flash cut) and `freeze-frame-dressing` (paper, tape and flash around a cut-out subject).

**38. `ascii-render-pass`** · `registry/components/ascii-render-pass/` · **M**
Any picture drawn as live ASCII characters, starting as coarse blocks of glyphs and resolving in steps to a fine, readable image.
Source numbers: character ramp `" .:-=+*#%@"` (dark to light); cell pitch steps down a ladder of 4x, 2.83x, 2x, 1.41x, 1x the final pitch; resolve lasts 0.5–1.2 s; 0.5 s fade in; the source is rasterised once and its luminance sampled per cell.
In Remotion: load the image into an offscreen canvas once (`delayRender` until decoded), sample average luminance per cell, draw glyphs with `fillText` in the accent on `bg`. Pitch index = `floor(p * 5)`. As an `fx`/`photo` mode for the `terminal` style: a hook image that resolves out of text, or a logo "printed" by a model. Sibling: `ordered-dither-pass` (Bayer 2-tone dither that resolves to clean).

**39. `cinemagraph`** · `registry/blocks/cinemagraph/` · **S**
A still photograph in which exactly one small area keeps moving, such as steam over a cup, while everything else is frozen.
Source numbers: 10 s seamless loop; one feathered window; the placeholder steam is 14 wisps, each rising with a sideways sine sway that grows with height and an opacity of `sin(π p)`; periods divide the duration so the last frame equals the first. Rule from the source: one living region per frame; "two is a gif".
In Remotion: bottom = `<OffthreadVideo>` (or an animated canvas); top = a freeze frame of the same clip (`<Freeze>` or a still) with `mask-image: radial-gradient(ellipse at x y, transparent 0, #000 100%)` so the window shows the moving layer. `photo` gains `"alive": {x, y, r, video}`. Makes a held photo or screenshot feel filmed without a zoom.

**40. `hw-boil`** (with `stop-motion-cadence`) · `registry/components/hw-boil/`, `registry/components/stop-motion-cadence/` · **S**
Hand-drawn line boil: annotations, arrows and labels re-pose slightly every few frames, the way hand-animated drawings shimmer.
Source numbers: new pose every 3 frames (1 = frantic, 3–4 = classic); calm = ±1.6 px and ±0.5°, lively = ±2.6 px and ±0.9°; pose from a seeded hash of the quantised time, so any frame can be rendered alone; the same family has four stroke textures (plain, soft, sharp, spray) and a pen-speed ease that slows into curves. `stop-motion-cadence` applies the same law to all motion: `t' = floor(t * fps') / fps'`.
In Remotion: `step = floor(frame / 3)`; `dx, dy, rot = hash(seed, step)` scaled by the pose; apply as a transform on SVG groups, or as `feTurbulence seed={step}` + `feDisplacementMap scale={2}` for true line wobble. Wrap `Highlighter`, `clipping` marks and `svg` scene elements. A whole-scene `fx: 'onTwos'` (quantise the frame passed to children to 12 fps) gives `toybox` and `vox` a stop-motion texture for free.

### Runners-up (not detailed, worth a look later)

`cosmic-orb` (iridescent planet shader), `grid-pixelate-wipe` and `paper-collage-reveal` (transitions), `rubber-band-bumper` (a panel strains and snaps past), `parallax-zoom` (one grid card grows to fill the frame), `hw-write-title` (true pen write-on; needs baked stroke data), `shutter-slam` and `motion-blur` (real shutter blur by sub-frame sampling), `morph-text` (gooey word morph: blur + threshold filter), `particle-text-dissolve`, `wordmark-tiles`, `chart-story` (bars, line with area, sweeping donut), `conic-progress-ring`, `number-wheel`, `constellation-hub` (features wired to a hub), `hw-pipeline` (hand-drawn boxes and arrows), `code-highlight` and `code-scroll` (line spotlight in a long file), `code-particle-assemble`, `telemetry-hud` and `segmentation-flood` (machine-vision read of an image), `notification-cascade`, `state-chip-rail`, `filmed-screen` (scene shot off an LED monitor), `pan-stations` (camera travels along a row of features), `parallax-device-dive` (camera pushes through a phone screen), `pull-back-reveal`, `extruded-logo`, `exploded-stack` (we have `stack`), `slit-scan-reveal`, `light-sweep-pass`, `lt-*` lower thirds and `news-ticker` for interview and news formats, and the 36 WebGPU shader looks (`godrays`, `sun-burst`, `stripes`, `voronoi`, `strands`, `marble`, `prism`, `liquid-metal` …) as a naming list for future GLSL backdrops; those blocks are thin wrappers around a third-party library and carry no parameters of their own.

## 4. Remotion ↔ HyperFrames concept map (read in reverse)

The `remotion-to-hyperframes` skill maps Remotion onto HyperFrames. We port the other way, so read each row right to left: this is how a registry block's timeline becomes our frame-driven code.

| HyperFrames (what the block's source does) | Remotion (what we write) |
|---|---|
| Root `data-composition-id`, `data-duration="s"`, `data-fps`, `data-width/height` | `<Composition durationInFrames fps width height>`; in our kit, a scene of `beats` length |
| A paused GSAP timeline that the engine seeks to a time in seconds | `const frame = useCurrentFrame(); const t = frame / fps;` everything is a function of `t` |
| `tl.to(el, {x: X, duration: d, ease: "none"}, at)` | `interpolate(frame, [at*fps, (at+d)*fps], [x0, X], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})` |
| `tl.fromTo(...)` | the same, with the explicit start value |
| Several tweens on one property in sequence | one multi-point `interpolate(frame, [a, b, c, d], [v0, v1, v1, v2])` |
| `ease: "powerN.in/out/inOut"` | `Easing.poly(N+1)` wrapped in `Easing.in/out/inOut`. GSAP numbers by degree minus one: `power1` = quad, `power2` = cubic, `power3` = quart, `power4` = quint |
| `ease: "back.out(s)"` | `Easing.out(Easing.back(s))`, same `s`; or a `spring()` (table below) |
| `ease: "elastic.out(1, 0.5)"`, `"bounce.out"` | `Easing.elastic(b)`, `Easing.bounce`, or an under-damped `spring()` |
| `CustomEase "M0,0 C a,b c,d 1,1"` / hand-solved cubic bezier | `Easing.bezier(a, b, c, d)` |
| `ease: "sine.inOut"`, `yoyo: true, repeat: n` | closed form: `sin(2π t / period)`; no state |
| `stagger: s` | `delay = i * s * fps` per item |
| `data-start` / `data-duration` clips, sub-compositions | `<Sequence from durationInFrames>`; sequential hosts = `<Series>` |
| `data-track-index` (layer order) | JSX order / `zIndex` inside `<AbsoluteFill>` |
| Scenes overlapping by the transition length + opacity/transform tweens | `<TransitionSeries>` with a presentation, or our `transitions/index.tsx` driven by progress 0..1 |
| A "driver" tween `{t: 0 → DUR, ease: "none"}` whose setter repaints a canvas or shader | paint from `frame` directly: `useEffect(() => draw(t), [frame])`, or set `uTime` on a material |
| `data-composition-variables`, `var(--id)`, `data-var-text` | props / our scene JSON fields / `brand.colors` |
| `<template data-slot="…">` content slots | `children` or an `image`/`video` prop |
| `tl.set(el, {visibility: "hidden"}, at)` ("hard kill" after an exit) | `if (frame > end) return null` |
| Bounded GSAP `repeat` | `<Loop>` or `frame % period` |
| `assets/x.png`, `<audio data-volume data-trim-start>` | `staticFile('x.png')`, `<Audio volume startFrom endAt>` |
| `window.__hfLottie` + `goToAndStop` | `@remotion/lottie` |
| Fonts via `@font-face` in the block | `fonts.ts` (`@remotion/google-fonts` or `loadFont`) |

Spring correspondence the skill validated (use it backwards when a block says `back.out`):

| GSAP in the block | Remotion `spring` config |
|---|---|
| `back.out(1.4)` over ~0.7 s | `{damping: 12, stiffness: 100, mass: 1}` |
| `back.out(1.2)` over ~0.7 s | `{damping: 14, stiffness: 90, mass: 1}` |
| `back.out(2.0)` or `elastic.out(1, 0.5)` over ~0.6 s | `{damping: 8, stiffness: 200}` (not validated) |
| `power3.out` over ~0.6 s | `{overshootClamping: true}` |

Rough rule from the skill: overshoot ≈ `stiffness / damping² * 1.4`. Tune by eye.

Gotchas they list, as they apply to us:

1. **Seconds, not frames.** Every number in a block is seconds. Multiply by `fps` once, at the top; do not sprinkle `* 30`. Our scenes run on beats, so rescale a block's timings to the scene: `k = sceneSeconds / blockSeconds`, as the blocks themselves do when a clip is shorter than their envelope.
2. **Clamp.** GSAP holds values before and after a tween. Remotion's `interpolate` extrapolates by default, so every ported tween needs `extrapolateLeft/Right: 'clamp'`.
3. **`power2.out` is cubic.** `power2.out` equals `1 - (1 - t)³` exactly (0.875 at the midpoint); `power3.out` gives 0.9375. An off-by-one in the degree makes counters and reveals land visibly early or late.
4. **Springs are the lossy part.** Spring ↔ `back.out` is approximate. For beat-locked hits prefer the explicit ease and duration from the block over a spring, so the landing frame is known.
5. **`back` direction.** A bare back ease is an ease-in; the overshoot-at-the-end version is `Easing.out(Easing.back(s))`. Default `s` is 1.70158 on both sides.
6. **Counters.** A count-up must be compared at matching times, not only at the final value: a plausible-looking counter can still run ahead of the VO.
7. **No state, no clock, no unseeded random.** Blocks avoid `requestAnimationFrame`, wall-clock time and `Math.random()` for the same reason we must: frames render out of order and in parallel. Anything a block "accumulates" (trails, phosphor decay, particle paths, low-passed camera) is written there in closed form or re-simulated from 0 each frame; port it the same way. In Remotion terms: no `useState`/`useEffect` driving animation; `useMemo` for seeded set-up only.
8. **Do not port the engine workarounds.** Notes in the sources about `onUpdate` not firing on `seek()`, registering timelines only after they are built, `will-change` caching and "hard kills" are HyperFrames plumbing. They have no Remotion equivalent and should be dropped.
9. **Box sizing.** Remotion's render page sets `* { box-sizing: border-box }`; a plain browser page does not. Block CSS written for content-box draws bordered or padded boxes smaller in our kit (a 200x100 box with 20 px padding and a 10 px border is 260x160 in content-box). Check card sizes after porting.
10. **Measured layout.** Blocks measure the DOM once after `document.fonts.ready` (FLIP for code morph, word widths for centred builds). In Remotion, measure with `@remotion/layout-utils` or use monospace arithmetic, and hold the render with `delayRender` until fonts are loaded.
11. **Container units.** Many components size in `cqw`/`cqh`/`cqmin` against their host box. Convert to fractions of our `width`/`height` from `useVideoConfig()`.
12. **Shader transitions.** HyperFrames' shader transitions sample both scenes as textures. Our scenes are DOM, so only the mask-shaped ones (iris, noise/burn threshold, halftone, tear) port cleanly, via `clip-path`, `mask-image` and SVG filters. Lens, warp and ripple distortions do not.
13. **CDN scripts and remote data.** Blocks load GSAP, three.js, D3 and topojson from jsDelivr at run time, and the map blocks fetch geometry. We bundle everything; never fetch during a render.
14. **Colour and encoder.** When comparing a port against a reference video, encode both the same way (PNG frames, bt709), or the comparison measures the encoders (about 0.05 SSIM), not the animation.

## 5. Licence and asset notes for anything taken further

Ideas, timings and maths are free to reimplement; these matter only if code or assets are ever lifted.

- **Whole repo**: Apache-2.0. Keep the attribution line at the top of this file, and add a row to `packages/motion-kit/src/components/fx/CREDITS.md` for each port.
- **36 WebGPU shader blocks** (`aurora`, `godrays`, `voronoi` …): "Apache-2.0 AND MIT". Each bundles `lib/shaders.iife.js` (Shaders 4.0.0, MIT, © 2026 Shader Effects Inc.) with a third-party licence file. Do not copy the library without that notice.
- **`kinetic-center-build`** (MIT) and **`caret-swap`** (MIT AND OFL-1.1): ported from Remocn (github.com/Remocn/remocn); the MIT notice is in the file header. `caret-swap` bundles Geist (OFL-1.1).
- **`weight-wave`**: OFL-1.1 because it bundles the Recursive variable font. The `hw-*` family bundles Caveat (OFL).
- **3D-motion pieces** (`canopy-part-title`, `glass-shard-title`, `code-slice-hero`, `frost-sequence-camera-orbit`, `cuboid-carousel`, `orbit-card`, `wireframe-portal-title`): vendor three.js (MIT), three-mesh-bvh and opentype.js (MIT), Clipper (Boost 1.0), d3-delaunay (ISC), Geist/Archivo/Cormorant (OFL-1.1), a Poly Haven HDR (CC0), and **GSAP under the GSAP Standard License, which is not an open-source licence**. The repo's `CREDITS.md` also lists several textures in these blocks whose origin is "to be confirmed with the author": do not reuse those images.
- **GSAP generally**: every block loads GSAP 3.14.2. We do not use GSAP at render time and should not start.
- **Reference-derived constants**: `spiral-galaxy`, `vfx-anamorphic-flare` and `rack-focus` cite three.js examples (MIT) as the source of their constants; `halftone-field` embeds Ashima/Gustavson simplex noise (MIT); `split-flap-board` takes its drum alphabet from scottbez1/splitflap (Apache-2.0); 16 components are tagged as ports "inspired by" transitions.dev.
- **Author-credited showcase blocks**: `nyc-paris-flight`, `north-korea-locked-down`, `apple-money-count`, `vpn-youtube-spot` (author Stronkter) and `blue-sweater-intro-video` ship their own map images and sound mixes. Use our own maps (Natural Earth is public domain) and our SFX kit.
- **Product look-alikes**: `claude-exchange`, `chatgpt-exchange`, `slack-notification-ad`, `ios26-liquid-glass`, `macos-tahoe-liquid-glass`, the `code-snippet-*` editor skins and the social cards imitate real products' interfaces; `claude-exchange/TEMPLATE.md` states the application identity belongs to its owner. Build the pattern in our own skin. The chat blocks bundle Inter and EB Garamond (OFL) because the real apps' fonts are not licensed.
- **Maps**: `us-map`, `world-map`, `spain-map` fetch `world-atlas`/`us-atlas` topojson and D3 from a CDN at run time (ISC/BSD code, public-domain Natural Earth data).
