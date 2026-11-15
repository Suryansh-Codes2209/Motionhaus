// `shorts insta-post`: posts the reel that is due, with nobody watching.
//
// It is run every 15 minutes by a timer, so it must be safe to run again and
// again: at most one post a day, never the same reel twice (even if the
// process died mid-upload), never a reel that fails the QA gate, and one
// notification per event rather than one per run.
//
// Everything it touches comes in through `deps`, so the rules are tested
// without the network, ffmpeg or the clock.
import fs from 'node:fs/promises';
import path from 'node:path';
import {dueEntry, missedDays, patchEntry, readSchedule} from './insta-queue.mjs';

/** @typedef {import('./insta-queue.mjs').ScheduleEntry} ScheduleEntry */

/**
 * @typedef {object} PostDeps
 * @property {string} scheduleFile  review/instagram-reels/schedule.json
 * @property {string} kitsDir       review/instagram-reels
 * @property {string} stateFile     what was last notified, and the last run's date
 * @property {{date: string, time: string, iso: string}} now  IST date and time, plus the ISO instant
 * @property {number | undefined} after  series.instagram.autoPostAfter
 * @property {string} slotTime      first posting time of the day (IST "HH:MM")
 * @property {number} coverFrameMs  the frame of the reel used as its cover
 * @property {{publishReel: Function, containerStatus: (id: string) => Promise<string>, waitFinished: (id: string) => Promise<string>, publish: (id: string) => Promise<{id: string, permalink: string}>}} ig
 * @property {(mp4: string) => Promise<{verdict: string, reasons?: string[]}>} gate
 * @property {(title: string, body: string) => Promise<void>} notify
 * @property {(entry: ScheduleEntry, posted: {id: string, permalink: string}) => Promise<void>} [onPosted]
 * @property {string} channelName  the channel's name, for notification titles
 * @property {string} [kit]         post this kit folder now, whatever its date
 * @property {boolean} [dryRun]
 * @property {boolean} [skipGate]   only honoured together with `kit`
 */

const LOCK_STALE_MS = 30 * 60_000;

/** Takes the lock, or returns null when a live run holds it. @param {string} file */
async function lock(file) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fh = await fs.open(file, 'wx');
      await fh.writeFile(String(process.pid));
      await fh.close();
      return () => fs.rm(file, {force: true});
    } catch (err) {
      if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'EEXIST') throw err;
      const age = await fs.stat(file).then((s) => Date.now() - s.mtimeMs, () => Infinity);
      if (age < LOCK_STALE_MS) return null;
      await fs.rm(file, {force: true}); // a run that died half an hour ago
    }
  }
  return null;
}

/** "Made by @a @b" in the caption → the makers to tag. @param {string} caption */
export function makersIn(caption) {
  const line = caption.split('\n').find((l) => /^Made by\s+@/.test(l));
  return line ? (line.match(/@[\w.]*\w/g) ?? []) : [];
}

/**
 * @param {PostDeps} deps
 * @returns {Promise<{outcome: 'posted' | 'idle' | 'blocked' | 'failed', detail: string}>}
 */
export async function postDue(deps) {
  const {scheduleFile, kitsDir, now} = deps;
  const release = await lock(`${scheduleFile}.lock`);
  if (!release) return {outcome: 'idle', detail: 'another run is posting right now'};

  /** @type {{lastRun?: string, notified: Record<string, string>}} */
  const state = await fs.readFile(deps.stateFile, 'utf8').then(JSON.parse, () => ({}));
  state.notified ??= {};
  /** At most once a day per key. @param {string} key @param {string} title @param {string} body */
  const once = async (key, title, body) => {
    if (state.notified[key] === now.date) return;
    state.notified[key] = now.date;
    await deps.notify(title, body);
  };
  /** @param {ScheduleEntry} entry @param {{id: string, permalink: string}} r @param {string} [note] */
  const recordPosted = async (entry, r, note = '') => {
    // The schedule first: it is what stops a second post.
    // Also move the entry to the day it really went up: a reel posted early or
    // late (--kit) must not keep holding a future day that a new reel needs.
    await patchEntry(scheduleFile, entry.n, {posted: {id: r.id, permalink: r.permalink, at: now.iso}, containerId: undefined, date: now.date, time: now.time});
    await deps.onPosted?.(entry, r).catch(() => {});
    await deps.notify(`${deps.channelName} #${entry.n} is on Instagram`, `${r.permalink || 'posted'}${note}`);
    return /** @type {const} */ ({outcome: 'posted', detail: `#${entry.n} posted ${r.permalink}`.trim()});
  };

  /** @type {ScheduleEntry | null} */
  let entry = null;
  try {
    const schedule = await readSchedule(scheduleFile);

    if (!deps.dryRun && !deps.kit && typeof deps.after === 'number' && state.lastRun && state.lastRun < now.date) {
      const mine = schedule.filter((e) => Number(e.n) > /** @type {number} */ (deps.after));
      const missed = missedDays(mine, {date: now.date, since: state.lastRun});
      if (missed.length) await once(`missed:${missed.join()}`, `${deps.channelName}: days without a reel`, `No reel went out on ${missed.join(', ')} (${missed.length} day${missed.length > 1 ? 's' : ''}).`);
    }

    if (deps.kit) {
      entry = schedule.find((e) => e.dir === deps.kit) ?? null;
      if (!entry) return {outcome: 'failed', detail: `no kit ${deps.kit} in ${path.basename(scheduleFile)}`};
      if (entry.posted) return {outcome: 'failed', detail: `#${entry.n} was already posted: ${entry.posted.permalink}`};
    } else {
      const due = dueEntry(schedule, {date: now.date, time: now.time, after: deps.after});
      if (!due.entry) {
        if (!deps.dryRun && /^set instagram\.autoPostAfter/.test(due.reason)) await once('setup', `${deps.channelName}: Instagram posting is not set up`, due.reason);
        if (!deps.dryRun && /^nothing queued/.test(due.reason) && now.time >= deps.slotTime) await once('empty', `${deps.channelName}: no reel today`, `Nothing queued for ${now.date}: no reel will go out.`);
        return {outcome: 'idle', detail: due.reason};
      }
      entry = due.entry;
    }

    const mp4 = path.join(kitsDir, entry.dir, entry.file);
    const captionFile = path.join(kitsDir, entry.dir, 'caption.txt');
    const caption = (await fs.readFile(captionFile, 'utf8').catch(() => { throw new Error(`cannot read ${captionFile}`); })).trim();
    await fs.stat(mp4).catch(() => { throw new Error(`cannot read ${mp4}`); });
    const opts = {caption, thumbOffsetMs: deps.coverFrameMs, shareToFeed: true, userTags: makersIn(caption)};

    if (deps.dryRun) return {outcome: 'idle', detail: `would post #${entry.n} ${mp4}\ncover frame at ${opts.thumbOffsetMs} ms, tags: ${opts.userTags.join(' ') || 'none'}\n\n${caption}`};

    // An upload from a run that died: finish it or record it, never repeat it.
    if (entry.containerId) {
      // A status check that fails (timeout, dead token) must not be read as
      // "start over": the reel may already be live. Let it throw; the saved
      // container id stays and the next run asks again.
      const status = await deps.ig.containerStatus(entry.containerId);
      if (status === 'PUBLISHED') return await recordPosted(entry, {id: '', permalink: ''}, ' (went up in an earlier run; recorded now)');
      if (status === 'FINISHED') return await recordPosted(entry, await deps.ig.publish(entry.containerId));
      // Still processing: the bytes may well be there (an upload can report
      // an error and still arrive), and starting a new upload every run is
      // what kept failing. Give it time to finish before giving up on it.
      if (status === 'IN_PROGRESS') {
        const finished = await deps.ig.waitFinished(entry.containerId).then(() => true, () => false);
        if (finished) return await recordPosted(entry, await deps.ig.publish(entry.containerId));
      }
      // ERROR, EXPIRED, or processing that never finished: that container was
      // never published (publishing is its own call), so a fresh upload cannot double-post.
      await patchEntry(scheduleFile, entry.n, {containerId: undefined});
    }

    if (!(deps.kit && deps.skipGate)) {
      const g = await deps.gate(mp4);
      if (g.verdict === 'red') {
        const reason = `QA gate red: ${(g.reasons ?? []).join('; ') || 'see `npm run qa -- gate`'}`;
        await patchEntry(scheduleFile, entry.n, {blocked: {reason, at: now.iso}});
        await deps.notify(`${deps.channelName} #${entry.n} was not posted`, reason);
        return {outcome: 'blocked', detail: `#${entry.n} ${reason}`};
      }
    }

    const n = entry.n;
    let created = false;
    const send = (/** @type {typeof opts} */ o) =>
      deps.ig.publishReel(mp4, o, async (/** @type {string} */ step, /** @type {string} */ containerId) => {
        if (step !== 'container') return;
        created = true;
        await patchEntry(scheduleFile, n, {containerId});
      });
    try {
      return await recordPosted(entry, await send(opts));
    } catch (err) {
      // Instagram refuses the whole reel when a tagged handle does not exist
      // or cannot be tagged. A wrong handle must not cost the day's post: if
      // nothing was created yet, try once more without the tags.
      if (created || !opts.userTags.length || /** @type {any} */ (err).code === 190) throw err;
      return await recordPosted(entry, await send({...opts, userTags: []}), ` · posted without the maker tags (${opts.userTags.join(' ')}): ${/** @type {Error} */ (err).message}`);
    }
  } catch (err) {
    const e = /** @type {Error & {code?: number}} */ (err);
    const hint = e.code === 190 ? ' The Instagram sign-in has expired: run `shorts insta-auth`.' : '';
    const what = entry ? `#${entry.n} failed to post` : 'Instagram posting failed';
    await once(`fail:${e.message}`, `${deps.channelName}: ${what}`, `${e.message}.${hint}`).catch(() => {});
    return {outcome: 'failed', detail: `${e.message}${hint}`};
  } finally {
    if (!deps.dryRun) {
      state.lastRun = now.date;
      for (const k of Object.keys(state.notified)) if (state.notified[k] !== now.date) delete state.notified[k];
      await fs.writeFile(deps.stateFile, JSON.stringify(state, null, 1) + '\n').catch(() => {});
    }
    await release();
  }
}

/**
 * True the first time `key` is seen on `date`, for a caller that must not
 * notify every 15 minutes about the same thing. Shares the poster's state file.
 * @param {string} stateFile @param {string} date @param {string} key
 */
export async function firstToday(stateFile, date, key) {
  const state = await fs.readFile(stateFile, 'utf8').then(JSON.parse, () => ({}));
  state.notified ??= {};
  if (state.notified[key] === date) return false;
  state.notified[key] = date;
  await fs.writeFile(stateFile, JSON.stringify(state, null, 1) + '\n').catch(() => {});
  return true;
}
