# Multi-channel Motionhaus (part 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A channel is a folder; every `shorts` command acts on one chosen channel with its own settings, logins, files and timers; Launch Radar is migrated onto that layout and keeps posting.

**Architecture:** A new `channels.mjs` owns where channels live, which one is chosen, and where its secrets are. `loadConfig()` takes the chosen channel and hands back paths inside its folder, so nothing can reach channel files without choosing a channel. Timers, notifications and file names take the channel's slug and name. A resumable `shorts channel migrate` moves the existing install.

**Tech Stack:** Node ≥ 18.17 ESM `.mjs` with JSDoc types (`tsc`), `node:test`, launchd, Remotion studio (TypeScript) for the mascot flag.

**Spec:** `docs/specs/2026-11-13-multi-channel-design.md`

## Global Constraints

- Work only in the worktree `../motionhaus-channels` on branch `channels`. The main checkout runs live timers; nothing is merged there until Task 8.
- Never run `insta-post` (without `--dry-run`), `insta-auth`, `auth`, `publish`, `autopilot install|uninstall|make` or `channel migrate` (without `--dry-run`) against the real data before Task 8. Tests use temp directories and `MOTIONHAUS_DATA` / `MOTIONHAUS_CONFIG_HOME`.
- Layout: `<data>/channels.json` (`{"default": "<slug>"}`), `<data>/channels/<slug>/{channel.json, brand/, blocklist.txt, episodes/, long/, runs/, review/, ledger.json, autopilot.log, autopilot-state.json, maker-runs/}`. `<data>` = `MOTIONHAUS_DATA` or `<repo>/workspace`.
- Shared tooling stays at `<data>/shorts/cache` and is never moved.
- Channel secrets: `<config>/channels/<slug>.env`, mode 600, where `<config>` = `MOTIONHAUS_CONFIG_HOME` or `~/.config/motionhaus`. Channel-only keys: `YOUTUBE_REFRESH_TOKEN`, `YOUTUBE_UPLOAD_MODE`, `INSTAGRAM_PAGE_TOKEN`, `INSTAGRAM_USER_ID`, `INSTAGRAM_UPLOAD_MODE`. They are read only from that file; never from the root `.env` or the shell. Not loaded when `MOTIONHAUS_MAKER` is set.
- Slug: `/^[a-z0-9][a-z0-9-]*$/`.
- Channel choice order: `--channel`, `MOTIONHAUS_CHANNEL`, `channels.json` default, the only channel; otherwise fail and list the channels.
- Timer labels `com.motionhaus.<slug>.poster|maker`; launchd log `~/Library/Logs/motionhaus-<slug>.log`.
- No new npm dependencies. `npm test -w @motionhaus/shorts` and `npm run typecheck -w @motionhaus/shorts` pass after every task; commit after every task.
- No change a viewer could see in a Launch Radar video.

## Review Focus

1. A channel-only key left in the root `.env` or exported in the shell: it must be ignored for every channel, with a warning (Task 1).
2. An install with data in `workspace/shorts/` and no `channels/`: every command stops with "run `shorts channel migrate`", and the poster notifies once a day (Task 2).
3. An episode path inside channel B passed while channel A is chosen: refused, naming B (Task 2).
4. Migration interrupted after the move but before the secrets split: a second run finishes it and does not move or overwrite anything twice (Task 6).
5. Two channels whose reels have the same episode number: file names, schedule entries and timers never collide (Tasks 3, 5).

---

### Task 1: `channels.mjs`: where channels live and which one is chosen

**Files:** Create `apps/shorts/src/channels.mjs`; Test `apps/shorts/test/channels.test.mjs`

**Interfaces (produces):**
- `CHANNEL_KEYS: string[]` (the five keys above)
- `isSlug(s): boolean`
- `dataRoot(): string`, `configHome(): string`
- `channelsDir(data): string`, `channelDir(data, slug): string`, `secretsFile(slug, config?): string`
- `listChannels(data): Promise<string[]>` (folders that contain `channel.json`, sorted)
- `readDefault(data): Promise<string | null>`, `writeDefault(data, slug): Promise<void>`
- `resolveChannel({flag, env, data}): Promise<string>`; errors: unknown slug → `no channel "x" (channels: a, b)`; none → `no channels yet: run \`shorts channel new <slug>\``; ambiguous → `choose a channel with --channel (channels: a, b)`
- `needsMigration(data): Promise<boolean>`: `<data>/shorts/` has anything besides `cache`, and no channel exists
- `channelOf(data, absPath): string | null`: the slug whose folder contains the path
- `loadChannelEnv(slug, {config, rootEnv, processEnv, maker}): {values: Record<string, string>, warnings: string[]}`: values only from the secrets file; a channel key found in `rootEnv`/`processEnv` yields one warning naming the keys and is not used; `maker: true` returns no values
- `validateChannel(json): string[]`: `name` and `handle` non-empty strings, `colors.{bg,fg,muted,accent,accent2}`, `voice.{provider,id,speed}`, `captions.wordsPerPage`, `perDay`, `shortlist`, `lookbackHours`, `sources`; `instagram.handle`, `instagram.hashtags[]`, `instagram.slotsIST[]` when `instagram` is present; each error names the field

- [ ] Write failing tests for: slug rule; resolution order (flag > env > default > only one); the three error messages; `needsMigration` (cache-only → false; episodes present → true; channel exists → false); `channelOf`; secrets isolation (root and shell values ignored with a warning; maker gets nothing); `validateChannel` names the missing field and accepts today's `series.json`.
- [ ] Run → fail on import. Implement. Run → pass. Typecheck. Commit `Channels: layout, resolution, secrets isolation`.

### Task 2: `loadConfig` per channel and every call site

**Files:** Modify `apps/shorts/src/config.mjs`, `cli.mjs`, `designs.mjs`; Tests `apps/shorts/test/config.test.mjs` (create), existing tests that call `loadConfig` or `allScripts`

**Interfaces:**
- `loadConfig({channel?: string, data?: string, config?: string} = {})` → today's shape plus `channel: {slug, dir, secretsFile}`, `paths.cache` (= `<data>/shorts/cache`), `paths.brand`, `paths.data` (= the channel folder). `series` comes from `channel.json` (validated; errors thrown with the file path). `env.youtube.refreshToken`, `env.youtube.uploadMode`, `env.instagram.{pageToken, igUserId, mode}` come from `loadChannelEnv`; app-level keys still from the root `.env`. `envFile` stays the root file; `channel.secretsFile` is where `auth`/`insta-auth`/`upsertEnv` write the channel keys.
- `DATA_DIR` export is removed. `SHORTS_DIR`, `REPO_DIR`, `WORKSPACE_DIR` stay.
- `parseArgs` returns `{cmd, flags, args}` where `args` are positionals after the command with `--channel <slug>` (a global flag, allowed before or after the command) removed; all `process.argv[3]` reads become `args[0]`, `args[1]`.
- `main()`: `channel` subcommands and `help` run without a channel; everything else resolves one. If `needsMigration`, every command except `channel migrate` throws `this install has not been moved to the channel layout: run \`shorts channel migrate\``; for `insta-post` that message is also notified once a day to `<data>/shorts/autopilot.log`.
- `assertInChannel(cfg, absPath)`: throws `that path belongs to channel "b", not "a"` when `channelOf` says so; called for every `<episode-dir>` argument.
- `designs.report(data)` / `allScripts(data)` take the channel folder explicitly (no default).
- Shared cache call sites (`MODELS_DIR`, `tts-venv`, `hf`, `bin/cutout`) use `cfg.paths.cache`. `brandDir` uses `cfg.paths.brand`. The chatterbox voice sample `voice.ref` resolves from the channel folder first, then `SHORTS_DIR` (Launch Radar's existing path keeps working).
- `process.env.INSTAGRAM_UPLOAD_MODE` in `instaKit` becomes `cfg.env.instagram.mode`.

- [ ] Failing tests: `loadConfig` on a temp data root with two channels returns each one's paths and settings; secrets come only from the channel file; un-migrated tree → the refusal; `assertInChannel`; `parseArgs` handles `--channel x make dir --render` and `make dir --channel x`.
- [ ] Implement; fix every call site until typecheck is clean and all tests pass. Commit `Config: per-channel paths and logins; --channel`.

### Task 3: Names, file names, Instagram defaults, mascot

**Files:** Modify `cli.mjs`, `insta-post.mjs`, `instagram.mjs`, `youtube.mjs`, `photos.mjs`, `props.mjs`, `steps/make.mjs`, studio `longform/Host.tsx`, `longform/Thumbnail.tsx`, `shorts/Headshot.tsx`, `shorts/sample.ts`; update tests

**Interfaces:**
- `postDue` deps gain `channelName: string`; every notification title uses it in place of "Launch Radar". CLI notifications likewise.
- Kit base name `${cfg.channel.slug}-${n}-${slug}`; `upload.txt` headers use `series.name.toUpperCase()`.
- `IG_DEFAULTS` loses `handle` and `hashtags` (keeps `maxHashtags: 6`, `slotsIST: ['19:30']`); `igConfig(series)` throws `channel.json: instagram.handle is missing` when used without one.
- Sign-in pages say `${name} is connected…`; `createYouTube` takes an optional `label`.
- Photos User-Agent: `Motionhaus/<package version>` with no channel name or owner URL.
- `channel.json` `mascot?: boolean`. `buildProps` passes `series.mascot`. `prepare()` in `make.mjs` throws `this channel has no mascot: a headshot short needs a filmed \`face\` take` for a headshot script without `face` when `mascot` is not true; long-form omits the host and never picks the `react` thumbnail without it. Studio components render nothing where the mascot would be when `series.mascot` is false.
- Launch Radar's defaults file `apps/shorts/series.json` gets `"mascot": true`.

- [ ] Failing tests: notification titles carry the channel name; two channels' kits for episode 5 get different file names; `igConfig` without a handle throws; headshot-without-face refusal; UA has no channel name. Implement. `npm run typecheck` at the root (studio included). Commit `Channel name everywhere; mascot optional`.

### Task 4: `shorts channel list|new|default`

**Files:** Modify `cli.mjs`; Create `apps/shorts/src/channel-cmds.mjs`; Test `apps/shorts/test/channel-cmds.test.mjs`

**Interfaces:**
- `createChannel({data, config, slug, name, defaultsDir}): Promise<string>`: refuses an existing slug or a bad slug; copies `series.json` → `channel.json` with `name` set, `handle: ""`, `instagram.handle: ""`, no `instagram.autoPostAfter`, `mascot` removed; copies `brand/` and `blocklist.txt`; writes the secrets file (600) with both modes `manual`; sets it as default only if it is the first channel. Returns the text of what to fill in.
- `describeChannels({data, config, loaded: (label) => Promise<boolean>}): Promise<row[]>` for `list` and `autopilot status --all`.

- [ ] Failing tests on a temp tree; implement; commit `shorts channel list, new, default`.

### Task 5: Timers per channel

**Files:** Modify `autopilot.mjs`, `cli.mjs`, `autopilot/maker-prompt.md`; update `test/autopilot.test.mjs`

**Interfaces:**
- `labels(slug): {poster, maker}`; `OLD_LABELS` = the two `work.suryansh.motionhaus.*` (for migration).
- Jobs run `[node, cli, '--channel', slug, 'insta-post']` and `[…, 'autopilot', 'make']`.
- `makerSettings({base, repoDir, channelDir, configHome})`: `Edit(//<channelDir>/**)` allowed; denied `Edit` on that channel's `ledger.json`, `autopilot-state.json`, `review/instagram-reels/schedule.json`, `channel.json`; denied `Read` and `Edit` on `//<configHome>/**` and the repo `.env`. Written to `<configHome>/maker-settings-<slug>.json` on each run.
- `makerPrompt(template, {name, slug, channelDir})` fills `{{name}}`, `{{slug}}`, `{{dir}}`; the template tells the maker to work only inside `{{dir}}` and that `shorts` already targets this channel (`MOTIONHAUS_CHANNEL` is set in its environment).
- `autopilot status --all` prints one line per channel.

- [ ] Failing tests: labels and arguments per slug; settings confine edits to the channel and deny config home; prompt has no unfilled `{{`. Implement. Commit `Timers and maker per channel`.

### Task 6: `shorts channel migrate`

**Files:** Create `apps/shorts/src/migrate.mjs`; Modify `cli.mjs`; Test `apps/shorts/test/migrate.test.mjs`

**Interfaces:**
- `planMigration({data, repoDir, config}): Promise<{slug: 'launch-radar', steps: {id, what, done: boolean}[], counts: {episodes, ledger, schedule}}>`
- `migrate({data, repoDir, config, rootEnvFile, defaultsDir, dryRun, timers: {running(): Promise<boolean>, removeOld(): Promise<string[]>, install(which: string[]): Promise<void>}}): Promise<{moved: string[], counts: {before, after}}>`
- Steps, each idempotent and checked: (1) refuse if `timers.running()` or a `schedule.json.lock` exists; (2) `timers.removeOld()` returns which were loaded; (3) create the channel folder, copy `series.json` (+ `mascot: true`) → `channel.json`, `brand/`, `blocklist.txt` unless already there; (4) `fs.rename` every entry of `<data>/shorts/` except `cache` into the channel folder, skipping entries already moved, failing if the destination exists with different content; (5) move the five channel keys from the root `.env` to the secrets file (600), removing them from the root file only after the secrets file is written; (6) write `channels.json`; (7) `timers.install(loadedBefore)`; (8) counts before and after must match or the command fails loudly.
- A marker `<channel>/.migrated` is written last; with it present the command says "already migrated" and does nothing.

- [ ] Failing tests on a temp tree shaped like the real one: counts preserved; cache untouched; `.env` split exactly; `--dry-run` changes nothing; stop after step 4 then rerun → completes; rerun after completion → no-op; running timer → refused. Implement. Commit `shorts channel migrate`.

### Task 7: Docs and skills

**Files:** `README.md`, `docs/architecture.md`, `skills/*/SKILL.md`, `.env.example`, `apps/shorts/autopilot/maker-prompt.md`

- [ ] Replace `workspace/shorts/<x>` paths with `workspace/channels/<slug>/<x>`; add a short "Channels" section to the README (list, new, default, `--channel`, where logins live); move the five channel keys out of `.env.example` into a documented `channels/<slug>.env` block. `npm run check` at the root. Commit `Docs: channels`.

### Task 8: Cutover (owner's machine, real data)

- [ ] Whole-branch review; fixes.
- [ ] In the main checkout, confirm today's reel has posted and no maker or poster run is in progress.
- [ ] Merge `channels` into `main` there; `shorts channel migrate --dry-run`; then the real run.
- [ ] `shorts autopilot status`, `shorts ledger | tail -1`, `shorts insta-post --dry-run`; confirm the timers are loaded under the new labels and the poster ran once with exit 0.
- [ ] Push `main`.
