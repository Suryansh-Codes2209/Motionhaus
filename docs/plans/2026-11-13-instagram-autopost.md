# Instagram Auto-posting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launch Radar's Mac makes one reel a day and posts it to `@thelaunchradar.hq` through the Instagram API with nobody in the loop.

**Architecture:** A zero-dependency Graph API client beside `youtube.mjs`, pure queue rules over the existing `review/instagram-reels/schedule.json`, a `shorts insta-post` command that gates and posts the due reel, and two launchd agents (poster, maker). Everything is off until `INSTAGRAM_UPLOAD_MODE=auto`.

**Tech Stack:** Node ≥ 18.17 ESM (`.mjs`, JSDoc types checked by `tsc`), `node:test`, global `fetch`, launchd, Claude Code headless (`claude -p`).

**Spec:** `docs/specs/2026-11-13-instagram-autopost-design.md`

## Global Constraints

- No new npm dependencies. No cloud service or hosting.
- Facebook Login route only: `https://graph.facebook.com/<version>`, upload to `https://rupload.facebook.com/ig-api-upload/<version>/<container-id>`. One `GRAPH_VERSION` constant (`v27.0`).
- Permissions: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `pages_show_list`.
- Instagram limits: caption ≤ 2,200 characters, ≤ 30 hashtags, ≤ 20 mentions; file ≤ 300 MB.
- `.env` keys: `META_APP_ID`, `META_APP_SECRET`, `INSTAGRAM_PAGE_TOKEN`, `INSTAGRAM_USER_ID`, `INSTAGRAM_UPLOAD_MODE=manual|auto` (default `manual`). Nothing posts unless the mode is `auto` or `--kit` is passed.
- All dates and times are IST (`UTC+5:30`), as `YYYY-MM-DD` and `HH:MM`, the way `instaKit` already computes them.
- Never post an entry dated before today, an entry with `posted` or `blocked`, or an entry whose `n` ≤ `series.instagram.autoPostAfter`. At most one post per IST day.
- `shorts publish` (YouTube) and the look of any video stay untouched.
- Tests run with `npm test -w @motionhaus/shorts`; types with `npm run typecheck -w @motionhaus/shorts`. Both must pass after every task.
- Commit after each task on `main`.

## Review Focus

1. The upload succeeds but the process dies before `posted` is written: the next run must not post the same reel again (Task 4: publish with an already-`PUBLISHED` container / saved `containerId`).
2. `autoPostAfter` is missing from `series.json`: the poster must refuse to post and say why, not treat it as 0 (Task 2).
3. Two poster runs overlap (launchd fires while a slow upload is running): only one may post (Task 4: lock file).
4. The Page token is dead (password change): the error must name `shorts insta-auth`, and one notification, not one every 15 minutes (Task 4).
5. An episode number string like `"044"` compared with `autoPostAfter: 44`: compare as numbers (Task 2).

---

### Task 1: Instagram Graph client

**Files:**
- Create: `apps/shorts/src/instagram-api.mjs`
- Test: `apps/shorts/test/instagram-api.test.mjs`

**Interfaces:**
- Produces:
  - `GRAPH_VERSION: string`, `SCOPES: string[]`
  - `validateReel(caption: string, sizeBytes: number): string[]` (empty = fine)
  - `createInstagram({pageToken, igUserId, fetchImpl?, sleep?}) → {account(), createContainer(opts), upload(containerId, file), waitFinished(containerId), publish(containerId), publishReel(file, opts, onStep?)}`
    - `account(): Promise<{id: string, username: string}>`
    - `ReelOpts = {caption: string, thumbOffsetMs?: number, shareToFeed?: boolean, userTags?: string[]}`
    - `publishReel(file, opts, onStep?: (step: 'container'|'uploaded'|'finished', containerId: string) => Promise<void>|void): Promise<{id: string, permalink: string, containerId: string}>`
    - `containerStatus(containerId): Promise<'IN_PROGRESS'|'FINISHED'|'PUBLISHED'|'ERROR'|'EXPIRED'>`
  - `exchangeToken({appId, appSecret, userToken, fetchImpl?}): Promise<string>` (long-lived user token)
  - `findAccount({userToken, handle, fetchImpl?}): Promise<{pageToken: string, igUserId: string, username: string, page: string}>`; throws listing the usernames found when none matches `handle` (compare without `@`, case-insensitive)
  - Errors thrown by API calls are `Error` with `message` starting `Instagram API <status>:` and a `code` property holding Graph's `error.code` (190 = dead token).

- [ ] **Step 1: Write the failing tests** (fake `fetchImpl` recording calls, as in `test/youtube.test.mjs`)

```js
test('validateReel: caption and size limits', () => {
  assert.deepEqual(validateReel('ok #a @b', 1000), []);
  assert.match(validateReel('x'.repeat(2201), 1000).join(), /2,200/);
  assert.match(validateReel(Array(31).fill('#t').join(' '), 1000).join(), /30 hashtags/);
  assert.match(validateReel(Array(21).fill('@u').join(' '), 1000).join(), /20 mentions/);
  assert.match(validateReel('ok', 301 * 1024 * 1024).join(), /300 MB/);
});

test('publishReel: container → rupload → poll → publish → permalink', async () => {
  // fetch fake: POST /IG/media → {id:'C1'}; POST rupload → {success:true};
  // GET /C1?fields=status_code → IN_PROGRESS then FINISHED;
  // POST /IG/media_publish → {id:'M1'}; GET /M1?fields=permalink → {permalink:'https://www.instagram.com/reel/x/'}
  const r = await ig.publishReel(file, {caption: 'cap', thumbOffsetMs: 1200, shareToFeed: true, userTags: ['@maker']});
  assert.deepEqual(r, {id: 'M1', permalink: 'https://www.instagram.com/reel/x/', containerId: 'C1'});
  const create = calls[0];
  assert.match(create.url, /graph\.facebook\.com\/v27\.0\/IG\/media$/);
  assert.equal(create.body.get('media_type'), 'REELS');
  assert.equal(create.body.get('upload_type'), 'resumable');
  assert.equal(create.body.get('thumb_offset'), '1200');
  assert.equal(create.body.get('share_to_feed'), 'true');
  assert.equal(create.body.get('user_tags'), JSON.stringify([{username: 'maker'}]));
  const up = calls[1];
  assert.equal(up.url, 'https://rupload.facebook.com/ig-api-upload/v27.0/C1');
  assert.equal(up.headers.authorization, 'OAuth PT');
  assert.equal(up.headers.offset, '0');
  assert.equal(up.headers.file_size, String(size));
});

test('publishReel: ERROR status throws with the status; EXPIRED too', ...);       // /status ERROR/
test('waitFinished gives up after 40 polls', ...);                                 // /still processing/
test('API error carries Graph code', ...);                                         // err.code === 190, message /^Instagram API 400: /
test('findAccount picks the Page whose Instagram username matches the handle', ...); // '@TheLaunchRadar.HQ' matches 'thelaunchradar.hq'
test('findAccount lists what it found when nothing matches', ...);                  // /found: other_account/
test('exchangeToken calls oauth/access_token with fb_exchange_token', ...);
```

- [ ] **Step 2: Run** `npm test -w @motionhaus/shorts` → the new file fails on import.
- [ ] **Step 3: Implement `instagram-api.mjs`.** Form-encoded POST bodies (`URLSearchParams`) with `access_token` in the body/query; upload reads the file with `fs.readFile` (reels are < 300 MB) and sends it as the body; `waitFinished` polls every 15 s through the injected `sleep`, max 40 polls; `findAccount` reads `GET /me/accounts?fields=name,access_token,instagram_business_account{id,username}`.
- [ ] **Step 4: Run tests and typecheck** → pass.
- [ ] **Step 5: Commit** `Instagram Graph client: resumable reel upload, account lookup`.

### Task 2: Queue rules

**Files:**
- Create: `apps/shorts/src/insta-queue.mjs`
- Test: `apps/shorts/test/insta-queue.test.mjs`

**Interfaces:**
- Produces:
  - `ScheduleEntry = {n: string, dir: string, file: string, date: string, time: string, posted?: {id: string, permalink: string, at: string}, blocked?: {reason: string, at: string}, containerId?: string}`
  - `istNow(d?: Date): {date: string, time: string}`
  - `dueEntry(schedule: ScheduleEntry[], {date, time, after}: {date: string, time: string, after: number | undefined}): {entry: ScheduleEntry | null, reason: string}`
  - `queuedAhead(schedule, date): number` (distinct dates > `date` with an unposted, unblocked entry above nothing else; used by the maker)
  - `missedDays(schedule, {date, since}): string[]` (dates in `[since, date)` that have an entry and none `posted`)
  - `readSchedule(file): Promise<ScheduleEntry[]>`, `patchEntry(file, n, patch): Promise<void>` (re-reads, patches by `n`, atomic write via tmp + rename, same JSON format as `instaKit`: `JSON.stringify(x, null, 1) + '\n'`)

- [ ] **Step 1: Write the failing tests**

```js
const S = [
  {n: '043', dir: '043-a', file: 'a.mp4', date: '2026-11-12', time: '19:30'},
  {n: '044', dir: '044-b', file: 'b.mp4', date: '2026-11-13', time: '19:30'},
  {n: '045', dir: '045-c', file: 'c.mp4', date: '2026-11-14', time: '19:30'},
];
test('due: today, time passed, unposted', () => assert.equal(dueEntry(S, {date: '2026-11-13', time: '19:31', after: 43}).entry?.n, '044'));
test('not due before the slot', () => assert.match(dueEntry(S, {date: '2026-11-13', time: '19:29', after: 43}).reason, /19:30/));
test('past-dated entries are never due', () => assert.equal(dueEntry(S, {date: '2026-11-13', time: '23:00', after: 0}).entry?.n, '044'));
test('nothing queued today', () => assert.match(dueEntry(S, {date: '2026-11-15', time: '20:00', after: 0}).reason, /nothing queued/));
test('autoPostAfter blocks by number, not string', () => assert.match(dueEntry(S, {date: '2026-11-13', time: '20:00', after: 44}).reason, /autoPostAfter/));
test('autoPostAfter unset refuses', () => assert.match(dueEntry(S, {date: '2026-11-13', time: '20:00', after: undefined}).reason, /set instagram\.autoPostAfter/));
test('one a day: a posted entry today means done', ...);   // second entry same date → null, /already posted today/
test('blocked entry is skipped', ...);
test('istNow', () => assert.deepEqual(istNow(new Date('2026-11-13T14:01:00Z')), {date: '2026-11-13', time: '19:31'}));
test('queuedAhead counts future days', () => assert.equal(queuedAhead(S, '2026-11-13'), 1));
test('missedDays', () => assert.deepEqual(missedDays(S, {date: '2026-11-13', since: '2026-11-12'}), ['2026-11-12']));
test('patchEntry keeps other entries and the file format', ...);
```

- [ ] **Step 2: Run** → fails on import.
- [ ] **Step 3: Implement.** Move the IST computation out of `instaKit` in `cli.mjs` to use `istNow`.
- [ ] **Step 4: Run tests and typecheck** → pass.
- [ ] **Step 5: Commit** `Instagram queue rules: due entry, backlog guard, autoPostAfter`.

### Task 3: Ledger backfill, kept by `kit`

**Files:**
- Modify: `apps/shorts/src/ledger.mjs`, `apps/shorts/src/types.mjs` (add `instagramId?: string`), `apps/shorts/src/cli.mjs` (`cmdLedger`, `cmdKit`)
- Test: `apps/shorts/test/ledger.test.mjs` (create if absent)

**Interfaces:**
- Produces:
  - `Ledger.prototype.upsert(e: Omit<LedgerEntry, 'domain'>): LedgerEntry` (match on `episode`; else push, keeping the given episode number)
  - `entriesFromEpisodes(episodesDir: string): Promise<Omit<LedgerEntry, 'domain'>[]>`: one per `*/script.json` with a numeric `episode`; `url` = `script.sourceUrl ?? script.brand.url`, `title` = `script.brand.name`, `source`/`sourceId` from the script when present else `'manual'`/slug, `status: 'made'`, `date` = the script file's mtime date. Skips dirs without `script.json` or without `episode`, and `sample-*`.
  - CLI: `shorts ledger backfill` writes the ledger and prints `N episodes, next is #M`. Existing entries are kept (upsert never downgrades `published`).
  - `cmdKit` upserts the episode it packs (status `made`).

- [ ] **Step 1: Failing tests:** backfill over a temp dir with three episodes (one without `episode`, one `sample-x`) yields the right entries; `nextEpisode()` after backfill is max + 1; `conflict(url)` now reports `already featured as #N`; `upsert` on an existing `published` entry keeps `published`.
- [ ] **Step 2: Run** → fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run tests and typecheck; then run `node apps/shorts/src/cli.mjs ledger backfill` for real** and check the count is close to the number of episode dirs and `shorts ledger` lists them.
- [ ] **Step 5: Commit** `Ledger: backfill from episodes; kit records the episode`.

### Task 4: `insta-auth` and `insta-post`

**Files:**
- Create: `apps/shorts/src/insta-post.mjs`, `apps/shorts/src/notify.mjs`
- Modify: `apps/shorts/src/config.mjs` (env block `instagram: {appId, appSecret, pageToken, igUserId, mode}`), `apps/shorts/src/cli.mjs` (commands, usage header, `upload.txt` wording in auto mode), `apps/shorts/series.json` (`instagram.autoPostAfter` left out until the owner gives the number), `.env.example`
- Test: `apps/shorts/test/insta-post.test.mjs`

**Interfaces:**
- Consumes: Task 1 client, Task 2 queue functions, `measure` from `@motionhaus/film-qa/gate` (`res.verdict === 'red'` blocks), `igConfig`, `Ledger`.
- Produces:
  - `notify(title: string, body: string, {logFile}): Promise<void>`: appends `ISO  title  body` to `workspace/shorts/autopilot.log` and raises a macOS banner with `osascript -e 'display notification …'` (failure to raise is ignored; arguments passed via `execFile`, never a shell string).
  - `postDue(deps): Promise<{outcome: 'posted'|'idle'|'blocked'|'failed', detail: string}>` where `deps = {scheduleFile, kitsDir, now: {date, time}, after, ig, gate: (mp4) => Promise<{verdict: string, reasons?: string[]}>, notify, kit?: string, dryRun?: boolean, stateFile, coverFrameMs: number, ledger?}`.
    - Takes a lock (`<scheduleFile>.lock`, `fs.open(..., 'wx')`, stale after 30 min); a held lock → `idle`.
    - `--kit` selects that entry regardless of date and of `autoPostAfter`, but still refuses `posted`.
    - Reads `caption.txt` (trimmed) and the entry's mp4 from `kitsDir/<dir>/`; `validateReel`; gate; red → `patchEntry(blocked)` + notify → `blocked`.
    - `publishReel` with `onStep` saving `containerId` on the entry at `container`. If an entry already has `containerId` and `containerStatus` is `PUBLISHED`, do not upload again: mark it `posted` (id unknown → `permalink: ''`) and notify "posted earlier, recorded now". If `FINISHED`, publish that container. Otherwise start over.
    - Success → `patchEntry(posted)` first, then ledger `instagramId`, then notify with the permalink.
    - Failure → notify once per distinct error message per day (remember in `stateFile`); `code === 190` adds "run `shorts insta-auth`".
    - Idle with reason `nothing queued` after the slot time → one notification per day. Also reports `missedDays` since `state.lastRun` once.
    - User tags: `script.instagram.makers` are not in the kit folder; read them from the caption line `Made by @a @b` when present.
  - CLI:
    - `shorts insta-auth [--token <user token>]`: with `--token`, skip the browser. Otherwise loopback on `http://localhost:8723/` with Facebook's dialog (`https://www.facebook.com/<version>/dialog/oauth`, `response_type=code`, `state`), exchange the code, `exchangeToken`, `findAccount` for `series.instagram.handle`, `upsertEnv` both keys, print `connected to @username via Page "<page>"`.
    - `shorts insta-post [--dry-run] [--kit <nnn-slug>]`: exits 0 on `posted`/`idle`, 1 on `failed`/`blocked`. Without `--kit`, prints `INSTAGRAM_UPLOAD_MODE is manual: nothing posted` and exits 0 unless the mode is `auto`.
  - `coverFrameMs` = `Math.round(36 / 30 * 1000)` = `1200` (frame 36, the studio's 30 fps; confirm the fps constant in `apps/shorts/studio/src` and import or mirror it).

- [ ] **Step 1: Failing tests for `postDue`** with a temp kits dir and fakes for `ig`, `gate`, `notify`:
  - posts the due entry: `ig.publishReel` called once with the caption and `thumbOffsetMs: 1200`; the schedule file gains `posted.permalink`; outcome `posted`; one notify containing the permalink.
  - second run the same day → `idle`, `publishReel` not called again.
  - red gate → `blocked`, entry has `blocked.reason`, `publishReel` not called.
  - `publishReel` rejects → `failed`, entry has no `posted`; a second failing run with the same message notifies only once.
  - crash recovery: entry with `containerId` and status `PUBLISHED` → marked `posted`, no upload.
  - `after: undefined` → `idle` with `/set instagram\.autoPostAfter/`, nothing posted.
  - held lock → `idle`.
  - `kit: '043-a'` posts a past-dated entry; `kit` on a `posted` entry refuses.
  - `dryRun` → no `publishReel`, no file change.
  - error with `code: 190` → notify body matches `/insta-auth/`.
- [ ] **Step 2: Run** → fail.
- [ ] **Step 3: Implement** `notify.mjs`, `insta-post.mjs`, config and CLI wiring; update the usage comment block at the top of `cli.mjs` and `.env.example`.
- [ ] **Step 4: Run tests and typecheck; run `node apps/shorts/src/cli.mjs insta-post --dry-run`** → prints the mode line and exits 0.
- [ ] **Step 5: Commit** `shorts insta-auth and insta-post: gated, idempotent Instagram posting`.

### Task 5: Real-post proof (needs the owner)

Not automatable. Requires the owner's Meta app id and secret in `.env`, the Page link, and the `autoPostAfter` number.

- [ ] `shorts insta-auth` → prints `connected to @thelaunchradar.hq`.
- [ ] `shorts insta-post --kit <the kit due today> --dry-run`, then without `--dry-run` → a permalink; open it and check the caption, the cover frame and "also in feed".
- [ ] If the API refuses publishing in development mode, stop and report to the owner (spec section 7).
- [ ] Set `instagram.autoPostAfter` in `series.json` and commit.

### Task 6: Timers

**Files:**
- Create: `apps/shorts/src/autopilot.mjs`, `apps/shorts/autopilot/maker-prompt.md`, `apps/shorts/autopilot/maker-settings.json`
- Modify: `apps/shorts/src/cli.mjs` (`autopilot install|uninstall|status`, `autopilot make`)
- Test: `apps/shorts/test/autopilot.test.mjs`

**Interfaces:**
- Consumes: `queuedAhead`, `istNow`, `notify`.
- Produces:
  - `plist({label, args, calendar, repoDir, logFile}): string`: a launchd plist with `ProgramArguments`, `WorkingDirectory`, `StartCalendarInterval` (array of `{Hour, Minute}`), `StandardOutPath`/`StandardErrorPath`, and `EnvironmentVariables.PATH` including the directories of the current `node`, `claude` and `ffmpeg`.
  - Labels `work.suryansh.motionhaus.poster` and `work.suryansh.motionhaus.maker`.
  - Poster calendar: every 15 minutes from the first `series.instagram.slotsIST` time to 23:45, converted from IST to the Mac's local time zone. Maker: 10:00 IST.
  - `shouldMake(schedule, date): {make: boolean, reason: string}`: false when `queuedAhead ≥ 3`.
  - `shorts autopilot make`: checks `shouldMake`; if true runs `claude -p "<maker-prompt.md contents>" --plugin-dir <repo> --settings apps/shorts/autopilot/maker-settings.json` with a 3-hour timeout, then notifies with the outcome (a new schedule entry appeared → "made #N for <date>", otherwise "no episode made" with the last lines of output). Verify the exact headless flags against `claude --help` before writing them.
  - `maker-prompt.md` states the green rule from spec 5.3 word for word: `shorts make --render` exits 0, no `instagram:` or `retention:` warnings, `npm run qa -- gate <out/short.instagram.mp4> --profile animation` not red, stills review clean, and only then `shorts kit`; otherwise fix and retry at most twice, then stop without running `kit`.
  - `maker-settings.json` allows only: Read/Write/Edit inside the repo, `Bash(node apps/shorts/src/cli.mjs:*)`, `Bash(npm run:*)`, `Bash(npx remotion:*)`, `Bash(ffmpeg:*)`, `Bash(ffprobe:*)`, WebFetch, WebSearch.
  - `install` writes both plists to `~/Library/LaunchAgents` and loads them with `launchctl bootstrap gui/<uid>`; `uninstall` boots them out and deletes them; `status` prints loaded or not, the mode, the next due entry and `queuedAhead`. `install` refuses unless `INSTAGRAM_PAGE_TOKEN` is set, and installs the maker only with `--maker`.

- [ ] **Step 1: Failing tests:** `plist` output parses with `plutil -lint` (skip off macOS) and contains the label, the working directory and 18 calendar entries for a `19:30` slot in an IST time zone; IST → local conversion for a UTC machine gives `14:00`; `shouldMake` false at 3 queued days and true at 2.
- [ ] **Step 2: Run** → fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Tests and typecheck pass; `shorts autopilot status` prints without installing anything.**
- [ ] **Step 5: Commit** `Autopilot: launchd poster and maker`.

Installing the agents (`shorts autopilot install`, later `--maker`) is the owner's step after Task 5.

### Task 7: Docs

**Files:** `README.md` (new "Autopilot" section: one-time Meta setup from spec section 8, the five commands, the pause switch, where the log is), `docs/architecture.md` (data flow lines for `insta-post` and the agents), `skills/short-styles/SKILL.md` (Instagram version: the kit posts by itself in auto mode; what stays manual).

- [ ] Write the three edits, plain and short.
- [ ] `npm run check` at the repo root passes.
- [ ] Commit `Docs: Instagram autopilot`.
