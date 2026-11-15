Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), `skills/style-sampling/` (SKILL.md, references/remix.md).

# Style sampling: a new episode in a proven style

**Read this first: what the source does and does not contain.** The HyperFrames repo ships only the *method* for making an episode from a style template. The five templates themselves (each style's look, structure, pacing numbers, component list, sound rules) are paid downloads fetched from HyperFrames's server at run time and are **not in the repository**. Nothing below invents them. Per style, this file records every fact the repo states, then a clearly labelled Motionhaus starting point that is our own inference. To get real pacing numbers for a style, measure a reference episode with `reverse-a-video.md` and fill in the style sheet in §3.

## 1. The goal

A good episode is one the series' own viewers would take for the next upload: its structure, pacing, look, graphics and sound, on a new topic, in our voice.

Hard rule: **never use a creator's face, voice, footage, logo, wordmark or show name.** The styles were learned from other creators' channels; their names, faces, voices and work stay theirs and never appear in an episode or in what is said about it.

Source credit (kept here, in an internal reference, only): the Collage Explainer learned from Vox ("America, Explained"); the Finance Explainer from Xiao Lin Shuo ("Understand It in One Go"); the Animated Science Explainer from Kurzgesagt; the 3D Brand Explainer and 3D True Crime from Fern.

## 2. The five styles: what the source states

| Style | Makes | Language / presenter | Brings |
|---|---|---|---|
| **Collage Explainer** | an explainer on one American policy or history question | English, voice only | voice |
| **Finance Explainer** | a host explains one country, commodity or institution thoroughly | Chinese in the original, on-camera host | voice and face |
| **Animated Science Explainer** | a fully drawn science explainer | English, voice only | voice |
| **3D Brand Explainer** | a breakdown of a brand or a design, in one graphic world with real 3D | English, voice only | voice |
| **3D True Crime** | a reconstruction of a hunt or a closed case, in a dark 3D world | English, voice only | voice |

That table, plus the names, is everything the repo says about each look. Stated structural facts that apply to all five:

- An episode has a **cold open, a title beat, chapters and an end card**.
- A series has its own **runtime**, its own **speaking rate** (words per minute), a **script anatomy**, a **caption skin** and a **title look**.
- A series is built either from a fixed **component set** (each component documented with the creator's own use of it) or, for a drawn series, from a **drawing style sheet and a drawing engine**.
- Every style lists the topics it is good for and not good for.

### Motionhaus starting points (our inference, not from HyperFrames)

| Style | Nearest Motionhaus tools | What we would still have to define |
|---|---|---|
| Collage Explainer | `vox` style; `photo` collages (taped prints, one per beat), `document`, `quote`, `stat`, `maskBrush` / `paper` transitions, `tag` hook | cut rate, paper textures, map and archive-photo rules |
| Finance Explainer | `headshot` layout (presenter panel) with `stat`, `flow`, `clip` grammar `t3_finance_chart`, `svg` charts | presenter framing rules, chart grammar, chapter length. Note: the own-voice/headshot route is currently dropped in Motionhaus. |
| Animated Science Explainer | `svg` scenes (drawn objects in motion), `toybox` style, `clip` grammar `y3_whiteboard`, art-engine cutaways | a flat drawing style sheet, character rules, palette per topic |
| 3D Brand Explainer | `3d` style, long-form `shapes3d` backdrop and `sceneCamera`, `spotlight`, `cube` / `flip` transitions | the single graphic world, 3D asset rules |
| 3D True Crime | `3d` style with `noir` grade, `letterbox`, `document`, `clipping`, `log`, `freeze` hit, `spotlight` fx | dark-world lighting, map/timeline grammar, tone rules |

## 3. What a style definition must contain

The template's file set is a checklist for a complete Motionhaus style reference. A style is not defined until each row has an answer.

| Part | Holds |
|---|---|
| Channel sheet | identity, caption skin, title look, rights rules |
| Series sheet | what an episode is, its runtime, its slots, topics it suits and does not suit |
| Process | the ordered steps for making an episode, with defaults (chapters, language) |
| Voice | register, script anatomy, script statistics at the series runtime, target words per minute |
| Frame | layout and framing rules |
| Editing | every component, each with the creator's own precedent for using it; presenter cut rules |
| Footage | what to show for each kind of line, and where to source it |
| Sound | music cues, sound effects, loudness |
| Kit | starter project, tools, fonts, sounds, assets |
| Drawn series only | a drawing style sheet and a drawing engine instead of components |

## 4. Making the episode

Order: read the style → settle the voice → say what is coming → ask only what is open → facts and script → **stop 1 (storyboard)** → voice → face → footage → shot plan and build → checks → **stop 2 (draft)** → render → reply.

### Read, in this order

1. The channel sheet.
2. The series sheet. If the topic is one the style is not good for, say so in one line and offer the nearest angle that fits. Never offer to make the unfit topic anyway.
3. The process. Its step table IS the process: follow it in order, skip nothing.
4. The kit's tools.
5. Every other sheet when a step points to it.

When the style's own sheet and this method disagree, the style wins, except on the length the person picked.

### Ask once

Ask together, once, only what is still open: topic, length, voice, and (presented series) the face.

- **Settle the voice before any research.** Nothing else starts until it is settled. A voice is used only when it is the person's own, its owner agreed to this film, or it is a stock voice. Having an identifier for a voice is not permission. Credit an AI stock voice as AI-generated.
- **Then say what is coming** in one short message that is not a question, and carry on: working title and hook, length, roughly how long it takes.
- **The length is the person's and it beats the series runtime.**

| Asked for | Cut |
|---|---|
| nothing, or "short" | **about 1 minute**: cold open, title beat, one chapter, a short end card. Offer the longer cut in the reply. |
| 2–4 minutes | the style's short cut |
| a full episode | the series' own runtime |
| a number ("90 seconds", "5 min") | that length |

- Scale everything to the chosen length: script words (from the style's script statistics at that runtime), facts, sections, music cues, review rounds (**one for a minute, two for a full episode**). Never pad or trim toward the series runtime.
- Credits name only who the person names. A role nobody named is left out.
- Record every default taken, and the length, with the reason, in the project's notes.

### Facts and script, then stop 1

- Facts first: every number, date and quote with its source.
- Write the script to the style's voice sheet and script anatomy; run the style's script checks.
- **Stop 1: the storyboard.** One still per beat with its line under it, what each shot shows and which component makes it. Never pay for a voice to get a board: use estimated timing at the series' pace. Every time on the board is an estimate until the voice exists; say so. Wait for a go.

### Voice and face

- **Audition before the whole script:** voice one paragraph, measure words per minute, and set the voice speed to land on the series' rate. Past the allowed speed range, change the words instead.
- Voice the script once. Re-voice only the paragraphs that changed.
- The voice is final before any presenter take. A line changed after the presenter take exists means the whole take is made again, or the lips drift.

### Footage, shot plan, build

- Source footage only from places with stated licences (Wikimedia Commons, Openverse, US National Archives, Library of Congress, Prelinger Archives, Pexels, Mixkit, official media). Check each clip's own licence; some stock clips are restricted.
- A site that refuses automated access: move to another source. Never work around the check.
- Every file gets a licence line in a record. Credit what needs credit.
- Never take footage from YouTube, TikTok, Instagram or X unless its licence is stated. Searching what existing videos on the topic cover is research; nothing is downloaded.
- A real brand's logo or sign, and screenshots of web pages, appear only under terms that allow it. Otherwise crop it out, cite the page as a source line, or leave it out, and say so.
- **Before adding any graphic, find the creator's precedent for that kind of moment in the style's editing sheet. With no precedent, do not add it.**
- A component the style lacks: use the closest one and log the gap.
- Keep the style's own files unmodified.

### Checks, stop 2, render

- One heavy job at a time (renders, long encodes, transcription). For a change, re-render only that window.
- Before a render likely to pass 20 minutes, say roughly how long; report elapsed time while it runs.
- **Report each of our numbers beside the series' own:**

| Measure | Meaning |
|---|---|
| Cuts per minute | editing rate |
| Pause density | how often the voice pauses |
| Longest hold | the longest stretch with no picture change |
| Loudness | integrated level against the series' |
| Sound effects on picture changes | share of cuts that carry a sound |
| Script fingerprint | the script's statistics against the series' script anatomy |

- Name every check that failed.
- **Stop 2: the draft.** Ask once, with a contact sheet and a preview, and name everything that is still a stand-in.
- Then exactly one full render.

### Reply and hand back

- Say what the episode is, its length (and that the full episode is one ask away, for a short cut), every stand-in, every failed check and why, and the footage licence table.
- Keep a step log (each step and how long) and a gaps log (where the style was missing, unclear or wrong, with file and section). The gaps log is how the style gets better: never skip it.

## 5. Routing

- The person named a style, or the topic fits only one: go on with it. Otherwise list the styles (name, what it makes, what the person brings), name the one that fits, and wait for the pick.
- A style that is none of these (a channel or film they link or name): offer two routes. (a) Rebuild a short video frame by frame, then give it their content (`reverse-a-video.md`). (b) Make a new film on their topic that takes that style's grammar. Both need an actual video; a style that is only named gets a request for one example.

## 6. Conflicts with Motionhaus rules

- **Conflict:** HyperFrames says creators' names never appear in what the person is told about an episode. Motionhaus has an edit style named `vox`.
- **Conflict:** HyperFrames lists Pexels and Mixkit as footage sources. Motionhaus `shorts photos` searches only Openverse and Wikimedia Commons and accepts only CC0, public domain, CC BY and CC BY-SA.
- **Conflict:** the default length is about 1 minute with the series runtime as the full cut. Motionhaus formats are fixed: shorts 30–38 s and 62–84 VO words; long-form 1:50–2:20 and 300–330 words.
- **Conflict:** "with no creator precedent for a graphic, don't add it" (fidelity to one style). Motionhaus pushes the opposite direction: `shorts designs` favours designs never used and warns on repeats across the last three videos.
- **Conflict:** the Finance Explainer needs the person's own face and voice. Motionhaus dropped the own-voice / clone / headshot route and uses a stock voice.
