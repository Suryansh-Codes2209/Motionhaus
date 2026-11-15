#!/usr/bin/env node
// Shorts pipeline CLI. Every command acts on one channel: --channel <slug>,
// else MOTIONHAUS_CHANNEL, else the default channel (see channels.mjs).
//   shorts fetch  [--date YYYY-MM-DD]   pull launches → runs/<date>/candidates.json
//   shorts pick   [--date YYYY-MM-DD]   filter + score → runs/<date>/shortlist.json
//   shorts run    [--date YYYY-MM-DD]   fetch then pick (later steps land here as they're built)
//   shorts story claim --title "…" --url <link> --key <short-name> [--source "…"] [--allow-same-name]
//                                       reserve a story and its episode number for 24 hours
//                                       (refused if the channel already covered it); `story check` only asks
//   shorts story release --key <short-name>  give a claim back (a story dropped after claiming it)
//   shorts ledger                       list featured episodes
//   shorts ledger backfill              build ledger.json from the episodes on disk (dedupe + numbering)
//   shorts designs                      the design ledger: every style, scene, transition, type style…
//                                       with what has never been used and what was used longest ago.
//                                       Read it before writing a script and pick from the top.
//   shorts make <episode-dir> [--stills 30,120] [--render] [--fast] [--voice af_heart] [--thumbs] [--no-insta]
//                                       voice → captions → props → music → .srt → stills / MP4
//                                       (shorts: --render also renders the Instagram cut and its
//                                       cover, one after the other; --no-insta skips them)
//                                       (script "format": "long" → 16:9 deep dive, chapters,
//                                       description.txt; thumbnails with --render or --thumbs)
//   shorts sample [same flags]          dev episode from the Oratora captures → episodes/sample-oratora
//   shorts voices [--voices a,b,c]      the sample script read by each voice → review/voices/*.mp3
//   shorts kit <episode-dir> [--slot "Wed 22 Oct, 7:30 PM IST"] [--thumb N]
//                                       manual-upload folder: review/youtube-shorts/<nnn-slug>/
//                                       (or review/youtube-long/) with the mp4, .srt
//                                       (long-form: thumbnails too) + upload.txt; shorts also get
//                                       review/instagram-reels/<nnn-slug>/ (reel, cover, caption,
//                                       upload.txt) on the next free 1-a-day slot in schedule.json
//   shorts critique <episode-dir>       earshot launch-film scorecard of out/short.mp4 (or long.mp4)
//                                       → out/<name>.earshot.json; needs earshot on PATH or EARSHOT_BIN
//   shorts sfx-kit [--rebuild] [--offline]  build/show the shared real-recording SFX kit
//   shorts photos <episode-dir> "<query>" [--n 4] [--source openverse|commons|all] [--orient wide|tall]
//                                       free CC0/CC BY photos → public/photos/, photos.json, photo-credits.txt
//   shorts capture <episode-dir> <https://page> [--as <name>]
//                                       screenshots of any page → public/captures/<name>/ (a headline, a table, a document)
//   shorts cutout <episode-dir> <image>  the photo's subject as a transparent PNG (Apple Vision) →
//                                       public/<image>-cut.png, for a photo scene's text-behind-subject
//                                       ("behind" + "cutout")
//   shorts auth                         one-time YouTube sign-in → YOUTUBE_REFRESH_TOKEN in .env
//   shorts insta-auth [--token <user token>]
//                                       one-time Instagram sign-in (Facebook Login) → INSTAGRAM_PAGE_TOKEN
//                                       and INSTAGRAM_USER_ID in .env. --token skips the browser: paste a
//                                       user token from Meta's Graph API Explorer
//   shorts insta-post [--dry-run] [--kit <nnn-slug>] [--no-gate]
//                                       post the reel that is due today in review/instagram-reels/
//                                       schedule.json (needs INSTAGRAM_UPLOAD_MODE=auto). --kit posts
//                                       that kit now, whatever its date; --no-gate (with --kit) skips QA
//   shorts autopilot status             what is due, how deep the queue is, whether the timers are loaded
//   shorts autopilot install [--maker]  load the poster timer (every 15 min from the slot, runs insta-post);
//                                       --maker also loads the daily maker (headless Claude makes an episode)
//                                       (a channel with no Instagram account has no poster: --maker only)
//   shorts autopilot uninstall          remove both timers
//   shorts autopilot make               what the maker timer runs: make one episode unless 3+ days are queued
//                                       (Instagram channels); a run that makes nothing releases its claims
//   shorts publish <episode-dir> [--privacy private|unlisted|public] [--at ISO] [--dry-run] [--thumb N]
//                                       upload the mp4 with metadata.json, the .srt track, the links
//                                       comment, and (long-form) thumb-N.png
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHttp} from '@motionhaus/audio-lib/http.mjs';
import {execFile} from 'node:child_process';
import {loadConfig, REPO_DIR, SHORTS_DIR, upsertEnv, WORKSPACE_DIR} from './config.mjs';
import {CHANNEL_KEYS, channelOf, configHome, dataRoot, needsMigration, resolveChannel, takeChannelFlag, writeDefault} from './channels.mjs';
import {createChannel, describeChannels, formatChannels, TEMPLATES, upgradeChannel} from './channel-cmds.mjs';
import {migrate, MIGRATED_SLUG} from './migrate.mjs';
import {createYouTube, insertBody, sourcesBlock, validateMeta} from './youtube.mjs';
import {critique, formatCritique} from '@motionhaus/film-qa/earshot';
import {describeKit, ensureKit} from '@motionhaus/audio-lib/sfxkit.mjs';
import {entriesFromEpisodes, Ledger} from './ledger.mjs';
import {fetchPhotos, usedPhotoCredits} from './photos.mjs';
import {makeReachable} from './filters.mjs';
import {createGithub} from './sources/github.mjs';
import {createHn} from './sources/hn.mjs';
import {fetchAll} from './steps/fetch.mjs';
import {chapterLines, instaCover, isLong, output, prepare, render, stills, subtitles, thumbnails, withChapters} from './steps/make.mjs';
import {igConfig, instaCaption} from './instagram.mjs';
import {istNow} from './insta-queue.mjs';
import {hasInstagram, publishOf, rulesOf, storiesOf} from './channel-settings.mjs';
import {claimStory, recordEpisode, releaseClaim, storyConflict} from './stories.mjs';
import {createRss} from './sources/rss.mjs';
import {codeToToken, createInstagram, DIALOG_URL, exchangeToken, findAccount, grantedPermissions, OPTIONAL_SCOPES as IG_OPTIONAL_SCOPES, SCOPES as IG_SCOPES} from './instagram-api.mjs';
import {firstToday, postDue} from './insta-post.mjs';
import {istToLocal, labels, OLD_LABELS, MAKER_TIME_IST, makerArgs, makerPrompt, makerSettings, newClaims, newlyMade, plist, posterTimes, shouldMake} from './autopilot.mjs';
import {bookEntry, dueEntry, queuedAhead, readSchedule, writeSchedule} from './insta-queue.mjs';
import os from 'node:os';
import {notify} from './notify.mjs';
import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {createWhisper} from './captions/whisper.mjs';
import {createKokoro} from './tts/kokoro.mjs';
import {synth as sayTts} from './tts/say.mjs';
import {createChatterbox} from './tts/chatterbox.mjs';
import {shortlist} from './steps/pick.mjs';

/** @typedef {import('./types.mjs').Candidate} Candidate */
/** @typedef {import('./types.mjs').Source} Source */
/** @typedef {import('./config.mjs').Config} Config */

/** @param {string[]} argv */
function parseArgs(argv) {
  const [cmd = 'help', ...rest] = argv;
  /** @type {Record<string, string | boolean>} */
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) continue;
    const next = rest[i + 1];
    if (next && !next.startsWith('--')) flags[a.slice(2)] = next, i++;
    else flags[a.slice(2)] = true;
  }
  return {cmd, flags};
}

/** "Today" for the run: --date pins it to that day's 06:30 IST (01:00 UTC). @param {string | boolean | undefined} d */
function runClock(d) {
  if (typeof d !== 'string') return {now: new Date(), date: new Date().toISOString().slice(0, 10)};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`--date must be YYYY-MM-DD, got "${d}"`);
  return {now: new Date(`${d}T01:00:00Z`), date: d};
}

/** @param {string} file @param {unknown} data */
async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

/** @param {Awaited<ReturnType<typeof loadConfig>>} cfg @returns {Source[]} */
function sources(cfg) {
  // The channel's feeds (channel.json → stories.feeds). The thresholds for the
  // two launch finders still come from the older `sources` block.
  const s = /** @type {any} */ (cfg.series.sources ?? {});
  /** @type {Source[]} */
  const out = [];
  for (const feed of storiesOf(cfg.series).feeds) {
    if (feed.type === 'hn') {
      if (s.hn?.enabled !== false) out.push(createHn({http: createHttp({provider: 'hn', minIntervalMs: 250}), minPoints: feed.minPoints ?? s.hn?.minPoints ?? 20}));
    } else if (feed.type === 'github') {
      if (s.github?.enabled !== false)
        out.push(
          createGithub({
            http: createHttp({provider: 'github', minIntervalMs: cfg.env.githubToken ? 2000 : 6000}),
            minStars: feed.minStars ?? s.github?.minStars ?? 150,
            maxAgeDays: feed.maxAgeDays ?? s.github?.maxAgeDays ?? 7,
            token: cfg.env.githubToken,
          }),
        );
    } else if (feed.type === 'rss') {
      if (typeof feed.url !== 'string') throw new Error('channel.json: an rss feed needs a "url"');
      out.push(
        createRss({
          url: feed.url,
          label: feed.label,
          fetchText: async (u) => {
            const res = await fetch(u, {headers: {'user-agent': 'Motionhaus/0.3 (feed reader)', accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml'}, signal: AbortSignal.timeout(20_000)});
            if (!res.ok) throw new Error(`${u} answered ${res.status}`);
            return res.text();
          },
        }),
      );
    } else throw new Error(`channel.json: unknown feed type "${feed.type}" (hn, github, rss)`);
  }
  return out;
}

/** The ledger's "already covered?" for a feed story, under this channel's idea of the same story. @param {Config} cfg @param {Ledger} ledger */
function ledgerCheck(cfg, ledger) {
  const {identity} = storiesOf(cfg.series);
  // Link and product site only: a feed headline is not a product name ("Show HN: …",
  // a sentence), so matching names here would drop new products for old ones.
  return {conflict: (/** @type {string} */ url) => storyConflict(ledger.entries, {url}, {identity}).refuse};
}

/** @param {Awaited<ReturnType<typeof loadConfig>>} cfg @param {{now: Date, date: string}} clock */
async function cmdFetch(cfg, clock) {
  const feeds = sources(cfg);
  if (!feeds.length) {
    console.log('this channel has no feeds (channel.json → stories.feeds): stories come from search, inside the brief');
    return [];
  }
  const {candidates, errors} = await fetchAll(feeds, {now: clock.now, lookbackHours: cfg.series.lookbackHours});
  const file = path.join(cfg.paths.runs, clock.date, 'candidates.json');
  await writeJson(file, {fetchedAt: new Date().toISOString(), runFor: clock.now.toISOString(), errors, candidates});
  for (const e of errors) console.error(`! ${e.source}: ${e.error}`);
  const by = candidates.reduce((m, c) => m.set(c.source, (m.get(c.source) ?? 0) + 1), new Map());
  console.log(`fetched ${candidates.length} candidates (${[...by].map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}) → ${file}`);
  if (errors.length === feeds.length) throw new Error('every feed failed');
  return candidates;
}

/** @param {Awaited<ReturnType<typeof loadConfig>>} cfg @param {{now: Date, date: string}} clock @param {Candidate[]} [candidates] */
async function cmdPick(cfg, clock, candidates) {
  if (!candidates) {
    const file = path.join(cfg.paths.runs, clock.date, 'candidates.json');
    candidates = /** @type {Candidate[]} */ (JSON.parse(await fs.readFile(file, 'utf8')).candidates);
  }
  const ledger = await Ledger.open(cfg.paths.ledger);
  const res = await shortlist(candidates, {
    now: clock.now,
    size: cfg.series.shortlist,
    ledger: ledgerCheck(cfg, ledger),
    blocked: cfg.blocked,
    banned: storiesOf(cfg.series).banned,
    identity: storiesOf(cfg.series).identity,
    reachable: makeReachable(),
    anchors: cfg.series.anchors ?? [],
  });
  const file = path.join(cfg.paths.runs, clock.date, 'shortlist.json');
  await writeJson(file, {perDay: cfg.series.perDay, ...res});
  console.log(`shortlist ${res.shortlist.length}/${cfg.series.shortlist} (rejected ${res.rejected.length}) → ${file}`);
  for (const c of res.shortlist)
    console.log(`  ${String(c.rank).padStart(2)}. ${c.velocity.toFixed(2)}  ${c.sourceLabel.padEnd(9)} ${String(c.score).padStart(5)}  ${(c.anchor ? `[${c.anchor}]` : '[no anchor]').padEnd(16)} ${c.title.slice(0, 60)}  ${c.url}`);
  return res;
}

async function cmdLedger(/** @type {Awaited<ReturnType<typeof loadConfig>>} */ cfg) {
  const ledger = await Ledger.open(cfg.paths.ledger);
  if (process.argv[3] === 'backfill') {
    // Long-form deep dives carry episode numbers too (a launch can exist only
    // as a deep dive), so they count for numbering and for "already featured".
    const longs = await entriesFromEpisodes(path.join(cfg.paths.data, 'long')).catch(() => []);
    const shorts = await entriesFromEpisodes(cfg.paths.episodes);
    const found = [...longs.filter((l) => !shorts.some((s) => s.episode === l.episode)), ...shorts];
    for (const e of found) ledger.upsert(e);
    await fs.mkdir(path.dirname(cfg.paths.ledger), {recursive: true});
    await ledger.save();
    return console.log(`${found.length} episodes on disk → ${cfg.paths.ledger} (${ledger.entries.length} entries, next is #${ledger.nextEpisode()})`);
  }
  if (!ledger.entries.length) return console.log('ledger is empty: run `shorts ledger backfill` to build it from the episodes on disk');
  for (const e of ledger.entries) console.log(`#${String(e.episode).padStart(3, '0')}  ${e.date}  ${e.status.padEnd(9)} ${e.title}  ${e.url}`);
}

// Shared tooling (models, voice environment): one copy for every channel.
const CACHE_DIR = path.join(dataRoot(), 'shorts', 'cache');
const MODELS_DIR = path.join(CACHE_DIR, 'models');
const WHISPER_MODEL = path.join(MODELS_DIR, 'ggml-small.en.bin');

/** A voice-clone sample: from the channel folder, else from apps/shorts (where the first channel's has always been). @param {any} cfg @param {string} ref */
async function voiceRef(cfg, ref) {
  const own = path.resolve(cfg.paths.data, ref);
  return (await fs.stat(own).then(() => true, () => false)) ? own : path.resolve(SHORTS_DIR, ref);
}

/** TTS from series.json (TTS_PROVIDER env overrides), whisper if its model is present. @param {any} cfg @param {string | boolean | undefined} voice */
async function voiceStack(cfg, voice) {
  const v = cfg.series.voice;
  let provider = process.env.TTS_PROVIDER || v.provider;
  const venv = path.join(CACHE_DIR, 'tts-venv');
  if (provider === 'chatterbox' && !(await fs.stat(path.join(venv, 'bin', 'python')).then(() => true, () => false))) {
    console.error(`! chatterbox needs ${venv} (python3 -m venv ${venv} && ${venv}/bin/pip install mlx-audio): using kokoro`);
    provider = 'kokoro';
  }
  const synth =
    provider === 'say'
      ? (/** @type {string} */ text, /** @type {string} */ wav) => sayTts(text, wav)
      : provider === 'chatterbox'
        ? createChatterbox({venv, hfHome: path.join(CACHE_DIR, 'hf'), ...(v.ref ? {ref: await voiceRef(cfg, v.ref)} : {})})
        : createKokoro({cacheDir: MODELS_DIR, voice: typeof voice === 'string' ? voice : v.id, speed: v.speed});
  // say which voice speaks: an env override silently replaced the cloned voice once
  const from = process.env.TTS_PROVIDER ? ' (TTS_PROVIDER from env/.env overrides series.json)' : '';
  console.error(`voice: ${provider}${provider === 'kokoro' ? ` ${typeof voice === 'string' ? voice : v.id}` : v.ref ? ` cloned from ${v.ref}` : ''}${from}`);
  const hasWhisper = await fs.stat(WHISPER_MODEL).then(() => true, () => false);
  if (!hasWhisper) console.error(`! no whisper model at ${WHISPER_MODEL}: caption timings will be estimated`);
  return {synth, transcribe: hasWhisper ? createWhisper({model: WHISPER_MODEL}) : undefined};
}

/** @param {Awaited<ReturnType<typeof loadConfig>>} cfg @param {string} dir @param {Record<string, string | boolean>} flags */
async function cmdMake(cfg, dir, flags) {
  const studioDir = path.join(SHORTS_DIR, 'studio');
  const t0 = Date.now();
  const props = await prepare(dir, {
    ...(await voiceStack(cfg, flags.voice)),
    series: cfg.series,
    studioDir,
    brandDir: cfg.paths.brand,
    dataDir: cfg.paths.data,
    motionBlur: !flags.fast,
  });
  const beats = props.config.scenes.map((s) => `${s.type}:${s.beats}`).join(' ');
  console.log(`props → ${path.join(dir, 'props.json')}  (${beats})`);
  console.log(`subtitles → ${await subtitles(dir, {studioDir})}`);
  if (isLong(props)) await writeDescription(dir, studioDir);
  if (typeof flags.stills === 'string') await stills(dir, {studioDir, frames: flags.stills.split(',').map(Number)});
  const {brightFrame0} = rulesOf(cfg.series);
  if (flags.render) console.log(`rendered → ${await render(dir, {studioDir, brightFrame0})}`);
  if (flags.render && !isLong(props) && !flags['no-insta'] && !hasInstagram(cfg.series)) console.log('instagram → skipped: this channel has no Instagram account (channel.json → instagram.handle)');
  if (flags.render && !isLong(props) && !flags['no-insta'] && hasInstagram(cfg.series)) {
    console.log(`instagram → ${await render(dir, {studioDir, variant: 'instagram', brightFrame0})}`);
    console.log(`instagram cover → ${await instaCover(dir, {studioDir})}`);
  }
  if (isLong(props) && (flags.render || flags.thumbs)) for (const f of await thumbnails(dir, {studioDir})) console.log(`thumbnail → ${f}`);
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

/** Long-form: metadata.json's description with chapter stamps → out/description.txt. @param {string} dir @param {string} studioDir */
async function writeDescription(dir, studioDir) {
  const {lines, warnings} = await chapterLines(dir, {studioDir});
  for (const w of warnings) console.error(`! chapters: ${w}`);
  const meta = await fs.readFile(path.join(dir, 'metadata.json'), 'utf8').then(JSON.parse, () => null);
  if (!meta) return console.error('! no metadata.json yet: description.txt skipped');
  const file = path.join(dir, 'out', 'description.txt');
  await fs.writeFile(file, withChapters(meta.description, lines) + '\n');
  console.log(`description (${lines.length} chapters) → ${file}`);
}

/** Final metadata for upload: long-form takes the description with chapters. @param {string} dir */
async function uploadMeta(dir, listSources = false) {
  /** @type {import('./youtube.mjs').VideoMeta} */
  const meta = JSON.parse(await fs.readFile(path.join(dir, 'metadata.json'), 'utf8'));
  const desc = await fs.readFile(path.join(dir, 'out', 'description.txt'), 'utf8').catch(() => null);
  if (desc) meta.description = desc.trimEnd();
  else meta.description = withChapters(meta.description, []);
  // CC-BY sound effects in the real SFX kit must be credited where viewers can see it
  const credits = await fs.readFile(path.join(dir, 'sfx-credits.txt'), 'utf8').catch(() => null);
  if (credits && !meta.description.includes(credits.trim())) meta.description = `${meta.description}\n\n${credits.trim()}`;
  // CC BY photos too, but only the ones the script uses
  const photos = await usedPhotoCredits(dir);
  if (photos && !meta.description.includes(photos)) meta.description = `${meta.description}\n\n${photos}`;
  // The channel may list what the video's claims rest on (publish.listSources).
  if (listSources) {
    const script = await fs.readFile(path.join(dir, 'script.json'), 'utf8').then(JSON.parse, () => null);
    const block = sourcesBlock(script?.sources);
    if (block && !meta.description.includes(block)) meta.description = `${meta.description}\n\n${block}`;
  }
  return meta;
}

/** Which thumbnail to use (--thumb N, default 1), if the episode has any. @param {string} dir @param {Record<string, string | boolean>} flags */
async function pickThumb(dir, flags) {
  const n = typeof flags.thumb === 'string' ? Number(flags.thumb) : 1;
  const file = path.join(dir, 'out', `thumb-${n}.png`);
  return fs.stat(file).then(() => file, () => null);
}

/** @param {Awaited<ReturnType<typeof loadConfig>>} cfg */
async function cmdSample(cfg) {
  const dir = path.join(cfg.paths.episodes, 'sample-oratora');
  const site = path.join(WORKSPACE_DIR, 'launch-films', 'oratora-launch-2', 'public', 'site');
  await fs.mkdir(path.join(dir, 'public'), {recursive: true});
  await fs.cp(site, path.join(dir, 'public', 'site'), {recursive: true});
  await fs.copyFile(path.join(SHORTS_DIR, 'sample', 'oratora.script.json'), path.join(dir, 'script.json'));
  console.log(`sample episode → ${dir}`);
  return dir;
}

/** @param {Awaited<ReturnType<typeof loadConfig>>} cfg @param {Record<string, string | boolean>} flags */
async function cmdVoices(cfg, flags) {
  const voices = typeof flags.voices === 'string' ? flags.voices.split(',') : ['af_heart', 'af_bella', 'am_michael', 'am_fenrir', 'bf_emma'];
  const script = JSON.parse(await fs.readFile(path.join(SHORTS_DIR, 'sample', 'oratora.script.json'), 'utf8'));
  const lines = [...script.scenes.map((/** @type {any} */ s) => s.vo), script.outro.vo].filter(Boolean);
  const out = path.join(cfg.paths.review, 'voices');
  await fs.mkdir(out, {recursive: true});
  for (const voice of voices) {
    const synth = createKokoro({cacheDir: MODELS_DIR, voice, speed: cfg.series.voice.speed});
    const parts = [];
    for (const [i, line] of lines.entries()) {
      const wav = path.join(out, `.${voice}-${i}.wav`);
      await synth(line, wav, {pronounce: script.pronounce});
      parts.push(wav);
    }
    const list = path.join(out, `.${voice}.txt`);
    await fs.writeFile(list, parts.map((p) => `file '${p}'`).join('\n'));
    const mp3 = path.join(out, `${voice}.mp3`);
    const {execFileSync} = await import('node:child_process');
    // 0.35s gap between scene lines, like the edit.
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-af', 'apad=pad_dur=0.35', '-c:a', 'libmp3lame', '-q:a', '2', mp3]);
    await Promise.all([...parts, list].map((f) => fs.rm(f)));
    console.log(`  ${voice} → ${mp3}`);
  }
}

/** @param {Awaited<ReturnType<typeof loadConfig>>} cfg */
function youtube(cfg) {
  const y = cfg.env.youtube;
  if (!y.clientId || !y.clientSecret)
    throw new Error(`set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in ${cfg.envFile} (Google Cloud → APIs & Services → Credentials → OAuth client, type "Desktop app")`);
  return createYouTube({...y, label: cfg.series.name, video: publishOf(cfg.series).youtube});
}

/** @param {Awaited<ReturnType<typeof loadConfig>>} cfg */
async function cmdAuth(cfg) {
  const yt = youtube(cfg);
  const token = await yt.authorize((url) => {
    console.log(`Opening Google sign-in. Choose the account that manages ${cfg.series.handle}.\nIf no browser opens, visit:\n${url}\n`);
    execFile('open', [url]);
  });
  await upsertEnv(cfg.channel.secretsFile, 'YOUTUBE_REFRESH_TOKEN', token);
  const ch = await createYouTube({...cfg.env.youtube, refreshToken: token}).channel();
  console.log(`saved YOUTUBE_REFRESH_TOKEN to ${cfg.channel.secretsFile}`);
  console.log(ch ? `connected to "${ch.title}" ${ch.handle}` : '! signed in, but that account has no YouTube channel');
  if (ch && ch.handle && ch.handle.toLowerCase() !== cfg.series.handle.toLowerCase())
    console.log(`! expected ${cfg.series.handle}: run auth again and pick the ${cfg.series.name} brand account`);
}

/** @param {Awaited<ReturnType<typeof loadConfig>>} cfg @param {string} dir @param {Record<string, string | boolean>} flags */
async function cmdPublish(cfg, dir, flags) {
  const props = JSON.parse(await fs.readFile(path.join(dir, 'props.json'), 'utf8'));
  const {name} = output(props);
  const long = isLong(props);
  const file = path.join(dir, 'out', `${name}.mp4`);
  await fs.stat(file);
  const srt = await fs.stat(path.join(dir, 'out', `${name}.en.srt`)).then(() => path.join(dir, 'out', `${name}.en.srt`), () => null);
  const thumb = long ? await pickThumb(dir, flags) : null;
  if (long && !thumb) throw new Error('no thumbnail: run `shorts make <dir> --thumbs` (or pass --thumb N)');
  const meta = await uploadMeta(dir, publishOf(cfg.series).listSources);
  if (typeof flags.privacy === 'string') meta.privacy = /** @type {any} */ (flags.privacy);
  if (typeof flags.at === 'string') meta.publishAt = new Date(flags.at).toISOString();
  const errs = validateMeta(meta);
  if (errs.length) throw new Error(`metadata.json: ${errs.join('; ')}`);
  if (flags['dry-run']) return console.log(JSON.stringify(insertBody(meta, publishOf(cfg.series).youtube), null, 2));

  const yt = youtube(cfg);
  const ch = await yt.channel();
  if (!ch) throw new Error('the signed-in account has no channel: run `shorts auth`');
  console.log(`uploading to "${ch.title}" ${ch.handle} as ${meta.publishAt ? `scheduled ${meta.publishAt}` : meta.privacy ?? 'private'}…`);
  const id = await yt.upload(file, meta, (sent, total) => process.stdout.write(`\r  ${Math.round((sent / total) * 100)}%`));
  const watch = long ? `https://youtube.com/watch?v=${id}` : `https://youtube.com/shorts/${id}`;
  console.log(`\n  ${watch}`);
  const captionId = srt ? await yt.captions(id, srt).catch((e) => (console.error(`! subtitles: ${e.message}`), null)) : null;
  if (captionId) console.log(`  subtitles uploaded (${path.basename(/** @type {string} */ (srt))})`);
  const thumbOk = thumb
    ? await yt.thumbnail(id, thumb).then(
        () => true,
        (e) => (console.error(`! thumbnail: ${e.message} (custom thumbnails need a phone-verified channel)`), false),
      )
    : false;
  if (thumbOk) console.log(`  thumbnail set (${path.basename(/** @type {string} */ (thumb))})`);
  const commentId = meta.comment ? await yt.comment(id, meta.comment).catch((e) => (console.error(`! comment: ${e.message}`), null)) : null;
  if (commentId) console.log('  links comment posted: pin it in YouTube Studio (the API cannot pin)');
  const st = await yt.status(id);
  const wanted = meta.publishAt ? 'private' : meta.privacy ?? 'private';
  if (st && st.privacy !== wanted)
    console.log(`! YouTube set it to ${st.privacy} (asked ${wanted}): unaudited API projects are locked private. Make it public in Studio, or apply for the audit.`);
  await fs.writeFile(path.join(dir, 'published.json'), JSON.stringify({videoId: id, url: watch, format: long ? 'long' : 'short', at: new Date().toISOString(), status: st, commentId, captionId, thumbnail: thumbOk ? thumb : null}, null, 2) + '\n');
  const ledger = await Ledger.open(cfg.paths.ledger);
  const script = JSON.parse(await fs.readFile(path.join(dir, 'script.json'), 'utf8'));
  const url = String(script.sourceUrl ?? `https://${script.brand.url}`);
  if (long) {
    // A deep dive usually follows the launch's own short: record it beside
    // that entry instead of as a new episode.
    const known = ledger.entries.find((e) => e.url === url);
    if (known) ledger.update(known.episode, {longYoutubeId: id});
    else ledger.add({url, source: String(script.sourceLabel), sourceId: id, title: meta.title, status: 'published', date: new Date().toISOString().slice(0, 10), longYoutubeId: id});
  } else {
    const known = ledger.entries.find((e) => e.url === url);
    if (known) ledger.update(known.episode, {status: 'published', youtubeId: id});
    else ledger.add({url, source: String(script.sourceLabel), sourceId: id, title: meta.title, status: 'published', date: new Date().toISOString().slice(0, 10), youtubeId: id});
  }
  await ledger.save();
}

const IG_AUTH_PORT = 8723;

/**
 * Facebook's sign-in dialog in the browser, answered on localhost (allowed
 * for apps in development mode). Returns a short-lived user token.
 * @param {{appId: string, appSecret: string, name: string}} app  name: the channel's name, shown on the page
 */
async function instaSignIn(app) {
  const redirectUri = `http://localhost:${IG_AUTH_PORT}/`;
  const state = randomBytes(12).toString('hex');
  /** @type {(code: string) => void} */
  let done = () => {};
  /** @type {(e: Error) => void} */
  let fail = () => {};
  const got = /** @type {Promise<string>} */ (new Promise((res, rej) => ((done = res), (fail = rej))));
  const server = http.createServer((req, res) => {
    const u = new URL(req.url ?? '/', redirectUri);
    if (u.pathname !== '/') return void res.writeHead(404).end();
    const code = u.searchParams.get('state') === state ? u.searchParams.get('code') : null;
    res.writeHead(code ? 200 : 400, {'content-type': 'text/html'});
    res.end(code ? `<h2>${app.name} is connected to Instagram. You can close this tab.</h2>` : '<h2>Sign-in failed. Go back to the terminal.</h2>');
    if (code) done(code);
    else fail(new Error(`Facebook sign-in failed: ${u.searchParams.get('error_description') ?? u.searchParams.get('error') ?? 'state mismatch'}`));
  });
  await new Promise((res, rej) => server.once('error', rej).listen(IG_AUTH_PORT, 'localhost', () => res(undefined)));
  const url = `${DIALOG_URL}?${new URLSearchParams({client_id: app.appId, redirect_uri: redirectUri, state, response_type: 'code', scope: [...IG_SCOPES, ...IG_OPTIONAL_SCOPES].join(',')})}`;
  console.log(`Opening Facebook sign-in. Tick the Page and the Instagram account when asked.\nIf no browser opens, visit:\n${url}\n`);
  execFile('open', [url]);
  try {
    return await codeToToken({...app, code: await got, redirectUri});
  } finally {
    server.close();
  }
}

/** @param {Awaited<ReturnType<typeof loadConfig>>} cfg @param {Record<string, string | boolean>} flags */
async function cmdInstaAuth(cfg, flags) {
  const {appId, appSecret} = cfg.env.instagram;
  if (!appId || !appSecret) throw new Error(`set META_APP_ID and META_APP_SECRET in ${cfg.envFile} (developers.facebook.com → your app → App settings → Basic)`);
  const handle = igConfig(cfg.series).handle;
  const short = typeof flags.token === 'string' ? flags.token : await instaSignIn({appId, appSecret, name: cfg.series.name});
  const userToken = await exchangeToken({appId, appSecret, userToken: short});
  const acct = await findAccount({userToken, handle}).catch(async (err) => {
    const perms = await grantedPermissions({userToken}).catch(() => null);
    const extra = !perms ? '' : perms.missing.length ? `\nThe sign-in did not grant: ${perms.missing.join(', ')}. Add these permissions to the Meta app (Use cases → customize), then sign in again.` : `\nThe required permissions were granted (${perms.granted.join(', ')}), so the app is fine: the Page or the Instagram account was not ticked in the sign-in dialog, or the two are not connected.`;
    throw new Error(`${err.message}${extra}`);
  });
  await upsertEnv(cfg.channel.secretsFile, 'INSTAGRAM_PAGE_TOKEN', acct.pageToken);
  await upsertEnv(cfg.channel.secretsFile, 'INSTAGRAM_USER_ID', acct.igUserId);
  const me = await createInstagram({pageToken: acct.pageToken, igUserId: acct.igUserId}).account();
  console.log(`saved INSTAGRAM_PAGE_TOKEN and INSTAGRAM_USER_ID to ${cfg.channel.secretsFile}`);
  console.log(`connected to @${me.username} via Page "${acct.page}"`);
  if (cfg.env.instagram.mode !== 'auto') console.log('posting is still manual: set INSTAGRAM_UPLOAD_MODE=auto in that file when you want `shorts insta-post` to post');
}

// A full render takes about 12 minutes, past Claude Code's default 10-minute
// ceiling for a shell command. Past the ceiling a command is moved to the
// background, and a headless run then waits for a notification that never
// comes (the maker's first working run sat on three renders for three hours).
const MAKER_BASH_TIMEOUTS = {BASH_DEFAULT_TIMEOUT_MS: String(30 * 60_000), BASH_MAX_TIMEOUT_MS: String(60 * 60_000)};

/** YouTube category names for the kit checklist (ids are what the API takes). */
const YT_CATEGORIES = /** @type {Record<string, string>} */ ({1: 'Film & Animation', 2: 'Autos & Vehicles', 10: 'Music', 15: 'Pets & Animals', 17: 'Sports', 19: 'Travel & Events', 20: 'Gaming', 22: 'People & Blogs', 23: 'Comedy', 24: 'Entertainment', 25: 'News & Politics', 26: 'Howto & Style', 27: 'Education', 28: 'Science & Technology'});

const IG_COVER_FRAME = 36; // steps/make.mjs instaCover: the hook frame the cover is rendered from
const SHORT_FPS = 30; // props.mjs default

/** @param {Awaited<ReturnType<typeof loadConfig>>} cfg @param {Record<string, string | boolean>} flags */
async function cmdInstaPost(cfg, flags) {
  const kit = typeof flags.kit === 'string' ? flags.kit : undefined;
  const dryRun = !!flags['dry-run'];
  const ig = igConfig(cfg.series);
  if (!kit && cfg.env.instagram.mode !== 'auto') {
    console.log('INSTAGRAM_UPLOAD_MODE is manual: nothing posted' + (dryRun ? ' (this is what would be due)' : ''));
    if (!dryRun) return;
  }
  const kitsDir = path.join(cfg.paths.review, 'instagram-reels');
  const logFile = path.join(cfg.paths.data, 'autopilot.log');
  const {date, time} = istNow();
  const {measure, PROFILES} = await import('@motionhaus/film-qa/gate');
  const res = await postDue({
    scheduleFile: path.join(kitsDir, 'schedule.json'),
    kitsDir,
    stateFile: path.join(cfg.paths.data, 'autopilot-state.json'),
    now: {date, time, iso: new Date().toISOString()},
    after: /** @type {any} */ (ig).autoPostAfter,
    slotTime: ig.slotsIST[0],
    coverFrameMs: Math.round((IG_COVER_FRAME / SHORT_FPS) * 1000),
    // built only when something is sent, so --dry-run works before sign-in
    ig: dryRun ? /** @type {any} */ ({}) : createInstagram(cfg.env.instagram),
    gate: async (mp4) => {
      const g = await measure(mp4, {profile: 'animation'});
      const reds = Object.entries(g.lights).filter(([, l]) => l === 'red').map(([k]) => `${PROFILES.animation[k]?.name ?? k} ${g[k]}${PROFILES.animation[k]?.unit ?? ''}`);
      return {verdict: g.verdict, reasons: reds};
    },
    channelName: cfg.series.name,
    notify: (title, body) => notify(title, body, {logFile}),
    onPosted: async (entry, r) => {
      const ledger = await Ledger.open(cfg.paths.ledger);
      if (r.id && ledger.entries.some((e) => e.episode === Number(entry.n))) {
        ledger.update(Number(entry.n), {instagramId: r.id});
        await ledger.save();
      }
    },
    kit,
    dryRun,
    skipGate: !!flags['no-gate'],
  });
  console.log(`${res.outcome}: ${res.detail}`);
  if (res.outcome === 'failed' || res.outcome === 'blocked') process.exitCode = 1;
}

/** @param {string} cmd @param {string[]} args @param {import('node:child_process').ExecFileOptions} [o] @returns {Promise<{code: number, out: string}>} */
const runCmd = (cmd, args, o = {}) =>
  new Promise((res) => execFile(cmd, args, {maxBuffer: 64 * 1024 * 1024, ...o}, (e, out, err) => res({code: e ? (typeof (/** @type {any} */ (e).code) === 'number' ? /** @type {any} */ (e).code : 1) : 0, out: `${out}${err}`})));

/** Absolute path of a program on PATH, or null. @param {string} name */
const which = async (name) => {
  const r = await runCmd('/usr/bin/which', [name]);
  return r.code === 0 ? r.out.trim().split('\n')[0] : null;
};

/** @param {Awaited<ReturnType<typeof loadConfig>>} cfg @param {Record<string, string | boolean>} flags */
async function cmdAutopilot(cfg, flags) {
  const sub = process.argv[3];
  const LABELS = labels(cfg.channel.slug);
  const agents = path.join(os.homedir(), 'Library', 'LaunchAgents');
  const file = (/** @type {string} */ label) => path.join(agents, `${label}.plist`);
  const domain = `gui/${os.userInfo().uid}`;
  const logFile = path.join(cfg.paths.data, 'autopilot.log');
  const scheduleFile = path.join(cfg.paths.review, 'instagram-reels', 'schedule.json');
  // igConfig throws for a channel with no Instagram account: it is read only where Instagram is used.
  const ig = hasInstagram(cfg.series) ? igConfig(cfg.series) : null;
  const cli = path.join(SHORTS_DIR, 'src', 'cli.mjs');
  const loaded = async (/** @type {string} */ label) => (await runCmd('launchctl', ['print', `${domain}/${label}`])).code === 0;

  if (sub === 'status' && flags.all) {
    const uidAll = os.userInfo().uid;
    const on = async (/** @type {string} */ label) => (await runCmd('launchctl', ['print', `gui/${uidAll}/${label}`])).code === 0;
    return console.log(formatChannels(await describeChannels({data: cfg.paths.root, config: configHome(), loaded: async (slug) => ({poster: await on(labels(slug).poster), maker: await on(labels(slug).maker)})})));
  }
  if (sub === 'status') {
    console.log(`channel: ${cfg.channel.slug} (${cfg.series.name})`);
    if (ig) {
      const schedule = await readSchedule(scheduleFile);
      const {date, time} = istNow();
      const after = ig.autoPostAfter;
      console.log(`mode: ${cfg.env.instagram.mode}${cfg.env.instagram.mode === 'auto' ? '' : ' (nothing posts; set INSTAGRAM_UPLOAD_MODE=auto)'}`);
      console.log(`signed in: ${cfg.env.instagram.pageToken ? 'yes' : 'no (run `shorts insta-auth`)'}`);
      console.log(`autoPostAfter: ${after ?? 'not set'}`);
      console.log(`now: ${date} ${time} IST · ${dueEntry(schedule, {date, time, after}).reason}`);
      console.log(`queued ahead: ${queuedAhead(schedule, date)} days · maker: ${shouldMake(schedule, date).reason}`);
    } else console.log('instagram: no account (nothing is posted; the maker, if installed, makes one episode a day)');
    for (const [name, label] of Object.entries(LABELS)) console.log(`${name} timer: ${(await loaded(label)) ? 'loaded' : 'not installed'} (${label})`);
    const st = await fs.readFile(path.join(cfg.paths.data, 'autopilot-state.json'), 'utf8').then(JSON.parse, () => ({}));
    console.log(`poster last ran: ${st.lastRun ?? 'never'}`);
    console.log(`log: ${logFile}`);
    return;
  }
  if (sub === 'uninstall') {
    for (const label of Object.values(LABELS)) {
      await runCmd('launchctl', ['bootout', `${domain}/${label}`]);
      await fs.rm(file(label), {force: true});
    }
    return console.log('timers removed');
  }
  if (sub === 'install') {
    if (process.platform !== 'darwin') throw new Error('the timers are launchd agents: macOS only');
    if (!ig && !flags.maker) throw new Error('this channel has no Instagram account, so there is nothing to post: use --maker to install only the daily maker');
    if (ig && !cfg.env.instagram.pageToken) throw new Error('not signed in to Instagram: run `shorts insta-auth` first');
    const claude = await which('claude');
    if (flags.maker && !claude) throw new Error('`claude` is not on PATH: install Claude Code before loading the maker');
    const pathDirs = [process.execPath, claude, await which('ffmpeg'), await which('npx')].filter((p) => typeof p === 'string').map((p) => path.dirname(/** @type {string} */ (p)));
    /** @type {{label: string, args: string[], calendar: {Hour: number, Minute: number}[]}[]} */
    const jobs = ig ? [{label: LABELS.poster, args: [process.execPath, cli, '--channel', cfg.channel.slug, 'insta-post'], calendar: posterTimes(ig.slotsIST[0]).map((t) => istToLocal(t))}] : [];
    if (flags.maker) jobs.push({label: LABELS.maker, args: [process.execPath, cli, '--channel', cfg.channel.slug, 'autopilot', 'make'], calendar: [istToLocal(MAKER_TIME_IST)]});
    await fs.mkdir(agents, {recursive: true});
    await fs.mkdir(path.dirname(logFile), {recursive: true});
    // what the jobs print (the notifications still go to autopilot.log in the workspace)
    const launchdLog = path.join(os.homedir(), 'Library', 'Logs', `motionhaus-${cfg.channel.slug}.log`);
    for (const j of jobs) {
      await fs.writeFile(file(j.label), plist({...j, logFile: launchdLog, pathDirs}));
      await runCmd('launchctl', ['bootout', `${domain}/${j.label}`]);
      const r = await runCmd('launchctl', ['bootstrap', domain, file(j.label)]);
      if (r.code !== 0) throw new Error(`launchctl could not load ${j.label}: ${r.out.trim()}`);
      console.log(`loaded ${j.label}`);
    }
    if (!ig) return console.log(`maker: daily at ${MAKER_TIME_IST} IST · no poster (this channel has no Instagram account)`);
    console.log(`poster: every 15 min from ${ig.slotsIST[0]} IST${flags.maker ? ` · maker: daily at ${MAKER_TIME_IST} IST` : ' · maker not installed (add --maker)'}`);
    // Run the poster once now, while someone is here: the first launchd run of
    // node inside ~/Documents can raise a macOS privacy prompt, and a timer
    // that is silently refused would never notify anyone.
    await runCmd('launchctl', ['kickstart', `${domain}/${LABELS.poster}`]);
    console.log(`started the poster once: approve any macOS prompt for "node", then check \`shorts autopilot status\` shows "poster last ran: ${istNow().date}"`);
    if (cfg.env.instagram.mode !== 'auto') console.log('! INSTAGRAM_UPLOAD_MODE is manual: the poster will run and post nothing until it is auto');
    return;
  }
  if (sub === 'make') {
    const say = (/** @type {string} */ title, /** @type {string} */ body) => notify(title, body, {logFile});
    const before = ig ? await readSchedule(scheduleFile) : [];
    const {date} = istNow();
    // The queue throttle is about reels waiting to post: a channel without Instagram has no queue.
    if (ig) {
      const go = shouldMake(before, date);
      if (!go.make) return console.log(`not making an episode: ${go.reason}`);
    }
    const ledgerBefore = (await Ledger.open(cfg.paths.ledger)).entries;
    const prompt = makerPrompt(await fs.readFile(path.join(SHORTS_DIR, 'autopilot', 'maker-prompt.md'), 'utf8'), {name: cfg.series.name, slug: cfg.channel.slug, dir: cfg.paths.data});
    // Written outside the repo and the workspace, fresh on every run, so the
    // maker cannot leave a looser copy behind for its next run.
    const settingsFile = path.join(configHome(), `maker-settings-${cfg.channel.slug}.json`);
    await fs.mkdir(path.dirname(settingsFile), {recursive: true});
    const base = JSON.parse(await fs.readFile(path.join(SHORTS_DIR, 'autopilot', 'maker-settings.json'), 'utf8'));
    await fs.writeFile(settingsFile, JSON.stringify(makerSettings({base, repoDir: REPO_DIR, channelDir: cfg.paths.data, configHome: configHome()}), null, 2) + '\n');
    // stdout and stderr apart: Claude's answer is on stdout, and warnings on
    // stderr would otherwise be all that is left in the "last lines".
    /** @type {{code: number, stdout: string, stderr: string}} */
    const r = await new Promise((res) => {
      const child = execFile('claude', makerArgs({prompt, settingsFile}), {cwd: REPO_DIR, timeout: 3 * 3600e3, maxBuffer: 64 * 1024 * 1024, env: makerEnv(cfg.channel.slug)}, (e, stdout, stderr) =>
        res({code: e ? (typeof (/** @type {any} */ (e).code) === 'number' ? /** @type {any} */ (e).code : 1) : 0, stdout: String(stdout), stderr: String(stderr)}),
      );
      child.stdin?.end(); // nothing is piped in; without this claude waits for input first
    });
    // The whole run is kept: it is the only account of why an episode was not made.
    const runLog = path.join(cfg.paths.data, 'maker-runs', `${date}.log`);
    await fs.mkdir(path.dirname(runLog), {recursive: true});
    await fs.writeFile(runLog, `exit ${r.code}\n\n${r.stdout}\n\n--- stderr ---\n${r.stderr}`);
    // "Made" is what the ledger says: `shorts kit` records every packed short,
    // and a channel without Instagram books nothing in the schedule.
    const ledgerAfter = (await Ledger.open(cfg.paths.ledger)).entries;
    const [made] = newlyMade(ledgerBefore, ledgerAfter);
    const booked = ig ? (await readSchedule(scheduleFile)).filter((e) => !before.some((b) => b.n === e.n)) : [];
    const last = (r.stdout.trim() || r.stderr.trim()).split('\n').slice(-3).join(' ').slice(-300);
    if (made) {
      if (booked.length) await say(`${cfg.series.name}: made #${booked[0].n}`, `${booked[0].dir} is booked for ${booked[0].date} ${booked[0].time} IST.`);
      else await say(`${cfg.series.name}: made #${made.episode}`, `#${made.episode} ${made.title} is packed in ${cfg.paths.review}.`);
      console.log(booked.length ? `made #${booked[0].n} for ${booked[0].date}` : `made #${made.episode} ${made.title}`);
      return;
    }
    // A run that made nothing gives back the numbers it claimed.
    const left = newClaims(ledgerBefore, ledgerAfter);
    for (const key of left) await releaseClaim(cfg.paths.ledger, key);
    if (left.length) console.log(`released ${left.length} claim${left.length === 1 ? '' : 's'} this run left (${left.join(', ')})`);
    await say(`${cfg.series.name}: no episode made today`, `${last || `claude exited ${r.code} with no output`} (full log: ${runLog})`);
    console.log(`no episode made: ${last}`);
    process.exitCode = 1;
    return;
  }
  console.log('usage: shorts autopilot <status|install [--maker]|uninstall|make>');
}

/** @param {Config} cfg @param {string} dir @param {Record<string, string | boolean>} flags */
async function cmdKit(cfg, dir, flags) {
  const script = JSON.parse(await fs.readFile(path.join(dir, 'script.json'), 'utf8'));
  const props = JSON.parse(await fs.readFile(path.join(dir, 'props.json'), 'utf8'));
  const long = isLong(props);
  const {name} = output(props);
  const m = await uploadMeta(dir, publishOf(cfg.series).listSources);
  const errs = validateMeta(m);
  if (errs.length) throw new Error(`metadata.json: ${errs.join('; ')}`);
  const n = String(script.episode).padStart(3, '0');
  const slug = path.basename(dir);
  // One category folder per YouTube format.
  const kit = path.join(cfg.paths.review, long ? 'youtube-long' : 'youtube-shorts', `${n}-${slug}`);
  await fs.mkdir(kit, {recursive: true});
  const base = `${cfg.channel.slug}-${n}-${slug}${long ? '-deep-dive' : ''}`;
  const video = `${base}.mp4`;
  await fs.copyFile(path.join(dir, 'out', `${name}.mp4`), path.join(kit, video));
  const srt = path.join(dir, 'out', `${name}.en.srt`);
  const hasSrt = await fs.copyFile(srt, path.join(kit, `${base}.en.srt`)).then(() => true, () => false);
  const thumb = long ? await pickThumb(dir, flags) : null;
  if (thumb) await fs.copyFile(thumb, path.join(kit, `${base}-thumbnail.png`));
  const slot = typeof flags.slot === 'string' ? flags.slot : long ? 'next free long-form slot' : `next free slot${Array.isArray(/** @type {any} */ (cfg.series).publishSlotsIST) ? `: ${/** @type {any} */ (cfg.series).publishSlotsIST.join(' or ')} IST` : ''}`;
  const rule = (/** @type {string} */ t) => `━━━━━━━━ ${t} ━━━━━━━━`;
  const pub = publishOf(cfg.series);
  const text = [
    `${cfg.series.name.toUpperCase()} #${n} · ${script.brand?.name ?? slug} · ${long ? 'deep dive' : 'short'} · manual upload kit`,
    long ? `Video: ${video} (16:9 deep dive)` : `Video: ${video} (vertical, under 3 min → YouTube makes it a Short automatically)`,
    `Schedule: ${slot}`,
    '',
    rule('TITLE (copy)'), m.title, '',
    rule(long ? 'DESCRIPTION (copy; chapters included)' : 'DESCRIPTION (copy)'), m.description, '',
    rule('TAGS (Show more → Tags, copy)'), (m.tags ?? []).join(', '), '',
    rule('PINNED COMMENT (post after it goes live, then ⋮ → Pin)'), m.comment ?? '', '',
    rule('STUDIO SETTINGS'),
    ...(long && thumb ? [`[ ] Thumbnail: upload ${base}-thumbnail.png`] : []),
    ...(hasSrt ? [`[ ] Subtitles → Add language English → Upload file → With timing → ${base}.en.srt`] : []),
    "[ ] Audience: No, it's not made for kids",
    '[ ] Show more → Altered content: No (AI narration, nothing realistic is faked)',
    `[ ] Category: ${YT_CATEGORIES[pub.youtube.categoryId] ?? `id ${pub.youtube.categoryId}`} · Language: ${pub.youtube.language === 'en' ? 'English' : pub.youtube.language}`,
    ...(long
      ? ['[ ] End screen (last 8s, right side is left clear): 1 video "Best for viewer" + Subscribe', '[ ] Comments: On']
      : ['[ ] Comments: On · Shorts remixing: Allow']),
    `[ ] Visibility: Schedule → ${slot}`,
    '[ ] After it goes live: post + pin the question comment, reply to every comment in the first hour (comments are the cheapest ranking signal)',
    '',
  ].join('\n');
  await fs.writeFile(path.join(kit, 'upload.txt'), text);
  console.log(`kit → ${kit}`);
  if (!long) {
    // A packed short is a covered story, product or not: record it so `pick`
    // and `story claim` skip it and the next episode takes the next number.
    await recordEpisode(cfg.paths.ledger, {script, slug});
    if (hasInstagram(cfg.series)) await instaKit(cfg, dir, {script, meta: m, n, slug, flags});
    else console.log('instagram kit → skipped: this channel has no Instagram account');
  }
}

/**
 * review/instagram-reels/<nnn-slug>/: the Instagram cut, its cover and
 * caption, booked on the next free slot of review/instagram-reels/schedule.json
 * (1 a day, 7:30 PM IST, per the audit) unless --ig-slot "YYYY-MM-DD HH:MM".
 * @param {Config} cfg @param {string} dir @param {{script: any, meta: any, n: string, slug: string, flags: Record<string, string | boolean>}} o
 */
async function instaKit(cfg, dir, {script, meta, n, slug, flags}) {
  const reel = path.join(dir, 'out', 'short.instagram.mp4');
  if (!(await fs.stat(reel).then(() => true, () => false)))
    return console.error(`! no ${path.relative(dir, reel)}: run \`shorts make <dir> --render\` for the Instagram cut`);
  const {series} = cfg;
  const ig = igConfig(series);
  const root = path.join(cfg.paths.review, 'instagram-reels');
  const kit = path.join(root, `${n}-${slug}`);
  await fs.mkdir(kit, {recursive: true});
  const base = `${cfg.channel.slug}-${n}-${slug}`;
  await fs.copyFile(reel, path.join(kit, `${base}.mp4`));
  const hasCover = await fs.copyFile(path.join(dir, 'out', 'instagram-cover.png'), path.join(kit, `${base}-cover.png`)).then(() => true, () => false);
  const caption = instaCaption(script, meta, series);
  await fs.writeFile(path.join(kit, 'caption.txt'), caption + '\n');

  const schedFile = path.join(root, 'schedule.json');
  const pinned = typeof flags['ig-slot'] === 'string' ? flags['ig-slot'].split(' ') : null;
  const {date: today, time: now} = istNow();
  // Read as late as possible and write atomically: the poster patches this file too.
  const booked = bookEntry(await readSchedule(schedFile), {n, dir: `${n}-${slug}`, file: `${base}.mp4`}, {today, now, slots: ig.slotsIST, pinned: pinned ? {date: pinned[0], time: pinned[1] ?? ig.slotsIST[0]} : null});
  const slot = booked.slot;
  if (booked.posted) console.error(`! #${n} is already on Instagram: its schedule entry is left as it is`);
  else await writeSchedule(schedFile, booked.schedule);

  const auto = cfg.env.instagram.mode === 'auto';
  const rule = (/** @type {string} */ t) => `━━━━━━━━ ${t} ━━━━━━━━`;
  const makers = script.instagram?.makers ?? [];
  const text = [
    auto
      ? `${series.name.toUpperCase()} #${n} · ${script.brand?.name ?? slug} · Instagram reel · POSTS BY ITSELF at the slot below (shorts insta-post). Do not upload it by hand.`
      : `${series.name.toUpperCase()} #${n} · ${script.brand?.name ?? slug} · Instagram reel · manual upload kit`,
    `Reel: ${base}.mp4 (9:16, no episode badge, share-prompt end card)`,
    `Schedule: ${slot.date}, ${slot.time} IST (1 reel a day)`,
    '',
    rule('CAPTION (copy)'), caption, '',
    ...(auto ? ['Posted automatically: the caption, the hook frame as cover, maker tags, share to feed.', 'The steps under BEFORE POSTING are only for a manual upload.', ''] : []),
    rule('BEFORE POSTING'),
    hasCover ? `[ ] Edit cover → Add from camera roll → ${base}-cover.png (check the 3:4 grid crop)` : '[ ] Cover: pick the hook frame where the subject and the words are both on screen',
    ...(makers.length ? [`[ ] Tag people: ${makers.join(' ')}`] : []),
    '[ ] Audio: keep original audio (the voiceover); optional trending sound under 15% volume',
    '[ ] Share to feed: On',
    '[ ] Advanced: AI label only if asked (AI narration, nothing realistic is faked)',
    ...publishOf(series).kitNotes.map((/** @type {string} */ n) => `[ ] ${n}`),
    '',
    rule('AFTER IT GOES LIVE'),
    '[ ] Reply to every comment in the first hour',
    '[ ] Day 14: check watch time, skip rate and shares per reel in the app',
    '',
  ].join('\n');
  await fs.writeFile(path.join(kit, 'upload.txt'), text);
  console.log(`instagram kit → ${kit} (${slot.date} ${slot.time} IST)`);
}

/** earshot scorecard of the rendered episode. @param {string} dir */
async function cmdCritique(dir) {
  const props = JSON.parse(await fs.readFile(path.join(dir, 'props.json'), 'utf8'));
  const mp4 = path.join(dir, 'out', `${output(props).name}.mp4`);
  const res = await critique(mp4);
  console.log(formatCritique(res));
  if (!res.ok) process.exitCode = res.missing ? 0 : 1;
}

/**
 * An episode or kit path given on the command line, resolved. A path that
 * sits in another channel's folder is refused: running `kit` or `publish`
 * on it would file one channel's video under another channel's name.
 * @param {Config} cfg @param {string} p
 */
function inChannel(cfg, p) {
  const abs = path.resolve(p);
  const owner = channelOf(cfg.paths.root, abs);
  if (owner && owner !== cfg.channel.slug) throw new Error(`that path belongs to channel "${owner}", not "${cfg.channel.slug}" (add --channel ${owner})`);
  return abs;
}

/**
 * `shorts story claim|check --title "…" --url <link> --key <short-name> [--source "Reuters"]`
 * claim: reserve the story and its episode number for 24 hours (the same key
 * again returns the same number). check: only say whether it may be covered.
 * @param {Config} cfg @param {Record<string, string | boolean>} flags
 */
async function cmdStory(cfg, flags) {
  const sub = process.argv[3];
  const str = (/** @type {string} */ k) => (typeof flags[k] === 'string' ? /** @type {string} */ (flags[k]) : '');
  const story = {title: str('title'), url: str('url'), key: str('key'), ...(str('source') ? {source: str('source')} : {})};
  const {identity, banned} = storiesOf(cfg.series);
  if (sub === 'check') {
    if (!story.url) throw new Error('usage: shorts story check --url <link> [--title "…"] [--key <short-name>]');
    const v = storyConflict((await Ledger.open(cfg.paths.ledger)).entries, story, {identity, allowSameName: !!flags['allow-same-name']});
    console.log(v.refuse ? `no: ${v.refuse}` : `ok: not covered yet${v.warn ? `\n! ${v.warn}` : ''}`);
    if (v.refuse) process.exitCode = 1;
    return;
  }
  if (sub === 'claim') {
    if (!story.title || !story.url || !story.key) throw new Error('usage: shorts story claim --title "…" --url <link of the main source> --key <short-name> [--source "where it was found"] [--allow-same-name]');
    const r = await claimStory(cfg.paths.ledger, story, {identity, banned, blocked: cfg.blocked, allowSameName: !!flags['allow-same-name']});
    console.log(`claimed #${r.episode} ${story.key}${r.reused ? ' (your earlier claim, same number)' : ''}: put "episode": ${r.episode} and "key": "${story.key}" in script.json. The claim holds for 24 hours; \`shorts kit\` makes it final.`);
    if (r.warn) console.log(`! ${r.warn}`);
    return;
  }
  if (sub === 'release') {
    if (!story.key) throw new Error('usage: shorts story release --key <short-name>');
    return console.log((await releaseClaim(cfg.paths.ledger, story.key)) ? `released ${story.key}` : `no claim "${story.key}" to release`);
  }
  console.log('usage: shorts story <claim|check> --title "…" --url <link> --key <short-name> [--source "…"] | shorts story release --key <short-name>');
}

/** `shorts channel …`: runs without a channel chosen (upgrade takes --channel). @param {Record<string, string | boolean>} flags @param {string} [channel] */
async function cmdChannel(flags, channel) {
  // A mistyped option must not fall through to the real thing (`--dryrun` running the migration).
  const unknown = Object.keys(flags).find((f) => !['name', 'dry-run', 'template', 'learned', 'kit-notes'].includes(f));
  if (unknown) throw new Error(`unknown option --${unknown} (shorts channel takes --name, --template, --learned, --kit-notes and --dry-run)`);
  const rest = process.argv.slice(3);
  for (const f of ['--name', '--template', '--learned', '--kit-notes']) {
    const at = rest.indexOf(f);
    if (at >= 0) rest.splice(at, 2); // the flag and its value, even when the value equals the slug
  }
  const [sub, arg] = rest.filter((a) => !a.startsWith('--'));
  const data = dataRoot();
  const config = configHome();
  const uid = os.userInfo().uid;
  const isLoaded = async (/** @type {string} */ label) => (await runCmd('launchctl', ['print', `gui/${uid}/${label}`])).code === 0;
  if (sub === 'list' || sub === 'ls') {
    const rows = await describeChannels({data, config, loaded: process.platform === 'darwin' ? async (slug) => ({poster: await isLoaded(labels(slug).poster), maker: await isLoaded(labels(slug).maker)}) : undefined});
    return console.log(formatChannels(rows));
  }
  if (sub === 'new') {
    if (!arg) throw new Error(`usage: shorts channel new <slug> [--name "Channel name"] [--template ${TEMPLATES.join('|')}]`);
    const r = await createChannel({data, config, slug: arg, name: typeof flags.name === 'string' ? flags.name : undefined, template: typeof flags.template === 'string' ? flags.template : undefined, templatesDir: path.join(SHORTS_DIR, 'templates')});
    console.log(`created channel "${arg}" from the ${r.template} template at ${r.dir}\nNext:`);
    for (const n of r.next) console.log(`  - ${n}`);
    return;
  }
  if (sub === 'default') {
    if (!arg) throw new Error('usage: shorts channel default <slug>');
    await resolveChannel({flag: arg, data}); // must exist
    await writeDefault(data, arg);
    return console.log(`default channel is now "${arg}"`);
  }
  if (sub === 'upgrade') {
    const slug = await resolveChannel({flag: channel, env: process.env.MOTIONHAUS_CHANNEL, data});
    const learned = typeof flags.learned === 'string' ? await fs.readFile(flags.learned, 'utf8') : undefined;
    const kitNotes = typeof flags['kit-notes'] === 'string' ? (await fs.readFile(flags['kit-notes'], 'utf8')).split('\n') : undefined;
    const r = await upgradeChannel({dir: path.join(data, 'channels', slug), templatesDir: path.join(SHORTS_DIR, 'templates'), learned, kitNotes, dryRun: !!flags['dry-run']});
    if (!r.changes.length) return console.log(`channel "${slug}" is up to date`);
    console.log(`${flags['dry-run'] ? 'would change' : 'changed'} channel "${slug}":`);
    for (const c of r.changes) console.log(`  - ${c}`);
    return;
  }
  if (sub === 'migrate') {
    const domain = `gui/${uid}`;
    const agents = path.join(os.homedir(), 'Library', 'LaunchAgents');
    const cli = path.join(SHORTS_DIR, 'src', 'cli.mjs');
    /** @type {import('./migrate.mjs').Timers} */
    const timers = {
      running: async () => {
        for (const label of Object.values(OLD_LABELS)) if (/state = running/.test((await runCmd('launchctl', ['print', `${domain}/${label}`])).out)) return true;
        return false;
      },
      // installed = loaded in launchd, or its plist is still on disk
      loaded: async () => {
        const was = [];
        for (const [name, label] of Object.entries(OLD_LABELS)) if ((await isLoaded(label)) || (await fs.stat(path.join(agents, `${label}.plist`)).then(() => true, () => false))) was.push(name);
        return was;
      },
      removeOld: async () => {
        for (const label of Object.values(OLD_LABELS)) {
          await runCmd('launchctl', ['bootout', `${domain}/${label}`]);
          await fs.rm(path.join(agents, `${label}.plist`), {force: true});
        }
      },
      install: async (which) => {
        if (!which.includes('poster')) return;
        const r = await runCmd(process.execPath, [cli, '--channel', MIGRATED_SLUG, 'autopilot', 'install', ...(which.includes('maker') ? ['--maker'] : [])], {env: {...process.env, MOTIONHAUS_MIGRATING: '1'}});
        if (r.code !== 0) throw new Error(`could not install the timers: ${r.out.trim()}`);
        console.log(r.out.trim());
      },
    };
    const r = await migrate({data, config, rootEnvFile: path.join(REPO_DIR, '.env'), defaultsDir: SHORTS_DIR, dryRun: !!flags['dry-run'], timers, log: (l) => console.log(`  ${l}`)});
    const n = (/** @type {typeof r.before} */ i) => `${i.episodes} episodes, ${i.long} long-form, ${i.ledger} ledger entries, ${i.schedule} schedule entries (${i.posted} posted)`;
    if (r.status === 'already') return console.log(`already migrated: channel "${MIGRATED_SLUG}" has ${n(r.after)}`);
    if (r.status === 'nothing') return console.log('nothing to migrate: no files from before channels were found');
    if (r.status === 'dry-run') return console.log(`dry run only, nothing changed. To protect: ${n(r.before)}`);
    console.log(`migrated to channel "${MIGRATED_SLUG}"\n  before: ${n(r.before)}\n  after:  ${n(r.after)}`);
    return;
  }
  console.log(`usage: shorts channel <list | new <slug> [--name "…"] [--template ${TEMPLATES.join('|')}] | default <slug> | upgrade [--dry-run] [--learned <file>] [--kit-notes <file>] | migrate [--dry-run]>`);
}

function usage() {
  console.log('usage: shorts [--channel <slug>] <fetch|pick|run|story|ledger|designs|make|sample|voices|kit|critique|sfx-kit|photos|capture|cutout|auth|publish|insta-auth|insta-post|autopilot|channel> [--date YYYY-MM-DD]');
}

/** The maker's environment: this channel, and no channel login that may be lying in the shell. @param {string} slug */
function makerEnv(slug) {
  /** @type {Record<string, string | undefined>} */
  const env = {...process.env, MOTIONHAUS_MAKER: '1', MOTIONHAUS_CHANNEL: slug, ...MAKER_BASH_TIMEOUTS};
  for (const k of CHANNEL_KEYS) delete env[k];
  return env;
}

const NOT_MIGRATED = 'this install has not been moved to the channel layout, or the move did not finish: run `shorts channel migrate`';

async function main() {
  const channel = takeChannelFlag(process.argv);
  const {cmd, flags} = parseArgs(process.argv.slice(2));
  // The unattended maker (headless Claude, which reads launch pages it cannot
  // trust) may make and pack an episode. It may not post, publish, sign in or
  // touch the timers, whatever its permission settings let through.
  if (process.env.MOTIONHAUS_MAKER && ['insta-post', 'insta-auth', 'publish', 'auth', 'autopilot', 'channel'].includes(cmd))
    throw new Error(`\`shorts ${cmd}\` is not available to the unattended maker`);
  // A maker run belongs to one channel. --channel would beat that, and a web
  // page it read could ask it to book a reel into another channel's queue.
  if (process.env.MOTIONHAUS_MAKER) {
    const own = process.env.MOTIONHAUS_CHANNEL;
    if (!own) throw new Error('the unattended maker must be started for one channel (MOTIONHAUS_CHANNEL is not set)');
    if (channel && channel !== own) throw new Error(`the maker for channel "${own}" may not act on channel "${channel}"`);
  }
  if (cmd === 'help') return usage();
  if (cmd === 'channel') return cmdChannel(flags, channel);
  // The migration itself reinstalls the timers by running this CLI again,
  // before it has marked itself finished: that one child is let through.
  if (!process.env.MOTIONHAUS_MIGRATING && (await needsMigration(dataRoot()))) {
    // The poster is run by a timer; a refusal there must reach the owner.
    if (cmd === 'insta-post' && !flags['dry-run']) {
      const old = path.join(dataRoot(), 'shorts');
      if (await firstToday(path.join(old, 'autopilot-state.json'), istNow().date, 'not-migrated')) await notify('Motionhaus: posting is stopped', NOT_MIGRATED, {logFile: path.join(old, 'autopilot.log')});
    }
    throw new Error(NOT_MIGRATED);
  }
  const cfg = await loadConfig({channel});
  switch (cmd) {
    case 'fetch':
      return void (await cmdFetch(cfg, runClock(flags.date)));
    case 'pick':
      return void (await cmdPick(cfg, runClock(flags.date)));
    case 'run': {
      const clock = runClock(flags.date);
      return void (await cmdPick(cfg, clock, await cmdFetch(cfg, clock)));
    }
    case 'ledger':
      return cmdLedger(cfg);
    case 'designs':
      console.log(await (await import('./designs.mjs')).report(cfg.paths.data));
      return;
    case 'make': {
      const dir = process.argv[3];
      if (!dir || dir.startsWith('--')) throw new Error('usage: shorts make <episode-dir> [--stills 30,120] [--render] [--fast] [--thumbs]');
      return cmdMake(cfg, inChannel(cfg, dir), flags);
    }
    case 'sample':
      return cmdMake(cfg, await cmdSample(cfg), flags);
    case 'voices':
      return cmdVoices(cfg, flags);
    case 'kit': {
      const dir = process.argv[3];
      if (!dir || dir.startsWith('--')) throw new Error('usage: shorts kit <episode-dir> [--slot "..."] [--thumb N] [--ig-slot "YYYY-MM-DD HH:MM"]');
      return cmdKit(cfg, inChannel(cfg, dir), flags);
    }
    case 'critique': {
      const dir = process.argv[3];
      if (!dir || dir.startsWith('--')) throw new Error('usage: shorts critique <episode-dir>');
      return cmdCritique(inChannel(cfg, dir));
    }
    case 'sfx-kit': {
      const {kit, kitDir} = await ensureKit({rebuild: !!flags.rebuild, offline: !!flags.offline});
      console.log(`${kitDir}/kit.json (built ${kit.builtAt})`);
      for (const l of describeKit(kit)) console.log(`  ${l}`);
      return;
    }
    case 'photos': {
      const [dir, query] = process.argv.slice(3);
      if (!dir || !query || query.startsWith('--')) throw new Error('usage: shorts photos <episode-dir> "<query>" [--n 4] [--source openverse|commons|all] [--orient wide|tall]');
      const got = await fetchPhotos(inChannel(cfg, dir), query, {
        n: typeof flags.n === 'string' ? Number(flags.n) : 4,
        source: /** @type {any} */ (typeof flags.source === 'string' ? flags.source : 'all'),
        orient: /** @type {any} */ (typeof flags.orient === 'string' ? flags.orient : 'any'),
      });
      if (!got.length) console.log('no licensed photos found: try a plainer query (the object, place or person, not the idea)');
      for (const g of got) console.log(`${g.file}  ${g.width}×${g.height}  ${g.credit}\n    ${g.title.slice(0, 70)}  ${g.sourceUrl ?? ''}`);
      return;
    }
    case 'capture': {
      // Any page as images for a video: a headline, a table, a document. (A
      // product's own site goes to public/site, as the launch format expects.)
      const [dir, url] = process.argv.slice(3);
      if (!dir || !url || !/^https?:\/\//.test(url)) throw new Error('usage: shorts capture <episode-dir> <https://page> [--as <name>]');
      const name = typeof flags.as === 'string' ? flags.as : new URL(url).hostname.replace(/^www\./, '').replace(/[^a-z0-9.-]/gi, '-');
      if (!/^[a-z0-9][a-z0-9.-]*$/i.test(name)) throw new Error('--as takes a simple name (letters, digits, dots, dashes)');
      const out = path.join(inChannel(cfg, dir), 'public', 'captures', name);
      const r = await runCmd(process.execPath, [path.join(SHORTS_DIR, 'studio', 'scripts', 'capture.mjs'), url, out], {cwd: path.join(SHORTS_DIR, 'studio'), timeout: 180_000});
      if (r.code !== 0) throw new Error(`capture failed: ${r.out.trim().split('\n').slice(-3).join(' ')}`);
      console.log(`captured ${url} → ${out} (use as "captures/${name}/hero.png", "…/full.png", "…/mobile.png")`);
      return;
    }
    case 'cutout': {
      const [dir, image] = process.argv.slice(3);
      if (!dir || !image) throw new Error('usage: shorts cutout <episode-dir> <image inside public/, e.g. photos/phone-3.jpg>');
      const src = path.join(inChannel(cfg, dir), 'public', image);
      const rel = image.replace(/\.[a-z0-9]+$/i, '') + '-cut.png';
      const bin = path.join(CACHE_DIR, 'bin', 'cutout');
      await fs.mkdir(path.dirname(bin), {recursive: true});
      const run = (/** @type {string} */ cmd, /** @type {string[]} */ a) => new Promise((res, rej) => execFile(cmd, a, (e, out, err) => (e ? rej(new Error(err.trim() || e.message)) : res(out.trim()))));
      if (!(await fs.stat(bin).catch(() => null))) await run('swiftc', ['-O', '-suppress-warnings', path.join(SHORTS_DIR, 'src', 'cutout.swift'), '-o', bin]);
      const kept = Number(await run(bin, [src, path.join(path.resolve(dir), 'public', rel)]));
      console.log(`${rel}  subject covers ${(kept * 100).toFixed(0)}% of the frame`);
      if (kept < 0.06 || kept > 0.7) console.log('  warning: a good text-behind-subject photo has one clear subject covering about 10–60% of the frame. Read the PNG before using it.');
      return;
    }
    case 'auth':
      return cmdAuth(cfg);
    case 'autopilot':
      return cmdAutopilot(cfg, flags);
    case 'story':
      return cmdStory(cfg, flags);
    case 'insta-auth':
      return cmdInstaAuth(cfg, flags);
    case 'insta-post':
      // Run by a timer: a failure before the posting logic starts (no sign-in,
      // a broken install) would otherwise only reach a log nobody reads.
      return cmdInstaPost(cfg, flags).catch(async (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (cfg.env.instagram.mode === 'auto' && !flags['dry-run'] && (await firstToday(path.join(cfg.paths.data, 'autopilot-state.json'), istNow().date, `setup:${msg}`)))
          await notify(`${cfg.series.name}: Instagram posting cannot run`, msg, {logFile: path.join(cfg.paths.data, 'autopilot.log')});
        throw err;
      });
    case 'publish': {
      const dir = process.argv[3];
      if (!dir || dir.startsWith('--')) throw new Error('usage: shorts publish <episode-dir> [--privacy private|unlisted|public] [--at ISO] [--dry-run] [--thumb N]');
      return cmdPublish(cfg, inChannel(cfg, dir), flags);
    }
    default:
      usage();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
