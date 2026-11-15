---
name: motion-engines
description: Use when a Motionhaus video needs something beyond the Remotion motion kit — a famous-painting art style (Van Gogh, Monet, Munch, 8-bit, Ghibli… 35 styles), an explainer-grammar clip (Kurzgesagt, Vox, whiteboard, 3Blue1Brown, finance chart, kinetic type), a GSAP or Anime.js timeline, a Three.js / React Three Fiber 3D scene, a Rive animation, a Motion Canvas scene, or a Satori-rendered cover image.
---

# Motion engines

Every engine is wrapped so Remotion can render **any frame on its own**. Remotion captures frames out of order across parallel tabs, so nothing may run on its own clock. Each engine is built paused and seeked to `frame / fps`. Code lives in `apps/reels/studio/src/engines/`; one demo composition per engine is in the studio's **Lab** folder (`npm --prefix apps/reels/studio run dev`).

| engine | wrapper | use it for | Lab composition |
|---|---|---|---|
| huashu art styles | `<Huashu kind="style" id="09_postimp" focusX={0.3} />` | painting cutaways, "X in the style of Y", era jumps | `ArtStyle`, `ArtStyleLandscape` |
| huashu explainer clips | `<Huashu kind="clip" spec="huashu/examples/t3_finance_chart.json" />` | charts, diagrams, whiteboard, kinetic type from a JSON spec | `Explainer` |
| GSAP | `useGsapTimeline((tl, root) => tl.from('.x', {...}))` | complex staggered UI/type choreography | `GsapTitle` |
| Anime.js v4 | `useAnimeTimeline((tl, root) => tl.add(...))` | grid/stagger effects (`stagger(…, {grid, from})`) | `AnimeGrid` |
| Three.js / R3F | `<ThreeCanvas>` from `@remotion/three` | 3D cards, product spins, particles | `Title3D` |
| Rive | `<RemotionRiveCanvas src=…>` | designer-made `.riv` animations (put files in `public/rive/`) | `Rive` |
| Motion Canvas | `<MotionCanvas name scenes={() => [makeScene2D(function* (view) {…})]} />` | generator-scripted motion graphics (`yield* node.x(300, 1)`) | `MotionCanvas` |
| Satori | `renderCover()` in `apps/reels/src/cover.mjs` | cover / thumbnail PNGs from a layout (no browser) | `reels cover <dir>` |

The catalogue of art styles and explainer grammars is in `packages/art-engine/README.md`. Read it before picking an `id` or writing a spec.

## Rules that keep renders correct

- **Never** use an engine's own clock: no `gsap.to()` outside the hook, no R3F `useFrame`, no Anime `autoplay`, no Motion Canvas `Player`. Derive everything from `useCurrentFrame()`.
- **No `Math.random()`.** Use Remotion's `random(seed)`. Motion Canvas seeds are pinned by the wrapper; GSAP function values take `(i) => random(\`x${i}\`)`.
- Art scenes are 1920×1080. In 9:16 they are cover-cropped: pick `focusX` (0 = left, 1 = right) by rendering the `ArtStyleLandscape` still first.
- huashu assets are served from `<public>/huashu`. The studio has a link (`scripts/sync-engine.sh`), and `reels render` links it into each reel. Remotion follows the symlink.
- Motion Canvas replays from 0 for every frame: keep scenes under ~10 s. Use the imperative API (`new Txt({...})`, `view.add(...)`), because this project's JSX is React's.
- Rive needs a real `.riv` from the Rive editor. `public/rive/rope.riv` is an MIT sample from rive-app/rive-android. Note that GitHub serves `.riv` files through LFS: download via `media.githubusercontent.com`, not `raw.githubusercontent.com`.

## In a reel

Use an `insert` overlay in `edit.json` (see `skills/insta-reels`). The voice keeps playing under it:

```jsonc
{"type": "insert", "engine": "art", "mode": "full", "from": 27.4, "to": 29.4, "label": "my brain on coffee ☕", "props": {"id": "09_postimp", "focusX": 0.3}}
{"type": "insert", "engine": "title3d", "mode": "pip", "from": 29.95, "to": 32.6, "props": {"lines": ["3 HRS → 1 HR", "coffee mode"]}}
```
Engines: `art`, `explainer` (`props.spec`), `gsap-title` (`title`, `subtitle`), `anime-grid` (`label`), `title3d` (`lines`), `motion-canvas` (`title`), `rive` (`file`, `animation`). `full` is a 1.5–2.5 s B-roll cut; `pip` floats a card in the top half and keeps the speaker visible.

Use an art cutaway for a **metaphor** ("my brain on coffee" → Van Gogh swirl, "the crash" → Munch's Scream), not as decoration. Use one or two per reel.

## Adding an engine

Wrap it so that (1) setup happens once, paused; (2) every frame calls the engine's seek or render with `frame / fps`; and (3) async work sits inside `delayRender` / `continueRender`. Add a Lab composition, render 2–3 stills at different frames, and look at them before using it in a video.
