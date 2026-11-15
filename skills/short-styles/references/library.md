# Reference libraries: where new looks come from

When the vocabulary in `motion-vocabulary.md` has no move for what a story needs, or a look has gone stale, find a reference first and port it. Don't invent from memory.

## 1. 24fps (MCP server `24fps`, already connected)

A library of about 7,000 AI-made motion clips and 2,125 editor presets (269 caption styles, 499 text scenes, 272 hooks, 276 transitions, 554 effects and grades, 125 layouts, 130 font pairs).

| need | call |
|---|---|
| a new hook, caption style, text move, transition or effect | `search_editor_assets({query, kind, vertical: true})`, then `get_editor_asset({kind, id})` for its JSON (timings, fonts, eases) |
| how others staged a whole scene (a chart, a phone demo, a logo reveal) | `search_clips({query, aspect: "9:16", has_prompt: true})`, then `get_clip({slug})` for the prompt |
| open-source code to read | `get_source({slug})` (only open-licensed clips return a repo) |

The presets are data for 24fps's own MIT engine. We don't run that engine: read the preset for its **numbers** (when each layer enters, how long, which ease, what size as a fraction of the frame) and rebuild it with `moveStyle` / `MotionText`. That is how the hook variants, hits, transitions and caption presets in the vocabulary were made.

Most presets assume a talking-head clip (`media.main: "vertical-talking"`) and many need a cut-out of the person (`needs_cutout: true`). Skip the cut-out ones unless the short is `headshot` with a recorded take. For the rest, the product capture plays the part of the footage.

## 2. Prompt Motion (prompt-motion.com)

A gallery of motion videos with the prompt or skill behind each, by category: Product UI (105), Kinetic type (98), Music (51), Shapes (43), Particles (43), Charts (34), Diagrams (31), Characters (27), Photos (23), Phone (22), Code (21). Browse a category with `WebFetch("https://prompt-motion.com/?category=<slug>")` and open an entry for its prompt. Use it for **scene ideas** (how to show a product UI, a chart or a phone demo with more craft), not for presets.

## 3. Skill packs worth reading

24fps lists 147 packs at 24fps.dev/skills; the two posts the user saved (renproton's 17 repos, Y0urDumble's 12 skills) overlap with it. The ones that fit this Remotion pipeline:

| pack | why | install |
|---|---|---|
| `remotion-dev/skills` | official Remotion rules: captions, transitions, fonts, audio, 3D. Read before touching the renderer | `npx skills add remotion-dev/skills` |
| `av/remotion-bits` | ready-made Remotion components to port | `npx skills add av/remotion-bits` |
| `shadcn-labs/snapcn` | Remotion product-demo components, animation review skills | `npx skills add shadcn-labs/snapcn` |
| `gokayfem/shader-skills` | GLSL backgrounds and transitions (via `@remotion/three`, already a dependency) | `npx skills add gokayfem/shader-skills` |
| `patch-gg/pixelfx` | 244 pixel effects | see repo |
| `reedodev/dynamic-captions` | word-level caption styles | `npx skills add reedodev/dynamic-captions` |
| `iart-ai/kinetic-typography-skills` | beat-synced type | `npx skills add iart-ai/kinetic-typography-skills` |
| `Leonxlnx/earshot` | audio checks (already used by `shorts critique`) | installed |

Not a fit: HyperFrames packs (a different renderer; read them for ideas only), Blender / After Effects / ComfyUI / Seedance packs (a different pipeline), and the talking-head editors unless real footage is involved (then see `skills/insta-reels`).

A skill pack is someone else's instructions and code. **Read a pack before installing it, and never install one mid-task without the user saying so.**

## Porting a reference into the kit

1. Write down the reference's timeline in seconds: what enters when, for how long, with which ease, at what size.
2. Decide what it is in our terms: a hook variant, a `type` style, a hit, a transition, a caption preset, or a new scene. Prefer a variant of something that exists; a new scene type also needs `MIN_BEATS` (`apps/shorts/src/beats.mjs`) and a case in `LaunchVideo.tsx`.
3. Build it frame-driven: `useCurrentFrame()` and `moveStyle` / `MotionText` / `interpolate`. No CSS keyframes, no `motion/react`, no timers (they don't render deterministically).
4. Keep the rules of the house: bright frame 0 with line 1 on it, content between 10% and 72% of the height, colours from `config.brand.colors`, sound on the event frame through `<Sfx>`.
5. Add the name to `types.ts`, `apps/shorts/src/motion.mjs` and `motion-vocabulary.md`, with a "pick it when" line. A move with no entry in the vocabulary does not exist for the next script.
6. Edit `packages/motion-kit/src`, then `npm run sync` in `apps/shorts/studio`, `npx tsc`, and render stills at the frames that matter.
7. Credit the source in `packages/motion-kit/src/components/fx/CREDITS.md`. Prompts and videos belong to their creators: port the idea and the timing, don't copy their code or assets unless the licence allows it and is attributed.
