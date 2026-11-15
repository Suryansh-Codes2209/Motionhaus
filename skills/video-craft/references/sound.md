Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), skills/hyperframes/references/sound.md, film.md, SKILL.md.

# Sound

Sound is half of how a film feels, and the viewer notices a silent one before any frame. Every review of stills misses it, so plan it on purpose. Motionhaus mechanics (the SFX kit, `<Sfx>` placement, `shorts critique`) are in `skills/short-styles/references/sound.md`; this file is the rules those mechanics serve.

## 1. The default

- A film over ~15 s that tells something gets a **music bed and sounds on its visible actions**, unless the user asked for silence or it is made to play muted (a looping background, an autoplay feed: then type and pictures carry it alone).
- Each storyline says its sound in one line: the bed's feel and tempo, the one moment the music changes, which actions get effects, or silence and why.
- Short pieces (a title card, a sting under 10 s, captions or overlays on footage with its own sound) follow the request and the footage.
- Many viewers watch muted: the picture must carry the hook without sound.

Conflict: HyperFrames adds a voiceover only when the request or source calls for one. Motionhaus narrates every scene with a TTS `vo` line, and the VO sets scene length.

## 2. The clock

- **Narrated:** the voice is the clock. Time each beat's start to its anchor word; text lands on the word that says it.
- **Music only:** the music is the clock. Land the payoff and the mark on its strong beats; cuts follow the motion, not the drums.
- Let the sound act out the story: the old way sits near silence, the music opens when the product appears; or the music holds back until the payoff.

## 3. Voice

- TTS reads about 2.2 words a second (script budgets: `story.md` §6).
- A VO longer than its visuals makes the visuals pad with idle drift. Trim the script; never stretch the motion.
- Write the VO as separate phrases so each has a cue point; reveal each piece when the voice names it.
- TTS reads `@handles` and symbols aloud: speak names.

## 4. Music

- The user's own track first, as given.
- Otherwise search by **feel and tempo, not subject**: "tense minimal pulse building to a bright drop, 120 bpm". Listen to / read a few results before keeping one.
- **Enter at the track's strongest bar**, not a quiet intro. A track whose opening is a quiet build drains a short film: start from a stronger later section.
- End on a bar line with a short fade under the end card.
- Library music comes as 15–30 s loops: loop the bed to the film with a **0.4 s fade-in and a 1.5 s fade-out**.
- Scenes tile the track with no gaps.
- With no music source, deliver silent and say so in one line with how to add one. Do not spend the run building an audio chain or writing music in code: nobody can hear whether it is good.
- Beat detection is trustworthy only on rhythmic stretches; on calm music it invents a metronome, often at double tempo. Check the tracker's confidence; on calm sections cut on phrase and energy changes.

Conflict: HyperFrames says never write music in code and no synthesised tones. Motionhaus `launch-video` step 5 synthesises the music bed and SFX locally with ffmpeg; `short-styles/references/sound.md` already says "real recordings, not synths" for SFX.

## 5. Effects

Few and exact. Every effect has a cause on screen; too many read as a template.

| Sound | Only on |
|---|---|
| click | a real cursor click on screen |
| whoosh | a scene cut, or a large card moving fast |
| soft key tick | text arriving letter by letter or line by line |
| pop | a badge, chip or number landing |
| riser into impact | the payoff or the mark, **once in the film** |

- Place a clip so its **peak lands one frame after its picture** (light arrives before sound; a sound that is early feels wrong sooner than one that is late). Most files peak after their start: measure the peak, don't assume it.
- Each hit sits **3–6 dB over the bed**.
- A bed with most of its energy under 150 Hz plays as nothing on a phone speaker.
- **Rotate two or three takes** of a repeated sound. The same whoosh on every cut is the most common tell.
- Over strong music, a typing-heavy film can drop the clicks and keys.
- No synthesised tones, chimes or dings.
- On music: a move landing on a hit starts 40–190 ms early; the hit itself is instant (`motion.md` §3).

Conflict: HyperFrames wants few effects and calls a whoosh on every cut the most common tell. Motionhaus `launch-video`: "whoosh on every transition, never silence", plus an impact + flash + shake on each reveal; every Motionhaus `hit` also brings its own sound.

Conflict: HyperFrames allows riser-into-impact once per film. Motionhaus plays an impact on each reveal (logo, stat).

Conflict: HyperFrames lands every peak one frame after its picture. Motionhaus lands taps and pops on the event frame and whoosh peaks 2 frames after the cut.

## 6. Levels

| Thing | Target |
|---|---|
| Music under a voice | ~0.14 linear volume |
| True peak, every file | ≤ −1 dBTP (AI-generated audio often clips) |
| Integrated loudness, social | −16 to −14 LUFS |
| Effects over the bed | +3 to +6 dB |

Motionhaus normalises to −14 LUFS, inside this range.

## 7. Check it

Measure the rendered file: sound present, hits where the picture hits, loudness in range. Say in the delivery note that the sound was **measured, not heard** (`review.md` §5).
