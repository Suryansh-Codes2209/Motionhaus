Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), skills/hyperframes/references/look.md, spec.md, film.md, format.md, SKILL.md, assets/frame-presets/*/FRAME.md.

# Look

Left alone, the same brief comes out with the same look every run, and banning that look only moves it to the next default. Outside input breaks it, in this order: the project's design spec → a real brand → a reference image or film the user gave → the subject's own world (its era, its materials, where it would be shown). Settle the look before the first scene, as numbers.

In Motionhaus the edit style (`skills/short-styles`) owns palette, fonts and surfaces. Use this file to judge a style, to write a custom look for a launch film, and to build new styles.

## 1. Reading a brand

- **Strict:** hex values, font families, weight relationships, the brand's Do's and Don'ts. Quote them exactly; never round or invent.
- **Yours to scale for video:** type sizes, spacing, border weight, decoration. A 1 px border or a 6% shadow from a web page vanishes on screen.
- Look at the captures before choosing anything. A failed or near-empty capture ("very little text", no assets) gives no brand data, even if the tool said OK.
- Link blue `#0000EE` and status reds/greens are never the accent. The accent is the colour that recurs across the most roles.
- Icon fonts are never the display or body face. A captured monospace goes to the mono role.
- Use only weights the brand font ships, or 600/700 render as fake bold. An upright and an italic "Regular" collide unless files are named by family, weight and style.
- A logo file named by guesswork is not proof it is the logo: look at it.
- Dark brand on a light-ground preset: swap ground and ink.
- To show a site as it is, use its screenshots. Rebuilding the page drifts from the real layout: rebuild only the part that moves, or overlay captured assets at measured positions. Pushing in past 1:1 needs a 2× capture of that region.
- Preserve the product's meaningful status colours when recolouring.

## 2. Reading a reference

A reference film or image gives its **grammar, never its content**: shot lengths, how titles enter and leave, the transitions, the palette roles, the type's scale and weight. Put its frames beside yours at the same timestamps and write the grammar down, marking what you measured apart from what you guessed.

## 3. The spec: every adjective as a number

Adjectives are where the default look lives ("premium, modern, clean" → a dark void, a glow, small type floating in the middle, everything fading in). Before any scene, write the film as a brief with a number wherever you would write an adjective. Build from it, check against it, and change it when a review changes the film. The spec serves the story: a look that turns the story's things into abstract shapes has failed.

```text
GOAL:    what the viewer feels or does at the end, one sentence
OUTPUT:  W x H, fps
TIME:    seconds x fps = frames; BPM and frames per beat
LOOK:    ground (hex, texture and its amount), ink, one accent and where it may appear;
         display face + weight + size in px + tracking, body face the same;
         the medium (paper and ink, photographs, product UI, glass, clay, 3D studio) with its numbers;
         light and depth: shadow offset, blur and opacity, grain %, vignette %
OBJECTS: every thing the viewer must recognise (a mirror, a clock, a phone, a person), drawn with the
         material and details that make it read without a label: a mirror is silvered glass
         with a bright edge and a mount, not a bar
MOTION:  eases by role as named curves (enter, move, exit, camera); springs as damping ratio;
         durations and staggers in frames
SHOTS:   one line per shot: frame range, the one hero move, what the viewer reads (with its window),
         the sound, and how it hands off to the next shot
BANNED:  the defaults below, plus anything this film must not become
QA:      the frames to check, and what each must show
```

| The word | Becomes |
|---|---|
| premium | a material with numbers: satin paper with 2% grain; a product on a seamless sweep with a 0.55 contact shadow; chrome at roughness 0.05 |
| modern | a camera and a type system: a 30-frame push on one ease; a display face at 9% of frame height with −2% tracking |
| clean | a grid and a ration: 12 columns, 96 px margins, the accent on one word per shot |
| dynamic | cuts on the beat, a layout change every bar (4 beats), one hero move per shot |
| playful | springs at damping ratio 0.45–0.6 on position and scale, 10–30% exaggerated poses |
| cinematic | a lens and a light: a 35 mm framing, a key from upper left, a rim from behind, 6% vignette |

## 4. Composition numbers

- The hero of a shot fills **at least 40%** of the frame's height or width. A small object in the middle of an empty frame is never a shot: push in, crop, or give it a world.
- One hero move per shot; everything else holds still (`motion.md` §2).
- In a story film every shot causes the next.
- An information card (B-roll over a talking head, a data beat, a vertical explainer card) has its information on screen within ~2.5 s, then holds, so any paused frame reads as a finished poster.
- Text meant to be read: **≥ 28 px at 1080 (2.6% of the short side)**, held 0.5 s + 0.3 s a word. Too many words: cut words, never shrink type.
- Content inside the 90% action-safe box; captions and key text inside the 80% title-safe box.
- Vertical platform bands: `story.md` §9.

### The frame craft bar (from the presets; run before any structural check)

- **Squint:** exactly one element dominates at **3–6× its nearest neighbour** (a chasm, not a ramp). Never two rival headlines.
- **Silence:** statement frames read **45–60% empty**. A film has at most one kind of dense frame (the grid or ledger). Never fill a sparse frame to look complete.
- **Restraint:** the scarce gestures (the accent, the one shadow, the one ornament) fire once per frame.
- **Reference:** name what the look aims at (e.g. "sports-magazine cover") and what failure looks like (e.g. "soft drop-shadowed card deck").
- **Fit-to-measure:** headline size tracks line length. Cap the block at ≤ 78% of frame width. ≤ 3 words → largest display tier; 4–6 → middle; 7+ → smallest. Short lines go big; long lines step down.
- **Legibility floor:** any load-bearing line ≥ 1.4% of frame width (≈ 27 px at 1920). Smaller mono labels are chrome only.
- **Anchor:** no three consecutive frames share an anchor (left / centred / split).
- **Bullets:** capped at three.
- **Fabrication:** every numeral traces to the script, else a visible placeholder.
- Size everything relative to the frame, not the viewport, so it holds at any render size. Hairlines and radii stay in px.
- Per-frame recipe: ground · container · what it composes · focal · chrome · accent · silence % · what is fixed / free · density.
- Re-step type per aspect ratio; 16:9 rows become 9:16 stacks, rails turn vertical, 3-up grids stack or go 2+1 in 1:1.

## 5. BANNED by default

Where generated video lands when nothing is decided. Each is banned unless the brand's own material or the user's reference uses it, and then only as they use it:

- a black or dark navy void as the ground, with small elements floating in its middle;
- glow, bloom, neon, lens flares, glowing orbs and rings; floating particles as decoration;
- purple or blue gradients, mesh gradients, glass cards;
- a cream or off-white paper ground with a serif display, italic accent words, numbered "01 / 02" labels, small monospace caps labels, pill-shaped chips and buttons;
- everything centred; everything fading in at once; every element fading and sliding up;
- text that moves while it is read; titles that keep drifting after they land;
- corner labels, frame borders, corner brackets, HUD readouts as decoration;
- three cards in a row, KPI grids, a title over a dimmed screenshot;
- the logo docked in a corner.

Also: Inter, Space Grotesk, Instrument Serif, Geist and JetBrains Mono are where generated design lands. Use them when the brand does, not by default.

After the first render, name every default it used anyway (on this list or not), add each to the film's BANNED line, and fix them. The list grows with every film.

Conflict: HyperFrames bans dark voids, glow, bloom, neon, decorative particles and glass cards by default. Motionhaus styles are built on them: `neon` (aurora, border beams, shimmer), `radar` (film grain, glass cards, light leaks), `3d` (dark stage), `terminal` (phosphor on black); `launch-video` says "Dark backgrounds look most cinematic", "Grain + vignette always on", light leaks and a particle burst on every reveal.

Conflict: HyperFrames bans the cream-paper + serif + italic-accent + mono-label look. Motionhaus `toybox` is cream paper with italic serif; `vox` uses typewriter labels.

Conflict: HyperFrames bans a docked logo and corner labels. Motionhaus shows a series badge (top-left), chapter chips (top-right) and a dateline `kicker`.

Conflict: HyperFrames treats brand hex as strict and lists Inter / Geist / Instrument Serif as generated defaults. Motionhaus `launch-video` allows a near-black `bg` for a light site and recommends Inter / Geist / InstrumentSerif as matches; styles replace brand colours and fonts.

Conflict: HyperFrames rations the accent to one highlighted word per shot, the payoff and the end card, in a flat colour. Motionhaus marks 1–2 words per line with an accent gradient.

## 6. A look built from a medium

A look holds together when it is the rules of one medium, not a palette. Write: its parts, what each may carry, and how the medium itself moves. Risograph, for example, is five parts and nothing else:

| Part | Rule |
|---|---|
| paper | one flat colour with fibre noise, no gradients |
| ink A | every word that must be read and every structural line |
| ink B | one fluorescent accent, one focus per frame (the number, the bar, the stamp) |
| overprint | where inks overlap a third colour appears; the B plate sits 3 px off register |
| halftone | every gradient is dots |

Motion comes from the same medium: the frame is printed plate by plate, not faded in. Paper is cut and lifted, ink is printed, glass refracts, clay is pressed.

## 7. Video facts

- Full-screen linear gradients on dark grounds band under H.264: use a radial gradient, a solid fill, or a solid plus a local glow.
- An accent at 5% opacity disappears in compression: 15–25% for atmosphere, full saturation for the focal element.
- On a background or palette change, update every surface and every colour animation together (a later tween can restore the old ground), re-check contrast of text, strokes and axes, then check frames from every affected scene and transition.
- Keep palette and fonts as named tokens (ground, ink, accent, display face) used everywhere, so a film can be re-branded in one place.

## 8. Frame presets (palette and type library)

Thirteen slide-deck looks. Use one when the user names it or the piece is a deck; **never as the fallback for a film without a brand.** All are light-ground, flat, and specify composition only (no motion). Useful as starting points for a new Motionhaus style.

| Preset | Look | Faces | Key colours |
|---|---|---|---|
| `biennale-yellow` | museum catalogue: parchment, one ink, one soft yellow "sun" bloom per frame, 1 px hairlines, no shadow | Instrument Serif 400 | paper `#E9E5DB`, ink `#1B2566`, sun `#F1EE2E`, ember `#E26B4A` |
| `blockframe` | loud neobrutalist: 4 px black borders with 8 px hard offset shadows, one pastel ground per frame, tilted decorations | Inter 800–900 caps, Space Grotesk labels | black, white, pink `#FE90E8`, blue `#C0F7FE`, green `#99E885`, yellow `#F7CB46` |
| `blue-professional` | consulting restraint: cream canvas, a single cobalt accent, tinted cards instead of shadows | Space Grotesk + Inter | bg `#FDFAE7`, cobalt `#1E2BFA`, text `#111111` |
| `bold-poster` | vintage editorial poster: tilted display, red panels, double borders, four colours only | Shrikhand, Libre Baskerville, mono chrome | white, dark `#1C1410`, red `#D8000F`, light `#F5F2EF` |
| `broadside` | protest poster: ink-black and fire-orange registers (one per frame), giant lowercase type | Barlow 900 lowercase, mono chrome | ink `#111111`, orange `#E85D26`, cream `#F0ECE5` |
| `capsule` | friendly editorial: every container a pill with a 2 px outline, colour on fills and stat numerals only | Bodoni Moda | cream `#F5F5F0`, ink `#1A1A1A`, coral `#E85D4E`, lime `#C4D94E`, sky `#8BB4F7`, violet `#A06CE8`, yellow `#F2D160` |
| `cartesian` | quiet catalogue: warm stones, 1 px taupe hairlines, at most two compass rings, no dense frame | Playfair Display 400 + Inter | bg `#EDE8E0`, text `#1A1A1A`, accent `#8A8178`, line `#B8B0A4` |
| `cobalt-grid` | two-colour risograph: cream paper, cobalt ink, graph-paper grid, top and bottom hairlines | Newsreader 400, Hanken Grotesk labels | paper `#F0EBDE`, ink `#1F2BE0` |
| `code-editorial` | developer brand book: warm paper, coral exactly once per frame, warm-navy code surface only | EB Garamond 400, Inter, JetBrains Mono | cream `#FAF9F5`, ink `#141413`, coral `#CC785C`, navy `#181715`; syntax teal `#5DB8A6`, amber `#E8A55A` |
| `coral` | bold magazine: coral / ink / cream planes meeting at hard edges, 45° hatch at 6% ink, giant wallpaper numerals at 12% | Bebas Neue caps (tracked 2–12 px) + Inter | coral `#E85D5D`, cream `#F5F0E8`, black `#1A1A1A` |
| `creative-mode` | sparse neobrutalist: cream, 4 px ink borders, at most one hard offset shadow, 2–3 accents per frame, rotation only −4°/−6° | Archivo Black caps, line-height 0.92 | cream `#EFE9D9`, ink `#0F0F0F`, green `#1F8A4C`, pink `#F06CA8`, orange `#E85A1F`, yellow `#F5C518` |
| `daisy-days` | picture book: 3 px charcoal outlines, hard offset shadows, one pastel surface, 3–7 ornaments cropping past the edges | Fredoka One + Quicksand | cream `#F5F0E6`, turquoise `#7ECDC0`, pink `#F7C8D4`, butter `#FDE68A`, coral `#F8635F`, text `#2D2D2D` |
| `editorial-forest` | literary: two surface tones per frame, 2 px hairlines, flat paper, green ground for gravity moments | Source Serif 4 (500 display / 400 body), mono chrome | green `#2E4A2A`, pink `#E89CB1`, cream `#EFE7D4`, ink `#1A1A17` |

Each preset defines six frame treatments of the same kinds: cover, statement / big claim, stat or data grid (the dense frame), quote, process / timeline or list, closing plate. Shared rules across all thirteen: one dominant element; ink type on a saturated ground, never white-on-accent; no blur shadows (flat, hairline or hard offset only); no extra hue beyond the palette; placeholders instead of invented figures.
