Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), skills/media-use.

# Media: getting it, making it, mixing it, grading it

Rules and numbers for music, sound effects, the mix, images, logos, colour looks, footage fixes, transcripts and cutouts. Everything here works with free, local or openly licensed tools (ffmpeg, whisper, Kokoro, Openverse, Wikimedia). Tool-specific HyperFrames commands are restated as plain ffmpeg or as a method.

Volume conversions used below: gain 1.0 = 0 dB, 0.9 ≈ −1 dB, 0.6 ≈ −4.4 dB, 0.4 ≈ −8 dB, 0.35 ≈ −9 dB, 0.3 ≈ −10.5 dB, 0.25 ≈ −12 dB, 0.15 ≈ −16.5 dB, 0.12 ≈ −18 dB.

## 1. Ground rules

- Every media file is local before render. Renders never fetch from the network.
- Record where each file came from (source URL, creator, licence) next to the file. A file with no provenance record does not ship.
- Reuse before fetching: check the episode folder and the shared cache first. Auto-reuse only on an exact match of the request text (case and whitespace ignored). A "close enough" match is a human or agent decision, never automatic.
- When unsure whether a cached asset fits, fetch fresh. A redundant download is cheap; the wrong asset is not.
- Never reuse a brand asset (logo, product shot) from another project on a loose match. The entity must match exactly.
- A weak search match is a low-confidence match: listen to or look at it before placing it, or search again with other words.
- Optional media never blocks a render. Missing music or a missing sound effect is logged and skipped.
- Offer once, never add silently. Scan a finished piece once for concrete gaps and offer the fixes in one ask: on-screen text with no voiceover, emoji standing in for icons, placeholder images, silent cuts, 10 s or more with no music, a colour cast. No signal, no suggestion. Respect "leave it".

## 2. Music

### Choosing

- One music bed per video.
- Name the mood, not the genre alone. Fallback mood when nothing is specified: "calm cinematic underscore".
- Starting prompts and tempos by topic:

| Topic | Bed | BPM |
| --- | --- | --- |
| Crypto, web3, blockchain | atmospheric electronic, deep bass, futuristic synths, restrained percussion | 100 |
| Finance, fintech, payments | calm cinematic, soft strings, subtle piano, restrained percussion | 92 |
| Creative, design, agency, brand | playful electronic, warm pads, light percussion | 115 |
| Default: SaaS, tech, platforms | uplifting corporate tech, bright modern piano with synth pads | 108 |

- Reshape by story arc: problem then solution = start minor, resolve to major. Before/after or aspirational = rising. Feature cascade = +10 BPM, energetic and driving (cap 128). Demo loop = −8 BPM, minimal.
- Tempo ranges: 90–110 BPM calm, 110–130 BPM energetic. Brightness 0.7 or higher reads as promotional.
- Narration pace the bed must leave room for: 145–155 words per minute.

### Generating locally (MusicGen)

- MusicGen takes only a prompt, so put mood, instruments, BPM and major/minor in the prompt text.
- Generate one seed clip of 28 s (limits 10–30 s; the decoder cannot go longer), then loop it to length with a 0.3 s equal-power crossfade (cosine out, sine in). Looping one seed avoids per-segment seams.
- Finish with a 0.08 s fade-in and a 0.5 s fade-out.
- Target length = total voice duration. Trim down if the seed is longer.

### Placing

- Do not assume the start of a track is the best edit point. Compare the opening against later five-second sections. If the track opens with a quiet build and a later section has a stronger, clean musical entrance, start from that section.
- Apply a short fade-in and a longer fade-out.
- Repeat the check whenever the video length changes. The music must cover the full cut with no silent tail.
- Trim with ffmpeg: `ffmpeg -ss <start> -t <len> -i track.mp3 -af "afade=t=in:d=0.08,afade=t=out:st=<len-0.5>:d=0.5" bed.wav`

### Level

| Situation | Bed gain |
| --- | --- |
| Under narration, static level | 0.12 (≈ −18 dB) |
| No voice at all (music-led film) | 0.9 |
| Under a calm documentary narrator | about −31 LUFS integrated, never masking the voice |
| Ducked bed (see mixing) | full level between phrases, 0.3–0.4 of it under speech |

## 3. Sound effects

### Sourcing

- Search and download; never generate. Search Openverse audio first (mostly Freesound), fall back to the local kit.
- Accept only CC0 and CC BY for sound effects. Never NonCommercial, ShareAlike or NoDerivatives. Re-check the licence on each result, not only in the search filter.
- Prefer CC0 over CC BY when two results are close.
- Clip length: 15 s maximum; anything past about 4 s ranks lower.
- Name effects concretely ("glass shatter", not "dramatic sound"). Vague queries return poor matches.
- Openverse anonymous limits: 20 searches a minute, 200 a day. One search per distinct effect name, 20 results each. Past the limit, use the local kit for the rest of the run.
- One file per distinct effect name; reuse it for every cue.
- Credit every CC BY sound (title, creator, licence, source link) in a credits file kept with the project, and include those credits wherever the video is published.

### Level and placement

- Default gain 0.35 (≈ −9 dB). Effects sit under the voice and the bed; they never fight them.
- Sync short accents (click, pop, key press, ping) exactly to the on-screen action.
- Place builds by their peak, not their start. A riser of length L starts at `climax − L` so it crests on the reveal (a 10.03 s riser starts 10.03 s before the reveal). A cinematic whoosh (about 5.5 s) swells into the cut.
- Trigger impacts and glitch hits on the visual landing and let the decay bleed into the next shot.
- A cue that matches nothing is skipped and logged.

### What each effect is for

| Effect | Typical length | Use |
| --- | --- | --- |
| click, soft click | 0.37 s | Button press, toggle, selection |
| key press | 0.4 s | One keystroke, terminal input |
| typing burst | 1.5 s | Text being typed; start as typing begins |
| pop | 0.72 s | Element, chip or badge appearing |
| short whoosh | 0.57 s | Swipe, slide, fast element move, snappy transition |
| cinematic whoosh | 5.54 s | Sweeping scene transition; peak on the cut |
| ping | 1.32 s | Key reveal or data point |
| chime | 2.5 s | Success, confirmation, light transition |
| notification | 2.46 s | Alert, message, toast or badge arriving |
| sparkle | 1.8 s | Shine on a hero element |
| bass impact | 2.1–2.6 s | Logo snap, headline slam; peak on the reveal |
| glitch (punchy, harsh, low-key) | 2.6–3.5 s | Hard-cut accent, jarring transition, or subtle digital shift under other audio |
| error tone | 1.62 s | Failure state, "wrong" beat |
| riser | 10.03 s | Long build to a climax |

## 4. Mixing

### Order of work

1. Level each track (voice loudest, bed under it, effects under both).
2. Duck the bed under speech.
3. Carve the bed's frequencies where the voice lives.
4. Fix tone problems on the voice with EQ.
5. Limit, then normalise the final mix to the publish target.

### Ducking the bed

- Speech spans come from word timings (the TTS output or a transcript). Merge spans whose gap is under 0.6 s so the bed does not pump between words.
- Duck to 0.25 of the bed's base level by default (hand-tuned range 0.3–0.4). Attack 0.15 s, release 0.4 s.
- Worked example: base 0.6, ducked 0.15. Envelope points: hold 0.6 until speech starts at 3.42 s, reach 0.15 by 3.57 s, hold until speech ends at 9.87 s, back to 0.6 by 10.27 s.
- A bed that starts before the voice needs an explicit full-level point at t = 0.
- An envelope multiplies the track's static volume. Write the level in one place only: volume 0.5 under an envelope at 0.5 plays at 0.25.
- Envelope times are relative to the clip's start, not the video's. Subtract the clip's start time.
- In a Remotion composition, express the duck as a `volume={(frame) => ...}` function built from these points. The source file stays untouched.
- Bake ducking into a file only for standalone exports:
  `ffmpeg -i bgm.mp3 -i voice.wav -filter_complex "[0][1]sidechaincompress=threshold=0.03:ratio=8:attack=200:release=400[ducked]" -map "[ducked]" bgm.ducked.wav`

### Carving the bed

- After ducking, dip only the frequency bands the voice occupies in the bed, so the bed can stay more present without masking words.
- Method: analyse the voice at 48 kHz, find its dominant bands, apply a narrow EQ cut on the bed at each, plus a level match.
- Strength 0–1, default 0.8. At 0.25 the bed stays present but still fights the voice.
- Analyse all voices that play over the bed together.
- Never carve a voice track.
- Plain ffmpeg approximation: `equalizer=f=<band Hz>:t=q:w=<q>:g=<negative dB>` on the bed for each band; the speech clarity region is around 3 kHz.

### Fixing how it sounds

| It sounds like | Fix | ffmpeg filter |
| --- | --- | --- |
| Hum, rumble, handling noise | High-pass at 80 Hz | `highpass=f=80` |
| Boomy, too close | Peak cut 200 Hz, −4 dB | `equalizer=f=200:t=q:w=1:g=-4` |
| Muffled | Peak cut 250 Hz, −3 dB | `equalizer=f=250:t=q:w=1:g=-3` |
| Words hard to make out | Peak boost 3 kHz, +2.5 dB, Q 1, or duck the music | `equalizer=f=3000:t=q:w=1:g=2.5` |
| Harsh | Peak cut 3.2 kHz, −3 dB | `equalizer=f=3200:t=q:w=1:g=-3` |
| Peaks clipping | Limiter at −1 dB, last in the chain | `alimiter=limit=0.891` |

- Chain order is signal order: high-pass, then EQ, then limiter.
- Compressors, limiters and gates cannot be automated smoothly; automate a gain stage before them instead.
- Reverb and delay make a track longer than its source. Expect the tail.
- A crossfade is two overlapping clips, each with its own fade.
- Speed changes: 0.1–10×, pitch preserved; give a video and its paired audio the same rate.
- Keep one role per group: voiceover, music, effects. Process each group as one bus.

### Loudness targets

| Target | Integrated | True peak | Range |
| --- | --- | --- | --- |
| Social platforms (Shorts, Reels, YouTube) | −14 LUFS | −1.5 dBTP | LRA 11 |
| Podcast, spoken-word default | −16 LUFS | −1.5 dBTP | LRA 11 |

Use two-pass `loudnorm`. Pass 1 measures, pass 2 applies the measured values:

```sh
ffmpeg -i mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null -
ffmpeg -i mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=<input_i>:measured_TP=<input_tp>:measured_LRA=<input_lra>:measured_thresh=<input_thresh>:offset=<target_offset>:linear=true:print_format=summary mix.social.wav
```

- Swap `I=-14` for `I=-16` for the podcast target.
- To match one clip to another, measure both and adjust the quieter one's gain; with no reference, level to −16 LUFS.

### Audio-reactive motion (music-led pieces)

- When the audio is music (vocals over instrumentation, beats), captions and graphics must react to it; without it, the picture feels disconnected. Even a ballad gets a subtle bass pulse.
- Extract per-frame data once, at build time: mono 44.1 kHz, RMS per video frame, FFT on a centred 4096-sample Hann window (about 10.8 Hz per bin; the per-frame slice of 1470 samples at 30 fps is too small for low bands), 8 log-spaced bands from 30 Hz to 16 kHz, peak magnitude per band, RMS and each band normalised to its own peak.
- Bands 0–1 are bass, bands 6–7 are treble. Take the peak over a caption group's time range and scale the group's entrance by it.
- Keep it subtle: 3–6% scale variation (`1 + peakBass × 0.06`), glow up to 12 px at opacity up to 0.4. Heavy pulsing makes text unreadable.
- Shape the animation from the data at build time. No per-frame callbacks.

## 5. Voiceover (local Kokoro)

- Speed: 0.7–0.8 tutorial, complex content, accessibility; 1.0 natural; 1.1–1.2 intros, transitions, upbeat content; 1.5 or more rarely works, test it.
- Voice by content:

| Content | Kokoro voice |
| --- | --- |
| Product demo | `af_heart`, `af_nova` |
| Tutorial, how-to | `am_adam`, `bf_emma` |
| Marketing, promo | `af_sky`, `am_michael` |
| Documentation | `bf_emma`, `bm_george` |
| Casual, social | `af_heart`, `af_sky` |

- The first letter of a Kokoro voice ID sets the language: `a` American English, `b` British English, `e` Spanish, `f` French, `h` Hindi, `i` Italian, `j` Japanese, `p` Brazilian Portuguese, `z` Mandarin. Non-English needs `espeak-ng` installed.
- Split scripts longer than about 5 minutes of speech into segments.
- Keep one narrator across a series so the channel sounds like one product. Change voice only for a written-down reason.
- Kokoro returns no word timings. Transcribe the generated audio to get them, matching the transcription model's language to the voice.
- After any change to the read, generate and align again. Check that the transcript preserved the script, especially names, numbers and pauses.

## 6. Transcripts and captions timing

### Whisper model rules

- Always choose the model explicitly. `.en` models (`tiny.en`, `base.en`, `small.en`, `medium.en`) translate non-English speech into English and silently destroy the original.
- Known English: `small.en`. Known other language: `small` plus the language code. Unknown language: `small` (auto-detect). A language code also filters out other languages in mixed audio.

| Model | Size | Use |
| --- | --- | --- |
| `tiny` | 75 MB | Quick previews |
| `base` | 142 MB | Short clips, clear audio |
| `small` | 466 MB | Default; speech over silence or light background |
| `medium` | 1.5 GB | Speech over music, vocals, noisy audio |
| `large-v3` | 3.1 GB | Production quality, multilingual |

- Produced music with vocals: start at `medium.en` and expect to need manual lyrics.
- Parakeet-TDT (`parakeet-mlx` on Apple Silicon, CC BY 4.0 model) is a stronger local option for English and 24 other European languages: average word error rate 6.05% against whisper.cpp's 7.44%, 4.73% against 5.96% on noisy audio, and 5–10× faster. Whisper covers 99 languages; use it for the rest.

### Mandatory quality check after every transcription

Read the transcript before using it.

| Signal | Cause |
| --- | --- |
| Music-note tokens or replacement characters | Whisper heard music, not speech |
| Garbled or nonsense words | Misheard lyrics or noise |
| 20 s or more with only music tokens | Instrumental section, or speech being missed |
| Many "huh", "uh", "oh" entries | Hallucination on music |
| Words shorter than 0.05 s | Unreliable timing |

- Failed transcript = more than 20% music or replacement tokens, or obvious nonsense. Retry with `medium.en`. If that fails too, the audio is too noisy for local transcription: supply the text by hand as SRT/VTT.
- Always clean before captioning: drop empty entries, entries that are only music symbols, and "huh/uh/um/ah/oh" shorter than 0.1 s.
- Word-level timestamps give better captions than SRT/VTT phrase timing, which cannot drive per-word animation.
- Word shape used everywhere: `{ id: "w0", text, start, end }`, seconds.

### Caption grouping and placement

- Group size: 2–3 words high energy, 3–5 conversational, 4–6 calm. Break on sentence ends, pauses of 150 ms or more, or the word cap.
- One group visible at a time. Every group gets a hard hide at its end time, after a 0.12 s exit.
- Portrait 1080×1920: lower middle, about 600–700 px from the bottom. Landscape 1920×1080: 80–120 px from the bottom. Never cover the subject's face.
- Fit text: max width 1600 px landscape, 900 px portrait; base size 78 px, minimum 42 px, step 2 px. When words scale above 1.0, use `safeWidth / maxScale` as the max width. Do not clip overflow; clipping cuts scaled words and glows.
- Caption style by tone:

| Tone | Font | Animation | Size |
| --- | --- | --- | --- |
| Hype, launch | Heavy condensed, 800–900 | Scale-pop with overshoot, 0.1–0.2 s | 72–96 px |
| Corporate | Clean sans, 600–700 | Fade and slide, 0.3 s | 56–72 px |
| Tutorial | Mono or clean sans, 500–600 | Typewriter or fade, 0.4–0.5 s | 48–64 px |
| Storytelling | Serif, 400–500 | Slow fade, 0.5–0.6 s | 44–56 px |
| Social | Rounded sans, 700–800 | Bounce, word by word | 56–80 px |

- Karaoke highlight is the baseline at every energy level: 15% scale pop with accent and glow at high energy, 3% scale with a gentle white shift at low energy.
- Alternate highlight styles every 2 groups at high energy, every 3 at medium, every 4 at low.
- Emphasis words (brand names, ALL CAPS, numbers, emotional keywords, calls to action) always get a stronger treatment than their neighbours.
- If the picture is bright or busy, put a semi-transparent dark layer under the captions.

### Cutting by transcript

- Turn word timestamps plus cut decisions into kept segments, then encode. Print the kept-segment plan before encoding.
- Removal sources: explicit time ranges, word-index ranges, filler words (compare lower-cased with punctuation stripped, so "UM," matches "um"), and silences.
- Silence cut: remove any gap between words longer than the threshold (0.8 s is a good start) but keep 0.15 s of padding on each side.
- Drop kept segments shorter than 0.2 s.
- Add a 30 ms audio fade in and out at every splice to kill clicks (scale the fade to a quarter of the segment when the segment is very short; no fade at the true start and end).
- Encode segments with PCM audio (`-c:v libx264 -preset veryfast -crf 18 -c:a pcm_s16le`, constant frame rate, in `.mov`) and encode AAC once at the concat. AAC per segment adds 25–35 ms of priming silence at every join.
- Dead-air trimming without a transcript: `auto-editor in.mp4 --edit audio:threshold=4% -o tight.mp4`. Scene detection: `scenedetect -i in.mp4 detect-adaptive list-scenes`.

## 7. Images, icons and logos

- Licence rule for sounds: CC0 and CC BY only. For photos, also accept public domain; treat ShareAlike as a per-project decision (Motionhaus photos allow CC BY-SA, sounds do not). Never NonCommercial or NoDerivatives.
- Keep the credit line for every CC BY asset and publish it with the video.
- Logos are official marks, never redrawn by hand. Source order: an official SVG logo collection, then the brand's GitHub organisation avatar, then the site's favicon. Leave logo pixels unchanged: no grade, no tint.
- Icons: use real icon files (transparent PNG or SVG). Emoji standing in for icons is a gap to fix.
- Placeholder images are a gap to fix before publishing.
- Query with the concrete subject, not the idea.
- Local image generation (FLUX via `mflux`) is an option only when asked for: FLUX.1 schnell 4-bit needs about 8 GB of free RAM and takes about 20 s for 512 px, but only with the low-RAM flag; without it a 768×512 run swapped for 90 minutes on a 24 GB machine. FLUX.2 Klein 4B needs about 32 GB. Qwen-Image needs about 64 GB.
- Upscale a small still: `realesrgan-ncnn-vulkan -i in.png -o out.png -s 4`.

## 8. Colour grading and looks

### Scope

- Grade photographic media only. Skip text, SVG, logos, icons, UI chrome and footage that is already intentionally stylised, unless asked.
- A grade treats the whole image. It cannot hide one face or number plate; that needs a separate cropped or masked layer.
- The grading path is Rec.709 SDR. Do not silently process HDR (PQ, HLG) or camera LOG footage; convert or tone-map on purpose first. Check with `ffprobe -show_entries stream=color_space,color_transfer,color_primaries,pix_fmt`.
- Never read a `.cube` LUT file as text. A 33-point LUT is about 36,000 lines of numbers. Judge a LUT by rendering it on a frame.
- Parametric maths cannot reproduce a real film stock. Use a scanned `.cube` for that and do not call a parametric look by a stock's name.

### Pick the smallest lane

| Request | Lane |
| --- | --- |
| Too dark, flat, too warm, too many shadows | Correction only |
| Polished, premium, warm, cinematic, fit the topic | One restrained look |
| Retro, print, ASCII, glitch, camcorder | Stylised effect, applied strongly enough to be unmistakable |
| Hide the whole image | Blur or pixelate |
| Hide one region | Separate masked layer |
| Draw attention without changing pixels | Framing and motion |
| Reveal, focus pull, depixelate | Animate one value over a fixed time |

- Do not add a stylised effect when correction solves the complaint. Do not change colour when the request is about timing.
- Correction and polish stay restrained. A named bold look must be obvious in the after-frame.
- Start with one candidate; two at most. A second candidate is an escalation.
- Do not stack effects to look sophisticated.

| Feedback | First action | Never infer |
| --- | --- | --- |
| "Too many shadows and a bit boring" | Lift shadows, protect highlights, then one restrained look | Retro texture or palette effect |
| "Make the product feel premium" | Protect product colour and labels; try Product Polish | A cinematic LUT or crushed blacks |
| "Make this reveal cooler" | Keep colour; animate one value | Whole-clip styling |
| "Like an old home video" | Compare 8mm against VHS on the source | That old video always means VHS |
| "Keep the brand colours exact" | Leave pixels alone; use framing and motion | Any look, palette or LUT |

### Workflow

1. Confirm the target is real photo or video and check its colour metadata.
2. Look at the source: one read for an image; for video, one contact sheet of early, middle and late frames. Do not infer content from statistics alone.
3. Pick one lane and one look.
4. Apply, then capture an after-sheet at the same three timestamps and compare.
5. Stop when the result is clearly better. If it is not clearly better, keep the source unchanged and say so.
6. Judge anything that moves (flicker, tape damage, reveals) in motion, not on a still. Judge print and dot effects at final output resolution.
7. Report the media treated, the intent, the final settings and which frames were actually checked. Command success is not evidence of quality.

### Control scale

All adjustment values below are on a −1 to 1 scale (exposure −2 to 2), where 0 is no change. Values are absolute, not added to a preset. `intensity` (0–1) blends the whole grade against the source. Controls: exposure, contrast, highlights, shadows, whites, blacks, temperature (positive = warmer), tint, vibrance, saturation; details: vignette, grain, grain size, grain roughness.

### Look presets (values from HyperFrames core, `packages/core/src/colorGrading.ts`)

The settings are the source's. The "Use for" column is our reading of each preset's name and values; the source gives no usage note for most of them.

| Look | Use for | Settings |
| --- | --- | --- |
| Warm Daylight | Friendly outdoor or lifestyle warmth | exposure 0.06, contrast 0.07, highlights −0.06, shadows 0.08, temperature 0.18, saturation 0.08 |
| Clean Studio | Neutral, slightly cool product or studio footage | contrast 0.08, highlights −0.08, shadows 0.06, temperature −0.08, tint 0.03, saturation 0.04 |
| Skin Soft | People; gentle and flattering | exposure 0.04, contrast −0.03, highlights −0.12, shadows 0.12, temperature 0.08, tint 0.02, saturation 0.04 |
| Food Pop | Food, saturated products | exposure 0.06, contrast 0.1, shadows 0.06, temperature 0.14, vibrance 0.1, saturation 0.18 |
| Night Lift | Dark or night footage | exposure 0.08, contrast 0.08, highlights −0.18, shadows 0.2, blacks −0.08, saturation 0.04, vignette 0.12 |
| Muted Editorial | Serious, documentary | exposure −0.02, contrast 0.08, highlights −0.08, shadows 0.06, blacks −0.05, temperature −0.03, saturation −0.12, vignette 0.1 |
| Vintage Wash | Memory, nostalgia | exposure 0.03, contrast −0.12, highlights −0.1, shadows 0.16, whites −0.04, blacks 0.08, temperature 0.13, vibrance −0.08, saturation −0.08, vignette 0.18 |
| Mono Clean | Crisp black and white | contrast 0.12, highlights −0.04, shadows 0.04, blacks −0.08, saturation −1 |
| Mono Fade | Soft, lifted black and white | contrast −0.04, highlights −0.06, shadows 0.1, blacks 0.12, saturation −1, vignette 0.08 |
| Soft Boost | Flat footage that needs gentle life | exposure 0.06, contrast −0.04, highlights −0.14, shadows 0.16, vibrance 0.08, saturation 0.1 |
| Bright Pop | Dull footage for energetic social | exposure 0.12, contrast 0.12, whites 0.08, blacks −0.04, vibrance 0.08, saturation 0.14 |
| Deep Contrast | Dramatic, moody | exposure −0.03, contrast 0.2, highlights −0.08, shadows −0.08, blacks −0.12, saturation 0.06 |

### Three LUT looks (parametric)

| Look | Blend | Settings |
| --- | --- | --- |
| Teal-orange blockbuster | 0.85 | contrast 0.18, saturation 0.08, vibrance 0.12; split tone intensity 0.62, balance 0.52, shadows RGB offset (−0.04, 0.05, 0.09), highlights RGB offset (0.1, 0.04, −0.03) |
| Bleach bypass (gritty, desaturated, strong blacks) | 0.8 | blacks 0.04, shadows −0.08, highlights 0.08, whites 0.18, contrast 0.55, temperature −0.02, saturation −0.72, vibrance −0.25 |
| Film fade (lifted blacks, warm highlights) | 0.75 | blacks 0.35, shadows 0.18, highlights 0.02, whites −0.03, contrast −0.28, temperature 0.16, saturation −0.12, vibrance −0.08 |

Apply a `.cube` with ffmpeg at partial strength (the graded stream goes first; `all_opacity` is its share):
`ffmpeg -i in.mp4 -filter_complex "[0:v]split[a][b];[b]lut3d=look.cube[g];[g][a]blend=all_mode=normal:all_opacity=0.85" out.mp4`

### Source-matched recipes

**Natural Portrait** (talking head, interview, people photo). Base: Skin Soft at intensity 0.6. Not for tiny or incidental faces, neon or monochrome sources, or beauty retouching.

| Property | Range |
| --- | --- |
| intensity | 0.45 to 0.75 |
| exposure | −0.06 to 0.14 |
| contrast | −0.05 to 0.08 |
| highlights | −0.18 to −0.04 |
| shadows | 0.04 to 0.18 |
| whites | −0.10 to 0.04 |
| blacks | −0.06 to 0.06 |
| temperature | −0.05 to 0.10 |
| tint | −0.03 to 0.05 |
| vibrance | 0 to 0.06 |
| saturation | −0.04 to 0.06 |

- Grain, blur and pixelate stay at 0. Vignette 0–0.05 only if it helps focus without reading as an effect.
- Reject results with implausible skin, lost highlight detail, flattened or desaturated dark skin, or a cast on clothing and background.

**Product Polish** (photographed or filmed physical products). Base at intensity 0.7: exposure 0.01, contrast 0.06, highlights −0.1, shadows 0.04, whites 0.02, blacks −0.03, vibrance 0.03, saturation 0.02.

| Property | Range |
| --- | --- |
| intensity | 0.45 to 0.8 |
| exposure | −0.08 to 0.1 |
| contrast | 0 to 0.1 |
| highlights | −0.16 to 0 |
| shadows | 0 to 0.12 |
| whites | −0.08 to 0.05 |
| blacks | −0.06 to 0.04 |
| temperature | −0.05 to 0.05 |
| tint | −0.03 to 0.03 |
| vibrance | 0 to 0.06 |
| saturation | −0.04 to 0.05 |

- Temperature and tint stay at 0 unless the frames show a real cast. No grain, vignette or blur on catalogue shots; vignette up to 0.04 on lifestyle shots.
- Reject clipped white packaging, muddy black products, a shifted brand colour, hidden texture or harder-to-read labels. If the original is already accurate, leave it and polish with framing and motion.

**UI Fidelity** (screenshots, screen recordings, dashboards, terminals, slides). The default grade is none. A global colour change alters brand colours, status colours, charts and small text together. Polish with crop, scale, pacing, cursor emphasis and motion outside the captured pixels. For a camera filming a screen, correct only a demonstrated cast or exposure problem.

**Film Memory** (warm memory, restrained flashback; not the default meaning of "cinematic"). Base: Vintage Wash at intensity 0.6, vignette 0.12, grain 0.12, grain size 0.2, grain roughness 0.6.

| Property | Range |
| --- | --- |
| intensity | 0.5 to 0.75 |
| vignette | 0.08 to 0.16 |
| grain | 0.08 to 0.16 |
| grain size | 0.16 to 0.24 |
| grain roughness | 0.5 to 0.7 |

- Flicker: exposure drifting within −0.03 to 0.03, in eased segments of 0.45–0.8 s. A gentle pulse, not a flash.
- Gate weave: x/y within 0.15% of the shorter edge, rotation within 0.03°, scale 1.005–1.01 so edges never show. Slight mechanical drift, not handheld shake.
- Drive both from the frame number, deterministically. No randomness, timers or infinite loops. Return near the start values at the end.
- No dust, scratches, light leaks or burns unless the story needs them. If the motion reads as an effect before it reads as a memory, reduce or remove it.

**8mm Home Movie** (family archive, childhood, travel memory; stronger than Film Memory). Base: Vintage Wash at intensity 0.72, vignette 0.28 (midpoint 0.54, feather 0.72), grain 0.34, grain size 0.18, grain roughness 0.72, dust and scratches 0.62.

| Property | Range |
| --- | --- |
| intensity | 0.6 to 0.8 |
| vignette | 0.18 to 0.34 |
| grain | 0.22 to 0.42 |
| grain size | 0.12 to 0.24 |
| grain roughness | 0.6 to 0.8 |
| dust and scratches | 0.35 to 0.7 |

- Weave as Film Memory but scale 1.005–1.015 and segments of 0.6–1 s.
- Reject constantly visible dust, scratches that persist, pumping, an exposed edge or muddy highlights. Not for footage where dust would imply false provenance.

**Creator Camcorder** (consumer digital-video character; not VHS, not CRT). Base at intensity 0.72: contrast 0.08, highlights −0.05, shadows 0.02, whites 0.03, blacks −0.04, temperature −0.03, tint −0.015, vibrance −0.03, saturation −0.06, vignette 0.06, grain 0.08, grain size 0.18, grain roughness 0.58, horizontal chroma bleed 0.55.

| Property | Range |
| --- | --- |
| intensity | 0.55 to 0.8 |
| contrast | 0.03 to 0.1 |
| highlights | −0.1 to 0 |
| shadows | 0 to 0.06 |
| whites | 0 to 0.05 |
| blacks | −0.08 to −0.01 |
| temperature | −0.06 to 0.04 |
| tint | −0.03 to 0.02 |
| vibrance | −0.06 to 0.02 |
| saturation | −0.12 to −0.02 |
| vignette | 0.03 to 0.1 |
| grain | 0.04 to 0.12 |
| grain size | 0.14 to 0.24 |
| grain roughness | 0.45 to 0.7 |
| chroma bleed | 0.35 to 0.7 |

- No blur, pixelation, scanlines, RGB split or tracking noise; those are other visual languages.
- A REC overlay (date, time, counter, blinking dot driven from the frame number) is optional and only when the story is about a recording device.
- To go from clean to camcorder on screen, crossfade two synchronised layers (untreated and treated). Fading the grade's intensity does not fade the effects.

**VHS Playback** (analog home-video tape, visibly degraded). Base at intensity 1: contrast −0.04, saturation −0.08, grain 0.16 (size 0.12, roughness 0.72), tape damage 0.82, tracking 0.85, tape noise 0.3, tape speed 0.5, chroma bleed 0.5, channel separation 0.18 at 0°, scanlines 0.35 (count 0.17, about 127 line cycles; softness 1), row tears 0.32 with line tear 0.08 at speed 0.5. Keep digital colour split, pixelation and block displacement at 0.

| Property | Range |
| --- | --- |
| intensity | 0.75 to 1 |
| contrast | −0.1 to 0 |
| saturation | −0.16 to 0 |
| grain | 0.08 to 0.18 |
| grain size | 0.08 to 0.18 |
| grain roughness | 0.55 to 0.8 |
| tape damage | 0.65 to 0.9 |
| tracking | 0.5 to 0.9 |
| tape noise | 0.15 to 0.45 |
| tape speed | 0.35 to 0.65 |
| chroma bleed | 0.35 to 0.65 |
| channel separation | 0.08 to 0.22 |
| scanlines | 0.2 to 0.4 |
| scanline count | 0.14 to 0.2 |
| row tears | 0.2 to 0.4 |
| line tear | 0.04 to 0.1 |

- Tape damage means: horizontal line jitter, slow time-base wobble, head-switching noise at the bottom edge, reduced luma detail, restrained ghosting, noise and sparse dropouts.
- Leave blur, CRT curvature and a camera overlay off.
- Reject hard edge tearing, smeared faces, frozen noise, square blocks, blank borders or a bottom disturbance that competes with the subject.

**CRT Display** (media shown on an old monitor, terminal or game screen). Curvature 0.2 (0.08–0.28), scanlines 0.35 (0.18–0.45; count 0.17, softness 1), channel separation 0.08 (0–0.12). Curvature alone is not a CRT look. Reject heavy black corners, unreadable UI or large colour fringes.

**Editorial Halftone** (print, poster, comic or newsprint beats). Intensity 1, contrast 0.04 (−0.02 to 0.08), saturation 0.04 (−0.04 to 0.08), halftone 0.94 (0.75–1), dot size 0.36 (0.15–0.55). Four CMYK screens at fixed angles C 15°, M 75°, Y 0°, K 45° on a warm paper base. Reject unstable moiré, unreadable subjects, oversized dots, or anything that looks like a dot texture laid over unchanged footage.

**Two-Ink Print** (poster frames, zine graphics, music cutaways). Intensity 1, contrast 0.08 (0.02–0.1), highlights −0.06 (−0.1 to 0), shadows 0.04 (0–0.08), amount 1 (0.8–1), dot size 0.42 (0.18–0.55). Warm midtones map to vermilion, cool shadows to teal, shared darks overprint on warm paper; screens at 15° and 75° with a small fixed registration offset. Do not combine with halftone or a duotone LUT. Reject a result that reads as a red tint with dots.

**Monochrome Screen Print**. Amount 1, cell size 0.35 (0.15–0.55), angle 0.25, spread 0.3 (0.15–0.55), shape circle / square / diamond / triangle / line, palette `#111319` on `#f2ecdc`. Reject faces that lose their silhouette or cells too small to survive encoding.

**Engraved Illustration**. Amount 1, spacing 0.4118 (0.25–0.6), thickness 0.2 to 0.4571, angle 0.25, contrast 0.4667 (0.3–0.65), sharpness 0.59, wave 0.2 (0–0.35) at frequency 0.2222, palette `#101216` on `#f3eddf`. Reject broken contours, noisy flat backgrounds or flickering lines.

**Crosshatched Sketch**. Amount 1, spacing 0.28 (0.18–0.5), thickness 0.25, angle 0.25, contrast 0.3333, edge detail 0.5 (0.3–0.7), wave 0.33 (0.1–0.45) at frequency 0.2222, same palette. Reject dense black fill that hides the subject.

**Procedural ASCII** (terminal, code, data, surveillance reveals). A real 5×7 glyph field generated from the image, not text laid over footage. Terminal: amount 1, glyph size 0.08, inverted, palette `#020605` / `#38ff78`. Editorial: amount 1, glyph size 0.066, palette `#0b0d0d` / `#eee9db`. Keep amount 0.75–1 and size 0.04–0.15. Reveal by animating amount 0 to 1.

**Ordered Palette Dither** (pixel-art, posterised beats). Stable 4×4 Bayer matrix with a dark-to-light palette of 2–6 colours. Amount 0.7–1, cell size 0.1–0.5. Reversing the palette order inverts the mapping. Do not call it Floyd-Steinberg or Atkinson.

| Palette | Colours, dark to light |
| --- | --- |
| noir | `#000000`, `#ffffff` |
| ink-paper | `#1a1a2e`, `#f5f5dc` |
| terminal | `#001100`, `#00ff00` |
| amber-glow | `#1a0f00`, `#ffcc00` |
| handheld-green | `#0f380f`, `#306230`, `#8bac0f`, `#9bbc0f` |
| golden-hour | `#1a1205`, `#4a3510`, `#8b6914`, `#d4a017`, `#fff8dc` |
| deep-sea | `#0a1628`, `#1a3a5c`, `#2d6187`, `#5ba4c9`, `#a8dce8` |
| arctic-night | `#0a0a14`, `#1a2a4a`, `#3a5a8a`, `#6a9aca`, `#cae8ff` |
| synthwave | `#120458`, `#7b2cbf`, `#e040fb`, `#ff6ec7`, `#fff59d` |
| vaporwave | `#1a0a2e`, `#3d1a5c`, `#ff71ce`, `#01cdfe`, `#fffb96` |
| forest | `#1a2e1a`, `#2d4a2d`, `#4a7c4a`, `#7ab37a`, `#c8e6c8` |
| sepia | `#1a1610`, `#3d3020`, `#6b5a40`, `#a89070`, `#e8dcc8` |
| blueprint | `#001830`, `#003060`, `#0050a0`, `#0080e0`, `#e0f0ff` |
| warm-print (size 0.25) | `#17121a`, `#824c50`, `#e09873`, `#f7ddb1` |
| electric-ink (size 0.4) | `#080717`, `#3c185f`, `#7e2278`, `#d9339f`, `#ff6b66`, `#aafae0` |

**Exact error-diffusion dither** (1-bit Macintosh, newsprint, crunchy editorial). Baked into a new file, because each block depends on error from earlier blocks; it cannot be a live filter.

| Algorithm | Character |
| --- | --- |
| Floyd-Steinberg | Balanced default, organic fine texture |
| Atkinson | Higher contrast, open, early-Macintosh |
| Jarvis-Judice-Ninke | Smoother gradients, 12-neighbour spread |
| Stucki | Smooth, slightly sharper than JJN |
| Burkes | Compact two-row texture |
| Sierra, Sierra Lite, Two-Row Sierra | Speed and texture trade-offs; compare frames first |

- Default: Floyd-Steinberg, black and white, block size 3 px (1–20), brightness 1 (0.5–2), contrast 1.2 (0.5–2), detail 0.1–1, palette 2–6 colours dark to light.
- SDR images and MP4 only; keep the audio; output BT.709. Reject PQ/HLG input.
- To reveal it, overlap the original and the processed file with identical framing and crossfade or wipe.

**Light leak** (one motivated memory beat, time shift or warm handoff). One rise, one peak, full recovery, over a fixed duration. Check the frame before, at the brightest point and after. Reject clipped faces, an unmotivated warm wash, visible black from the wrong blend mode, or a leak that hides the subject longer than the transition needs.

**Freeze-frame cutout** (speaker emphasis, chapter punctuation, scrapbook hold). Needs a real alpha matte; decoration must not hide a poor edge.

1. Extract the exact frame: `ffmpeg -ss <seconds> -i <source> -frames:v 1 freeze.png`.
2. Cut out the subject.
3. Check the matte over both a light and a dark plate before styling.
4. Animate the cutout in: from y 42 px, scale 0.86, rotation −2° to y 0, scale 1, rotation 0.4° over 0.5 s with a small overshoot.
5. Reject missing hair or fingers, halos, a thick outline or a flash that hides the reveal. If the matte is poor, pick another frame.

**Flash cut** (one high-energy cut or reveal; not a default transition).

- Outgoing shot: scale to 1.035 and exposure to 0.82 over 0.12 s, starting 0.16 s before the cut.
- Incoming shot: scale 1.1 to 1 over 0.42 s; exposure from 0.72 back to 0 over 0.24 s.
- Rise 0.035–0.055 s, recovery 0.24–0.38 s.
- One neutral or warm flash. Never saturated red, never a strobe, never more than one flash inside a one-second window.
- Avoid on calm long-form footage, already clipped highlights, UI that must stay readable through the cut, and accessibility-sensitive contexts.
- Grade each shot for its own subject first; the flash is not a substitute for correction.

### Cost

Blur, bloom and painterly smoothing are multi-pass and expensive. More than two full-frame multi-pass layers visible at once needs a playback check; simplify or pre-render if frames drop.

## 9. Fixing dark, flat or dull footage

Measure first, then correct, then verify by eye. The numbers are a starting point, not automatic neutralisation of intentional colour.

1. Sample 5 frames across the clip and read luma and chroma statistics:
   `ffmpeg -v error -i in.mp4 -vf "fps=5/<duration>,signalstats,metadata=mode=print:file=-" -an -f null -`
   Use YLOW (10th percentile), YAVG, YHIGH (90th percentile), UAVG, VAVG, SATAVG on the 0–255 scale.
2. Apply these rules:

| Problem | Test | Suggested correction |
| --- | --- | --- |
| Too dark | YAVG/255 < 0.28 and YHIGH/255 < 0.65 | exposure = (0.32 − YAVG/255) × 1.2 |
| Too bright | YAVG/255 > 0.72 and YLOW/255 > 0.3 | exposure = (0.68 − YAVG/255) × 1.2 (negative) |
| Flat | (YHIGH − YLOW)/255 < 0.35 | contrast = (0.35 − spread) × 0.4 |
| Shadows clipping | YLOW ≤ 16 | blacks +0.08 × share of frames affected |
| Highlights clipping | YHIGH ≥ 235 | whites −0.08 × share of frames affected |
| Warm or cool cast | warmth = ((VAVG − 128) + (128 − UAVG))/128, act when magnitude ≥ 0.08 | temperature = −warmth × 0.25 |
| Green or magenta cast | cast = UAVG + VAVG − 256, act when magnitude ≥ 10 | tint = −cast/512 |

3. Statistics do not recognise faces, white packaging, amber glass or intentional warm light. Look at the frames before trusting a suggestion.
4. "Dull" after correction: add one restrained look (Soft Boost or Bright Pop for social energy, Night Lift for dark scenes) rather than raising saturation alone.
5. Compare before and after sheets at the same timestamps. Keep the source if the result is not clearly better.

## 10. Cutouts (subject separation)

- Outputs: PNG for a still; VP9 WebM with alpha for video (about 1 MB per 4 s at 1080p); ProRes 4444 `.mov` for editing round-trips (about 50 MB per 4 s).
- Alpha video encode quality: CRF 30 for iterating, CRF 18 as the default, CRF 12 for masters and whenever the cutout sits over its own source.

| Behind the cutout | Result |
| --- | --- |
| A different scene (image, gradient, other video) | Works well |
| Its own source video (text behind the subject) | Fine at CRF 18; colour shift and edge halo at CRF 30; use CRF 12 for masters |
| A different take of the same person | Two overlapping people. Never do this |

- Text behind a subject: three layers, bottom to top: the source (or background plate), the text, the cutout. Start the cutout and its source at the same frame from time 0; mounting the cutout late lands it a frame off at the cut.
- To fade a cutout in, fade a wrapper around it, not the video element itself.
- A background plate made by inverting the mask has a transparent hole where the subject was; it is not a clean plate. Use it only when something else fills the hole. A room without the person needs an inpainting model (LaMa, ProPainter, E2FGVI).
- Test: will anything ever be visible through the subject's silhouette? If not, the cutout alone over a new background is enough.
- Always check a matte over a light and a dark plate. Reject missing hair or fingers and halos.

## 11. Plain ffmpeg recipes

| Task | Command |
| --- | --- |
| Keep a slice without re-encoding | `ffmpeg -i in.mp4 -ss 00:00:12 -to 00:00:20 -c copy out.mp4` |
| 16:9 to 9:16, centre crop | `ffmpeg -i in.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" out.mp4` |
| Join clips | `printf "file '%s'\n" a.mp4 b.mp4 > list.txt && ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp4` |
| H.264 proxy of an HEVC source | `ffmpeg -i in.mp4 -c:v libx264 -crf 18 proxy.mp4` |
| Exact frame as a still | `ffmpeg -ss <seconds> -i in.mp4 -frames:v 1 frame.png` |

- Inside a composition, trim by playing a sub-window of the clip and crop with a clip path; cut or crop a physical file only for assets leaving the pipeline.

## 12. Dropped from the source

| Dropped | Why |
| --- | --- |
| HeyGen sign-in, credits, credit limits, billing and host-gateway rules | Paid service; not used |
| HeyGen music catalogue and asset/icon search | Requires a HeyGen account |
| Avatar video, talking photos, image-to-video, lipsync, dubbing, translation, AI clipping | HeyGen-only; avatars are out of scope |
| Voice cloning and paid voices (HeyGen, ElevenLabs, Gemini TTS) and the ElevenLabs docs-narrator setup | Paid and/or cloning; out of scope |
| Google Lyria music generation | Needs a paid API key |
| OpenAI and Groq transcription API import | Hosted APIs |
| Codex image generation, local LTX video generation | Subscription or generated video |
| The `resolve` command, manifest, global cache layout, usage stats, telemetry and privacy notes, preference memory | HyperFrames tooling, not craft |
| HyperFrames attribute syntax (`data-automation`, `data-fx-chain`, `data-color-grading`, audio group elements), GSAP timeline rules, registry block install commands | Engine-specific; the underlying numbers are kept above |
| Hosted LUT CDN and LUT hosting steps | HeyGen infrastructure; the parametric settings are kept |
