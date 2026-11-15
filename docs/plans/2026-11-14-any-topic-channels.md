# Any-topic Channels (part 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A channel can be about any topic: its subject lives in a brief and in `channel.json` settings, the maker finds and claims stories inside that brief, and four templates start common kinds of channel. Launch Radar's published output does not change.

**Architecture:** One new module, `channel-settings.mjs`, turns `channel.json` into three resolved blocks with defaults (`rules`, `publish`, `stories`); the checks, caption, kit, badge and YouTube metadata read those instead of constants. A second, `stories.mjs`, owns story identity and claims on top of the ledger. Templates are folders copied by `channel new`. The skills lose their launch and Launch Radar content to briefs.

**Tech Stack:** Node ≥ 18.17 ESM `.mjs` with JSDoc types, `node:test`, the Remotion studio (TypeScript) for the badge.

**Spec:** `docs/specs/2026-11-13-any-topic-channels-design.md`

## Global Constraints

- Work only in the worktree `../motionhaus-topics`, branch `topics`. The main checkout runs live timers and a daily maker; nothing is merged there until Task 7.
- Never run `insta-post` without `--dry-run`, `insta-auth`, `auth`, `publish`, `autopilot install|uninstall|make`, `channel migrate` or `channel upgrade` (without `--dry-run`) against real data before Task 7.
- Defaults reproduce today's Launch Radar behaviour: a `channel.json` with none of the new blocks behaves exactly as now.
- What Launch Radar publishes (caption text, badge text, kit file names, YouTube metadata body, rendered props) is identical before and after. Wording of check messages and of the kit checklist may change.
- No Launch Radar name, handle, view count or audit finding in `apps/shorts/src`, `apps/shorts/templates`, or `skills/` (its own brief, written by `channel upgrade` from `apps/shorts/launch-radar/`, is the one place they live in the repo until part 3 decides otherwise).
- `sources` in `script.json` keeps its object shape `{"<claim>": "<where, with link and date>"}`.
- A story claim lasts 24 hours; `shorts kit` turns it into `made`; an expired claim frees its story and its number.
- No new npm dependencies. `npm test -w @motionhaus/shorts` and `npm run typecheck -w @motionhaus/shorts` pass after every task; commit after every task.

## Review Focus

1. A `channel.json` written before part 2 (Launch Radar's, as migrated): every default must equal the constant it replaces (Task 1 fixture test).
2. A rule that is off must print nothing, and a channel with every launch rule off must still be checked for length and opener (Task 1).
3. Two maker runs claiming at once: one number per story, no story claimed twice (Task 2).
4. A product that changed its link (`github.com/x/yogurt` → `yogurt.so`) under `product` identity is refused by name (Task 2).
5. A channel without an Instagram handle: `make --render`, `kit` and the maker's green rule all work without an Instagram cut (Task 3).

---

### Task 1: Settings, switchable checks, published text from the channel

**Files:** Create `apps/shorts/src/channel-settings.mjs`; modify `retention.mjs`, `instagram.mjs`, `steps/make.mjs`, `props.mjs`, `cli.mjs` (kit text), `youtube.mjs`, `channels.mjs` (validate new blocks), studio `shorts/SeriesBug.tsx`, `shorts/types.ts`; tests `channel-settings.test.mjs`, updates to `retention.test.mjs`, `instagram.test.mjs`, `youtube.test.mjs`, a fixture test `launch-radar-unchanged.test.mjs`.

**Interfaces (produces):**
- `rulesOf(series): Rules` with defaults `{titleAnchor: true, subjectInFrame0: true, brightFrame0: true, shortFirstSentence: true, scenes: [5, 7], words: [62, 84], endsOnQuestion: true, shortsTag: true, instagramBlock: true, broadHashtags: ['#ai', '#claude', '#tech', '#reels', '#github'], sourcesRequired: false}`; values in `series.rules` override.
- `publishOf(series): Publish` with defaults `{badge: '#{n} · via {source}', outro: "Follow for tomorrow's launch", shareOutro: 'Send this to a dev who needs it', credit: {own: 'Made by the creator of this account.', direct: "Not affiliated, featured because it's a new launch.", via: "Found via {source}. Not affiliated, featured because it's trending."}, youtube: {categoryId: '28', language: 'en'}, listSources: false, kitNotes: []}`.
- `storiesOf(series): Stories` with defaults `{identity: 'product', feeds: [{type: 'hn'}, {type: 'github'}], search: true, banned: [<today's four patterns as strings>]}`; `series.sources.hn/github` still supply those feeds' thresholds.
- `fill(template, {n, source, name}): string`; a `{source}` with no value drops the separator before it (`'#{n} · via {source}'` → `'#042'`).
- `hasInstagram(series): boolean`.
- `retentionWarnings(script, {meta, anchors, rules})` and `instaWarnings(script, {rules, hasInstagram})`: one named check per rule; messages carry no channel numbers.
- `instaCaption`/`instaScript` take `publish` for the credit lines and share outro.
- `validateMeta`/`insertBody(meta, {categoryId, language})`.
- Props gain `series.badge` (the filled text); `SeriesBug` prints it when present and falls back to today's format for old props.
- Kit checklist: generic lines only, then `publish.kitNotes`.

- [ ] Fixture test first: a frozen Launch Radar `channel.json` (as migrated, no new blocks) and a frozen episode script + metadata; assert the caption, badge text, kit base name, YouTube insert body and the *set of rule names that fire* equal values captured from the code before this task. Capture them in the test from the current functions before editing, then pin as literals.
- [ ] Tests for `rulesOf`/`publishOf`/`storiesOf`/`fill`, each rule on and off, a channel with all launch rules off.
- [ ] Implement; run; typecheck (root, studio included); commit `Channel settings: rules, publish and stories blocks; checks switchable`.

### Task 2: Stories: identity, claims, feeds

**Files:** Create `apps/shorts/src/stories.mjs`, `apps/shorts/src/sources/rss.mjs`; modify `ledger.mjs`, `types.mjs`, `filters.mjs`, `steps/pick.mjs`, `cli.mjs` (`story claim|check`, `sources(cfg)` from `stories.feeds`, `kit` consumes the claim, `ledger backfill` writes `key`); tests `stories.test.mjs`, `rss.test.mjs`, updates to `pick.test.mjs`, `ledger.test.mjs`.

**Interfaces:**
- `LedgerEntry` gains `key?: string`, `claimedAt?: string`, status `'claimed'`.
- `storyConflict(entries, {url, key, title}, {identity, now}): {refuse: string | null, warn: string | null}`. `product`: same normalized url, same `productDomain`, or same `nameKey(title)`. `story`: same url or key refuses; ≥ 70% shared significant words with an earlier title warns. Expired claims (`claimedAt` older than 24 h, status `claimed`) are ignored.
- `nameKey(title): string` (lowercase letters and digits only).
- `claimStory(ledger, {title, url, key, source}, {identity, now, banned, blocked}): {episode: number, entry, reused: boolean}`: same key with a live claim → same entry (`reused: true`); otherwise next number = 1 + max episode among non-expired entries; throws on refuse, banned or blocked. Ledger file writes go through a lock (`ledger.json.lock`, `wx`, stale after 60 s) so concurrent claims serialise.
- `Ledger.nextEpisode()` ignores expired claims; `Ledger.conflict()` unchanged for old callers.
- `shorts story claim --title --url --key [--source]` prints `claimed #N <key>`; `shorts story check` prints the verdict and exits 1 on refuse.
- `shorts kit` upserts the episode as `made`, replacing a claim with the same key or number.
- `createRss({url, fetchImpl, name?})`: a `Source` returning candidates from RSS 2.0 and Atom (title, link, date, summary), `source: 'rss'`, `score: 0`; no dependency (regex over items is enough for the two formats).
- `rank()` applies the repo-link factor only when `identity === 'product'`; candidates with no score rank by recency.
- `bannedReason(c, banned)` takes the channel's patterns.

- [ ] Failing tests: each identity rule, the changed-link case, expiry frees story and number, re-claim returns the same number, two concurrent `claimStory` calls on one file give two numbers, banned and blocked refuse, RSS and Atom fixtures parse, rank without scores.
- [ ] Implement; commit `Stories: identity rules, 24-hour claims, RSS feeds`.

### Task 3: Script generalisation, optional Instagram, capture command

**Files:** modify `props.mjs`, `steps/make.mjs`, `cli.mjs`, `instagram.mjs`, `apps/shorts/autopilot/maker-settings.json`; tests in `props.test.mjs`, `config.test.mjs`.

**Interfaces:**
- `buildProps`: `brand.url` defaults to `''`, `brand.font` to `'Inter'`; `sourceLabel` optional.
- `assertScenesFit(script)`: throws `scene N is "screenshot": it needs the subject's own page (brand.url); use clipping, photo or another scene` for `screenshot|spotlight|chat|cta` when `brand.url` is empty.
- `sourcesRequired` rule: fails when `script.sources` is missing/empty or any value has no `http(s)://` link; names the claim.
- A channel without Instagram: `make --render` skips the Instagram cut and cover, `kit` books no Instagram slot and says so, `igConfig` is not called.
- `shorts capture <dir> <url> [--as <name>]`: runs the studio capture script into `<dir>/public/captures/<name>/`.
- With `publish.listSources`, `uploadMeta` appends a "Sources" block of the links.

- [ ] Failing tests, implement, commit `Scripts for any subject; Instagram optional; shorts capture`.

### Task 4: Templates, briefs, `channel new --template`, `channel upgrade`

**Files:** Create `apps/shorts/templates/{launches,news-explainer,facts-lists,how-to}/{channel.json,brief.md,brand/mark.svg}`, `apps/shorts/launch-radar/learned.md` (Launch Radar's numbers, moved out of the skills); modify `channel-cmds.mjs`, `cli.mjs`; tests in `channel-cmds.test.mjs`, new `templates.test.mjs`.

**Interfaces:**
- `createChannel({…, template})`: copies the template; default `launches`; unknown template lists the four.
- `upgradeChannel({dir, templatesDir, learnedFile?, dryRun}): {changes: string[]}`: adds missing `template`, `stories`, `rules`, `publish` blocks with the values the defaults give today (so nothing changes), writes `brief.md` from the `launches` brief plus the learned file when the channel has none, backfills ledger `key` from each entry's `sourceId`. Idempotent; never overwrites an existing brief.
- Briefs use the eleven fixed headings of spec 5.1; `templates.test.mjs` asserts the headings, that each template's `channel.json` validates, and that no file under `templates/` or `skills/` contains `Launch Radar`, `launchradar`, or the audit numbers.

- [ ] Failing tests, write templates and briefs, implement, commit `Templates and briefs; channel new --template; channel upgrade`.

### Task 5: Skills and the maker prompt

**Files:** `skills/short-styles/SKILL.md` (+ references that carry launch wording), `skills/video-studio/SKILL.md`, `skills/long-form/SKILL.md` (mark as launch format), new `skills/channel-brief/SKILL.md`, `apps/shorts/autopilot/maker-prompt.md`, `test/autopilot.test.mjs`.

- [ ] Move launch rules and Launch Radar data out of `short-styles` into the `launches` brief and `launch-radar/learned.md`; add a non-launch script example; rewrite the maker prompt (read `brief.md`; find a story by `shorts run` and/or search; `shorts story claim`; research; write `sources`; reopen each link against its line; make, check, kit). Commit `Skills and maker prompt read the channel brief`.

### Task 6: Docs, full check, review

- [ ] README "Channels" gains templates and briefs; `docs/architecture.md` updated; `npm run check` at the root; whole-branch review; fixes.

### Task 7: Cutover and proof

- [ ] In the main checkout with nothing running and the day's reel posted: merge, `shorts channel upgrade --dry-run`, then the real run; confirm `insta-post --dry-run`, `autopilot status`, and the fixture comparisons on a real episode (caption and badge identical).
- [ ] Create a throwaway `facts-lists` channel (no accounts), run its maker once by hand (`autopilot make`), and read the result against its sources. Not posted.
- [ ] Push.
