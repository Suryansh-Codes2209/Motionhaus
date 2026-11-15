---
name: long-form
description: Use when writing or revising a long-form (16:9, ~2 minute) deep dive for a product-launch channel, its thumbnails, its chapters or its real-photo beats, or when the user asks for a "long video", "deep dive" or "YouTube long" about a launch.
---

# Long-form deep dives

Long-form is a product-launch format for now: its chapter structure, thumbnails and examples assume a launch with its own page. Channels on other topics make shorts (`skills/short-styles`).

A deep dive is one launch explained properly in about two minutes (2:00–2:20 is fine), 16:9, for regular YouTube (not Shorts). It runs through the same pipeline as a short. The script's `"format": "long"` switches the pipeline to the `Long` composition, which has no burned-in captions; instead it writes an `.srt` that is uploaded as a subtitle track. The pipeline also renders chapter chips, a 16:9 end card and 1280×720 thumbnails.

Episode folders live in `workspace/channels/<channel>/long/<slug>/` (shorts stay in `workspace/channels/<channel>/episodes/`). Kits go to `workspace/channels/<channel>/review/youtube-long/<nnn-slug>/` (shorts: `review/youtube-shorts/`).


**Craft rules live in `skills/video-craft`** (story, motion, continuity and cuts, look, sound, captions, review, 3D depth, a pool of 40 designs). Read its table and house decisions before writing a script or reviewing a render.

## Picking the launch (2–3 a week)

Most launches can't carry two minutes. Take one from the recent shortlist or a launch that already got a short when it has all three of these:
1. **A real mechanism** you can show step by step (`flow`, `steps`, `code`).
2. **Something to show**: a captured site, README code or a demo.
3. **A tension**: a rival, a catch, a beta, a trade-off. This becomes the open loop and the verdict.

Use the launch's own short as a starting point, but re-source every claim for the longer script. Fetch the README or docs into the episode folder (`source-README.md`).

## Structure (~300–330 spoken words, 12–14 scenes)

| t | chapter | job | scenes that fit |
|---|---|---|---|
| 0–10s | cold hook | The most surprising claim or result first. No channel intro, no "hey guys". | `hook`, `code`, `stat`, `screenshot` |
| 10–30s | stakes + **open loop** | Who made it and why people noticed, then the promise: "By the end, you'll know how it works and if it's worth trying." | `stat`, `hook` |
| 30–50s | the problem | The pain it removes, which the viewer should recognise. | `versus`, `quote`, `comment`, `document` |
| 50–80s | how it works | The real mechanism in order: "First… then… so…". | `flow`, `steps`, `code`, `features`, `spotlight` |
| 80–100s | setup / support | What it takes to use, and what it works with. | `steps`, `screenshot`, `features` |
| 100–120s | the catch + verdict | The limitation, then an honest call. This **pays off the open loop**. | `features`, `versus`, `hook` |
| last | question | One question to the viewer, then the end card. | `cta` |

Retention rules:
- **Objects over text boxes.** When a mechanism has a physical metaphor (a lock, a key, a counter, a pipe), show the object doing it (`crack`, `photo`, `clip`) instead of a `flow` of labelled cards that only repeats the VO. Keep `flow` for real multi-step pipelines.
- Something new on screen at least every 6–10s. One scene with a long VO (over 15s) needs a visually busy scene such as `flow` or `code`.
- Re-hook at about 45s and 85s with a line that pulls forward: "Here's how.", "Now the catch."
- `*emphasis*` on the word you'd stress out loud, at most one or two per line.
- Third person for the maker ("the developer", "they"). Present an opinion as an opinion ("it's worth waiting…").
- No lines that only repeat the visuals. The VO explains; the scene shows.

## Style

**Read `references/retention-research.md` first.** It has what we know about which style holds viewers, the story-angle → style table, the running vox-vs-explainer experiment, and a results table to fill in after each video.

Pick an edit style with `skills/short-styles` (read its reference for the one you pick). Long-forms track their own rotation: **never use the same style as the previous long-form**, and for now alternate `vox` and `explainer` (see the experiment). Shorts don't count. `vox` suits why-it-matters stories; `explainer` suits how-it-works stories. Use 2–3 of the style's signature scenes, as in a short. Long-form can go up to ~14 scenes; the 6-scene limit is for shorts only.

## Keep it moving: host, backdrops, camera, huashu

The same background with flat framing for two minutes bores viewers. Long-form has four tools against that, and every deep dive uses all four.

- **The host (the channel's mascot, when it has one: `channel.json` → `mascot`):** a rocket with a face and arms (`studio/src/longform/Mascot.tsx`, `Host.tsx`). The mascot **comes and goes**: it appears only in scenes with `"host": {"side": "left"|"right", "gesture": "wave"|"point"|"think"|"cheer"|"idle"}`, peeks up from that corner, talks with its mouth synced to the scene's VO words, and sinks away before the cut.
  - Use it in **3–5 scenes**, never two in a row.
  - Only use it in scenes whose corners are free: `hook`, `quote`, `stat`, `cta`, `type`. Avoid `flow`, `versus` and `steps`, which fill the width.
  - Pair the gesture with the line: `wave` for hello and goodbye, `think` for the open loop, `point` toward the content, `cheer` for the payoff.
- **Backdrops change per chapter** (`longform/Backdrop.tsx`): `canvas` (the style's own look), `shapes3d` (Three.js shapes floating at the edges with a swaying, dollying camera), `aurora` (drifting light), `floor` (a perspective grid streaming in) and `rings`.
  - The default order is canvas → shapes3d → aurora → floor → shapes3d → rings.
  - A chapter can pick one with `"backdrop": "floor"`.
  - Every set keeps the palette's background tone, so scene text stays readable.
  - **`plate` (preferred):** `{"title": …, "scene": 3, "plate": "photos/game-cartridge-21.jpg"}` uses the episode's own photo or clip (`.mp4`) as that chapter's background: out of focus, graded into the palette, slowly moving. Give **every chapter a different plate**, so no video shares a background with an earlier one. The stock sets above are the fallback for a chapter with nothing to show.
- **Custom SVG motion graphics** (`svg` scene, `skills/short-styles/references/motion-vocabulary.md` §5c): draw 2–4 per deep dive for the mechanism and the proof number, objects in motion, not labelled boxes.
- **Run `shorts designs` before writing any script** (shorts too). It lists every design in the kit (styles, 25 scene types, hook variants, type styles, 35 transitions, fx, backdrops, mask edits) with what has never been used and what was used longest ago. Pick from the top of each list; `shorts make` prints `design:` warnings when a script repeats what the last three videos showed or uses one design more than 3 times.
- **Don't repeat the furniture** (user feedback, 2026-11-13: the same backgrounds and cards again and again make the videos boring). At most **2 card scenes** (`versus`, `flow`, `features`, `steps`, `bento`) per deep dive. Say the rest with photos, footage, `stack`, `type` styles, `crack`, mask edits. Rotate the look too: don't reuse the previous long-form's style, palette or scene mix.
- **3D camera** (`look.sceneCamera`, on for long-form): each scene arrives at a slight angle, alternating sides, then glides and yaws between its areas of interest (left card → right card, node → node). Statement scenes get one punch-in. Wide layouts are capped at a 1.07 zoom so outer cards don't crop.
- **huashu art engine scenes** (`packages/art-engine`, see `skills/motion-engines`):
  - `{"type": "art", "id": "01_cave", "label": "typing SQL by hand"}` is a 2–4s painting cutaway in one of 35 art styles. Use it as a **metaphor beat** (the old way → cave painting, chaos → Munch, a dream setup → Dalí), once or twice per video.
  - `{"type": "clip", "spec": {"grammar": "y3_whiteboard", "duration": 8, "cues": [...]}}` is an explainer clip written inline. `make` writes it to `public/clips/sN.json`, colours it with the episode palette and keeps the scene at least `duration` long.
  - Good grammars for tech: `y3_whiteboard` (lists with drawn icons; icons: person cat network doc chat bulb check cross screen stack gear …), `y5_kinetic_type` (requirements and numbers), `t2_keynote_ui` (cards plus a screenshot), `t3_finance_chart` (real numbers).
  - Images in a spec resolve relative to `public/clips/`, so use `"../site/hero.png"` for a capture.

A good mix for 2 minutes is 1 art cutaway, 2 clips, 3 real-photo beats, 4 host appearances and 5–6 backdrop changes, with every other scene coming from the motion kit.

## Real photos at the retention points

Animated cards for two minutes start to feel like a slideshow. A real photo (a person, a place, the hardware, the old way of doing it) resets attention because it looks like the world, not a UI. Put one at each point where viewers decide whether to stay:

| when | what the photo does | example |
|---|---|---|
| **0–10s**, the cold hook | the result, the famous person or the thing everyone recognises, behind the claim | a `hook` with `"image"`, or a `photo` with a `caption` |
| **~30–50s**, the problem | the pain as a real scene: the old way, the mess, the crowd | a single `photo` with `caption` + `label` |
| **~85s**, the re-hook / the catch | a second angle that pulls forward ("Now the catch.") | a `photo` collage of 2–3 prints |

Use 2–4 photo beats per deep dive, never two in a row, and never as decoration with no VO link: the VO says what the photo shows.

**Getting them** (free and safe to use commercially, no API key):
```sh
shorts photos <episode-dir> "server rack" --n 4 --orient wide     # → public/photos/, photos.json, photo-credits.txt
```
- Search Openverse (CC photos from Flickr and others) and Wikimedia Commons (people, places, hardware, logos, historical images). Only CC0, public domain, CC BY and CC BY-SA pass; NC and ND are dropped.
- Query with the plain **object, place or person** ("filing cabinet", "Linus Torvalds", "server rack"), not the idea ("legacy pain"). Long queries are cut to two words when nothing matches.
- **Read every downloaded image before using it.** Drop blurry ones, off-topic ones, and photos with watermarks or readable private details.
- Put the result's `credit` line (`Photo: <creator> / CC BY`) in the scene's `credit`. The upload adds a full credit for every photo the script uses to the description.
- **Never take images from Pinterest, Google Images, or social posts.** Most are re-posts the uploader holds no rights to. Pinterest is fine as a *mood board* (framing, colour, collage ideas), never as a source.

```jsonc
{"type": "photo", "images": ["photos/filing-cabinet-1.jpg"], "caption": "Row types, *by hand*", "label": "NOTHING CHECKS THEM",
 "credit": "Photo: Unknown author / public domain", "focus": {"x": 0.5, "y": 0.45}, "vo": "With raw SQL, you write row types by hand…"}
{"type": "photo", "images": ["photos/a.jpg", "photos/b.jpg", "photos/c.jpg"], "caption": "Your *own* driver", "credit": "Photos: … / CC BY · … / CC0", "vo": "…"}
```
One image is a full-bleed documentary shot with the camera creeping toward `focus`. Two or three become taped prints that land one per beat. Photos always get a dark scrim and white type, whatever the palette.

## Effects and voice

- Use the effects in `skills/short-styles/references/fx-catalog.md` → "Effects any scene can take" at the retention points: a `glitch` or `zoom: "in"` on the cold open, `whip`/`zoomIn`/`filmBurn`/`iris` transitions into each chapter, `flames` on the fallout, `letterbox` on the verdict.
- **Mask edits** (`skills/short-styles/references/motion-vocabulary.md` §5b): `maskText` / `maskInk` / `maskBrush` transitions into photo beats, a `type` `window` on the chapter's key word, and text behind the subject (`behind` + `cutout`) on the cold hook and one re-hook. Use 3–5 per deep dive, spread across the chapters (first used in #074 S2Arm).
- The voice is **Chatterbox-Turbo** (the channel's `channel.json` → `voice.provider: "chatterbox"`): local, MIT licensed, and far more natural than Kokoro. Write VO the way you'd say it: contractions, short sentences, commas where you breathe. It reads paralinguistic tags, e.g. `[sigh]` or `[chuckle]`, but use at most one per video. `pronounce` respellings still apply. Without the venv the pipeline falls back to Kokoro and says so.

## script.json additions

```jsonc
{
  "format": "long",
  "episode": 11,                     // the launch's ledger number (same as its short, if any)
  "style": "explainer",
  "chapters": [                      // ≥ 3, first at scene 0, each ≥ 10s (make warns otherwise)
    {"title": "What Reylo does", "scene": 0},
    {"title": "How it works", "scene": 6}
  ],
  "thumbnail": {"variants": [ … ]},  // 3, each a different layout (see Thumbnails); pick one with --thumb N (default 1)
  "outro": {"text": "Subscribe for launches worth your time", "vo": "Subscribe for more launches worth your time."},
  "scenes": [ … ], "sources": { … }   // as in short-styles
}
```

`metadata.json` is written as for a short, but: there's no `#shorts`, the title is 60–70 characters and states the payoff, and the description has a line `{{chapters}}` where the timestamps go (they are computed from the real timeline into `out/description.txt`).

## Thumbnails

The thumbnail decides whether a long-form gets watched at all. Write **3 variants**: two `react` hooks with different angles (the shock number, the question that worries the viewer), plus one `photo` or `versus`. Each tests a different idea, not three crops of one:

| layout | best for | needs |
|---|---|---|
| `react` | **the default first variant: the hook.** One huge object with a story in it (`object: "lock-open"`, or a photo cutout), the mascot reacting (`mascot: "shock"`), a claim with a curiosity gap in 2–3 words with one *hot* word in a red box, and a `sticker` with the number ("256 KEYS"), on a dark, red-glowing real photo | `image` (background photo), `object`, `sticker`, `mascot` |
| `photo` | a person, a place, a striking object, the old way. Real images pull more clicks than UI captures. | `image` (a fetched photo, wide), optional `inset` (a product capture shown as a card), `side` (which side of the photo is empty, for the headline) |
| `versus` | old vs new, rival vs rival, before vs after | `image` + `image2`, `labels: ["by hand", "typed"]` |
| `product` | the UI itself is the hook (a striking demo) | `focus: "screenshot"` + `image` (prefer a dark, high-contrast capture such as `og.png`), or `focus: "logo"` |

Rules for every layout:
- **The hook test:** would a developer scrolling past stop because they *need to know*? Use a number that shouldn't be possible ("cracked in 1 second"), a threat to their own stack ("Is curl safe?"), or a famous name in trouble. The claim must be true; no fake-scary claims the video doesn't back up.
- The headline is **2–4 words that are not the title**. It adds curiosity rather than repeating the title. Use one `*accent*` word.
- Use one focal image and one accent mark (`arrow`, `circle` or `none`; `photo` defaults to `circle`).
- It must read at 160px wide: big type, few words, a face or object large enough to recognise. Leave the bottom-right corner empty, because YouTube puts the duration badge there.
- Vary the angle between variants: the result, the person, a provocation.
- After rendering, **read `out/thumb-N.png` scaled down to 320px** (`ffmpeg -i thumb-1.png -vf scale=320:-1 small.png`). If the headline or the subject doesn't read at that size, cut words or pick another image.

```jsonc
"thumbnail": {"variants": [
  {"layout": "photo", "headline": "SQL, *typed*", "sub": "No codegen", "image": "photos/filing-cabinet-1.jpg", "inset": "site/og.png", "accent": "none"},
  {"layout": "versus", "headline": "Codegen vs *Reylo*", "image": "photos/filing-cabinet-1.jpg", "image2": "site/og.png", "labels": ["by hand", "typed"]},
  {"layout": "product", "headline": "Zod creator's *new* tool", "focus": "screenshot", "image": "site/og.png", "accent": "circle"}
]}
```

## Commands

```sh
shorts make workspace/channels/<channel>/long/<slug> --fast                  # VO, props, .srt, description.txt; prints chapter warnings
shorts make … --fast --thumbs --stills 166,416,…                 # + thumbnails + one still per scene: READ THEM
shorts make … --render                                           # final MP4 (motion blur on) + thumbnails
shorts kit workspace/channels/<channel>/long/<slug> [--thumb 2]              # → review/youtube-long/<nnn-slug>/
shorts publish workspace/channels/<channel>/long/<slug> [--thumb 2] --privacy unlisted
```

`publish` uploads the MP4, then the `.srt` (captions.insert) and the thumbnail (thumbnails.set). Custom thumbnails need a phone-verified channel; if the upload fails, the video stays up and the error is printed.

## Checking

- Length: 1:50–2:20. Each scene's length is set by its VO, so trim words rather than beats.
- Read a still of every scene: nothing overlaps the series badge (top-left) or the chapter chip (top-right).
- Open `out/long.en.srt` next to the video. Cues should read as sentences, with no more than 2 lines of 42 characters.
- `film-qa gate out/long.mp4 --profile animation`, when `packages/film-qa` is set up.

## Common mistakes

- A hook that names the product before the payoff. Lead with what it does for the viewer.
- No open loop, or one the verdict never answers.
- A verdict stated as fact ("it's not production ready") when the source only says "beta".
- A thumbnail headline that repeats the title word for word.
- Three thumbnail variants in the same layout, so the test learns nothing.
- Photos from Pinterest or Google Images, or a photo with no `credit`.
- Chapters under 10s, or the first one not at scene 0: YouTube then ignores all of them.
