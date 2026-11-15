# Motionhaus for anyone, part 1: channels

Status: draft for approval · 2026-11-13

## 1. Intent

Motionhaus should be something another person can install on their own Mac, point at their own YouTube and Instagram accounts, and run as their own channel on any topic. Today it is one channel, Launch Radar, wired into the code.

The owner chose: people set it up and run it themselves (not a hosted service), channels can be about anything, and the build is the "general engine plus starter templates" approach. That is three projects, in this order:

1. **Channels (this document):** take Launch Radar out of the code; one install runs several channels, each with its own settings, logins, files and timers.
2. **Briefs and templates:** a written brief per channel, Claude-driven story finding for any topic, starter templates (product launches, news explainer, facts and lists, how-to tips).
3. **Setup and release:** guided setup, YouTube in the automatic poster, docs, public repo.

Part 1 changes no behaviour a viewer could see. When it lands, Launch Radar runs exactly as it does today, as the first channel on the new layout, and a second channel can be created by hand and run beside it.

## 2. Goals, non-goals, anti-goals

**Goals**
- A channel is a folder. Everything that makes a channel itself (name, handle, colours, fonts, voice, posting times, hashtags, sources, blocklist, brand mark, logins, queue, ledger, episodes) lives in that folder and nowhere in the code.
- Every `shorts` command acts on one channel, chosen explicitly or by a default.
- Each channel has its own timers; installing, pausing or removing one never touches another.
- Launch Radar is migrated by one command, with its 79 episodes, ledger, schedule and sign-ins intact, and keeps posting.

**Non-goals (later parts)**
- Topics other than product launches. The story finders (Hacker News, GitHub) and the writing skills still assume launches; part 2 changes that. A second channel made in part 1 is another launch channel with its own brand.
- A setup wizard, YouTube auto-posting, public release, docs for strangers. Part 3.
- The launch-film skill (`launch-video`) and the phone-footage reels app (`apps/reels`). They are not channel-bound and stay as they are.
- Running on anything but a Mac.

**Anti-goals**
- A missed or doubled Launch Radar post because of the migration.
- One channel posting with another channel's login, or a reel landing in another channel's queue.
- A command that silently picks a channel when the choice is ambiguous.
- Losing or overwriting existing episodes, the ledger or the schedule.

## 3. What exists today

- `apps/shorts/series.json` already holds most channel settings; `apps/shorts/brand/` holds the mark; `apps/shorts/blocklist.txt` the blocklist.
- Generated files live in `workspace/shorts/` (episodes, long, runs, review, ledger, cache, autopilot log and state). Path constants are defined in `apps/shorts/src/config.mjs` and used by `cli.mjs` and `designs.mjs`; three other packages hard-code the shared `workspace/shorts/cache` path.
- One `.env` at the repo root holds shared keys (audio providers, GitHub, Google client, Meta app) and the channel's own tokens (`YOUTUBE_REFRESH_TOKEN`, `INSTAGRAM_PAGE_TOKEN`, `INSTAGRAM_USER_ID`) and switches (`YOUTUBE_UPLOAD_MODE`, `INSTAGRAM_UPLOAD_MODE`).
- The Remotion studio already takes the series name, handle and colours from props, and the mark from the episode's `public/brand/`. The mascot ("Rado") is Launch Radar art, used by the long-form host, a thumbnail variant and the headshot short.
- "Launch Radar" is typed into about 20 places: notification titles, kit file names (`launch-radar-<n>-<slug>`), `upload.txt` headers, the sign-in pages, the default Instagram handle, the photo fetcher's User-Agent, the timer labels (`work.suryansh.motionhaus.*`), the maker prompt.
- Two launchd agents are installed and live: poster and maker.

## 4. Approaches

| | What | Trade-off |
|---|---|---|
| **A channel folder under the data directory (chosen)** | `<data>/channels/<slug>/` holds `channel.json`, `brand/`, `blocklist.txt`, `.env`, and that channel's generated files | User data stays out of the code tree, so the repo can go public and be updated without touching it. Needs a one-time move of Launch Radar's files |
| One app per channel under `apps/` | What `docs/architecture.md` says today: copy `apps/shorts` for each channel | No migration, but every channel is a fork of the code; a fix has to be made N times and a stranger's channel would live inside the repo |
| Keep one layout, add a `--series <file>` flag | Point the CLI at a different `series.json`, share the workspace | Smallest change, but queues, ledgers and logins would be shared or collide, which is the anti-goal |

## 5. Design

### 5.1 Layout

```
<data>/                              MOTIONHAUS_DATA, default <repo>/workspace (unchanged)
  channels.json                      {"default": "launch-radar"}
  channels/
    launch-radar/
      channel.json                   today's series.json, same fields
      brand/mark.svg …               today's apps/shorts/brand
      blocklist.txt
      episodes/ long/ runs/ review/ ledger.json
      autopilot.log autopilot-state.json maker-runs/
  shorts/cache/                      shared tooling, NOT moved (see below)
  launch-films/ reels/ cache/        not channel-bound, unchanged

~/.config/motionhaus/channels/
    launch-radar.env                 this channel's tokens and switches (mode 600)
```

`workspace/shorts/cache/` (about 5.8 GB: the Whisper and Kokoro models, the earshot install, the Chatterbox voice environment, the SFX kit, the compiled cutout tool) is machine tooling shared by every channel and by `apps/reels`, `packages/audio-lib` and `packages/film-qa`, which point at that exact path. It stays where it is. Moving it would break the Python environments (they record absolute paths) and silently switch Launch Radar's voice to the fallback. Only `cache/designs`-style per-channel files, if the builder finds any, move with the channel.

`apps/shorts/series.json`, `apps/shorts/brand/` and `apps/shorts/blocklist.txt` stay in the repo as the defaults a new channel is created from. They stop being read at run time.

### 5.2 Choosing the channel

In order: `--channel <slug>` on the command, then the `MOTIONHAUS_CHANNEL` environment variable, then `channels.json` → `default`, then the only channel if exactly one exists. Otherwise the command fails and lists the channels. A slug is lowercase letters, digits and dashes.

When a command is given an episode or kit path that sits inside a different channel's folder than the one chosen, it refuses and says which channel the path belongs to.

`loadConfig()` returns the same shape as today plus `channel: {slug, dir}`; its `paths` point into the channel folder. The exported constants `DATA_DIR`, `SHORTS_DIR` used for per-channel files are replaced by `cfg.paths.*` so nothing can reach a channel's files without having chosen a channel. `SHORTS_DIR` (code location) and `WORKSPACE_DIR` remain.

### 5.3 Secrets and switches

Root `.env`: keys shared by every channel and safe to share (audio providers, `GITHUB_TOKEN`, `YOUTUBE_API_KEY`, `YOUTUBE_CLIENT_ID/SECRET`, `META_APP_ID/SECRET`, `TTS_PROVIDER`, `ELEVENLABS_API_KEY`).

Channel env file (`~/.config/motionhaus/channels/<slug>.env`, outside the data tree so the unattended maker, which reads untrusted web pages and can write inside the channel folder, cannot reach it): `YOUTUBE_REFRESH_TOKEN`, `YOUTUBE_UPLOAD_MODE`, `INSTAGRAM_PAGE_TOKEN`, `INSTAGRAM_USER_ID`, `INSTAGRAM_UPLOAD_MODE`. A channel may also set its own `META_APP_ID/SECRET` or Google client to override the shared ones.

These five channel keys are read **only** from the channel's env file. If they are present in the root `.env` or the shell they are ignored, with one warning, so a new channel can never inherit another channel's login. `shorts auth` and `shorts insta-auth` write to the channel's env file. When `MOTIONHAUS_MAKER` is set (inside the maker run) the channel env file is not loaded at all: making and packing an episode needs no login.

### 5.4 Names

Every user-visible "Launch Radar" comes from `channel.json` `name`: notification titles, `upload.txt` headers, sign-in pages, the maker's result line. Kit file names become `<slug>-<n>-<episode-slug>` (for Launch Radar that is still `launch-radar-…`, so nothing is renamed). The default Instagram handle and hashtags in code are removed; `channel.json` must give them. The photo fetcher's User-Agent becomes generic (`Motionhaus/<version>`), with no channel name.

The mascot (Rado) is Launch Radar's art and becomes optional: `channel.json` `mascot: true` keeps him, and the migration sets it for Launch Radar. The flag governs every place he appears: the long-form host and the `react` thumbnail variant, and the headshot short, where he speaks when the script has no `face` take. For a channel without a mascot, the long-form host is left out, the `react` thumbnail is not offered, and `shorts make` refuses a headshot script that has no `face` take, saying so. No new layout is designed in part 1.

### 5.5 Timers

Labels become `com.motionhaus.<slug>.poster` and `com.motionhaus.<slug>.maker`; each job runs `shorts --channel <slug> …`. `shorts autopilot install|uninstall|status` act on the chosen channel; `status --all` lists every channel in one table. The maker prompt takes the channel name and slug as parameters. The maker's settings file is generated per channel at `autopilot install` (written next to the plist data, not in the repo), with absolute paths: it may edit only inside that channel's folder; it is denied that channel's `ledger.json`, `review/instagram-reels/schedule.json` and `autopilot-state.json`; and it is denied reading `~/.config/motionhaus/`. Absolute paths also make the rules hold when `MOTIONHAUS_DATA` points outside the repo. One channel's maker therefore cannot touch another channel's files or any login. The maker child process gets `MOTIONHAUS_CHANNEL` so everything it runs stays in that channel. The launchd log becomes `~/Library/Logs/motionhaus-<slug>.log`.

### 5.6 Commands added

- `shorts channel list`: slug, name, handles, modes, whether timers are loaded, which is default.
- `shorts channel new <slug> [--name "…"]`: creates the folder from the repo defaults with empty handles and both modes `manual`, and prints what to fill in. (The guided version is part 3.)
- `shorts channel default <slug>`.
- `shorts channel migrate`: the one-time move for an existing install (5.7).

### 5.7 Migrating Launch Radar

**Cutover.** The live timers run the code in this checkout, so new code is live the moment it is on disk. The work is therefore built on a branch in a separate git worktree and never checked out here until cutover. Cutover is one sitting, after that day's reel has posted: merge to `main` here, run `shorts channel migrate`, check the status. Running the real migration on Launch Radar is part of this project.

On an install that has not been migrated (old `workspace/shorts/` present, no `channels/`), every command stops with "run `shorts channel migrate`", and `insta-post` raises that as a notification once a day. There is no legacy mode.

`shorts channel migrate [--dry-run]`. If a previous run stopped part-way it resumes; if migration is already complete it says so and does nothing:

1. Refuse while a poster or maker run is in progress (lock file present, or the old launchd job is running).
2. Boot out the two old timers (`work.suryansh.motionhaus.*`) and delete their plists.
3. Create `channels/launch-radar/`; copy `series.json` → `channel.json`, `brand/`, `blocklist.txt`.
4. Move (rename, same disk) everything in `workspace/shorts/` except `cache/` into the channel folder: `episodes`, `long`, `runs`, `review`, `ledger.json`, `autopilot.log`, `autopilot-state.json`, `maker-runs`, and anything else found there, so nothing is orphaned.
5. Move the five channel keys from the root `.env` into the channel env file, leaving the shared keys.
6. Write `channels.json` with `default: launch-radar`.
7. Reinstall the timers that were loaded before, under the new labels, and run the poster once.
8. Print a before/after count of episodes, ledger entries and schedule entries, and `shorts autopilot status`.

Every step is checked before the next; a failure stops with the tree in a state the command can resume from when run again. `--dry-run` prints the plan and touches nothing. Episode folders hold absolute paths nowhere that matters (props are rebuilt by `make`); the builder verifies this before relying on it.

## 6. Calls made by the designer, for the owner to check

1. Channels live under the existing data directory (`workspace/channels/`), not in a new home folder. Moving the default location for fresh installs (out of `~/Documents`, which macOS guards) is left to part 3.
2. The first channel's slug is `launch-radar`.
3. A channel's logins are never read from the shared `.env`, even as a fallback, and they are stored outside the project folder (`~/.config/motionhaus/`) where the unattended maker cannot read them.
7. The shared tooling cache is not moved or duplicated per channel.
8. The work is built away from this checkout and switched over in one sitting, because the live timers run this checkout's code.
9. A channel without a mascot cannot make a headshot short without a filmed face; it gets a clear refusal, not a new layout.
4. Rado the mascot stays Launch Radar's only; other channels get no mascot until they supply art.
5. The old repo-level `series.json` and `brand/` become the template for new channels in part 1, and are replaced by real templates in part 2.
6. Migration is done right after the code lands, on a day when today's reel has already posted, so a problem costs no post.

## 7. Left to the builder

- How `--channel` is parsed alongside existing flags and positional paths.
- The exact refactor of `config.mjs` and the call sites in `cli.mjs` and `designs.mjs`.
- Whether `channel.json` gets a schema check at load (recommended: fail with the field name).
- Test layout. Required coverage: channel resolution order and the ambiguous case; secrets isolation (a root-level channel key is ignored; the env file is not loaded inside the maker); the generated maker settings (edits confined to the channel, queue/ledger/state and `~/.config/motionhaus` denied); the un-migrated-install refusal; mascot off (headshot without `face` refused); a path from another channel is refused; migration on a temp tree (counts preserved, `.env` split, idempotent resume, `--dry-run` touches nothing); timer labels and arguments per channel.
- Updating `README.md`, `docs/architecture.md` and the skills where they name paths under `workspace/shorts/`.
