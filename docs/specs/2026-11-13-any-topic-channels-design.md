# Motionhaus for anyone, part 2: channels on any topic

Status: draft for approval · 2026-11-13

## 1. Intent

After part 1 a channel is a folder, but every channel is still a product-launch channel: the code finds stories on Hacker News and GitHub, the script format assumes a product with a website, the checks demand a tech brand in the title and a product shot in frame 0, and the published text says "Not affiliated, featured because it's trending".

Part 2 lets a channel be about anything: news explained, facts and lists, how-to tips, sport, money, history. The owner chose the "general engine plus starter templates" approach: each channel has a written brief, Claude finds and researches stories inside that brief, and ready-made templates give the common kinds of channel a tuned starting point. The launch format becomes one template, and Launch Radar keeps running on it unchanged.

## 2. Goals, non-goals, anti-goals

**Goals**
- A channel is described by a brief (`brief.md`, plain language) and a few settings in `channel.json`. Nothing about its subject lives in the code or in the shared skills.
- For any channel, the unattended maker can find today's story, check it was not covered before, research it from cited sources, and make and book a short.
- `shorts channel new <slug> --template <name>` starts a channel from one of four templates: `launches`, `news-explainer`, `facts-lists`, `how-to`.
- "Already covered" works for stories that are not products, and catches a product that changed its link (the "yogurt" case).
- Proof: one real episode made end to end for a non-launch test channel, rendered and through the QA gate, not posted anywhere.

**Non-goals**
- Long-form (16:9 deep dives) for non-launch channels. Long-form stays a launch format in part 2.
- Languages other than English, new voices, new scene types, stock video. Channels use the scenes and assets that exist: licensed photos, source screenshots, charts, the generated explainer clips, text.
- The guided setup, YouTube auto-posting, public release (part 3).
- Tuning each template to Launch Radar's level. Launch Radar's rules came from its own numbers; a new template starts from general craft and is tuned by its owner.

**Anti-goals**
- Any change to what Launch Radar makes or posts.
- A video stating something its sources do not support. The less a topic is "look at this product's own page", the more this matters.
- Launch Radar's private performance data (view counts, audit findings) shipping inside shared skills or templates.
- A check tuned for launches silently applied to a channel it makes no sense for (or the reverse: a channel with no checks at all).

## 3. What exists today (from a survey of the code and skills)

- **Story finding** is two fetchers (`sources/hn.mjs`, `sources/github.mjs`) that require a capturable product homepage, a ranking that prefers product sites, and a ledger whose idea of "same story" is "same product domain". Two stories from one news site would be treated as one.
- **The script** (`script.json`) requires `brand` (name, url, font) and `sourceLabel`. The renderer shows `brand.url` only inside browser frames; `sourceLabel` is printed in the badge as "#042 · via GitHub".
- **Checks** printed by `shorts make` (`retention:`, `instagram:`) require a tech anchor early in the title, a product image in scene 1, 5 to 7 scenes of 62 to 84 words, a question at the end. The maker treats any such line as "not green".
- **Published text**: the caption credit line, the 🌐/🔗 links, "Send this to a dev who needs it", "Follow for tomorrow's launch", YouTube category 28 (Science & Technology), and the kit checklist's "founders reshare" and "AI / dev creators" lines are constants in code.
- **Scenes**: of 28 scene types, four need product assets (`screenshot`, `spotlight`, `chat`, `cta`). The rest work with text, data, licensed photos, any screenshot, generated art or explainer clips (including a finance chart, whiteboard and kinetic type). There is no map scene.
- **Assets that are already general**: licensed photo search (Openverse, Wikimedia; commercial-use licences only, credits appended automatically), subject cutout, the SFX kit and music, the capture script (it captures any URL, though it is described as for product sites).
- **Skills**: `video-craft` is almost entirely general. `short-styles`, `video-studio` and `long-form` mix general craft with launch rules and with Launch Radar's own channel data.

## 4. Approaches (decided with the owner)

| | What | Trade-off |
|---|---|---|
| **General engine plus templates (chosen)** | A brief per channel, Claude finds stories inside it, four templates ship | Any topic works on day one; common ones start tuned. Quality for a new topic starts below Launch Radar's |
| Brief only | The same without templates | Everyone starts from a blank page |
| A coded module per topic type | Finder and rules in code for each type | Best quality per type, but unusual topics are stuck until someone writes a module |

## 5. Design

### 5.1 The channel brief

`channels/<slug>/brief.md`, written for a person and for the maker to read first. Fixed headings, so the maker and the checks can find things:

1. **What this channel covers**, and what it does not.
2. **Who watches**, and what they get from it.
3. **Voice and point of view** (for launches: third person, never posing as the product).
4. **Where stories come from**: the feeds configured in `channel.json`, and what to search for beyond them.
5. **What makes a story worth covering**, and what to skip.
6. **Sources of truth**: what a claim may rest on (for launches: the product's own page and repository; for news: the primary document or two independent reports; for facts: a reference work), and what is never enough (a social post, an AI summary).
7. **Never**: topics and claims that are off limits (the template for money or health topics says no advice, no predictions).
8. **Shape of an episode**: length, the beats, how it opens and ends.
9. **Visuals**: which scene types fit and where images come from.
10. **Words that go out with it**: outro line, share prompt, caption shape, credit line, hashtags policy.
11. **What this channel has learned**: the owner's own numbers and lessons. Launch Radar's retention review and Instagram audit move here, out of the shared skills.

The brief wins over the shared skills where they disagree. The skills keep the craft that is true for any video.

### 5.2 Settings in `channel.json`

Added blocks; every one has a default so Launch Radar's existing file keeps working with only the additions the migration writes:

```json
"template": "launches",
"stories": {
  "identity": "product",
  "feeds": [{"type": "hn"}, {"type": "github"}],
  "search": true
},
"rules": {
  "titleAnchor": true, "subjectInFrame0": true, "endsOnQuestion": true,
  "scenes": [5, 7], "words": [62, 84], "sourcesRequired": false
},
"publish": {
  "badge": "#{n} · via {source}",
  "outro": "Follow for tomorrow's launch",
  "shareOutro": "Send this to a dev who needs it",
  "credit": {"own": "Made by the creator of this account.", "direct": "Not affiliated, featured because it's a new launch.", "via": "Found via {source}. Not affiliated, featured because it's trending."},
  "youtube": {"categoryId": "28", "language": "en"},
  "kitNotes": ["Tag the maker if they have an Instagram account (founders reshare)"]
}
```

- `stories.identity`: `product` (same link, same product domain, or same name) or `story` (same link or same story key; a similar title is a warning, not a refusal).
- `stories.feeds`: zero or more finders. Existing `hn` and `github`; new `rss` (`{"type": "rss", "url": …}`), which also covers a subreddit's public feed. There is no Reddit API finder: it would need a registered app, credentials and Reddit's API terms, and the existing finders were chosen as "no key needed". `sources` in today's file is read as the settings for `hn`/`github`.
- `stories.banned`: word patterns a story is dropped for. The default is today's hard-coded list (crypto, betting, adult, get-rich); a money or sport channel edits its own. It and `blocklist.txt` apply to feed stories and to claimed stories alike.
- `stories.search`: the maker may also find stories by web search inside the brief. A channel with no feeds relies on it.
- `rules`: which `shorts make` checks apply, and their numbers. A check that is off prints nothing. Every existing check becomes a named rule (5.5 has the table); the six shown are the ones whose value differs between templates.
- `publish`: the text that today is constant in code. `{n}`, `{source}`, `{name}` are filled in. A badge without `{source}` shows only the number.

### 5.3 Stories, identity and the ledger

- A candidate becomes `{id, source, title, url, key, sourceUrl?, sourceLabel?, score?, postedAt?, text?}`. `source` is any string. `key` is a short stable name for the subject (`agentes-chat`, `india-v-australia-2026-11-13`).
- New command `shorts story claim --title "…" --url … --key … [--source "Reuters"]`: checks the ledger under the channel's identity rule (and `stories.banned`, `blocklist.txt`), and if clear, records a **claim** and prints its episode number. The maker claims before writing, so two runs cannot take the same number or story.
- A claim is a reservation, not an episode. It holds the story and its number for 24 hours. Claiming the same key again inside that time returns the same number, so a retry resumes its own story. `shorts kit` turns the claim into a `made` entry. A claim that is never packed expires: its story is free again, and its number is reused by the next claim, so failed runs (there were four on 2026-11-13) burn nothing and leave no gaps. Launch Radar's maker uses `claim` too; its numbering stays gap-free as today.
- `shorts story check` does the check without recording.
- The ledger entry gains `key` and keeps `url`, `domain`, `title`. Under `product` identity a claim is refused on the same normalized link, the same product domain, or the same name (letters and digits only, case-insensitive), which catches a product that moved from its repository to its own site. Under `story` identity it is refused on the same link or key, and warned on a title that shares most of its words with an earlier one.
- `shorts run` keeps working for channels with feeds: it fetches, ranks, and writes the shortlist. Ranking stays "score over time, per feed"; the launch-only "product site beats bare repository" factor applies only under `product` identity.
- Existing ledger entries get `key` from their episode folder name by a one-time backfill; nothing else about them changes.

### 5.4 The script

`script.json` keeps its shape so every existing episode still renders. Meanings widen:

- `brand.name` is the subject's name. `brand.url` and `brand.font` become optional; `shorts make` fills the font from the channel and leaves the link empty. The four product scenes (`screenshot`, `spotlight`, `chat`, `cta`) are refused by `shorts make` when the script has no `brand.url`, with a message naming the scene.
- `sourceLabel` becomes optional; the badge follows `publish.badge`.
- `sources` keeps the shape 74 of the 75 existing scripts already use and `short-styles` teaches: an object `{"<claim>": "<where it comes from, with link and date>"}`. With `rules.sourcesRequired`, the check fails when it is empty or when any entry has no link. `publish.listSources` (off for `launches`, on for the other templates) adds the links to the YouTube description; Launch Radar's descriptions do not change.
- What the code can and cannot check: it can require that every claim names a link. It cannot tell whether the page supports the claim. That part is the maker's QA step (reopen each link and compare it with the line), stated in the maker prompt and the `channel-brief` skill. This is the weakest point of an unattended channel on a factual topic, and the reason the proof episode is read by a person before part 2 is called done.
- `shorts capture <dir> <url> [--as <name>]`: the existing capture script, exposed as a command for any page (a headline, a table, a document), saving under `public/captures/`. Product site captures keep going to `public/site/`.

### 5.5 Checks

`retentionWarnings` and `instaWarnings` take the channel's `rules` and `publish` settings. Each existing check becomes one named rule; `shorts make` prints only the ones that are on. `channel.json` is the single enforced source: no check reads `brief.md`. The brief's "Shape of an episode" and "Words that go out with it" sections explain the choices and point at the `rules` and `publish` values instead of restating numbers, so the two cannot drift apart.

| Rule | What it checks | launches | news-explainer | facts-lists | how-to |
|---|---|---|---|---|---|
| `titleAnchor` | a name from `anchors` early in the title | on | off | off | off |
| `subjectInFrame0` | scene 1 shows the subject (image or clip), not typed words | on | off | off | off |
| `brightFrame0` | frame 0 is not dark | on | on | on | on |
| `shortFirstSentence` | first sentence ≤ 10 words, no run-up opener | on | on | on | on |
| `scenes`, `words` | scene count and word count bounds | 5–7, 62–84 | 5–8, 62–100 | 5–8, 62–100 | 5–8, 62–100 |
| `endsOnQuestion` | last scene and pinned comment ask a question | on | on | on | off |
| `shortsTag` | `#shorts` in the YouTube title | on | on | on | on |
| `instagramBlock` | the script has its `instagram` block (only when the channel has Instagram) | on | on | on | on |
| `broadHashtags` | none of the channel's listed too-broad tags | its list | empty | empty | empty |
| `sourcesRequired` | every claim names a link | off | on | on | on |

"How-to ends on the action" is guidance in that template's brief, not a check.

The maker's green rule is unchanged: no `retention:` or `instagram:` line, QA gate not red, stills clean. The QA gate (motion, blank frames, palette) is about the picture and applies to every channel.

**Instagram is optional per channel.** A channel with no `instagram.handle` makes no Instagram cut, `shorts kit` books no Instagram slot, and the green rule does not ask for one. A YouTube-only channel is a supported outcome.

**Check and kit wording.** The messages that today quote Launch Radar's own view counts and audit findings, and its tech-only advice ("AI / dev creators", "Topics: Technology") become neutral in the code. The numbers move to Launch Radar's brief; its channel-specific checklist lines move to its `publish.kitNotes`.

### 5.6 Templates

`apps/shorts/templates/<name>/` holds `channel.json` (the blocks above, a neutral look, no handles), `brief.md`, and a placeholder mark. `shorts channel new <slug> --template <name>` copies one; without `--template` it uses `launches`.

| Template | Identity | Feeds | Rules on | Typical scenes |
|---|---|---|---|---|
| `launches` | product | hn, github | title anchor, subject in frame 0, question, 5–7 scenes | screenshot, spotlight, features, stat |
| `news-explainer` | story | rss (owner adds), search | sources required, question | clipping, stat, chart, quote, document |
| `facts-lists` | story | search | sources required | photo, tiles, stat, stack, clip |
| `how-to` | story | search | sources required, ends on the action | steps, flow, code or photo, type |

The `launches` brief carries the launch rules now spread through `short-styles` (third person, never the product's own ad, credit line, what counts as a source), without Launch Radar's numbers. Launch Radar's own `brief.md` is that brief plus its "what this channel has learned" section, and its `channel.json` gets its existing anchors, hashtags and the blocks above with today's values, so nothing it produces changes.

### 5.7 Skills and the maker

- `skills/short-styles`: keeps style picking, motion rules, the script reference, checking. Its launch rules and Launch Radar data move to the `launches` brief and Launch Radar's brief. Its examples show one launch script and one non-launch script.
- New `skills/channel-brief`: how to read a brief when making an episode, and how to write one when starting a channel.
- `skills/video-studio`: the researcher step follows the brief's "where stories come from" and "sources of truth" instead of Hacker News.
- `skills/long-form`: marked as a launch format; unchanged otherwise.
- Maker prompt: read `brief.md` first; find a story (`shorts run` if the channel has feeds, web search if the brief allows); `shorts story claim`; research and write `sources`; then make, check, kit as today. The line "use only claims the launch's own page supports" becomes "use only claims your listed sources support, as the brief's 'Sources of truth' defines".

### 5.8 Order of work

1. Settings and published text: `publish` and `rules` blocks read from `channel.json`, constants removed from code, checks made switchable. Proven on a fixture episode with Launch Radar's settings: what is **published** (caption, badge, file names, YouTube metadata, the rendered props) is identical before and after, and the same set of checks fires. The wording of check messages and of the kit checklist may change (see 5.5).
2. Stories: candidate shape, `story claim`/`check`, identity rules, `rss` and `reddit` finders, ledger `key` backfill.
3. Script: optional `brand.url`/`font`/`sourceLabel`, `sources`, product-scene refusal, `shorts capture`.
4. Brief, templates, skills split, maker prompt.
5. Proof: a test channel from `facts-lists`, one episode made by the maker, rendered and gated, not posted.

### 5.9 Switching the live channel over

Same protocol as part 1: built in a separate worktree, merged here in one sitting after the day's reel has posted and with no maker or poster run in progress. A new idempotent command, `shorts channel upgrade`, writes what an existing channel needs: the `template`, `stories`, `rules` and `publish` blocks with today's values, a `brief.md` (the `launches` brief plus the "what this channel has learned" section), and the ledger `key` backfill. It shows a diff with `--dry-run` and never overwrites a `brief.md` that exists.

The maker reads `maker-prompt.md` and the skills live, so its instructions change at the cutover. What the maker reads about launches stays the same content, moved: the rules leave `short-styles` and land in Launch Radar's brief. Evidence that its work is unchanged: the first Launch Radar episode made after the cutover is compared by a person against the last one made before (same checks pass, same framing and credit line), before the timers are left to run on it.

## 6. Calls made by the designer, for the owner to check

1. Shorts only. Long-form for other topics waits.
2. English only, existing voices.
3. No new scene types (so no maps yet); non-product channels use photos, source screenshots, charts, generated clips and text.
4. Every non-launch template requires listed sources for its claims, and the money and health wording in the briefs forbids advice and predictions. A channel owner can relax this in their own brief; the templates do not.
5. A similar title under `story` identity is a warning, not a refusal, because "India beat Australia" can be true on two different days.
6. Launch Radar's numbers and audit findings move into Launch Radar's own brief and out of the shared skills, since the repository is meant to go public.
7. The proof episode is made for a throwaway test channel (no Instagram or YouTube account, so YouTube cut only) and never posted. A person reads it and checks each claim against its link before part 2 is called done.
8. A story claim is a 24-hour reservation; failed runs burn no episode numbers.
9. Check messages and the kit checklist lose Launch Radar's numbers. What Launch Radar publishes stays identical; the wording it sees in warnings changes.
10. No Reddit API finder; a subreddit's public RSS feed works through the `rss` finder, without scores.
11. The banned-topics list becomes a per-channel setting with today's list as the default.
12. Instagram is optional per channel.
13. The code can require a link for every claim but cannot judge whether the link supports it; that rests on the maker's QA step.

## 7. Left to the builder

- Exact names of the rule functions and the shape of the rules table.
- RSS parsing details, rate limits, and the User-Agent (generic, no channel name).
- The wording of the four briefs, within the headings above.
- How "shares most of its words" is measured for the similar-title warning.
- Test layout. Required coverage: Launch Radar output unchanged (kit text, caption, badge, warnings for a fixture episode); each identity rule including the changed-link case; `story claim` hands out one number per story under two concurrent runs, returns the same number on a re-claim, and frees story and number after expiry; a rule that is off prints nothing; product scenes refused without a link; `channel new --template` for all four; no Launch Radar name, handle or number in any template or shared skill.
