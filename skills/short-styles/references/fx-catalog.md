# Scene & fx catalog (style additions)

Hook variants, `type` styles, beat `hits`, grades, the newer transitions and caption presets are in `motion-vocabulary.md`. This file covers the scenes and the older effects.

Shared scenes (`hook`, `type`, `screenshot`, `spotlight`, `features`, `steps`, `stat`, `chart`, `chat`, `code`, `comment`, `versus`, `quote`, `cta`, `logo`) are documented in `skills/launch-video/SKILL.md` and re-skin per style. Every scene also takes `vo` in a shorts script. Minimum beats come from `apps/shorts/src/beats.mjs`.

## Real-photo scenes (any style)

| scene | min beats | props |
|---|---|---|
| `photo` | 5 | `images` (1–3 public paths from `shorts photos`), `caption?` (the claim, kinetic type), `label?` (accent pill), `credit?` ("Photo: X / CC BY"), `focus?: {x, y}` (where the camera creeps, 0..1). One image = a full-bleed documentary shot; two or three = taped prints, one per beat. Always a dark scrim and white type. |
| `crack` | 9 | `value` (the byte it lands on), `bytes?` (default 48), `title?`, `label?` (stamp, default "Key found"). A dark key plate of `00` bytes; the last one spins like a slot reel while a counter runs, then lands, lights up, a padlock springs open and a stamp slams on. The find lands near the end of the scene, so the VO's payoff line goes last. For weak keys, guessable PINs, default passwords. |
| `hook` + `image` | 4 | a product shot or photo behind the hook lines, so frame 0 shows the thing |

## Effects any scene can take

| field | values | use for |
|---|---|---|
| `zoom` | `in` (slow push over the scene), `out` (starts tight, pulls back to reveal), `punch` (snaps in on beat 2 and holds) | `in`: tension and a claim landing. `out`: a reveal ("…and that's the whole data centre"). `punch`: the one line that matters. **Long-form:** the camera already punches `hook`/`type`/`stat`/`cta`, so put `zoom` on photos and screenshots; on a statement scene it crops the text. |
| `fx: ["glitch"]` | RGB-split slices and picture jitter on entry and every 2.5 beats | security, hacks, "something broke", AI weirdness |
| `fx: ["flames"]` | fire licking up from the bottom edge, embers, heat glow | a shutdown, a breach, a price war, "this is burning" |
| `fx: ["vhs"]` | scanlines, rolling tracking band, colour bleed, REC timestamp | the past, old tech, "back in 2015…", found footage |
| `fx: ["shake"]` | handheld camera wobble | urgency, chaos, a live-feel photo collage |
| `fx: ["letterbox"]` | cinema bars slide in | the verdict, a serious turn, a "movie trailer" line |
| `glitchAt` | beats from the scene start | extra glitch hits on the words that earn them (the hit on entry is automatic). Each hit: RGB tear, row shear, data blocks, a real glitch sound. |
| `broll` | 4–6 photo paths | real photos cutting behind a text scene every 1.5 beats, a shutter on each cut |
| `sfx` | `[{"name": "drop", "at": 13.1}]` | a one-off sound on a word: any kit role (glitch, shutter, stamp, unlock, fire, static, typing, drop, alarm, error, impact, riser, pop, tick, whoosh-1..3); its peak lands on `at` beats |
| `fx: ["flare"]` | an anamorphic lens flare sweeps across once | the reveal of the hero product or photo |
| `fx: ["leak"]`, `["tiltShift"]`, `["spotlight"]` | light leak, miniature focus, dark edges | see `motion-vocabulary.md` §4 |
| `hits` | `[{"fx": "punch", "at": 3}]` | beat-timed accents with their own sound: `punch`, `flash`, `invert`, `freeze`, `strobe`, `rgb`, `jolt`, `blur`, `echo` (`motion-vocabulary.md` §3) |
| `grade` | `tealOrange`, `noir`, `warm`, `cold`, `punchy`, `duotone`, `faded` | a colour grade over the scene |

Transitions (`"transition"` on the scene it leads into), on top of each style's own: `zoomIn` (fly through the old scene), `zoomOut` (old scene shrinks away, the new one settles out), `whip` (fast whip pan with directional blur), `filmBurn` (burns out to orange-white and back), `iris` (circle opens from the centre), `glitch` (any style, not only terminal). Sixteen more (`flash`, `dip`, `rgbSplit`, `blinds`, `strips`, `diamond`, `clock`, `split`, `cube`, `pageTurn`, `spin`, `stretch`, `swirl`, `lightSweep`, `whipUp`, `push`) are in `motion-vocabulary.md` §5.

**Taste rules:** at most one `fx` per scene and 3–4 effects across a short, plus 2–5 `hits` (6–8 across a long-form); an effect must match what the VO says at that moment. Use `flames` at most once per video. Never stack `glitch` on `vhs`.

## Signature scenes

| scene | min beats | props |
|---|---|---|
| `clipping` | 7 | `image` (public path), `focus?: {x, y, w?, h?}` (0..1: centre and size of the mark), `mark?: "circle" \| "underline" \| "highlight"` (circle a UI element, name or number; underline a phrase; highlight a sentence), `label?` (typewriter, ≤ 32 characters) |
| `document` | 7 | `body` (real text, 250–600 characters; anything beyond about 230 characters either side of the quote is cut with …), `quote` (exact substring of body), `title?` ("README.md"), `source?` ("github.com") |
| `flow` | 7 | `title?`, `nodes: [{label, desc?, icon?}]` with 3–5 nodes |
| `bento` | 7 | `title?`, `tiles: [{title, desc?, icon?, image?}]` with ≤ 5 tiles; tile 0 is the full-width hero (give it `image`) |
| `tiles` | 7 | `title?`, `tiles: [{icon, label?}]` with ≤ 3 tiles (`icon` = emoji or a public image path), `strike?` / `check?` (tile index that gets a red ✕ + slash / a green ✓), `sticker?` ("FREE"), `badgeOn?` (tile for the sticker, default last) |
| `stack` | 7 | `title?`, `layers: [{label, desc?, icon?}]` with ≤ 4 layers, top first; they pull apart bottom-up, one per beat |
| `log` | 7 | `title?`, `lines: string[]`, where `$ ` = typed command, `+ ` ok, `! ` warning, `> ` info; ≤ 11 lines of ≤ 40 characters |

## fx components (`packages/motion-kit/src/components/fx/`)

| component | file | use |
|---|---|---|
| `AnimatedBeam` | beams.tsx | pulse travelling along a curved path between two points |
| `BorderBeam` | beams.tsx | light orbiting a rounded-rect border |
| `NumberTicker` | text.tsx | odometer digits (used by `stat` outside radar) |
| `ShimmerText`, `GlitchText`, `Typewriter` | text.tsx | text treatments |
| `AuroraBackground`, `RetroGrid`, `DotPattern`, `Meteors`, `FlickeringGrid`, `PaperTexture` | backgrounds.tsx | style backdrops |
| `Highlighter`, `tornClip`, `Tape` | paper.tsx | vox marks and cut-outs |
| `CRT`, `GlitchBurst`, `Ripple`, `Marquee` | screen.tsx | finishing layers and hits |
| `moveStyle`, `MotionText`, `keywordOf` | moves.tsx | the named entrance moves, eases and loops; kinetic text built from them (`motion-vocabulary.md` §7) |
| `SceneHits`, `Grade`, `LightLeak`, `TiltShift`, `Spot` | hits.tsx | beat hits, grades and the newer overlays |
| `ToyBackdrop`, `Sticker`, `Confetti` | toy.tsx | toybox / headshot backdrop, die-cut badge, soft confetti hit |
| `DepthStage`, `Orbit3D` | depth.tsx | 3d stage (spotlight, perspective dot floor, floating cubes) and the per-scene camera orbit |
| `SplitPanel` (`SPLIT`) | ../SplitPanel.tsx | headshot: scenes in the top panel; the shorts layer draws the speaker (`apps/shorts/studio/src/shorts/Headshot.tsx`) |

Style tokens (fonts, card surface, emphasis, transitions, hit, look) are in `packages/motion-kit/src/styles/index.ts`. Helpers: `style`, `look`, `accentFill()`, `onAccent()`, `tiltFor()`. Credits: `fx/CREDITS.md`.
