Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), skills/hyperframes/references/captions.md, overlays.md, types/vertical.md, assets/frame-presets/*/caption-skin.html.

# Captions

Motionhaus caption presets (`style`, `slam`, `bigKey`, `pill`, `sweep`, `underline`) are listed in `skills/short-styles/references/motion-vocabulary.md` §6. These are the rules a preset must obey.

Conflict: HyperFrames adds captions only when the request or source calls for them. Motionhaus burns captions into every short and reel, and ships long-form with an `.srt` instead (cues ≤ 2 lines of 42 characters).

## 1. Words and timings

- Work from per-word timings: `{text, start, end}` for every word.
- **One word per timed entry.** Match transcript words to caption words by position, not by text, or a repeated word takes the wrong time.
- Read the transcript before using it. More than 20% music-note or garbage tokens, or nonsense words, means it failed: retry with a larger model or get the text from the user. Drop non-word tokens before grouping.
- English-only speech models *translate* other languages into English: pick a multilingual model and set the language for non-English audio. Use a larger model for speech over music.
- Speech-to-text invents "Thank you." over silence and repeats lines over a silent tail. Drop words that start inside a final silence (threshold −35 dB for ≥ 0.6 s; real speech sits around −16 to −26 dB).
- Footage may already carry burned-in subtitles mid-clip: scan a 1 fps contact sheet before placing captions.
- A transcript's last word can end past the media: clamp to the file's real length.

## 2. Groups

| Energy | Words per group |
|---|---|
| High | 2–3 |
| Conversational | 3–5 |
| Calm | 4–6 |

- Break at a sentence end, a pause of ≥ 150 ms, or the word limit.
- **One group visible at a time.**
- A group opens at or before its first word's start and closes at or after its last word's end. In the preset skins a group ends at the earlier of the next group's start and its own end + 0.3 s.
- A caption at exactly 0 s looks pre-existing: start 0.1–0.3 s in.
- Exit: fade 0.12 s (cubic in), then a **hard kill** (fully hidden) at the group's end, so a stale group can never stay on screen.
- Fade the group or its words, not both: the opacities multiply and read as a pop.

Conflict: HyperFrames groups are 2–6 words. Motionhaus `style` shows 3 words a page and `slam` shows one giant word at a time.

## 3. Fit and place

- Size each group to fit its width: max width 1600 px landscape, 900 px portrait; base size 78 px, minimum 42 px, step down 2 px at a time. When a word scales up for emphasis, divide the max width by that scale.
- Lay out as a full-width container with centred text. Centring by a 50% offset clips at the frame edges.
- Never clip overflow on the caption box: it cuts off scaled words and glows.
- Landscape: 80–120 px from the bottom. Portrait: about 600–700 px from the bottom. Inside the 80% title-safe box. **Never over the speaker's face.**
- Burned-in captions on vertical sit at the bottom of the content band (above y = 1330 on 1080×1920; `story.md` §9).
- Position each group absolutely over the same band. In a flowing column a hidden group still takes space and the next one lands lower. In a stack that accumulates, groups in one block share one exit time or the stack reflows.
- A gradient or clipped-text fill goes on the inner text, not on the element being scaled or moved.
- Scenes that reserve no caption band (full-frame code, charts) must inset their content when captions are on.

Conflict: HyperFrames puts portrait captions ~600–700 px from the bottom (y ≈ 1220–1320) and never over the face. Motionhaus runs the caption band from ~72% of frame height (y ≈ 1380) and the `headshot` style puts captions on the face.

### Over footage

| Brightness behind the text (0–255) | Treatment |
|---|---|
| under 60 | screen blend |
| 60–180 | overlay blend |
| over 180 | normal blend, opaque colour |

Plain subtitles above brightness 60 get a scrim sized to the text (30–40% black), never a full-width bar.

## 4. Karaoke skin (three states)

Every preset skin uses the same structure; only the paint changes.

| State | Look |
|---|---|
| Upcoming | faint ink (about 40% ink mixed into the card colour) |
| Active | full ink on the accent mark: a block, chip, underprint or underline |
| Spoken | solid ink, mark cleared |

- The active mark must not shift layout: paint it as a spread or underline outside the text flow, never as padding that reflows the line.
- Card max width 80% of the frame (92% on portrait). Line height ~1.12. Default band: top at 83% of frame height, 17% tall, on landscape.
- Word pop on activation: scale 0.86 → 1.
- Pick the pop to match the look:

| Look | Pop |
|---|---|
| Loud (neobrutalist, poster, picture book) | 0.16–0.2 s, back-out overshoot 2.0–2.6 |
| Quiet (editorial, catalogue, consulting) | 0.16–0.2 s, quad out, no overshoot; the mark is a hairline underline or soft wash |
| Flat graphic (risograph, protest poster) | 0.1 s, quart out, hard square block |
| Mid (magazine, museum) | 0.14 s, cubic out |

- Optional per-word classes: brand / key term (heavier ink or hairline underline), numerals (the body or mono face, slightly recessed), call-to-action (a thick second-accent underline).
- The caption skin takes only the look's tokens: ink, canvas, accent, second accent, display face, body face.

## 5. Text behind the speaker

- Layer order: video → captions → a cutout of the person. Shake or punch in the video and the cutout together in one wrapper.
- A big word behind the head reads best **30–55% covered**. Under ~15% it floats; over ~65% it is eaten.
- Re-lay out when a content word is 80% covered, or two adjacent words are 50% each.
- Measure the rendered word boxes against the matte over each caption's own time window. Heads move (one clip went from y = 224 to y = 96 in 8 s), and estimates from character widths were wrong both ways.
- Matting models drop mic arms, let large rigs near the body leak in, and flicker on held objects: check the matte.

Motionhaus equivalent: `photo` with `behind` + `cutout` (motion-vocabulary §5b).
