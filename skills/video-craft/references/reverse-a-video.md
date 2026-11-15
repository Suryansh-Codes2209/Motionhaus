Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), `skills/reverse-any-video/` (SKILL.md, references/match.md, references/animated.md, references/people.md, references/start.md).

# Reverse a video: study it, rebuild it, verify it

The result is a project whose render matches the original frame for frame and stays editable. Use the same method, stopping after step 3, to *measure* a reference video's grammar (cut rate, entrances, type, timing) for a style sheet.

Ground rules:
- Reverse only videos the person has the right to use.
- Rebuild the video as it is. Remix it only when asked.
- Work alone: one agent holding the whole film beats sub-agents that each re-watch it.
- A clip under a minute takes 20–50 minutes. A longer film is worked in sections; say how many.

## 1. The original decides the frame

| Property | Rule |
|---|---|
| Canvas size | exactly the original's pixel size. A default canvas is wrong for most videos. |
| Frame rate | exactly the original's. NTSC rates stay a fraction (30000/1001), never rounded to 30. |
| Duration | the video's frame count ÷ fps, not the audio's length. |
| Sound | the original's own track, played once over the whole film, untouched (no extracted or re-encoded copy). Every rebuilt clip is muted. |

## 2. Break it into shots

- List **every cut with its frame number**, including jump cuts and punch-ins inside one take. A scene-change score alone misses those; check by frame difference and by eye.
- Every shot starts at its listed frame. Write a time as frame ÷ fps **rounded down** (frame 83 at 30 fps is 2.766666; writing 2.767 lands a frame late).
- Sudden light inside a shot can register as a cut. Look at the frames either side: the same picture under different light is one shot.
- A blur flash, a dissolve or a wipe at a cut is part of the cut. Rebuild it over its measured frames.

## 3. What to measure

**Read consecutive frames wherever something changes**: each cut, entrance, exit and transition, a few frames either side, cropped to the region of interest. Contact sheets a second or a quarter-second apart miss 1–3-frame timing, the direction things enter and leave, blurs and dissolves at cuts, and one-frame flashes.

### Timing

- Graphics change on exact frames. An element that is fully there on frame 241 is SET there, not faded in. Animate only what you saw move over several frames. A camera that lands in one frame is a set, not a move.
- **Captions:** take each group's first and last frame from the caption band's pixels, every frame (frame difference over the band). The words come from a transcript, which can mishear names; the switch times come from the pixels, because captions often lead or trail the voice. Switch hard unless the original fades.

### Size, type and position

- **Size text from its ink, not by eye.** Crop the line in a source frame and the same line in a still of yours; compare the ink boxes' height and width; scale the size, then the letter spacing, until both agree within a few pixels. A substitute font usually sets wider; compare numerals too. Then compare the ink's darkness for weight, and look for an outline or shadow.
- Match the font family by its traits (geometry, contrast, x-height, terminals). Try two or three candidates at the measured size before choosing. Record which fonts are substitutes.
- Positions come from measured boxes in source pixels. The canvas is the source's size, so they go in as measured.

### Look

- **Backdrop:** in motion graphics it covers most of the frame. Sample a grid of the empty backdrop at several moments and match its gradient and brightness over time.
- **Motion blur:** fast moves in the original are blurred. Sharp elements at speed score as wrong. Blur along the move while it is fast.
- **Dots and pixel textures:** measure the lattice (pitch, offset, colour) from a frame and render from that grid.
- **Flat graphics that move like footage** (a map under a camera, a scrolling diagram): trace each plate into flat-colour shapes and fit the camera move. It matches far better than redrawing from outside data.

### Every large word, through its whole life

Look at a strip of up to ~16 consecutive frames over the word's box, from the frame it appears to the frame it leaves. Record:

1. How it **arrives**: pop, scale, fade, type-on, word by word, wipe.
2. How it **changes** on screen: a fill sweeping across, a sheen, a counter, a colour change; with direction and duration.
3. How it **leaves**.
4. At full size, what the letters are **made of**: solid, gradient, glass, outline, glow, knockout.

Do this before building the word.

## 4. Every layer has one treatment

| Layer | Treatment |
|---|---|
| A component: text, captions, stickers, cards, UI and screen recordings, charts, maps | rebuilt in code |
| A sub-asset placed in the frame: a photo, a clip, an album cover, a logo or app icon, the people inside a photo or collage | cut from the original on its own box |
| A logo | cut where it is largest, or use the real mark. Never drawn by hand. |
| A person on screen | re-shot with a video generator (below), or cut on their own box |
| An animated or painted film | shot-by-shot split between code and generation (below) |

**Never play the original's whole frame.**

### Recipes for drawn looks (deterministic, frame-seekable)

| Look | Build |
|---|---|
| Fill that sweeps across letters | two copies of the word; the lit copy on top, clipped by an inset that opens from fully closed to fully open over the measured time and direction |
| Gradient type | a linear gradient in the measured direction and end colours, clipped to the text, transparent fill |
| Glass type over footage (letters show the footage bent, with a dark rim and a light edge) | a second copy of the shot inside the letters, clipped to the text shape, bent by a turbulence displacement (base frequency ≈ 0.02, fixed seed, displacement scale 40–60); a darker copy of the text multiplied over it at 15–35%; a 2–3 px dark stroke; a light top edge. It sits in the shot's camera group. |
| Outline type | text stroke at the measured width, transparent fill |
| Directional motion blur | a one-axis Gaussian blur on the moving wrapper, animated (e.g. 24 horizontal, 0 vertical). A symmetric blur is wrong. |
| Ghost trail | 2–4 clones behind the element along the move, opacity about 0.5, 0.3, 0.15 |
| Glow | stacked shadows, animating radius and alpha |
| Masks and wipes | a clip path or mask image with an animated stop |
| Flash | a full-frame layer for exactly the measured frames |
| Grain | turbulence noise with a fixed seed, stepped per frame for moving grain. Grain lowers similarity scores whatever you do: match its look, not its pixels. |

### People on screen

HyperFrames re-shoots every person with a hosted video generator so the original's face and burned-in text never ship. Motionhaus has no such generator wired in; the method is kept for when one is available, and the fallback is to cut the person on their own box and say the burned-in text came along.

1. **One generated shot per original shot.** A generated shot never spans a cut, jump cuts and punch-ins included. One take across a jump cut deletes the cut; a motion guide that crosses a cut makes the generator cut somewhere of its own.
2. Generators make 5–15 s. A shorter shot is asked for at 5 s and trimmed. A longer one is split where the original reframes; otherwise chained, the next part's reference being the last frame of the one before.
3. **A plate per shot:** a real frame of that shot at the source aspect, with every drawn thing and every other face (a photo on a wall, a sticker) painted out, since the generator may animate the wrong face. Inpaint small marks; use a temporal median where the person moves; use an image edit when drawn things are large or cross the person. Check the room stayed sharp.
4. **Drive the motion with the original shot itself**, cut at its cut times: body and camera motion come from the guide, the face from the plate. Mask each drawn text box in the guide (its own box, never a full-width band: a gesture under a mask is lost). The original voice over that shot drives the lips. A person who does not speak gets no audio.
5. Generate every shot at once and build the graphics meanwhile.
6. **Check each shot as it arrives:** no cut inside it, none of the original's text, the face box within **5%** of the original's. Regenerate a failing shot once; then trim it to its good part.
7. **Frame it:** scale and move each shot so its face box sits on the original's at the shot's start and end. Animate between them only where the original's camera moves. The framing jumps at cuts and nowhere else.
8. **Text behind the person:** cut them out of the shot and stack shot, text, cut-out.

Keep the original's voice as the soundtrack and the shots muted. Do not clone voices or make avatars for a re-shoot. People inside a photo, collage or screenshot are sub-assets, cut with it.

### Animated and painted films

In a hand-painted or 3D-animated film the character, world and camera are one picture; the layers do not come apart. Decide shot by shot, and say so before starting: code parts stay editable, generated shots come back as clips that can be replaced but not edited.

| Build in code | Generate | Both |
|---|---|---|
| text and handwriting, logos, the end card, light that sits on the picture (flashes, glows, a portal's ring), a camera moving over a still world (measure the camera; rebuild the world as separate layers from clean plates, never the whole frame) | a character acting, a picture that morphs, fine flowing detail such as streamlines (code draws these in the wrong shape) | in a mixed shot, generate the acting and lay the code over it |

Changes to the people recipe:
- The plate is the shot's first frame with its text and logos removed.
- Name the painting style in the prompt, plus what moves and the camera.
- Trim the guide to the shot's own frames. Leave out the blended frames of a dissolve at either end, or it comes back as the neighbouring shot.
- Frame it by comparing a stable shape at the shot's start and end, then set scale and position by hand.
- **Retime it.** Generators perform camera moves late. Match the generated shot's moves to the original's frames and set its start offset and playback rate to fit, shot by shot.

## 5. Verify against the original

Check once, at the end, not after every change.

1. **While building:** compare a few chosen moments (a still of yours against the same frame of the original) without a full render.
2. **When every shot has content:** fix build errors, but keep what the original itself does (its colours, its tiny text) even when a lint flags it. Render at the source frame rate and high quality.
3. **Diff the render against the original.** The diff must report:
   - the original's cuts that yours misses, and extra cuts of yours,
   - the duration difference,
   - the sound's offset,
   - stretches where content is missing,
   - the worst-matching moments, with the failing cell beside the original's.
4. **Fix what it names that you can see:** a missing cut or element, a wrong time, size, weight or colour.
5. **Render and diff once more, then stop.**

Hand over a side-by-side (original | rebuild) and a live preview.

## 6. The record

Write a short record at the end:
- what is rebuilt in code, what is cut from the original, what is generated or re-shot;
- what is approximate (each substituted font);
- the last diff's numbers.

A command written in the record is a note, not a script. On resume, rebuild it from its recipe and check it before running; never run it as written. A step an earlier session gave up on gets one more try, then ask.

## 7. In Motionhaus

- A reversed video does not fit `script.json`: scene lengths there come from the VO on a beat grid, while a reversed film's shots start on measured frames. Build it as its own Remotion composition with `Sequence from={frame}` per shot, at the source size and fps, with one `Audio` of the original over the whole film.
- For study only: produce the shot list, the per-shot notes from §3, and the numbers (cuts per minute, longest hold, entrance durations in frames, travel in px, blur, type sizes). That table is the input for a style sheet (`style-sampling.md` §3) or a new transition (`seams.md`).
- Frame tools: `ffmpeg` for frame strips and crops, frame difference for cuts and caption-band switches, `--stills` for our side, an SSIM pass for the final diff. `packages/film-qa` when it is set up.

## 8. Conflicts with Motionhaus rules

- **Conflict:** "exact frames, set not faded; switch captions hard" fixes timing to measured frames. Motionhaus sets scene length from the VO on the beat grid and gives every cut a one-beat transition. A faithful reverse must bypass both.
- **Conflict:** HyperFrames re-shoots people with a generator and never ships the original's face. Motionhaus's reel workflow edits the person's real footage directly.
