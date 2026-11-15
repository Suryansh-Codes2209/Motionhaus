# Motionhaus

An AI video studio, packaged as a Claude Code plugin and built on [Remotion](https://remotion.dev). Everything it makes shares one motion kit, with different products and channels on top:

| What | Where | Is |
|---|---|---|
| **LaunchReel** | `skills/launch-video` | website URL → After-Effects-style launch film |
| **Launch Radar** | `apps/shorts` | faceless channel about new launches (`@thelaunchradar`): daily YouTube Shorts plus 2–3 YouTube long deep dives a week |
| **Deep dives** | `skills/long-form` | ~2-min 16:9 explainer per launch: chapters, end card, thumbnails, `.srt` subtitles instead of burned-in captions |
| **Video studio** | `skills/video-studio` | one video made by a crew of subagents: researcher, writer, photo editor, sound designer, editor, QA |
| **Reels** | `skills/insta-reels` | phone footage → Instagram reel: jump cuts, punch-ins, Hinglish captions, stickers, slams, outro |
| **Motion engines** | `skills/motion-engines` | 35 painting styles + 8 explainer grammars (huashu art engine), GSAP, Anime.js, Three.js/R3F, Rive, Motion Canvas, Satori, all frame-exact in Remotion |
| **Film QA** | `packages/film-qa` | pre-delivery gate (slideshow, blank frames, palette, loudness) + reference breakdown |
| **Edit styles** | `skills/short-styles` | per-video looks: radar, Vox explainer, clean explainer, neon UI, terminal |
| **Motion kit** | `packages/motion-kit` | Remotion scenes, components, styles, ported 21st.dev effects |
| **Audio + references** | `packages/audio-lib` | MCP server: license-tracked music/SFX, launch-video research |

Repo layout and data flow: [docs/architecture.md](docs/architecture.md).

## Status

Motionhaus is a working tool that runs one real channel every day, and it is still early. Before you rely on it, know that:

- **It runs on macOS only** (Apple Silicon recommended). The cloned voice, subject cutouts and timers use macOS features.
- **Writing scripts needs [Claude Code](https://claude.com/claude-code).** The pipeline renders, checks and posts; Claude does the research and writing.
- **Instagram posting is automatic; YouTube is not yet.** YouTube gets a ready-to-upload kit. API uploads from a Google project that has not passed YouTube's audit are locked to private.
- **The unattended maker is experimental.** It makes one episode a day and stops at any failed check. Expect some days with no video, and approve a new channel's first episodes yourself.
- **There is no guided setup yet.** Follow the sections below.

Read the **[Rules for using Motionhaus](RESPONSIBLE_USE.md)** before you point it at a real account.

## LaunchReel: launch films

```
/motionhaus:launch-video https://yourproduct.com 9:16 ~25s
```

Claude then:

1. Scaffolds a Remotion project and drops in the LaunchReel motion kit.
2. Captures the site with Playwright: desktop/mobile/full-page screenshots, logo, copy, CTAs, brand colors and fonts.
3. Writes a beat-timed script (hook, logo drop, product shot, features, stat, CTA) using only the site's real claims.
4. Fills one config file (`src/video.config.ts`), which drives the whole video.
5. Synthesizes **license-free** music and SFX with ffmpeg. The music is beat-synced with a drop on the logo reveal.
6. Renders still frames, looks at them, fixes problems, then renders the MP4.

## Where videos are saved

Each run creates a project inside `workspace/launch-films/` (gitignored; all generated files live under `workspace/`):

```
workspace/launch-films/<site>-launch/
├── out/<site>-launch.mp4     ← final video
├── public/site/              ← captured screenshots, logo, brand.json
├── public/audio/             ← generated music + SFX
└── src/video.config.ts       ← script/colors; edit and re-render
```

Preview and tweak a project with `cd workspace/launch-films/<site>-launch && npm run dev`.

## What's in the motion kit

| Piece | Effect |
|---|---|
| `KineticText` | word-by-word masked rise + blur + overshoot, `*accent*` gradient words |
| `BrowserFrame` / `PhoneFrame` | 3D-tilted device mockups, screen scroll or Ken Burns zoom |
| `GlassCard` | frosted feature cards with a light sheen sweep |
| `Background` | drifting color blobs + perspective grid |
| `LightLeak`, `Flash`, `Grain`, `Vignette` | film finishing layers |
| `CameraRig` | slow push-in, handheld drift, impact shake |
| transitions | custom zoom-punch + Remotion push-cut / slide / wipe, one beat each |
| audio | whoosh per cut, riser into the drop, impact, pops, ticks, music bed |
| `ParticleBurst` | sparks explode from center on every hit (`look.particles`) |
| `ShapeAssemble` | brand-colored shapes spiral in and burst into the logo (`logo` `style: 'assemble'`) |

Scenes: `hook`, `logo`, `screenshot`, `features`, `stat`, `quote`, `cta`, plus motion scenes modeled on the [Prompt Motion](https://prompt-motion.com/) categories:

| Scene | Category | Effect |
|---|---|---|
| `type` | Kinetic type | `slam` (word per half-beat, accent plates), `scramble` (decode), `stack` (outlined marquee rows) |
| `spotlight` | Product UI | cursor glides, clicks with ripple, camera pushes in, callout pill |
| `chat` | Product UI | prompt types, sends, "thinking" dots, answer streams in |
| `code` | Code | editor or terminal typing itself out with syntax colors |
| `chart` | Charts | bars spring up / line draws with glowing counting head |
| `steps` | Diagrams | "how it works" nodes ignite as connectors draw |

## Install

Requirements: Node 18+, ffmpeg (`brew install ffmpeg`).

```bash
git clone https://github.com/Suryansh-Codes2209/Motionhaus.git motionhaus
cd motionhaus
claude --plugin-dir .
```

Then run `/motionhaus:launch-video <url>`. You can also just ask: "make a launch video for https://…".

Dev setup for the whole repo (npm workspaces; the Remotion studio keeps its own lockfile so its versions stay exact):

```bash
npm i && npm run studio:install
npm run check      # typecheck + tests for every package and the studio
npm run sync       # copy packages/motion-kit into the shorts studio after editing the kit
npm run shorts -- make workspace/channels/<channel>/episodes/<slug> --stills 60
```

## Channels

One install runs any number of channels. A channel is a folder, `workspace/channels/<slug>/`, holding its settings (`channel.json`: name, handles, colours, voice, posting times, hashtags), brand mark, blocklist, episodes, review queue and ledger.

```bash
npm run shorts -- channel new ai-daily --name "AI Daily"   # creates the folder and tells you what to fill in
npm run shorts -- channel list                             # every channel, its accounts, modes and timers
npm run shorts -- channel default ai-daily                 # the channel used when none is named
npm run shorts -- --channel ai-daily make <episode-dir> --render
```

- **A channel can be about anything.** Start one from a template: `channel new <slug> --template launches|news-explainer|facts-lists|how-to`. Each gives a `brief.md` to fill in (what the channel covers, the voice, what counts as a source, what is off limits) and a `channel.json` with three blocks the pipeline enforces: `stories` (feeds, and what makes two stories "the same"), `rules` (which checks apply, with their numbers) and `publish` (badge, outro, credit line, YouTube category). See `skills/channel-brief`.
- **Stories are claimed before they are written:** `shorts story claim --title "…" --url <link> --key <short-name>` refuses a repeat, and reserves the story and its episode number for 24 hours.
- **Instagram is optional per channel.** A channel with no `instagram.handle` makes only the YouTube cut.
- A channel made before templates existed is brought up to date with `shorts --channel <slug> channel upgrade` (try `--dry-run` first); it changes nothing about how the channel behaves.
- Every `shorts` command acts on one channel: `--channel <slug>`, else the `MOTIONHAUS_CHANNEL` environment variable, else the default, else the only channel. With several channels and no default it stops and lists them; it never guesses.
- **Logins are per channel and live outside this folder**, in `~/.config/motionhaus/channels/<slug>.env` (the YouTube and Instagram tokens and the two upload modes). They are never read from the shared `.env`, so one channel cannot post as another. The shared `.env` keeps what every channel can share: audio providers, `GITHUB_TOKEN`, the Google client and the Meta app.
- Each channel has its own timers (`shorts --channel <slug> autopilot install`); `shorts autopilot status --all` shows them all.
- The models and voice tooling in `workspace/shorts/cache/` are shared by every channel.
- An install from before channels existed is moved with `npm run shorts -- channel migrate` (try `--dry-run` first). It becomes the channel `launch-radar`.

## Autopilot: Instagram posts by itself

Launch Radar can post one reel a day to Instagram from this Mac with nobody involved. It is off until you turn it on. Design: [docs/specs/2026-11-13-instagram-autopost-design.md](docs/specs/2026-11-13-instagram-autopost-design.md).

**One-time setup**

1. Make the Instagram account a Business or Creator account and link it to a Facebook Page.
2. At developers.facebook.com create an app (type Business), add Facebook Login, and keep it in development mode. Put its id and secret in `.env` as `META_APP_ID` and `META_APP_SECRET`.
3. `npm run shorts -- insta-auth` signs in and saves `INSTAGRAM_PAGE_TOKEN` and `INSTAGRAM_USER_ID` to the channel's own file (`~/.config/motionhaus/channels/<slug>.env`).
4. In the channel's `channel.json`, set `instagram.autoPostAfter` to the number of the last episode you already posted by hand. Nothing at or below it is ever posted.
5. Test with one reel: `npm run shorts -- insta-post --kit <nnn-slug> --dry-run`, then without `--dry-run`.
6. Set `INSTAGRAM_UPLOAD_MODE=auto` in the channel's file, then `npm run shorts -- autopilot install` (add `--maker` to also make episodes unattended).

**What runs**

| Command | Does |
|---|---|
| `shorts insta-post` | posts the reel due today from `review/instagram-reels/schedule.json`: at most one a day, never an entry dated before today, never a reel that fails the film-qa gate |
| `shorts autopilot install [--maker]` | loads the timers: the poster every 15 minutes from the slot (19:30 IST) to midnight; the maker daily at 10:00 IST |
| `shorts autopilot make` | what the maker runs: headless Claude makes one episode and books it, unless 3 or more days are already queued |
| `shorts autopilot status` | mode, sign-in, what is due, queue depth, whether the timers are loaded |
| `shorts autopilot uninstall` | removes the timers |

**Pause:** set `INSTAGRAM_UPLOAD_MODE=manual` in the channel's file. The timers keep running and post nothing.

Every post, skip and failure raises a macOS notification and a line in `workspace/channels/<channel>/autopilot.log`. The Mac must be awake around the slot; a reel whose day passed is not posted later by the timer (post it by hand with `--kit`).

Instagram's API cannot upload a custom cover from disk, so the cover is the hook frame of the reel itself. Trending audio, Topics and replying to comments are still done in the app. YouTube stays manual (`YOUTUBE_UPLOAD_MODE`).

## Free music & SFX library (MCP tools)

The plugin ships an MCP server (`.mcp.json` → `packages/audio-lib/src/mcp.mjs`, zero runtime dependencies) that lets Claude search and download free audio with the licensing tracked:

- **`search_audio`**: `query`, `type` (`music`|`sfx`), `minDurationSec`, `maxDurationSec`, `licenses`, `commercialUseOnly` (default **true**), `limit` (≤10).
- **`fetch_audio`**: `id`, `destDir`. Downloads the file, writes `<file>.license.json`, updates `ATTRIBUTION.md`/`.json` in `destDir`, and returns the path plus a ready-to-paste attribution line.

| Provider | Key | Used for |
|---|---|---|
| Openverse | none (optional `OPENVERSE_CLIENT_ID`/`_SECRET` raise the 20/min, 200/day limit) | primary search, music + sfx |
| Freesound | `FREESOUND_API_KEY` | sfx. HQ MP3 previews by default. Originals need `FREESOUND_OAUTH_TOKEN` + `FREESOUND_DOWNLOAD_ORIGINALS=1` |
| Jamendo | `JAMENDO_CLIENT_ID` | music. Most tracks are NonCommercial |
| Internet Archive | none | licensed audio items only |
| Local packs | none, offline | `assets/audio-packs/` (see its README) |

**Setup:** `cp .env.example .env` and fill in whichever keys you want (all optional, including the reference-research keys below). A missing key disables only that provider. Shell env vars override `.env`.

**Try it:**

```bash
node packages/audio-lib/src/cli.mjs search "whoosh transition" --type sfx --max 3
node packages/audio-lib/src/cli.mjs fetch <id-from-search> --dest ./my-video/public/audio/library
node packages/audio-lib/src/cli.mjs credits ./my-video/public/audio/library      # text for credits/descriptions
```

In Claude Code, ask: "find a CC0 riser under 4 seconds and download it into this project".

**Run the server by hand** (it speaks MCP over stdio): `node packages/audio-lib/src/mcp.mjs`. To add it to Claude Code without the plugin: `claude mcp add audio-library -- node /abs/path/motionhaus/packages/audio-lib/src/mcp.mjs`. Test it: `cd packages/audio-lib && npm i && npm run check` (live: `AUDIO_SMOKE=1 REFERENCES_SMOKE=1 npm run test:smoke`).

**License caveats**
- `commercialUseOnly` keeps only CC0, Public Domain, CC BY and CC BY-SA. It drops NC, ND and anything unknown or ambiguous (fail closed). ND is excluded because Creative Commons treats syncing audio to video as an adaptation.
- CC BY and BY-SA require credit: paste the attribution line into the video description or end card. BY-SA may also require sharing your adaptation under the same license; for a closed commercial video, prefer CC0/CC BY.
- Licenses are what the source declares. Internet Archive and Openverse items are uploader-tagged, so check the source page for anything high-stakes.
- Jamendo's own commercial licensing (Jamendo Licensing) is a paid service and is not integrated.
- Caches: search results for 24h, downloads deduped forever, in `workspace/cache/audio-lib/`. `AUDIO_OFFLINE=1` uses local packs only.

**Manual-download sources only** (no official API, so not scraped): Mixkit, Pixabay Music, YouTube Audio Library, BBC Sound Effects (RemArc license: personal/educational use only, not commercial). Download from their sites, check each item's license, and drop the files in a local pack with a `pack.json`.

## Launch-video reference research

Before you make a video, have Claude study real launch videos and build a brief from them:

```
/motionhaus:launch-references "An AI agent that answers support tickets" devtools ~30s
```

The skill searches for references, analyzes 3–5 of them, then reports a brief: length, hook, scene beats, BPM, and music/SFX moods that plug straight into `search_audio` and `/motionhaus:launch-video`.

Tools (same MCP server as the audio library):

| Tool | What it does |
|---|---|
| `search_launch_references` | `query`, `category?`, `sources?`, `maxResults?` (10), `maxDurationSec?`, `sinceDate?` → `{id, source, title, creator, url, publishedAt, durationSec, viewCount?, description, tags}` |
| `analyze_reference` | `url` → length, hook, structure (chapters), pacing, tone, transcript status. Missing evidence is reported as `"unknown"` and never guessed; `basedOn` lists the evidence used |
| `save_reference` | `url`, `notes`, `tags` → appends to `references/curated.yaml` (comments kept; duplicates skipped) |
| `build_launch_brief` | `productDescription`, `referenceUrls[]` → suggested length, hook, scene structure on a beat grid, pacing (BPM), music/SFX mood keywords, plus `unknowns` |

| Source | Key | Notes |
|---|---|---|
| `curated` | none | `references/curated.yaml`, your hand-picked videos. Ranked first (up to half the results when other sources are on) |
| `youtube-rss` | none | Channel feeds listed in `references/channels.yaml` (Linear, Vercel, Stripe, Figma, Raycast, Framer, Notion, Cursor). Latest ~15 uploads each, no durations |
| `youtube` | `YOUTUBE_API_KEY` | Data API v3 `search.list` + `videos.list` (durations, views, chapters) |
| `producthunt` | `PRODUCT_HUNT_TOKEN` | Top-voted launches in a date range (default: last 30 days) that have a video. No text search in the API, so filtering is local |
| `vimeo` | `VIMEO_TOKEN` | Search + Staff Picks; text tracks feed the transcript module |
| `hackernews` | none | Show HN / Launch HN via the Algolia HN API |

**Try it from the shell:**

```bash
node packages/audio-lib/src/cli.mjs refs search "introducing" --sources curated,youtube-rss --limit 5
node packages/audio-lib/src/cli.mjs refs analyze https://www.youtube.com/watch?v=ovxL42LkKNg
node packages/audio-lib/src/cli.mjs refs brief "AI agent for support tickets" https://www.youtube.com/watch?v=ovxL42LkKNg https://www.youtube.com/watch?v=rZk0QrxPpw8
node packages/audio-lib/src/cli.mjs refs save https://vimeo.com/123456 --notes "hook: black screen, one word" --tags film,minimal
```

**Quotas and terms**
- **YouTube Data API:** per Google's current [quota table](https://developers.google.com/youtube/v3/determine_quota_cost), `search.list` has its own bucket of **100 calls/day** (1 unit each), and `videos.list` uses the general 10,000 units/day. Quotas reset at midnight Pacific. A local guard (`${CLAUDE_PLUGIN_DATA}/references/youtube-quota.json`) refuses calls before either limit; set `YOUTUBE_SEARCH_DAILY_LIMIT`/`YOUTUBE_DAILY_UNITS` lower if other apps share the key. The guard only counts this plugin's calls. Each search uses 1 search call + 1 unit, and `analyze_reference` uses 1 unit.
- **YouTube transcripts:** the Data API only lets a video's owner download captions, so YouTube transcripts are reported unavailable instead of being scraped. Without `YOUTUBE_API_KEY`, YouTube lengths are `unknown`, because RSS and oEmbed don't include them.
- **Product Hunt:** "By default the Product Hunt API must not be used for commercial purposes." For business use, ask Product Hunt first (hello@producthunt.com). Maker names Product Hunt redacts are never shown.
- **Vimeo:** standard API rate limits apply per token. Staff Picks are read from the `staffpicks` channel.
- **Hacker News:** Algolia's public HN API, with no key. Results are launch discussions and the pages they link to, not always videos.
- Search results and analyses are cached for 24h (`REFERENCES_CACHE_TTL_HOURS`). Only links, metadata and derived notes are stored, and **no video files are downloaded**.

**Deliberately not supported** (no official API; not scraped): Land-book, Godly, Awwwards, Behance, Dribbble, X/Twitter, LinkedIn. Find references there by hand and add them with `save_reference` or by editing `curated.yaml`.

**Where things are stored:** caches and quota go to `${CLAUDE_PLUGIN_DATA}` when Claude Code provides it, because the plugin folder is replaced on update. In a dev checkout (`--plugin-dir`), `save_reference` writes `references/curated.yaml` in this repo. In a marketplace install it writes `${CLAUDE_PLUGIN_DATA}/curated.yaml`, seeded from the shipped file. Override with `LAUNCHREEL_REFERENCES_FILE`.

## Licence

Motionhaus's own code is [MIT](LICENSE). Two things are not covered by that licence (details in [NOTICE.md](NOTICE.md)):

- **Remotion**, which renders every video, is source-available under the [Remotion License](https://www.remotion.dev/docs/license): free for individuals and teams of up to 3 people, a company licence for larger organisations. Everyone who renders with Motionhaus needs to be covered themselves.
- **The Launch Radar name and artwork** (`apps/shorts/brand/`) belong to the author's channel and are here as an example. Make your channel with its own name and art.

Media:

- Generated music and SFX are synthesized locally, so there is nothing to license.
- Photos and sounds found by the search tools keep only commercial-use licences, and the credits each one requires are written next to the episode. Publish them with the video.
- If you swap in your own track, use the audio library above (attribution tracked automatically), or check that the track's licence allows commercial use.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), the [Code of Conduct](CODE_OF_CONDUCT.md) and, for security problems, [SECURITY.md](SECURITY.md).
