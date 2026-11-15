Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), `.claude/skills/changelog-video/` (SKILL.md, references/build-spec.md, references/script-voice.md, references/visualization-registry.md), `.claude/skills/README.md`.

# Changelog video: structure, pacing and "show, don't list"

A recurring format: a weekly changelog (themes + items) becomes a 45–60 s branded video with voice-over, an animated brand background, mock-UI visualisations and a quiet caption rail. The reusable parts are the editorial budget, the visualisation routing, the two-layer script and the internal timing rules. They apply to any "what shipped" or feature-list video.

## 1. Prime directive: visualise, don't list

Every theme is illustrated by an **animated mock of the actual UI, or a faithful analogue, acting out the change**. Never text bullets. Route every theme through §3 BEFORE writing the script. A text checklist is the last resort, for items that are truly non-visual (reliability fix lists).

## 2. Editorial budget

| Part | Budget |
|---|---|
| Total | **45–60 s** |
| Title | ≤ 2 s |
| Themes | 4, about 9–12 s each |
| Outro | ≤ 3.5 s |
| Per theme | ONE hero visualisation + at most 3 spoken items |
| Whole video | ≤ 14 spoken beats, even from a 30-item changelog |

- Cutting is the job. Everything not spoken lives only behind the outro's "full digest" pointer.
- Theme order tells a story: **marquee feature → product surface → performance → reliability**.
- Per theme, write one line before scripting: `theme → surface → the 2–4 sequenced actions the mock performs, each tied to a script phrase`.

## 3. Visualisation routing

Classes, strongest first:

| Class | Use when |
|---|---|
| 1. **Recreate the UI** | the change lives in a surface we can mock faithfully |
| 2. **UI analogue** | no exact surface, but an honest UI metaphor (panel, meter, pipeline) whose behaviour IS the change |
| 3. **Terminal** | the change is a command or flag: type it, show the result |
| 4. **Checklist** | non-visual items (fix lists, dependency bumps). Last resort. |

- Never invent UI that implies a screen that does not exist. An analogue depicts the *behaviour* (speed, batching, caching), not a fake product page.
- If no surface fits and no honest analogue exists, it is a checklist scene.
- When a new surface is mocked for the first time, record its anatomy and choreography so the next video reuses it.

### Proven surface choreography

| Surface | Anatomy | Choreography |
|---|---|---|
| Editor / timeline | app frame with title bar, preview strip, ruler, lanes, playhead, labelled clips | clips drop and stack into lanes; a drag snaps to an edge or the playhead with an accent snap-line flash; marquee → group move → group resize; the playhead scrub drives the preview |
| Inspector / property panel | section headers in mono caps, key-value rows, hairline dividers, a dashed empty slot | a binding pill flies into a property slot; a value swaps by masked slide (old up and out, new up and in); a selection box draws on the canvas |
| Canvas + element | mini stage card, dashed selection box, live text | text updates on the SAME frame as the panel edit; an accent underline pulse marks the live-preview moment |
| Variant renders | small cards: display-font title + mono filename | cascade out diagonally, stagger ≤ 0.15 s |
| Storyboard | row of thumbnails with mono labels | thumbnails file in as a waterfall; one is dragged to reorder |
| Terminal | glass strip, mono 19–20 px, dim prompt | characters type at 0.02 s each; the result line lands after a 0.3–0.5 s beat |
| Render panel | header, big tabular frame counter, progress bar, status chips | bar and counter run on an accelerating (cubic-in) curve: slow → fast reads as "faster"; chips land on their VO words |

### Proven analogues

| Change | Analogue | Behaviour |
|---|---|---|
| Colour grading | slider rows beside footage art | each knob move re-filters the art on the same frame |
| Render / extraction speed | render counter + bar | the ease tells the story; add a before/after time chip when the claim is numeric |
| Batching | a row of small ticks | brackets draw around groups; ticks nudge into clusters |
| Caching | two identical request rows | the first runs a full bar; the second short-circuits instantly to a tick with a "cache" chip |
| Import / translation pipeline | source card morphs or docks into a result card | staged: source card → flight of extracted chips → assembled result; the chips are the carriers |
| One-pass / dedupe | N parallel rows collapse onto one lane | rows glide onto one bar; a count chip decrements |
| Concurrency cap / lock | a queue of chips entering a gate | the first k pass, the rest hold; a gate chip shows the cap |
| Error surfacing | the surface's corner grows a toast | the action fails subtly → toast slides in with a mono reason |

### Checklist scene (last resort)

One card, **≤ 6 rows**, a tick landing on each item's VO word (back-out overshoot 1.5, 0.3 s) plus a row brightness pulse. Items beyond 6 are cut.

## 4. The two-layer script

The script is the single source for both voice and captions. Each token has a **display** form (standard spelling and punctuation, shown in captions) and, where they differ, a **spoken** form (phonetic, read by the voice). A caption showing "jay-sawn" and a voice reading "JSON" letter by letter are both build failures.

### Register

- Conversational, not release notes. "The big one this week" beats "Theme 1:". Contractions welcome. Second person allowed.
- Informational, never salesy. No superlatives the changelog does not earn.
- One breath per beat: sentences **≤ ~14 words**; punctuation paces the read.
- Numbers with meaning stay ("fifteen releases"). Commit hashes, PR numbers and version micro-detail are never spoken.
- Open with the week and the marquee. Close with the digest pointer.
- **Teach the simple command.** When a feature has a one-line invocation, the script says it verbatim and the mock shows it being typed: the command is the visible CAUSE of the result. A slash command is spoken "slash name" and captioned `/name`.
- One line = one caption phrase, ≤ ~40 characters of display text.

### Phonetics for plain-text TTS

| Case | Rule | Example |
|---|---|---|
| Initialisms (each letter said) | space or hyphen the letters | CLI → "C L I", API → "A P I" |
| Acronyms said as words | respell phonetically | JSON → "jay-sawn" |
| Mixed, pronounceable compounds | hyphenated lowercase phonetics in one run; never spaced capitals (they come out as letters with hard stops) | OAuth → "oh-auth", WebM → "web em" |
| Versions and numbers | expand, or better, do not speak versions | 1080×1080 → "ten-eighty by ten-eighty" |
| URLs | spell the dots | "example dot com" |
| File extensions | spell out, or rephrase so the extension is not spoken | .mp4 → "dot em pee four" |
| Emphasis and pauses | commas and em-dashes; never capitals; ellipses are unreliable | n/a |

- Keep a shared display → spoken lexicon. Check it for EVERY technical term.
- A term not in the lexicon: ask how it is pronounced, then add it. Never guess; never ship unheard. Listen to a new entry in the generated voice before accepting it.
- When candidates are close, generate A/B takes of the real sentence and pick by ear.

### Timing

- **The audio is the clock.** All beat times come from the voice's real word timestamps. A voice regeneration re-opens every seam.
- **Word timings are a hard gate.** If the voice step returns audio without per-word start and end times, do not proceed: force-align the audio against the display script with a local speech model. The aligner supplies timestamps only; captions still use the display spelling.
- Resolve every mismatch between the heard word and the expected spoken form before trusting the captions.

## 5. Scene anatomy and internal timing

- Persistent chrome: a kicker chip top-left (series name + date range) and progress dots top-right, one per theme, switching at each cut.
- Title (≤ 2 s): date kicker, large headline, an accent rule sweep.
- Theme scene: a numbered section chip (`0N · THEME NAME`), a headline, and the mock filling the remaining area.
- Outro (≤ 3.5 s): "full digest" kicker, a short line, accent rule, URL chip. Fade everything, chrome included, ~0.5 s before the end.
- Safe margins: 7% of the frame on every side (76 px on 1080).
- **Every ordinary seam is cut-the-curve LEFT.** The outro may use a softer entry (8% travel instead of 10%).
- Each scene's shell (chip, headline, mock chrome, initial state) is **already composed on its first frame**; the seam flies it in.
- Internal reveals start **≥ 0.4 s after the cut** and end **≥ 0.45 s before the next cut** (the exit begins 0.34 s before the cut).
- Every internal beat lands on a VO word.
- Name each scene's sustained-motion route: sequenced UI life for mocks, staged reveals for checklists.
- **One accent-colour moment per scene.** The accent is rationed.
- Dim text never below 0.66 opacity over a dark glass card (contrast under 4.5:1 otherwise).
- Background music sits at about 0.14 volume under the voice.
- An animated background pattern is darkened hard (saturation 0.72, a 50% black overlay) plus a light scrim; raw, it is far too loud.

## 6. Gates before presenting

1. Build check clean; scene content stays out of the caption rail.
2. Every seam passes the seam checklist (`continuity.md` §6).
3. Spot-check 3–4 beats on stills.
4. After a render, verify frames from the file itself: captions present, background not black, no tiny or frozen frames.
5. **Caption presence is a hard gate:** sample 3–4 frames spread across the spoken span and confirm caption text in each.
6. Start every run from the format's own scaffold and assets, never from a previous video's project. Copying an old project is the most common way a recurring format drifts off-brand.

## 7. Anti-patterns

| Don't | Instead |
|---|---|
| Bullet-point slides for UI changes | Mock the surface acting out the change |
| Fake UI for items that cannot be represented | An honest checklist scene |
| Technical terms as plain text in the TTS input | Lexicon spoken forms; display stays standard |
| Phonetic spellings in captions | Captions always render the display layer |
| Guessing an unknown term's pronunciation | Ask, then grow the lexicon |
| Speaking every changelog item | ≤ 3 per theme; the digest link carries the rest |
| The accent colour everywhere | One accent moment per scene |
| Starting from a prior video's project | The format's own scaffold, always |
| No word timings → ship without captions | Force-align the audio; captions are non-optional |

## 8. In Motionhaus

- Surfaces map to `code` (terminal), `spotlight` (UI with cursor), `svg` (analogues: ticks, gates, pipelines), `stat` (counters), `steps` / `features` (checklist, last resort).
- The lexicon is our `pronounce` respellings; the display layer is the `vo` text that feeds captions.
- "Shell composed on frame 0, reveals ≥ 0.4 s after the cut" is the working form of the Z sign rule: nothing grows in from small under the transition window.

## 9. Conflicts with Motionhaus rules

- **Conflict:** 45–60 s, square 1080, 4 themes of 9–12 s. Motionhaus shorts are 30–38 s vertical with 5–7 scenes (62–84 VO words); long-form is ~2 minutes 16:9.
- **Conflict:** every ordinary seam is the same cut-the-curve LEFT. Motionhaus rotates transitions per style and warns on repeats.
- **Conflict:** captions are a hard gate on the render. Motionhaus long-form ships with no burned-in captions and an `.srt`.
- **Conflict:** a title card of up to 2 s opens the video. Motionhaus opens on the hook with line 1 on screen at frame 0 and no intro.
