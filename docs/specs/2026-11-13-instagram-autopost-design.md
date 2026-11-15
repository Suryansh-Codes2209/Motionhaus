# Launch Radar on autopilot: Instagram auto-posting from the Mac

Status: draft for approval · 2026-11-13

## 1. Intent

Launch Radar's Instagram page (`@thelaunchradar.hq`) should keep posting one reel a day with nobody in the loop: the Mac picks a launch, writes, renders, checks and posts it. Today everything up to the finished reel exists, but each episode starts in a hand-run Claude session and the upload is done by hand from `review/instagram-reels/<nnn-slug>/`.

Quality is the priority. Everything keeps running on the Mac so the cloned voice, Apple Vision cutouts, Whisper timings and local Remotion renders stay exactly as they are.

Packaging Motionhaus for other people's channels comes after this and is a separate design.

## 2. Goals, non-goals, anti-goals

**Goals**
- A finished Instagram cut posts through the Instagram API at its slot in `schedule.json`, with its caption, with no clicks.
- A daily timer makes one new episode end to end with no person involved.
- The owner hears about every post, skip and failure.
- One setting pauses all posting.

**Non-goals**
- YouTube. It stays on `YOUTUBE_UPLOAD_MODE=manual` until Google's API audit passes (API uploads are locked private before that). `shorts publish` is untouched.
- Any cloud service or hosting. No Cloudflare, no server.
- Multi-user or multi-channel support. Keep Instagram settings per series so it carries over, and build nothing more for it.
- Replying to comments, trending audio, Topics, boosts. The API cannot do the first three steps of the "after it goes live" checklist either; they stay manual and optional.

**Anti-goals** (a failure even if it technically works)
- Posting a reel that failed the QA gate, or the same reel twice.
- Dumping the backlog: `schedule.json` holds dozens of past-dated entries, and none of them may be posted by the new code.
- A silent stop: the page going quiet for days without the owner being told.
- Any change to how a reel looks or sounds.

## 3. Constraints found

- **Uploading a local file needs the Facebook Login route.** Instagram's API takes a reel either from a public URL or by "resumable upload" of a local file to `rupload.facebook.com`. Resumable upload is only offered to apps using Facebook Login, which requires the Instagram account to be a professional account linked to a Facebook Page. The Instagram Login route needs no Page but only accepts a public video URL, which would mean hosting. So: Facebook Login, `graph.facebook.com`, permissions `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `pages_show_list`.
- **No Meta review needed for one's own account** while the app stays in development mode and the owner has a role on it. This is the documented behavior, and it is the first thing to prove with a real post (section 7).
- **The custom cover cannot be uploaded from the Mac.** `cover_url` must be a public JPEG URL. The alternative is `thumb_offset`: Instagram takes a frame of the reel itself as the cover.
- **The API has no "post later".** Something must run on the Mac at the slot time.
- **Limits:** 100 API posts per 24 hours; caption up to 2,200 characters, 30 hashtags, 20 mentions; MP4 H.264/AAC, up to 300 MB, 3 s to 15 min, moov atom at the front.
- A Page token derived from a long-lived user token does not expire on a timer, but it dies if the owner changes their Facebook password or removes the app.

Sources: [content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/), [IG User media reference](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/).

## 4. Approaches

| | What | Trade-off |
|---|---|---|
| **Mac makes and posts (chosen)** | macOS timers run the daily build and the post; the reel is uploaded straight from disk | Nothing changes about quality; no hosting; the Mac must be on. A day the Mac is off posts nothing |
| All on Cloudflare | Worker cron + a Linux container render + R2 + Worker posts | Runs without the Mac, but loses the cloned voice and Apple Vision cutouts and needs weeks of porting. The owner rejected it for quality |
| Mac makes, cloud posts | Mac renders ahead, a small Worker posts at the slot | Posting survives a sleeping Mac, but it is two systems and needs hosting. Rejected as not simple |

The owner picked the first: "simple, from the Mac, built and uploaded from the Mac itself."

## 5. Design

Three pieces, built in this order. Each is useful without the next.

### 5.1 Instagram client: `apps/shorts/src/instagram-api.mjs`

Same shape as `youtube.mjs`: a `createInstagram({pageToken, igUserId, fetchImpl})` factory, zero dependencies, tested with an injected `fetch` like `test/youtube.test.mjs`.

- `account()` → username and id, to confirm the token points at the expected handle.
- `publishReel(file, {caption, thumbOffsetMs, shareToFeed, userTags})`:
  1. `POST /{ig-user-id}/media` with `media_type=REELS`, `upload_type=resumable`, caption and options → container id.
  2. `POST https://rupload.facebook.com/ig-api-upload/{version}/{container-id}` with headers `Authorization: OAuth <token>`, `offset: 0`, `file_size`, and the file as the body.
  3. Poll `GET /{container-id}?fields=status_code` until `FINISHED` (`ERROR` and `EXPIRED` are failures; give up after about 10 minutes).
  4. `POST /{ig-user-id}/media_publish` with `creation_id` → media id, then read its `permalink`.
- `validateReel(caption, file)` catches what Instagram rejects before any network call: caption length, hashtag and mention counts, file size.

Pin the Graph API version in one constant.

### 5.2 Commands in `apps/shorts/src/cli.mjs`

- **`shorts insta-auth`**: one-time sign-in, modeled on `shorts auth`. Loopback OAuth on `http://localhost` with Facebook Login, exchange for a long-lived user token, list the owner's Pages, pick the Page whose linked Instagram account matches `series.instagram.handle`, and save `INSTAGRAM_PAGE_TOKEN` and `INSTAGRAM_USER_ID` to `.env` with `upsertEnv`. Prints which account it connected to and complains if the handle differs. Needs `META_APP_ID` and `META_APP_SECRET` in `.env`.
- **`shorts insta-post [--dry-run] [--kit <nnn-slug>]`**: posts what is due.
  - Reads `review/instagram-reels/schedule.json`. An entry is due when its date is today (IST), its time has passed, and it has no `posted` field. Entries dated before today are never posted, whatever their state. That is the backlog guard.
  - At most one post per run and one per IST day.
  - Right before uploading it runs the film-qa gate on the kit's mp4 (`packages/film-qa`, the same check as `npm run qa -- gate <mp4> --profile animation`). A red verdict (exit 2) means no post: the entry is marked `blocked` with the reason and the owner is notified. This is the gate for every reel, including the ones already queued by hand.
  - It will not post an entry numbered at or below `series.instagram.autoPostAfter` (the last episode the owner posted by hand; see section 6).
  - Uploads the kit's mp4 with `caption.txt`, `share_to_feed=true`, `thumb_offset` at the cover frame (frame 36 of the cut, converted with the cut's fps), and the makers from the script as `user_tags` when present.
  - On success writes `posted: {id, permalink, at}` into the schedule entry before doing anything else, and records the Instagram id on the episode's ledger entry (section 5.4). A second run the same day sees `posted` and does nothing.
  - On failure it leaves the entry unposted, logs the error, notifies, and exits non-zero. The next timer run retries the same day; after the day ends the entry is skipped for good and reported.
  - `--kit` posts one named kit now regardless of date. It is the manual override and the way to run the first real test.
  - `--dry-run` prints what would be sent.
  - Does nothing, and says so, when `INSTAGRAM_UPLOAD_MODE` is not `auto`.
- `shorts kit` keeps writing the review folder and `upload.txt` as today. When the mode is `auto`, `upload.txt` says the reel will post by itself and lists only what is left for a human.

New `.env` keys (also in `.env.example`): `META_APP_ID`, `META_APP_SECRET`, `INSTAGRAM_PAGE_TOKEN`, `INSTAGRAM_USER_ID`, `INSTAGRAM_UPLOAD_MODE=manual|auto` (default `manual`). Setting it back to `manual` is the pause switch.

### 5.3 Timers: two launchd agents

Installed and removed with `shorts autopilot install|uninstall|status`, which writes plists into `~/Library/LaunchAgents`.

- **Maker** (once a day, morning IST): runs Claude Code headless with the Motionhaus plugin and a fixed prompt that says, in effect, "make today's Launch Radar short the way the skills describe: `shorts run`, choose from the shortlist, write `script.json` following `short-styles` and the design ledger, `shorts make --render`, run the QA gate, and if green run `shorts kit`." It runs under a settings file that pre-approves exactly the tools this needs, so nothing waits on a permission prompt.
- **Poster** (every 15 minutes from the slot time until midnight IST): runs `shorts insta-post`. Because it repeats, a Mac that was asleep at 19:30 posts when it wakes the same evening.

"Green" for the maker means all of: `shorts make --render` exits 0, it prints no `instagram:` or `retention:` warnings, the film-qa gate on `out/short.instagram.mp4` is not red, and Claude's stills review from `skills/short-styles` finds nothing to fix. Only then does it run `shorts kit`. The poster's own gate (5.2) is the backstop that does not depend on the prompt being followed.

The maker skips its run when 3 or more days are already queued ahead in `schedule.json`. Launch Radar covers new launches, and with a deep queue a fresh episode would post weeks late.

On each run the poster also checks for days since the last post with nothing posted and no notification raised (the Mac was off or asleep), and reports them once: "no reel went out on these N days."

Both agents append to `workspace/shorts/autopilot.log` and raise a macOS notification on every post, skip and failure: what happened, the episode, and the permalink or the error. If the poster finds no entry for today at slot time, that is itself a notification ("nothing queued for today").

### 5.4 Ledger

`workspace/shorts/ledger.json` does not exist today, although about 79 episodes do, so `shorts pick` currently rejects nothing as already featured and nothing hands out episode numbers. An unattended maker needs both. Add `shorts ledger backfill`, which builds the ledger once from `episodes/*/script.json` and the Instagram schedule, and make `shorts kit` add or update the episode's entry (status `made`) so the next `pick` skips that launch and the next episode takes the next free number.

## 6. Calls made by the designer, for the owner to check

1. **Cover:** the hook frame from the reel itself (`thumb_offset`), not the separately rendered `instagram-cover.png`. The difference is that burned-in captions are visible on the cover. A custom cover would need a public host for one JPEG.
2. **Missed days are skipped, not caught up.** A reel whose day has passed is never posted later by the timer, to keep one-a-day and avoid posting stale launches. `--kit` can still post it by hand.
3. **Notifications are on the Mac only** (notification banner plus the log). Nothing is sent to the phone.
4. **`share_to_feed` on, AI label off**, matching the current manual checklist.
5. **Maker runs once a day**, producing one episode, so the existing queue stays about as deep as it is now.
6. **Old schedule entries are left as they are.** It never posts anything dated before today. For entries dated today or later, `autoPostAfter` holds the number of the last reel the owner already posted by hand, so none goes out twice. (Owner to supply the number.)
7. **The poster gates every reel itself** with film-qa, so the 30 hand-made reels already queued are checked too.
8. **The maker waits until the queue is under 3 days.** With 30 reels queued today (13 Nov to 12 Dec), it will make its first episode in about four weeks.
9. **The ledger is backfilled and kept by `shorts kit`.** This changes `shorts pick`: it starts rejecting launches that were already featured.
10. **A Mac that was off reports the gap on its next wake.** Nothing can tell the owner while it is off; that is accepted as the cost of no cloud.

## 7. Order of work and proof

1. Client plus `insta-auth`, then one real reel posted with `shorts insta-post --kit <nnn-slug>`. This proves the Meta app, the token and the resumable upload on the real account before anything is automated. If development mode turns out not to allow publishing, stop and come back to the owner.
2. `insta-post` on the schedule, run by hand for a few days.
3. The poster timer.
4. The maker timer, last, because it is the piece that removes the human check.

## 8. What the owner must set up (cannot be done in code)

- `@thelaunchradar.hq` switched to a Business or Creator account and linked to a Facebook Page.
- A Meta developer app (type Business) with Facebook Login and the Instagram permissions above, the owner added as admin, kept in development mode. Its id and secret go in `.env`.
- The Mac left on, or set to wake, around the maker time and the 19:30 IST slot.

## 9. Left to the builder

- Exact Graph API version, polling intervals and retry counts.
- Whether `insta-auth` uses the loopback flow or, if Meta's redirect rules get in the way, accepts a pasted token from the Graph API Explorer and exchanges it.
- The headless Claude invocation: flags, the permission settings file, and the exact prompt wording.
- Plist details, the maker's time of day, and log rotation.
- Unit tests for the client (fake `fetch`), the due-entry rule, the backlog guard, `autoPostAfter` and the ledger backfill.
