---
name: insta-reels
description: Use when the user gives a phone video (talking head, vlog, creator clip, WhatsApp/Instagram download) and wants it edited into an Instagram Reel, TikTok or Short — jump cuts, punch-in zooms, word-by-word captions (including Hindi/Hinglish), stickers, slams, outro — or says "edit this reel", "make this video engaging", "insta edit".
---

# Instagram reel edits

Real footage in, a scroll-stopping 9:16 reel out. The app is `apps/reels`: a CLI (`src/cli.mjs`) and its own Remotion studio (`apps/reels/studio`). You write one file, `edit.json`; everything else is computed.

This skill edits real footage. The Instagram cut of a channel's short is made by the shorts pipeline: see `skills/short-styles` → "Instagram version". Its lessons apply to any reel you hand over. Open on the subject moving in the first second, never on spelled-out words. End on a question or a share prompt, because a reel that gets no comments and no shares stops at Instagram's first small test audience. Suggest a 2–3 line caption with 4–6 niche hashtags in place of huge ones.


**Craft rules live in `skills/video-craft`** (story, motion, continuity and cuts, look, sound, captions, review, 3D depth, a pool of 40 designs). Read its table and house decisions before writing a script or reviewing a render.

## Flow

```bash
node apps/reels/src/cli.mjs prep "<video>" --name <slug> [--lang hi|en|auto]
#  → workspace/reels/<slug>/  public/source.mp4 (1080x1920, 30 fps CFR, sharpened)
#                             analysis.json (duration, pauses, whisper words)  contact.jpg
#                             edit.json skeleton
# … write edit.json …
node apps/reels/src/cli.mjs render workspace/reels/<slug> --stills   # still per overlay → LOOK at them
node apps/reels/src/cli.mjs render workspace/reels/<slug>            # out/reel.mp4 (-14 LUFS) + QA report
node apps/reels/src/cli.mjs cover workspace/reels/<slug>             # Satori cover → out/cover.png (edit.json "cover")
```
First run: `npm --prefix apps/reels/studio install --cache ./.npm-cache` (the global npm cache may have root-owned files). Whisper needs a multilingual model for anything but English: `workspace/shorts/cache/models/ggml-medium.bin` (prep tells you the curl line if it's missing).

## 1. Understand the clip before editing

- Look at `contact.jpg`: where is the face (sets `focus`), is there a burned-in watermark, an end card to trim (Instagram downloads end with a ~4 s logo card: set `trim.end` before it)?
- Read the transcript in `analysis.json`. **It is a draft.** whisper.cpp loops (prep warns `transcript loop`), drifts word times by up to ~0.6 s on Hindi, and mishears names. For meaning, run whisper with `--translate` on the same audio and compare.
- Find the **one idea** of the reel and its turn ("everyone says X — I'm not X"). The edit amplifies that turn; it doesn't decorate every sentence.

## 2. Captions: write `script`, one line per speech window

Never ship raw whisper words. Get the speech windows (stretches between real pauses, measured from the audio, exact):

```bash
node -e "import('./apps/reels/src/edl.mjs').then(m=>{const a=require('./workspace/reels/<slug>/analysis.json');console.log(m.speechWindows(a.silences,a.duration))})"
```
Write `script` with exactly one line per window (`""` for a window with no speech, such as the IG end card).

**When whisper can't give clean words** (long clips, heavy Hindi, loops), caption a translation instead: run `whisper-cli -l hi --translate` and write each segment as `{"from": 7.56, "to": 10.04, "text": "I'm *obsessed* with coffee."}`, using the segment times. Every line must then carry a span. English subtitles are accurate in meaning and reach more viewers; say in the hand-off that the captions are a translation. Words are spread across their window by length, so they can't drift. Mark emphasis with `*word*` (shown in accent2 once spoken). Hinglish is captioned in **Roman script**, the way the speaker would type it ("ho sakta hai kal main tumhe mythology pe gyaan de rahi hoon"). If you can't tell a word, use the translation pass; if still unsure, ask the user rather than guess. If captions are wrong and time is short, `"captions": false` and let the graphics carry it.

## 3. edit.json

Times are **source seconds** (as in analysis.json). The props builder remaps them through the cuts, snapping a time that falls in a cut to the next kept frame.

```jsonc
{
 "handle": "@creator", "theme": "pop",            // pop | clean | bold
 "trim": {"start": 0, "end": 23.6},               // cut IG end cards / dead tails
 "cuts": {"minGap": 0.35, "pad": 0.08},           // remove pauses ≥ 0.35 s (false = keep all)
 "focus": {"x": 0.5, "y": 0.36},                  // zoom origin = the face
 "script": ["…", "…"],
 "zooms": [{"at": 7.8, "scale": 1.22}],           // punch-ins; every cut gets an auto alternating 1.0/1.14
 "overlays": [
  {"type": "hook", "from": 0, "to": 8.9, "lines": ["\"Pick ONE niche\"", "— every growth guru ever"], "strikeAt": 7.8, "strikeLine": 0},
  {"type": "sticker", "group": "days", "at": 10.5, "to": 16.2, "emoji": "🏛️", "label": "Mythology", "tag": "KAL"},
  {"type": "slam", "from": 16.27, "to": 17.5, "text": "MULTI TALENTED", "sub": "bro 😎"},
  {"type": "warning", "from": 21.95, "text": "FOLLOW AT YOUR OWN RISK"}
 ],
 "outro": {"seconds": 1.8, "title": "follow for part 2", "cta": "FOLLOW"},   // false = none
 "music": {"bpm": 100, "volume": 0.08},            // synthesized, license-free; false = none
 "cover": {"title": "I'm *obsessed* with coffee", "kicker": "not the iced kind", "at": 8.5}   // at = source second for the background
}
```

| overlay | use it for | notes |
|---|---|---|
| `hook` | the claim in the first second, top third | `strikeAt` scribbles through `lines[strikeLine]` when the speaker rejects it |
| `sticker` | a list the speaker counts through | same `group` stacks top-down; `tag` is the small red chip |
| `slam` | **the** line: the turn, the punchline | full-screen stamp, flash, shake; hides captions while up. Max 2 per reel |
| `warning` | a closing CTA with attitude | caution tape crawling across; no `to` = through the outro |
| `behind` | a giant word *behind* the speaker (text-behind-subject), never over the face | needs `reels mask`; `text` with `|` line breaks, `y` = top px; add `"hideCaptions": true` if it meets the captions |
| `lyric` | kinetic lyric typography (the "lyric edit" look): a mixed-font composition beside or above the performer, each word arriving on its sung time | `x`,`y`,`align`,`rot`,`behind`; `words: [{t, at, style: serif|fat|neon|script|bold|outline, size, color, br, in: rise|drop|type}]` |
| `sparkle` / `emoji` / `flash` | twinkling stars in a box; floating emoji sticker; white flash + zoom-blur kick on a beat drop | `flash` takes only `at` |
| `insert` | a cutaway while the voice continues: art style, 3D card, GSAP/Motion Canvas title, explainer clip | `engine` + `props`, `mode: full|pip`, `label`. Engines and props: `skills/motion-engines` |

**Song / lip-sync reels** (someone performing to a track): `"cuts": false`, `"music": false`, real lyrics as timed `script` lines (whisper loops on songs: transcribe 8 s chunks with `-ml 1` for times), `"captionStyle": "lines"` (whole line, fade, no karaoke pop), and a theme that suits the footage's light (`lilac` for pink/purple). Keep text off the face: `"captionY": 200` puts the lyrics above the head.

**Bad room light**: `reels grade <dir>` (before `mask`) fixes red/magenta LED casts by rebuilding green and blue from the red channel; `--filter` takes any ffmpeg chain.

**Cutout effects** (macOS): `reels mask <dir>` writes `public/person.webm` (Apple Vision matte). `"person": {"outline": [{"from": 0, "to": 28}]}` draws a white sticker outline and glow around the speaker that kicks on every zoom, and lets `behind` overlays sit behind her.

SFX follow the graphics automatically (pop per sticker, whoosh + impact per slam, tick on the strike). They are real recordings from the shared kit (`workspace/shorts/cache/sfx-kit/`, Openverse CC0 / CC-BY), never synths unless offline. Each cue sits on its event frame and the render moves the file so its measured peak lands there (whoosh peaks 2 frames after the cut); repeated hits rotate takes. If the render writes `sfx-credits.txt`, put those lines in the caption. An overlay without `to` stays up to the very end, outro included.

## 4. Edit rules (what makes eyes keep going)

- **Hook in the first second**: a `hook` card from frame 0, and never trim the first spoken word.
- **Something changes every 2–4 s**: a cut, a punch-in, a sticker, a slam. QA warns past 6 s without a cut or punch-in.
- **Punch on meaning, not on a timer**: zoom in on the key word (`at` = that word's time), pull back to 1.0 at the start of the next thought. Alternate in/out; never two zoom steps within 0.35 s of each other (the builder drops the auto step when you put one near a cut).
- Escalate: the biggest zoom (1.25–1.3) and a `slam` on the turn of the reel.
- Keep captions under the face (they sit at y≈1340 of 1920, clear of IG's bottom UI and right rail). Stickers and the hook go in the top third.
- Max 2 slams, 1 warning, about 1 sticker group, and 1 insert per ~10 s. More than that is noise.
- An insert is a **metaphor** for what's being said ("my brain on coffee" → Van Gogh swirl; "an hour later I crash" → Munch's Scream; a number → 3D card). Keep `full` inserts to 1.5–2.5 s; use `pip` for longer ones so the face stays on screen.
- Don't remove the creator's own watermark or credit.

## 5. Check before you hand it over

1. `--stills` and **look** at every still: text over the mouth? A sticker cut off? Emoji rendering as boxes?
2. Full render. The QA report (`film-qa`, reel profile) must not be red. `longest stretch with no cut, punch-in or graphic` comes from the edit itself (exact): keep it under 4 s, **especially the first 5 s**. Fix the other yellows when they point at a real problem (dead air, loudness).
3. If `earshot` is installed: `reels critique <dir>` and fix its `critical` / `major` lines (silent cuts, synthetic-sounding hits, late whooshes). Rules: `skills/short-styles/references/sound.md`.
4. Contact-sheet the final: `ffmpeg -i out/reel.mp4 -vf "fps=2,scale=150:-1,tile=10x5" -frames:v 1 out/sheet.jpg`. Read it as a viewer would.

Tell the user where `out/reel.mp4` is, what you cut, and anything you guessed (an unclear word, a handle).
