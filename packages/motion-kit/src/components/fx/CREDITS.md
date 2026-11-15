# fx credits

These are frame-driven Remotion ports of web components found on [21st.dev](https://21st.dev). The originals animate with `motion/react`, CSS keyframes or `offset-path`, none of which render deterministically in Remotion. Each port reimplements the visual idea with `useCurrentFrame()` + `interpolate`/`spring` and inline styles, so no code was copied verbatim.

| Port | File | Original | Author / library | Licence |
|---|---|---|---|---|
| `AnimatedBeam` | beams.tsx | [21st.dev/@dillionverma/components/animated-beam](https://21st.dev/@dillionverma/components/animated-beam) | Magic UI ([github.com/magicuidesign/magicui](https://github.com/magicuidesign/magicui)) | MIT |
| `BorderBeam` | beams.tsx | [border-beam](https://21st.dev/@dillionverma/components/border-beam) | Magic UI | MIT |
| `NumberTicker` | text.tsx | [number-ticker](https://21st.dev/@dillionverma/components/number-ticker) | Magic UI | MIT |
| `ShimmerText` | text.tsx | [animated-shiny-text](https://21st.dev/@dillionverma/components/animated-shiny-text) | Magic UI | MIT |
| `GlitchText` | text.tsx | inspired by [hyper-text](https://21st.dev/@dillionverma/components/hyper-text) | Magic UI | MIT |
| `RetroGrid` | backgrounds.tsx | [retro-grid](https://21st.dev/@dillionverma/components/retro-grid) | Magic UI | MIT |
| `DotPattern` | backgrounds.tsx | [dot-pattern](https://21st.dev/@dillionverma/components/dot-pattern) | Magic UI | MIT |
| `Meteors` | backgrounds.tsx | [meteors](https://21st.dev/@dillionverma/components/meteors) | Magic UI | MIT |
| `FlickeringGrid` | backgrounds.tsx | [flickering-grid](https://21st.dev/@dillionverma/components/flickering-grid) | Magic UI | MIT |
| `Marquee` | screen.tsx | [marquee](https://21st.dev/@dillionverma/components/marquee) | Magic UI | MIT |
| `Bento` scene | ../../scenes/Bento.tsx | [bento-grid](https://21st.dev/@dillionverma/components/bento-grid), [magic-card](https://21st.dev/@dillionverma/components/magic-card) | Magic UI | MIT |
| `Highlighter` | paper.tsx | highlighter (rough-notation style) | Magic UI | MIT |
| `AuroraBackground` | backgrounds.tsx | the "aurora background" idea common on 21st.dev | original implementation | — |
| `PaperTexture`, `tornClip`, `Tape`, `CRT`, `GlitchBurst`, `Ripple` | various | — | original | — |

Magic UI licence: MIT © Magic UI. To add another component, follow `skills/short-styles/references/porting-21st.md`.

## Motion vocabulary (moves.tsx, hits.tsx, hook variants, transitions, caption presets)

The names and timings of the entrance moves, eases, loops, beat hits, the sixteen any-style transitions, the hook variants (`band`, `echo`, `card`, `ghost`, `tag`, `build`), the `type` styles (`build`, `echo`, `boxed`, `offset`, `wall`) and the caption presets follow the editor-preset library at [24fps.dev/video-editor](https://24fps.dev/video-editor) (presets for its MIT engine, read through the 24fps MCP server). Presets studied for timing include "Red band, scrambled letter reveal", "Dim and echo-stack keyword", "Punch-in hit, then shrink into a glass-framed card", "Ghost keyword band with a blur pop", "Skewed tag slam", "Accelerating three-word build", "Pop offset outline duplicate", "Boxed word", "Violet pill karaoke", "Colour-sweep karaoke", "Giant single-word pop" and "Small sans phrases, oversized keywords". All implementations here are original frame-driven Remotion code; no engine code or preset JSON is bundled. To port another, follow `skills/short-styles/references/library.md`.
