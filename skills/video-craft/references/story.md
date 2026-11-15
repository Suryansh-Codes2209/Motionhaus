Adapted from HyperFrames (heygen-com/hyperframes, Apache-2.0), skills/hyperframes/SKILL.md, references/story.md, storyboard.md, storyboard-format.md, film.md, format.md, references/types/*.md.

# Story

Read before scripting any video that tells something over about 15 s. Most weak films are good motion around no story: a feature list, three cards in a row, a logo, a URL. Skip this for an edit to an existing video, captions on footage, or a single-idea piece (one kinetic line, one map move). When the user gave a script, storyboard or reference film, follow theirs.

Motionhaus-specific rules (anchors, retention, pacing shapes, style rotation) stay in `skills/short-styles` and `skills/long-form`; this file is the craft underneath them.

## 1. The one thing

- **What it is**, one line: "You can now …" (launch), the one idea the viewer must understand (explainer), what changed and why it matters (changelog / PR). A whole release ("2.0", "what's new") is not one thing: take its headline.
- **The one thing to remember**, in the viewer's words, not the brand slogan.
- **One viewer doing one real task**, from the moment they need it to the result. That task is the spine. One real piece of data (a query, a file, a prompt, a number) travels through it from hook to payoff.
- Keep facts (what it does, real numbers, real labels) apart from creative choices (angle, tone, look). Every claim traces to the source. Use the maker's own copy verbatim.
- What the source does not say stays unsaid. Never derive a claim ("40 min to 2 min" is not "20× faster"). Mark an example number as illustrative. A screen you cannot get is a labelled placeholder ("Screenshot: Settings → Motion"), never a drawn one.
- Show real things from their source (the product's screens, the brand's logo, a real place's imagery); draw only what has no source.
- Build what was asked: no extra aspect ratio, voice or captions the request does not call for. A question or a loose idea gets an answer or a proposal, not an edit.

## 2. Three storylines, then one

Sketch five or more ideas, one line each, pairing a **device** with a **form**. Drop those the subject cannot carry. Keep the three that differ most; make one the bold one you would not have picked first. They are three different films, not three titles for one: each has its own world, device and form.

Each storyline states: name; device + form; two sentences on what the viewer sees and feels; the first two seconds, exactly; beats in one line (`hook → … → end card`); look in one line (ground, type, one material); sound in one line.

- Words only: build nothing until one is picked.
- Pick for story: the one a stranger would follow and remember, with people or a situation they know, ahead of the most striking picture.
- Put the recommendation first with a one-clause reason. Save all three (e.g. `STORYLINES.md` in the episode folder) so a later turn can switch. A mix ("A's opening with C's middle") is one storyline.
- If the user asked for the file / no stops: build the recommendation and name the other two in one line each.
- State assumptions in one line: length as a range, aspect, music or voice, anything paid with the free option beside it.

Conflict: HyperFrames stops once for the user to pick a storyline. Motionhaus `launch-video` says "Don't ask questions unless the URL is missing; pick sensible defaults and state them."

| Device | What the viewer sees |
|---|---|
| A moment in someone's day | a person, a time stamp, the message that creates the need ("launch is tomorrow") |
| A character does the work | a mascot or cursor carries, drags, draws and reacts; every cut has a cause |
| The feature as the hook | the feature happening to a recognisable image in the first half second |
| The result first | the finished output plays, then the camera pulls back to where it came from |
| One object across apps | the thing being made travels from one app into the product |
| Life before and after | the old way as a scene (one person drowning in tabs), then the new way |
| Type carries the argument | giant kinetic type, colour fields and grids that cut on the beat |
| A number lands | one real number earned by a scene, then made physical |
| A question with the input | "What if you could make a video from your ⟨website⟩?", the blank filled by a real input |
| The object is the explanation | a machine or model whose working is the idea; the camera tours through it |

| Form | What the viewer sees |
|---|---|
| One continuous take | the camera never cuts; it pushes, pulls and travels between worlds |
| Object-to-object chain | every shot ends on the thing that opens the next: button → card → phone |
| An endless zoom | the camera dives into a detail that turns out to be the next world |
| A flight through one world | a 3D set, a map or a desk; each idea is a stop on the route |
| Cut on the beat | hard cuts on the music, type and colour fields changing every half beat |
| Match cuts | one shape holds while everything around it changes (circle → lens → wheel → logo) |
| Split screen to one | several panes play, then collapse into the one that matters |
| One frame that rebuilds | a single composition keeps rearranging itself and never leaves the frame |

- A pitch where all three are plain cuts between scenes has not tried the forms.
- Before/after: the new side moves calmly while the old side churns. Never mock a named competitor.
- A recap asks one question first so each piece answers it.

## 3. The hook

- The first two seconds are the densest of the film. Frame 0 is the thumbnail: never black, never a logo alone.
- Open on one of: the feature working on something recognisable; a real moment that creates the need; a question with the input inside it; a sentence whose last word becomes the picture; the bug itself.
- Then let the old way fail on screen (the wait, the wall of text, the wrong result) before the product brings relief. The proof is often the same shot improved in front of the viewer.
- Typing into an empty prompt box as the opener is the tell of a generated film; a few seconds in, as a story step, it is fine.
- The viewer decides in about one second: the change or the question arrives in the first beat, and the picture carries the hook without sound.

## 4. Beats

Launch shape for about 35 s; scale it, and let the device bend it.

| Beat | Share | Job |
|---|---|---|
| Hook | ~8% | the world and the need, or the feature already working |
| Tension | ~12% | the old way failing on screen, or a gag |
| Reveal | ~8% | the product or idea named as a title, 20–30% in |
| Proof | ~40% | the real task in the real UI as 3–6 verbs (*paste, pick, watch it build, ship*), one each |
| Payoff | ~20% | the output arrives, already moving: the biggest visual moment, once, 60–80% in |
| Claim | ~8% | the one thing, in one line |
| End card | ~8% | the mark carried in; name and call to action land and hold 2–3 s |

- In each verb beat keep only what the cursor touches and what proves the line; delete the rest of the screen.
- The process runs fast; the payoff plays at normal speed. Hold 0.3–0.75 s before the payoff.
- Length follows the story (feature launch 20–45 s, explainer 30–90 s). A requested length is a range, never padded.

Conflict: HyperFrames puts the brand mark once, on the end card (last 5–10%), with the name as a title 20–30% in. Motionhaus `launch-video` puts a `logo` scene second ("the drop") and shows a series badge throughout shorts.

## 5. Worlds

- A film visits several worlds, each with its own background, light and scale (a desktop, the product on a brand ground, a white void with a character, live action). Never one dark canvas with small UI floating in it.
- Enter each world through an object already on screen: the thing clicked becomes the next shot.
- Keep one home stage to return to, one carrier the eye follows, and the palette and type constant across worlds.

## 6. Copy and voice

- Titles: at most 6 words a line, one line on screen at a time, no trailing periods. Explainer lines may run to about 10.
- Hold: 0.5 s + 0.3 s per word; the last line at least 2 s.
- Show, don't list: no bullet slides, no three-card rows. When similar things repeat, each gets its own idea and layout.
- Real numbers only. The first line is never "Introducing", "Meet" or the logo (after the pain, "Introducing X" is fine). Never "unlock", "seamless", "supercharge", "game-changer", "revolutionize", "effortless", or "in seconds" unless measured.
- Two tests: read the lines alone, a stranger gets the pitch; watch the pictures alone, they tell the same story.
- With a voice, the screen never repeats the spoken sentence word for word. Lines read as cause and effect ("so…", "which means…"), not slogans.

Conflict: HyperFrames adds a voiceover only when the request calls for one; otherwise titles and the product's own text carry the words. Motionhaus gives every scene a `vo` line and sets scene length from it.

Conflict: HyperFrames bans three-card rows and feature lists as cards. Motionhaus `launch-video` has a `features` scene (3–4 cards) and `steps`/`tiles`/`bento`; `long-form` already caps card scenes at 2.

### Script pacing (narrated)

- TTS reads about 2.2 words a second.
- A scene: about 19 words (9 s). At most two scenes may reach 26 words (12 s).
- 30–90 s: about 155 words or fewer. A whole film: about 400 at most.
- A VO longer than its visuals makes the visuals pad with idle drift. Trim the script; never stretch the motion.
- Everything on screen in the first quarter of a scene, then frozen, reads as a slideshow. Reveal each piece when the VO names it, across the back half of the scene. Write the VO as separate phrases so it has cue points.
- TTS reads `@handles` aloud: speak names.

Conflict: HyperFrames caps 30–90 s at ~155 words (2.2 w/s). Motionhaus `long-form` scripts 300–330 words for ~2 min in 12–14 scenes (about 23–25 words a scene); shorts use quick cuts ≤ 8 words and holds ≥ 22.

## 7. The brand

- The mark lands once, with weight, usually on the end card. Before it, the brand shows only inside the product and the story, never docked small in a corner.
- The end card is built, not a still: the mark is carried in, typed or wiped in; the cursor clicks it and a fill rises through it. Lockup 15–30% of the frame width, centred, in the last 5–10% of the film. Then the call to action (a real button, the command to type), held 1.5–3 s.
- The accent colour is rationed: one highlighted word, the payoff, the end card.
- Logo, icons and fonts are the brand's own files; never redrawn from memory, never a coloured square for an app icon.

## 8. Tells of a generated film

- every scene entering the same way, or the same move beat after beat;
- side-by-side panels and floating cards standing in for a scene;
- titles that keep sliding or shrinking after they land; breathing or floating loops standing in for motion;
- plus the visual defaults banned in `look.md`.

After a first render: name each tell on screen, take the replacement from the subject, the brand or the medium, and add it to the film's BANNED list (`look.md`).

## 9. What each kind of video needs

### Launch, promo, feature (20–45 s)

- What gets shared is real people and real output: effects-heavy pieces drew about a tenth of the views of ones built on a real result.
- **Real UI, never a mockup.** One invented button loses everyone who uses the product. Source order: the user's recording or screenshots → design frames rebuilt as real states → walking the flow yourself → a capture of the feature's page → code/docs to confirm today's labels.
- A feature with nothing visible (speed, an API): the real UI that exposes it, a real analogue the viewer knows, real terminal output, or a checklist of real facts. Never a made-up dashboard.
- Captures establish what is real; they are not a shot list. Do not substitute a sequence of full-page screenshots with titles for showing what the product does.
  1. **Establish the workspace**: enough real navigation to locate the task.
  2. **Isolate the action**: bring the relevant chart, field or result forward at 1.6–2× its real size, with its real labels and values; text stays ≥ 26 px at 1080p after any push. Let a trace draw, a result populate or a panel open before advancing. A camera move over a frozen screenshot is not the product acting.
  3. **Return the result**: carry the component back into its place, or pull back to where the output is used. Floating close-ups alone lose the system. Do not imply an interaction the product does not support.
- Keep a short explanation where the action needs one. "Less text" does not mean removing the context needed to understand the evidence.
- Camera cycles between the window on its ground, one pane, and a punch-in on one control: moves of 0.4–0.6 s with motion blur, arriving at the control the cursor needs, then holding while the UI acts.
- Containers morph instead of cutting: the button becomes the menu, the message becomes the bubble.
- The cursor is big (4–7% of the frame), enters from off-screen, and its click causes the next thing on the same frame.
- Never a small window in the middle of an empty canvas; never product UI tilted in 3D.
- Tells: typing into a prompt box as the opener; a feature list as three cards; a title over a dimmed screenshot; an invented dashboard; the logo docked in a corner.

### Explainer, tutorial, "how it works" (30–90 s)

- Spine: one concrete example worked through start to finish, not a tour of facts.
- **Ground it first.** Start where the viewer already is: a person, place or situation they know and a question they would ask. The abstract device enters inside that situation as the answer, and the film returns to the person at the end. A film that opens on the device alone is a diagram.
- Devices: the object is the explanation (cutaways, exploded view, a dive into the part that matters); one diagram that grows, one part per beat as it is named; continuous transformation (a bar becomes an axis, a dot becomes a population); one real input travelling through every step.
- **Pick the shape of the line first, then the picture**, so similar lines get different pictures:

| Shape of the line | Picture (Motionhaus scene that fits) |
|---|---|
| a number that lands | `stat` |
| a myth turned over (wrong idea struck through, right one printed over) | `type`, `versus` |
| before and after | `versus`, `photo` |
| many things converging into a few groups; a network that densifies; one chosen out of many | `svg`, `flow`, `stack` |
| steps in order | `flow`, `steps` |
| a real screenshot with the detail circled | `screenshot`, `spotlight` |
| a quote set as a poster | `quote` |
| a chapter card | `type`, chapter chip |

- Narrated: reveal each part when the voice names it. Not narrated: large lines, up to about 10 words.
- Labels sit on the part they name (leader line if needed) and appear with it. No legends, no bullet slides.
- Check the science or logic of each step before animating it; a beautiful wrong diagram is worse than none. One data module drives every figure so numbers agree.
- End on the one idea in one line.
- Tells: a slide of bullets; icons in circles; three cards in a row; the whole diagram at once; a narrator repeating the on-screen text word for word.

Conflict: HyperFrames ends an explainer on the idea with no brand end card unless asked. Motionhaus always ends with an `outro` ("Follow for tomorrow's launch") and, on Instagram, a share prompt.

### Numbers, charts, data

- One number at a time, earned by the scene before it, then made physical (a count becomes a skyline, a share becomes a crowd).
- The number is the biggest thing on screen. Tabular figures so a count-up does not jitter. Count-up 1.2–1.6 s, then hold, landing on a downbeat or a hard stop.
- Real data only, rounded the same way everywhere, with a small source line on screen.
- Build a chart in reading order: frame and axis → a reference line → the data drawing in → one annotation on the point that matters. Annotate on the mark; no legends.
- Highlight one series, grey the rest. A chart with one thing to say says it in its title.
- The same object carries across beats: a bar becomes the ground of the next scene, a line becomes the road the camera follows.
- Tells: a grid of KPI cards; a dashboard; a pie chart; every number counting up at once; numbers with no source.

### Vertical and social (9:16, 1080×1920)

- Recompose; never squeeze a landscape film. One subject, centred, stacked vertically. Side-by-side panels and wide charts become a vertical sequence.
- Platform UI: nothing in the top 168 px; every word and the product between y = 168 and 1330; below 1330 only texture or decoration; no text under the right-hand action rail. Ads reserve more at the bottom.
- Frame 0: a face, the result, or one bold line already on screen. Speech is captioned; many viewers watch muted.
- Type larger than landscape (titles about ×1.35); nothing meant to be read under 28 px; a claim is about 5 words per line. Cut words, never shrink.
- Talking heads: punch-ins on emphasis, B-roll cut on the sentence, the face never under a card.
- Pacing: shots of 1–2 s, a new beat every 2–4 s, the payoff before the swipe.

Conflict: HyperFrames keeps content in y = 168–1330 (8.75%–69%). Motionhaus keeps content below the badge (~top 10%) and above the caption band (from ~72%), and Instagram hook lines inside y ≈ 240–1680.

Conflict: HyperFrames says a loop from last frame to first is a choice, not a default. Motionhaus retention rule 5 ends every short on a question the opening answers when it loops.

Conflict: HyperFrames wants a new beat every 2–4 s everywhere. Motionhaus: about every 3 s in shorts, but every 6–10 s in long-form.

### Music videos and films cut to a track

- The song is the structure: find its sections (intro, verse, chorus, bridge, outro); each is a chapter. Chapter breaks land on section boundaries.
- Cut density follows energy: slower shots in verses, one picture per strong beat in the chorus, a held image on a breakdown.
- The chorus returns to one home stage and escalates each time; the ending rhymes with the opening.
- Each lyric line gets its own picture (shots of 1.4–4 s): show what the line means, not the line. Lyrics on screen only when asked; then each line holds at least a beat and is set as type, not subtitles.
- A physical medium carries further than effects: watercolour with ink outlines, cut paper, risograph, film grain on footage.
- Tells: the same treatment for more than ~6 s; a spectrum bar or waveform as the main picture; every cut on every beat; words about the music rather than the song's world.

### 3D, simulations, generative

- Use 3D when the film earns it: an object or set as the payoff, a product, a simulation that explains.
- One hero object beats a crowd. Fly through or into it rather than orbiting: one dive is worth ten turns.
- Cutaways, exploded views, chapters with one caption line each, and labels with real numbers turn a simulation into an explanation.
- Light: warm key, cool rim, a dark environment with two or three soft strips; turn the environment, not the object, so highlights sweep; a contact shadow under the object.
- Bloom eats detail: keep it to the brightest points. Glossy metal under low light streaks white: roughness ≥ ~0.45, environment intensity ~0.5. Clamp values that can divide by zero (one NaN pixel blacks a frame through bloom).
- Simulate once into arrays, then look up state at time `t`; seed every random choice. Profile the heaviest frame once.
- Product UI is never tilted into 3D; only generated content tilts.

Conflict: HyperFrames never tilts product UI in 3D. Motionhaus uses 3D device mockups, the `3d` style and the long-form `sceneCamera` (each scene arrives at a slight angle and yaws).

### Characters and mascots (the channel's mascot)

- A character gives every transition a cause and the film its jokes: it carries the result in, rejects its own first try, reads the manual.
- Mood changes go through a take: anticipation → squash → the new face → settle. A face never snaps between states.
- Offset the parts (head leads, arms follow), vary the amounts; never move both arms, both eyes or a crowd in unison. Code's default is every part at once on one curve.
- An idle breath or blink is life here, not a tell.
- Contact sells it: feet on the ground, props held by the hand, eyes on what they look at.
- Each action is one read: lead the eye to where it will happen, play the action fast, hold the reaction. A sign or caption repeating what the action shows is the classic failure.
- A rig is parameters over time (position, squash, arm angles, eye and mouth state) written as keyed states the rig eases between.
- Hand-drawn life: redraw outlines ~12 times a second with jitter seeded by `floor(t × 12)`, so the line boils while the pose holds and every render matches.

### From a pull request or changelog

- Credit commit authors by commit count, not just whoever opened the PR; skip bots, lockfiles, build output.
- Never invent a version: first non-draft release at or after the merge, else the default branch's version as "unreleased", else only the URL.
- Length ceiling from size (additions + deletions): ≲ 50 lines 20–40 s; 50–200 40–70 s; 200–600 70–110 s; ≳ 600 lines or 25+ files 110–180 s.
- Show 2–4 hunks of 4–12 lines. Counts like +N/−M go on a `stat` card, not into the VO.
- Typed code runs at a fixed speed: check characters × speed against the scene length.

### Real places and maps

- A real place is shown on real imagery (satellite, photos). Vector outlines read as a diagram; keep them for borders, pins and labels drawn on top.
- Bake a map camera move to video once (live tiles change between renders); animate overlays only while the camera holds.
- Credit the imagery on screen in small type on a soft dark backing.

## 10. Storyboard (when shots need approval before animating)

- One still per shot, posed at its key moment with real words, real fonts, real colours, the focal point big enough to read on a phone. Look at every still yourself first.
- Present as a board: stills in film order, each with `NN: name`, its time range and one line of what happens; act headings between groups.
- The plan beside it carries, per frame: `status` (`outline` → `built` = layout confirmed, no motion → `animated`), duration, `transition_in`, a one-line scene caption, the VO guide, and:
  - `reads`: what the viewer must understand, in order, each with a window: `the cursor finds the button (0.4–1.2 s); "Export" lands (1.2–2.6 s)`. Windows never overlap; each is long enough for its words (§6).
  - `sound`: the bed, the effects on visible actions, or silence.
- Global direction on top: format, requested duration (advisory: judge drift, don't pad), one-line message, arc (`Hook → Problem → Solution → Proof → CTA`), audience.
- Stop and wait for the go. Notes on a frame change only that frame; the other stills stay approved. Animate only from approved stills.
