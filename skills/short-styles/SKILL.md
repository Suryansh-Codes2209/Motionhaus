---
name: short-styles
description: Use when writing or revising a short's script.json for any channel, choosing how a short or launch film should look, or when the user asks for a Vox-style, explainer, neon / 21st.dev, terminal, toy box, 3D, headshot / talking-head or "different" edit, or says videos all look the same, or when shorts lose viewers early (swipe-away, retention, hook), or when making the Instagram reel version of a short (caption, cover, hashtags, Instagram schedule), or when shorts look boring, flat or dated next to other channels and need stronger hooks, kinetic type, transitions, beat hits or caption styles, or when porting a look from 24fps.dev or prompt-motion.com.
---

# Short edit styles

Every Motionhaus video gets one **edit style**: its whole look and motion grammar. The style decides the palette, fonts, card surfaces, how *emphasis* is painted, transitions, hit effects, caption skin and which scenes fit. The renderer is `packages/motion-kit/src/styles/` and the pipeline registry is `apps/shorts/src/styles.mjs`.

| style | for stories about | signature | palette (default) |
|---|---|---|---|
| `vox` | trends, controversy, "why it matters", open-source drama | newsprint paper, torn clippings, marker circles, typewriter labels | `newsprint` |
| `explainer` | how something works: infra, protocols, frameworks | dotted canvas, nodes joined by animated beams, crisp cards | `chalk` |
| `neon` | AI products, polished UIs, design tools | aurora + retro grid, bento tiles with orbiting border beams, shimmer | `ultraviolet` |
| `terminal` | CLIs, dev tooling, security, self-hosting | phosphor on black, CRT scanlines, glitch cuts, streaming logs | `phosphor` |
| `toybox` | small tools, plugins, skills, "this free thing fixes X" | cream paper, white app-icon tiles, ✕/✓ badges, stickers, italic serif | `toybox` |
| `3d` | layered systems, 3D / spatial / game tools | dark stage, cards with an edge, orbiting camera, cube flips | `depth` |
| `headshot` | recommendations, tips, reactions (a person talking) | top panel of toy-box graphics, speaker below (your take or the channel's mascot), captions on the face | `toybox` |
| `radar` | anything else (the original look) | film grain, glass cards, light leaks | rotating |


**Before picking anything, run `shorts designs`.** It is the design ledger: every style, scene type, hook variant, type style, transition and effect, with which have never been used and which were used longest ago. Pick from the top of each list, and fix every `design:` warning that `shorts make` prints. The user finds repeated backgrounds, cards and moves boring (2026-11-13).


**Craft rules live in `skills/video-craft`** (story, motion, continuity and cuts, look, sound, captions, review, 3D depth, a pool of 40 designs). Read its table and house decisions before writing a script or reviewing a render.

## Picking

1. Suggest one with `pickStyle(candidate, recentStyles)` from `apps/shorts/src/styles.mjs`, where `recentStyles` lists the top-level `style` of recent episodes in `workspace/channels/<channel>/episodes/*/script.json`, ordered by `episode`, newest first. A script with no top-level `style` is `radar`. Scene-level `style` (`slam`, `assemble`) is a different field.
2. Choose by the **story**, not the product category. A CLI that started a privacy fight is `vox`.
3. **Never use the same style as the previous episode.**

## In script.json

```jsonc
{
  "episode": 8, "sourceLabel": "Show HN", "sourceUrl": "<thread or repo>",
  "style": "terminal",            // required; palette optional (defaults to the style's)
  "captions": "pill",             // optional caption preset; default "style" (the edit style's own skin)
  "pacing": "staccato",          // rhythm shape; never the previous episode's (Motion rules 6)
  "kicker": "SHOW HN · OCT 22",   // optional dateline chip over the hook
  "brand": {"name": "…", "url": "…", "font": "Inter", "colors": {…}},  // colors/fonts are replaced by the style
  "pronounce": {"OpenTRAP": "Open Trap"},  // TTS-only respellings; captions keep the script text
  "scenes": [
    {"type": "hook", "variant": "band", "image": "site/hero.png", /* or "video": "demo.mp4" */ "lines": ["Your room,", "in *Three.js*"], "vo": "Wes Bos just turned a real room into *Three.js.*"},
    {…, "vo": "…"}                // scene and word bounds: the channel's channel.json → rules
  ],
  "outro": {"text": "Follow for tomorrow's launch", "vo": "Follow for tomorrow's launch."},  // the channel's line: channel.json → publish.outro
  "sources": {"<claim>": "<where, with link and date>"}
}
```

That is a product launch: the subject has its own page (`brand.url`), so the product scenes (`screenshot`, `spotlight`, `chat`, `cta`) are available. A subject that is not a product leaves the link out and uses the other scenes. `shorts make` refuses a product scene in a script with no `brand.url`.

```jsonc
{
  "episode": 12, "key": "octopus-three-hearts",   // both from `shorts story claim`
  "sourceLabel": "Smithsonian Ocean",              // optional; printed in the badge when the channel's badge has {source}
  "style": "vox",
  "brand": {"name": "Octopus hearts"},             // the subject's name; no url, no font
  "scenes": [
    {"type": "hook", "variant": "band", "image": "photos/octopus-1.jpg", "lines": ["Three hearts.", "*One* stops."], "vo": "An octopus has three hearts, and one of them stops when it swims."},
    {"type": "stat", "vo": "…"},
    {"type": "photo", "vo": "…"}
  ],
  "outro": {"text": "Follow for one fact a day", "vo": "Follow for one fact a day."},
  "sources": {
    "three hearts": "Smithsonian Ocean, https://ocean.si.edu/… (read 2026-11-14)",
    "the systemic heart stops while swimming": "…, https://…"
  }
}
```
Every short also needs a top-level `instagram` block for its Instagram cut, when the channel has an Instagram account (see "Instagram version" below):

```jsonc
"instagram": {
  "hook": "This open-source tool strips ads off your smart TV", // caption line 1: the claim, ≤ 10 words
  "about": "CleanYourTV uses an AI coding agent to disable ad apps on Android TV.", // 1–2 sentences
  "question": "Which TV brand should we test next?",  // comment prompt; default: the last scene's question
  "makers": ["@maker"],                                // only real, checked Instagram handles; else []
  "hashtags": ["#smarttv"],                            // 1–2 niche topic tags (never #ai, #claude, #tech)
  "outro": {"text": "Send this to a dev who needs it", "vo": "Send this to a dev who needs it."} // optional, this is the default
}
```

Write `metadata.json` next to it (title ≤ 70 characters with an anchor in the first 3 words and **no `#shorts`**, description ending in `#shorts`, tags, a comment that opens with a question, privacy), copying the shape of an earlier episode.

Use 2–3 of the style's **signature scenes**. Shared scenes (`stat`, `cta`, `type`, `screenshot`, `steps`…) re-skin themselves automatically.

| style | signature scenes (see reference) |
|---|---|
| vox | `clipping`, `document`, `comment`, `versus` |
| explainer | `flow`, `steps`, `chart` |
| neon | `bento`, `spotlight`, `chat` |
| terminal | `log`, `code` (terminal: true), `type` scramble |
| toybox | `tiles`, `steps`, `stat` |
| 3d | `stack`, `spotlight`, `bento` |
| headshot | `tiles`, `stat`, `screenshot`; plus `"face": "take.mp4"` at the top level for a recorded take |

The per-style recipe (beat sheet, VO voice, do/don't, a full example) lives in `references/<style>.md`. **Read the one you picked before writing.** Props for the signature scenes are in `references/fx-catalog.md`; props for the shared scenes are in `skills/launch-video/SKILL.md`.

## Motion rules (the edit must not be flat)

The style sets the look. The **motion vocabulary** sets the energy, and it is the same for every style. Every name, with what it does, how long it lasts and when to pick it, is in `references/motion-vocabulary.md`. **Read it before writing a script**; use only names from it. `shorts make` prints `motion:` warnings for unknown names, a repeated hook variant and a flat edit.

1. **Give the hook a `variant`** (`build`, `band`, `echo`, `card`, `ghost`, `tag`; `rise` is the plain one), chosen by the story, and **never the previous episode's**.
2. **2–5 `hits`** across the short (`punch`, `flash`, `invert`, `freeze`, `strobe`, `rgb`, `jolt`, `blur`, `echo`), each on the word that earns it: a `punch` on the number, a `freeze` on the evidence, a `jolt` on the "but". Something should change on screen about every 3 seconds.
3. **Name a transition when the cut means something** (`clock` into "eleven hours later", `pageTurn` into a document, `split` into "inside"); otherwise leave it to the style's rotation.
4. **At least one text beat uses a `type` style other than `slam`** (`build`, `echo`, `boxed`, `offset`, `wall`, `scramble`, `stack`) when the short has a `type` scene. Two `slam` scenes in one short is the old look.
5. **Rotate the caption preset** (`"captions"`: `slam`, `bigKey`, `pill`, `sweep`, `underline`) when the style's own skin has run three episodes in a row.
6. **Name a `pacing` shape** (`steady`, `staccato`, `slowBurn`, `countdown`, `coldOpen`; vocabulary §7) and **never repeat the previous episode's shape, scene order or length**. Inside a short, mix quick cuts (≤ 8 VO words) with one scene that breathes; five scenes of 7 s each is a metronome. `shorts make` prints `pacing:` warnings.
7. **Every effect answers the voice.** If the VO does not justify it at that moment, cut it. Density without meaning reads as a template.

When the vocabulary has no move for what the story needs, look for a reference before inventing one: `references/library.md` (the 24fps MCP server, prompt-motion.com, skill packs) and how to port what you find.

## Opening, length and the checks

Read the channel's brief first (`brief.md` in the channel folder; see `skills/channel-brief`). It says what the channel covers, the voice, what counts as a source and what is off limits, and it wins over this skill where they differ. The rules below are the craft that holds for any short; which of them are enforced, and with what numbers, is set per channel in `channel.json` → `rules`. `shorts make` prints a `retention:` line for each one a script breaks, and a rule that is off prints nothing.

1. **Frame 0 is the subject plus the twist** (`subjectInFrame0`, `brightFrame0`). Scene 1 is a `hook` with a `"video"` (a muted clip of the thing itself, the best option) or an `"image"` (the brightest picture of it), behind at most 2 lines of at most 5 words that state the twist. The pipeline lands line 1 on frame 0. It shows no channel badge on the hook and plays no bumper before the content. Never open on a logo, a title card or words typing themselves out. Frame 0 is also the thumbnail in the Shorts list and in search, so it must not read near-black: `render` warns under a mean luma of 70/255. Choose light captures and daylight photos.
2. **The first sentence is short and is not a run-up** (`shortFirstSentence`). Ten words at most, leading with the name, the fact or the pain. Not "Someone just…", "A new…", "This week…".
3. **Length** (`scenes`, `words`). The voice runs about 2.2 words a second; the channel's bounds are in its settings. The usual beats are in the brief's "Shape of an episode".
4. **Show, then tell.** Put the detail on screen rather than in a text card. Frame an internal detail as the payoff, never as the topic.
5. **End on a question** when the channel asks for one (`endsOnQuestion`): worded so the opening answers it when the short loops, and repeated as the first line of `metadata.comment`, with the links under it.
6. **The title is for search** (`shortsTag`, `titleAnchor`). No `#shorts` in the title; it goes in the description. A channel with `titleAnchor` on keeps a list of names people already search for (`anchors`) and leads the title with one, in its first three words.
7. **Every claim has a source** (`sourcesRequired` for channels that turn it on; good practice for all). `script.json` → `sources` is `{"<claim>": "<where it comes from, with link and date>"}`. A `document` quote, a `comment`'s text and every `log` line are verbatim from a real source (use "…" for cuts), and a comment's author is the real handle. Before the final render, reopen each link and read the line it supports against the page.

Judge a channel by how many viewers stay, not by raw views, and not before 40 to 50 videos. What a particular channel has learned from its own numbers is section 11 of its brief.

## Instagram version

A channel with an Instagram account (`channel.json` → `instagram.handle`) ships every short twice: the YouTube Short and an Instagram reel cut from the same script. A channel without one makes only the YouTube cut.

**What the pipeline does on its own:**
- `shorts make <dir> --render` renders `out/short.mp4`, then `out/short.instagram.mp4` and `out/instagram-cover.png`, one after the other (`--no-insta` skips the last two). The Instagram cut shows the channel's Instagram handle in place of the badge's series line, and its end card is the channel's share prompt (`publish.shareOutro`) with its own VO line.
- `shorts kit <dir>` also writes `review/instagram-reels/<nnn-slug>/`, with the reel, the cover, `caption.txt` and `upload.txt`, and books the reel on the next free day in `review/instagram-reels/schedule.json` at the channel's slot (`instagram.slotsIST`). Pass `--ig-slot "YYYY-MM-DD HH:MM"` to choose the slot yourself.
- With `INSTAGRAM_UPLOAD_MODE=auto`, `shorts insta-post` uploads the reel at its slot through the Instagram API with the caption, the hook frame as cover, maker tags and share-to-feed (README → Autopilot). It posts only reels that pass the film-qa gate, so run `npm run qa -- gate <dir>/out/short.instagram.mp4 --profile animation` before `shorts kit`. `shorts kit` also records the episode in `ledger.json`.
- `shorts make` prints `instagram:` lines for a missing `instagram` block, a typed-out opener, no question, or a hashtag on the channel's too-broad list.

**What the script must give it:**
1. **The subject is on screen in the first second**, with a bold claim of at most 6 words over it. The cover is frame 36 of the hook, so the hook's lines must sit inside the middle 3:4 of the frame (y ≈ 240–1680), where the profile grid crops it.
2. **Ask for a comment or a share.** The last scene asks the question, and the caption repeats it with 👇. The end card asks for the share. A reel needs shares and comments to travel beyond its first test audience.
3. **The caption is 2–3 short blocks:** the hook (the claim again), what it is with its link, then the question. `instaCaption` builds it with the channel's credit line (`publish.credit`).
4. **Use 4–6 niche hashtags:** the channel's own set (`instagram.hashtags`) plus 1–2 topic tags in the script. Huge tags are where a small account cannot rank.
5. **Tag a maker or a source** only when you have looked up their real handle; never guess one.

## Common mistakes

- A hook with no `variant`, or the same one as yesterday: every short then opens the same way.
- No `hits`, `zoom` or `fx` anywhere (a flat edit), or a hit on every line (noise).
- A name that is not in `references/motion-vocabulary.md`: it renders as the default and nobody notices.

- Opening on a text-only card or a run-up sentence ("Someone just built…"), so viewers swipe before they see the subject.
- On a channel that anchors its titles: scripting a story with no name anyone searches for.
- The anchor buried mid-title, or "#shorts" taking up title space.
- Cutting a short down to 4 scenes and ~40 words: shorter than the channel's bounds rarely holds viewers better.
- A dark-theme capture as the hook, so the thumbnail in the Shorts list is near-black.
- Picking the style by subject type alone, so every story of one kind looks the same. Pick by the angle of the story.
- Mixing signatures (a `bento` in a `vox` short). Shared scenes are fine; another style's signature scenes are not.
- Setting `palette` to a rotation palette on a non-radar style, which breaks its look. Leave `palette` out unless it's listed in `STYLES[style].palettes`.
- A short with no `instagram` block, so its reel goes out with the YouTube title as its hook and no maker tag.
- Posting every short to Instagram the day it's made. Instagram gets 1 a day from `review/instagram-reels/schedule.json`.
- A `document.quote` that isn't an exact substring of `body`: the marker then has nothing to land on.
- Long `log` lines: keep each ≤ 40 characters so lines don't wrap.

## Checking

Render one still per scene (`shorts make <dir> --fast --stills …`) and read them. Content must stay above the caption band (from about 72% of the frame height) and below the badge (about the top 10%).

Sound follows `references/sound.md` in every style: real recordings, each hit on its event frame (peak-aligned), `i={index}` on repeated hits, and `shorts critique <dir>` (earshot) before shipping.

To add a style or port another 21st.dev component, see `references/porting-21st.md`. To port a hook, caption style, transition or effect from 24fps or Prompt Motion, see `references/library.md`.
