---
name: video-craft
description: Use before writing, editing or reviewing any Motionhaus video (short, reel, long-form, launch film) for the craft rules behind it — story and storyboards, motion and easing, scene-to-scene continuity and named cuts, look and type, sound and mixing, captions, media and grading, the review loop, a pool of 40 designs to build, and how to study and rebuild a reference video. Also when the user says a video feels like slides, feels generated, feels flat or 2D, or asks for "more 3D", "better transitions" or "that level" of a reference.
---

# Video craft

The craft library for every Motionhaus video. It was adapted on 2026-11-13 from HyperFrames (heygen-com/hyperframes, Apache-2.0): the knowledge, restated for our Remotion kit, with none of their runtime, assets or commands. Each reference keeps the source's numbers and marks every place it disagrees with our own guides as `Conflict:`.

`skills/short-styles`, `skills/long-form`, `skills/insta-reels` and `skills/launch-video` say **what we make**. This skill says **how to make it well**. Where they disagree, the house decisions below win.

## What to read, and when

| When | Read |
|---|---|
| Before the script: choosing the angle, the storyline, the storyboard | `references/story.md` |
| Before placing motion in any scene | `references/motion.md` |
| Before choosing transitions, and whenever a video "feels like slides" | `references/continuity.md`, then `references/seams.md` |
| Before choosing palette, type and layout, or writing a look for a new style | `references/look.md` |
| Before the sound plan and the mix | `references/sound.md`, `references/media.md` (mixing, grading, footage fixes, cutouts, transcripts) |
| Captions, or any scene with a cursor or pointer | `references/captions.md`, `references/captions-and-cursor.md` |
| After the first render, before saying a video is done | `references/review.md` |
| The user shares a reference video or says "this level" | `references/reverse-a-video.md` |
| "An episode in the style of…" | `references/style-sampling.md` (method only: the five style sheets are not in the repo) |
| Weekly changelog or digest video | `references/changelog-video.md` |
| Looking for a design we have never used, or building a new one | `references/block-ideas.md` (40 designs with Remotion recipes), with `shorts designs` |

## House decisions on the conflicts

The references record about 60 conflicts with our guides. These are settled; do not reopen them per video.

**Adopted from HyperFrames (these change how we work):**
- **Reveal with the voice.** Each element arrives when the VO names it, across the scene. Everything on screen in the first quarter and then frozen reads as a slideshow.
- **Read time.** A line meant to be read holds 0.5 s + 0.3 s per word; the last line at least 2 s. Cut words, never shrink type.
- **Ease by role.** Arrivals on a long tail, camera and colour in-out, exits accelerating and 40–50% shorter than entrances. Opacity and colour never bounce.
- **Vary the entrances** inside one video; a landed title is still.
- **No card rows.** At most 2 card scenes in a long-form, 1 in a short (see `skills/long-form` → "Don't repeat the furniture"). Show objects, footage, type and graphics.
- **The Z rule.** Scale changes in the same direction on both sides of a cut, including the incoming scene's own entrance for about half a second. Don't put a grow-from-small entrance under `zoomOut`, or use `pop` next to a zoom.
- **Cut at the fastest frame**, with blur ceilings of 10 px on text and 18–20 px full-frame.
- **Sound restraint.** A whoosh on every cut is the top giveaway of a generated video. Keep transition sounds for the cuts that move; one riser-into-impact per video. (The kit still plays a whoosh per transition by default: this is a known gap, not a licence.)
- **Mix targets.** −14 LUFS, true peak ≤ −1.5 dBTP; duck music under speech with attack 0.15 s and release 0.4 s.
- **Review by contact sheet.** Scene start and middle, a strip across every cut, beat frames. Notes are `time · where · problem → exact change`, ranked P0/P1/P2. No scores.
- **Measure before grading.** UI footage gets no grade.

**Kept as ours (ignore the HyperFrames position):**
- Every scene is narrated; shorts and reels burn captions in; long-form ships an `.srt`.
- Shorts end on a question; every video ends on the outro; the series badge and chapter chips stay.
- Transitions last exactly one beat. Seams that need longer use the in-scene frames on either side (`seams.md` says which).
- **Variety across videos beats their "2–3 transitions per film".** The user asked for designs never to repeat (`shorts designs`). Inside one video, keep one direction of travel where you can, and never use two opposing moves back to back without a cause.
- Dark, glowing and glass looks (`neon`, `3d`, `terminal`) stay available. Their banned list is a prompt to question a default, not a ban.
- Only CC0, public domain, CC BY and CC BY-SA media. No Pexels, Mixkit or Pixabay.
- No avatars, voice clones or the user's own face or voice.

## Depth: making a video feel 3D

A video reads as 3D when things sit at different distances and the camera moves through them. Flat cards with a drop shadow do not. The kit's tools, strongest first:

- **`space` scenes** (`packages/motion-kit/src/scenes/Space.tsx`): real depth, a moving camera and depth of field on a dark stage.
  - `swarm`: sheets (and the episode's `images`) multiply through space, 1 → 4 → 32 → hundreds, as the camera pulls back; `words` flash at different depths; a counter runs to `total` + `label`; then `title` lands. For "there is too much of X", scale, a flood.
  - `gallery`: `images` as tilted cards strung out in depth; the camera flies from one to the next and pulls focus. For a walk through screens, steps or examples.
  - `vortex`: thousands of points spiral into a disc around `image` or `title`, then flare. For "all of that becomes one thing", a product reveal.
- `stack` (layers pulling apart), the `3d` style's orbit, the long-form scene camera, `behind` + `cutout` (text between a photo and its subject), chapter `plate`s (out-of-focus footage behind the scene).
- Rules: one focal plane at a time, and say what is in focus; near things blur more than far things; the camera always has a reason to move (a pull back to show scale, a push in on the answer); 1–2 `space` scenes in a short, 2–4 in a long-form, never two in a row.

## Attribution

Adapted material carries its source line at the top of each reference. HyperFrames is Apache-2.0; see `skills/video-craft/NOTICE.md`. Nothing was copied from its registry, fonts, sound effects or LUTs: their sound effects are under the Pixabay licence and several registry textures have unconfirmed origins, so we rebuild from the recipes with our own assets.
