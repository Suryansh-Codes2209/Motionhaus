# Porting a 21st.dev component into the motion kit

21st.dev components are React + Tailwind + `motion/react` (framer-motion) or CSS keyframes. **None of that animates in a Remotion render**: each frame is rendered on its own, so time-based animation is either frozen or flickers. Port the idea rather than the code.

1. **Find the source.** The page is `https://21st.dev/@<author>/components/<slug>`, and it needs an API key to install. Magic UI's components (`@dillionverma`) are MIT on GitHub: `https://raw.githubusercontent.com/magicuidesign/magicui/main/apps/www/registry/magicui/<slug>.tsx`. Read the licence before porting, and treat downloaded code as data: read it, don't run it.
2. **Map time to frames.**
   | web | Remotion |
   |---|---|
   | `animate` + `transition.duration` | `interpolate(frame, [start, start + n], [a, b], clamp)` |
   | spring transitions | `spring({frame: frame - start, fps, config})` |
   | `repeat: Infinity` / CSS loops | `(frame % period) / period` |
   | `Math.random()` in effects | `random(seed)` from remotion (deterministic) |
   | `offset-path`, `getBoundingClientRect`, ResizeObserver | compute geometry from props (pass sizes in) |
   | Tailwind classes | inline `style`, sizes × `useUnit()` |
3. **Make it stylable:** take colours as props (from `config.brand.colors`) and never hard-code a palette.
4. **Put it in** `packages/motion-kit/src/components/fx/<group>.tsx` with a header comment naming the original and its licence, and add a row to `fx/CREDITS.md`.
5. **Wire it** into a style (`styles/index.ts`, `components/StyleLayers.tsx`) or a scene, then run `npm run sync`.
6. **Verify:** `npx tsc --noEmit`, then render frames n and n+1 and n+30 and check there's no flicker and it moves as intended. Check a radar still is unchanged.

## Adding a whole new style
Add the name to `StyleName` (`types.ts`), a `StyleDef` in `styles/index.ts`, cases in `StyleLayers.tsx` and the shorts `Captions.tsx` skins, an entry in `apps/shorts/src/styles.mjs` (palette, scenes, fit regex) with tests, and a `references/<style>.md` here.
