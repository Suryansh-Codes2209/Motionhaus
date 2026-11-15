# Launch Shorts pipeline: spec

Status: draft · 2026-10-21

> **2026-10-23:** the repo is now Motionhaus. `shorts/` moved to `apps/shorts/`, generated files (`episodes/`, `runs/`, `review/`, `ledger.json`) moved to `workspace/shorts/`, and the motion kit moved to `packages/motion-kit`. See [../architecture.md](../architecture.md). Paths below are the original ones.

## 1. Goal

A faceless YouTube Shorts channel that posts **1–2 vertical videos a day about products that launched in the last 24 hours**. Each video is made by the existing LaunchReel motion kit. The pipeline runs unattended, with one human approval step per day.

The test runs for one month (about 40 videos). It succeeds if the channel shows **retention**, not subscribers:

| Metric (YouTube Studio) | Target by week 4 |
|---|---|
| Viewed vs swiped away | ≥ 60% viewed |
| Average percentage viewed | ≥ 70% |
| Videos with > 1k views | ≥ 25% of uploads |
| Inbound "can you make one for us?" messages | ≥ 1 |

If week-4 numbers are below half of these targets, change the format (section 13) before posting any more.

### Non-goals (v1)
- Monetization. YPP needs 1k subscribers plus 10M Shorts views in 90 days, which a 30-day test won't reach.
- Long-form videos, TikTok/Instagram posting (phase 2), comment replies, thumbnails (Shorts don't use them).

## 2. Editorial rules (these constrain everything else)

1. **The channel covers launches. It doesn't pose as the product.** Today's LaunchReel output looks like an *official* launch film. For a third-party channel that would mislead viewers, so every short adds:
   - a persistent series bug ("◉ LAUNCH RADAR · #042") in the channel's own colors,
   - third-person narration ("Someone on Show HN just built…"), never "we",
   - a source line in the first 2s ("via Show HN") and in the description.
2. **Real claims only.** Copy, numbers and features come only from the captured site (`brand.json`) and the launch post. A sourced number like "312 points on Hacker News in 6 hours" is allowed and makes a good `stat` beat. The existing "never invent" rule in `launch-video/SKILL.md` applies as written.
3. **Opt-out list.** `shorts/blocklist.txt` lists domains that must never be featured. Anyone who asks to be removed is added, and their video is taken down within 24h.
4. **Content filter.** Skip crypto tokens, gambling, adult content, "make money" tools, anything needing a login to see the product, and sites whose capture is mostly a cookie wall or waitlist form.

## 3. Sources

| Source | How | Key | Commercial use | v1 |
|---|---|---|---|---|
| Show HN / Launch HN | Algolia HN API (reuses `audio-lib/src/references/sources/hackernews.mjs`) | none | OK | **on** |
| GitHub new + rising repos | Official REST search: `created:>{now-7d}`, sort by stars, filter repos with a `homepage` | `GITHUB_TOKEN` (optional, raises limits) | OK | **on** |
| Product Hunt | GraphQL API (existing `producthunt.mjs`) | `PRODUCT_HUNT_TOKEN` | **Not allowed by default.** API terms ban commercial use without permission | off until PH replies to an email to hello@producthunt.com |

GitHub Trending has no official API and is not scraped. That is consistent with the README's "no scraping" rule.

## 4. Architecture

```
launchd 06:30 IST
  └─ shorts run
      ├─ 1 fetch      sources → candidates.json
      ├─ 2 pick       score + filter + dedupe → top N (Claude ranks the shortlist)
      ├─ 3 capture    scripts/capture.mjs → public/site/
      ├─ 4 script     Claude (headless) → episode.json (scenes + VO lines + metadata)
      ├─ 5 voice      TTS per scene → vo/*.wav, durations
      ├─ 6 captions   whisper.cpp → word timestamps
      ├─ 7 audio      make-audio.sh (music bed + SFX), VO-aware length
      ├─ 8 render     remotion render (props = episode.json)
      ├─ 9 qa         automated checks + Claude still-frame review
      └─ 10 queue     → review/ (mp4 + metadata), notify
human: approve / reject (≈2 min)
      └─ 11 publish   upload (API once audited, else manual) → ledger
```

**Who does what:** a plain Node orchestrator handles the steps that must be predictable (fetch, capture, TTS, render, upload). Claude handles only the judgment steps: **pick**, **script** and **visual QA**. It is called through headless Claude Code (`claude -p --plugin-dir <launchreel> --output-format json`), which reuses the existing skill rules and the subscription and needs no extra API key. Every Claude step returns JSON that is checked against a schema. If validation fails, the step is retried once, then the episode is marked `failed`.

**Resumability:** every step writes to the episode folder and records `steps.<name>: done` in `episode.state.json`. Re-running `shorts run` resumes from the first step not marked done. No step overwrites another step's output.

## 5. Layout

```
launchreel/
  shorts/
    package.json            # zero runtime deps where possible (same style as audio-lib)
    src/
      cli.mjs               # shorts run | fetch | pick | make <id> | approve <id> | publish <id> | stats
      sources/{hn,github}.mjs
      steps/{fetch,pick,capture,script,voice,captions,audio,render,qa,queue,publish}.mjs
      tts/{kokoro,elevenlabs}.mjs     # one interface: synth(text, voice) → {wav, durationSec}
      youtube.mjs           # OAuth + videos.insert (resumable)
      ledger.mjs            # episodes.json read/write
      schema.mjs            # episode.json validation
    studio/                 # ONE persistent Remotion project (no per-video scaffolding)
      src/…                 # = launch-video template + Shorts additions (section 7)
    series.json             # channel name, colors, voice, posting times, counts
    blocklist.txt
    episodes/<date>-<slug>/ # one per video
      candidate.json  public/site/  vo/  captions.json  episode.json
      out/short.mp4   metadata.json  episode.state.json
    runs/<date>/            # candidates.json, shortlist.json for each daily run
    ledger.json             # every featured URL, episode number, status, YouTube id
    test/
```

`episodes/`, `ledger.json` and secrets are gitignored.

## 6. Steps in detail

### 1 · fetch
Pulls posts from the last 24h: HN `show_hn,launch_hn` with ≥ 20 points, and GitHub repos created in the last 7 days with ≥ 150 stars and a homepage. Each is normalised to `{source, id, title, url, sourceUrl, score, postedAt, text}`.

### 2 · pick
- **Hard filters:** URL in `ledger.json` (already featured), domain in `blocklist.txt`, content filter (section 2.4), URL unreachable.
- **Score:** `score_velocity = points / hours_since_post` (normalised per source).
- Claude receives the top 8 and returns the best N (`series.json: perDay`, default 2) with a one-line reason each. It prefers visual products (UI, demos, dev tools with a CLI) over "API only" or pure libraries.
- If fewer than N pass, post fewer. Never pad.

### 3 · capture
`scripts/capture.mjs <url> public/site` as it is today. Fail the episode if `hero.png` and `mobile.png` are both "weak". Claude makes that call in step 4 and returns `{"usable": false}`; the pipeline then moves on to the next pick.

### 4 · script
Claude gets `brand.json`, the captures, the launch post text and `series.json`, and returns `episode.json`:

```jsonc
{
  "episode": 42,
  "usable": true,
  "brand": { /* same shape as LaunchConfig.brand */ },
  "scenes": [
    { "type": "hook", "lines": ["Docs that *write* themselves?"], "vo": "Someone on Show HN just built docs that write themselves." },
    { "type": "logo", "style": "assemble", "vo": "It's called Inkwell." },
    { "type": "spotlight", "image": "site/hero.png", "focus": {"x":0.68,"y":0.32}, "label": "Auto-sync", "vo": "Point it at your repo and every page stays in sync." },
    { "type": "stat", "value": 312, "label": "points on *Hacker News*", "vo": "Three hundred points in six hours." },
    { "type": "cta", "headline": "Would you *use* this?", "url": "inkwell.dev", "vo": "Would you use it? Link in the comments." }
  ],
  "metadata": {
    "title": "Docs that write themselves? Inkwell just launched #shorts",
    "description": "…",            // template, section 10
    "tags": ["show hn", "developer tools", "…"],
    "pinnedComment": "Inkwell: https://inkwell.dev\nShow HN thread: https://news.ycombinator.com/item?id=…"
  },
  "sources": ["brand.json:headings[0]", "hn:points"]   // provenance of every claim
}
```

**Rules on top of `launch-video/SKILL.md`:**
- **≤ 50 VO words overall** (outro included), aiming for **20–25s**. *(Changed 2026-10-27 from ≤ 90 words / 25–40s after week 1 showed 61.5% swiping away. See the retention rules in `skills/short-styles/SKILL.md`.)*
- **Hook in the first 1.0s:** the product is on screen in frame 0 (`hook` with `image`), and the first VO sentence (≤ 10 words) leads with the known name or the payoff. No logo first, no "Hey guys", no "Someone just built…".
- At most 4 scenes. Every short ends on a **question CTA** (to get comments), not "visit our site".
- Numbers in VO are written as words, so TTS reads them correctly.
- `sources` must cite where each claim came from. QA rejects claims without a source.
- Every script names an edit `style` (`skills/short-styles`), and consecutive episodes never share one.

### 5 · voice
- **Default: Kokoro-82M**, run locally (Apache-2.0, free, runs on Apple Silicon). Voice is set in `series.json` and stays the same on every video, because the voice is the channel's identity.
- **Optional:** ElevenLabs behind the same interface (`TTS_PROVIDER=elevenlabs`), used if Kokoro's quality hurts retention in week 2.
- One WAV per scene, loudness-normalised. Each scene's measured duration sets its beat count (section 7).

### 6 · captions
Use `@remotion/install-whisper-cpp` with `transcribe()` (model `small.en`) on the joined VO to get word-level timestamps, then `@remotion/captions` → `captions.json`. The script text is known in advance, so whisper's words are matched to the script and spelling is always correct (brand names especially).

### 7 · audio
`make-audio.sh --bpm <bpm> --duration <total> --drop-beat <logo beat>`, unchanged. The music is **ducked to -18 dB under VO** with sidechain-style volume keyframes in Remotion, so make-audio.sh needs no changes. SFX stay on but sit about 6 dB lower than in launch films.

### 8 · render
`npx remotion render Short out/short.mp4 --props=episode.json --codec=h264 --crf=18` in `shorts/studio`. Motion blur stays on (renders run overnight, so speed isn't a concern).

### 9 · qa
**Automated, fail = no queue:**
- duration 15–58s, 1080×1920, 30 fps, has audio,
- integrated loudness −14 LUFS ±1 (`ffmpeg ebur128`),
- every caption word inside the Shorts safe zone (section 7),
- every `scene` with a number has a matching `sources` entry,
- title ≤ 70 chars, contains `#shorts`.

**Claude review:** render one still per scene at its settled frame, run the existing step-6 checklist from the skill, and also check that captions don't cover the product UI. Allow at most 2 rounds of fixes, then mark the episode `failed`.

### 10 · queue + notify
Copy `short.mp4` and `metadata.json` to `shorts/review/<date>/` and send a macOS notification (`terminal-notifier`, or an `osascript` fallback): "2 shorts ready for review". Phase 2 can push to a phone with Telegram bot or ntfy.sh.

### 11 · approve / publish
`shorts approve <id>` (or `reject <id> --reason`), then `publish`:

- **YouTube Data API `videos.insert`** (resumable upload, 1,600 quota units each, about 6/day on the default 10k). `privacyStatus: "public"` or a `publishAt` slot from `series.json`, `selfDeclaredMadeForKids: false`. If the voice is synthetic, set `containsSyntheticMedia` only if YouTube's disclosure rules require it. A narrated feature video normally doesn't, but this needs checking at setup.
- **Unverified API project restriction:** uploads from an unaudited API project are **locked to private**, and you can't make them public yourself. Until the audit passes (apply in week 1, it takes weeks), `publish` runs in **`manual` mode**: it opens YouTube Studio's upload page and prints the title, description, tags and pinned comment to paste. That's about 1 minute per video. When `YOUTUBE_UPLOAD_MODE=api` is set, it switches to full upload.
- After posting the pinned comment by hand (the API can post a comment but can't pin it), the ledger is updated with the YouTube id.

## 7. Remotion changes (`shorts/studio`)

Start from a copy of `skills/launch-video/template` plus these changes. The plugin skill stays as it is.

1. **Props, not a config file.** `Root.tsx` registers a `Short` composition. `calculateMetadata` reads `episode.json` input props and computes duration from the timeline. `LaunchVideo` takes the config as props, and `video.config.ts` remains the Studio default.
2. **VO-driven beats.** For each scene, `beats = max(minBeats[type], ceil(voSec × bpm / 60) + 1)`, so scene cuts still land on the beat grid and VO is never cut off. Put this in `timeline.ts` with a unit test.
3. **New layers** (overlays, not scenes):
   - `SeriesBug`: top-left "◉ LAUNCH RADAR · #042" plus source chip ("via Show HN"), in channel colors, visible the whole time.
   - `Captions`: 1–3 word pages, the active word gets the brand accent, big bold sans with stroke. Placed in the **safe zone**: centred horizontally, between 55% and 75% of frame height, ≥ 120px from the right edge (Shorts like/comment rail) and clear of the bottom 20% (title/channel overlay).
   - `VoiceOver`: per-scene `<Audio>` at each scene's start frame, plus the music-ducking volume curve.
4. **Shorts defaults:** `format: '9:16'`, `bpm: 120`, logo scene ≤ 4 beats (shorter than in launch films, since viewers swipe), first frame never black: frame 0 already shows the hook text.
5. Optionally render a **loop seam**: the last 0.5s cross-fades into a frame like frame 0, so replays (which count toward views) feel seamless.

## 8. Configuration

`shorts/series.json`:
```yaml
name: Launch Radar
handle: "@thelaunchradar"
colors: {bg: "#0D0C12", fg: "#F4F1EC", accent: "#FFB020", accent2: "#FF3D2E"}
fonts: {display: SpaceGrotesk, mono: JetBrainsMono}
brand: shorts/brand/             # mark.svg, wordmark, profile, banner
voice: {provider: kokoro, id: am_michael, speed: 1.05}   # final pick after listening test
captions: {burnIn: true, srt: true, wordsPerPage: 3, highlight: accent}
perDay: 2
publishSlotsIST: ["19:30", "21:30"]   # ≈ US morning
sources:
  hn: {minPoints: 20}
  github: {minStars: 150, maxAgeDays: 7}
```

`.env` (in the existing `.env.example` style): `GITHUB_TOKEN`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, `YOUTUBE_UPLOAD_MODE=manual|api`, `TTS_PROVIDER`, `ELEVENLABS_API_KEY`.

## 9. Scheduling

A macOS `launchd` agent (`~/Library/LaunchAgents/com.launchreel.shorts.plist`) runs `shorts run` at 06:30 IST, with `pmset` set to wake the Mac at 06:25. Logs go to `shorts/logs/<date>.log`. If the Mac is asleep or offline, the next run catches up: candidates from the last 36h are still allowed, and the ledger prevents duplicates.

Not GitHub Actions in v1: captures, whisper and motion-blur renders are heavy, and the local Mac is free.

## 10. Description template

```
{one-line what it is}. Launched on {source} {relative date}.

🔗 {product url}
💬 {source thread}

Not affiliated with {product}. Featured because it was trending on {source}.
Want your launch featured, or removed? Email {contact}.

{music attribution if any}
#shorts #{category} #buildinpublic
```

## 11. Testing

- Unit tests (`node --test`, same as audio-lib): source normalisation, scoring, dedupe against the ledger, blocklist, VO-to-beats timeline math, safe-zone checker, `episode.json` schema, description template.
- Recorded fixtures for the HN and GitHub responses. Live smoke tests behind `SHORTS_SMOKE=1`.
- One end-to-end dry run, `shorts run --dry-run --date 2026-10-20`, that goes through render and QA and stops before publishing.

## 12. Build plan

| Day | Deliverable |
|---|---|
| 1 | `shorts/` skeleton, ledger, fetch (HN + GitHub), pick with filters. Apply for YouTube API audit. |
| 2 | `studio/` from template: props-driven config, `SeriesBug`, VO-driven timeline + tests |
| 3 | Kokoro TTS + whisper captions + `Captions` layer + ducking |
| 4 | Claude script/pick/QA steps with schemas; first full episode end-to-end |
| 5 | QA checks, review queue, notifications, manual publish mode; launchd |
| 6–7 | 5 test episodes, tune hook/pace from looking at them, then go live |

## 13. Weekly review (what to change if numbers are weak)

| Symptom | First thing to try |
|---|---|
| Swiped away > 50% | Hook: stronger first line, product UI on screen by 0.5s, cut the logo scene |
| Average viewed < 60% | Shorter (20–25s), fewer scenes, faster VO (`speed: 1.1`) |
| Views fine, no subs | Make the series identity stronger: same opener phrase, numbered episodes, "follow for tomorrow's" end line |
| Everything flat after 20 videos | Switch the second daily slot to the data format: weekly "GitHub stars race" built from the `chart` scene |

## 14. Open questions

1. ~~Channel name~~: **Launch Radar** (the channel strategy lives with the channel's own files, outside the repo). Handle: **@thelaunchradar** (claimed).
2. Kokoro voice choice: listen to `am_michael`, `am_adam`, `af_heart`, `bf_emma` on one script before day 3.
3. Review on Mac only, or a phone notification from day 1?
4. Contact email for the description (feature / removal requests).
