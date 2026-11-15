// The Instagram posting queue: review/instagram-reels/schedule.json, written
// by `shorts kit` (one entry per reel, on a date and an IST time). These are
// the rules for what may be posted, kept free of I/O so they can be tested.
//
// The rules exist because nobody is watching:
//   - an entry dated before today is never posted (the file holds dozens of
//     old entries that were posted by hand, or never);
//   - one reel a day;
//   - nothing at or below `autoPostAfter`, the last episode the owner posted
//     by hand, and nothing at all until that number is set.
import fs from 'node:fs/promises';
import {nextInstaSlot} from './instagram.mjs';

/**
 * @typedef {object} ScheduleEntry
 * @property {string} n     episode number, zero-padded ("044")
 * @property {string} dir   kit folder under review/instagram-reels
 * @property {string} file  the reel's file name inside that folder
 * @property {string} date  YYYY-MM-DD (IST)
 * @property {string} time  HH:MM (IST)
 * @property {{id: string, permalink: string, at: string}} [posted]
 * @property {{reason: string, at: string}} [blocked]  failed the gate; never posted by the timer
 * @property {string} [containerId]  an upload in flight, kept to recover from a crash
 */

/** Now in IST, as the schedule writes it. @param {Date} [d] */
export function istNow(d = new Date()) {
  const ist = new Date(d.getTime() + 5.5 * 3600e3).toISOString();
  return {date: ist.slice(0, 10), time: ist.slice(11, 16)};
}

/**
 * The entry to post now, or why there is none.
 * @param {ScheduleEntry[]} schedule
 * @param {{date: string, time: string, after: number | undefined}} now  `after`: series.instagram.autoPostAfter
 * @returns {{entry: ScheduleEntry | null, reason: string}}
 */
export function dueEntry(schedule, {date, time, after}) {
  const none = (/** @type {string} */ reason) => ({entry: null, reason});
  if (typeof after !== 'number' || !Number.isFinite(after))
    return none('set instagram.autoPostAfter in series.json to the number of the last episode already posted by hand (0 if none)');
  const today = schedule.filter((e) => e.date === date).sort((a, b) => a.time.localeCompare(b.time));
  if (!today.length) return none(`nothing queued for ${date}`);
  if (today.some((e) => e.posted)) return none('already posted today');
  const open = today.filter((e) => !e.blocked);
  if (!open.length) return none(`today's reel is blocked: ${today[0].blocked?.reason ?? ''}`.trim());
  const entry = open[0];
  if (Number(entry.n) <= after) return none(`#${entry.n} is at or below autoPostAfter (${after}): treated as posted by hand`);
  if (time < entry.time) return none(`#${entry.n} is due at ${entry.time} IST`);
  return {entry, reason: `#${entry.n} is due (${entry.date} ${entry.time} IST)`};
}

/** How many days after `date` have a reel waiting. @param {ScheduleEntry[]} schedule @param {string} date */
export function queuedAhead(schedule, date) {
  return new Set(schedule.filter((e) => e.date > date && !e.posted && !e.blocked).map((e) => e.date)).size;
}

/**
 * Days in [since, date) that had a reel queued and none posted.
 * @param {ScheduleEntry[]} schedule @param {{date: string, since: string}} o
 */
export function missedDays(schedule, {date, since}) {
  const days = [...new Set(schedule.filter((e) => e.date >= since && e.date < date).map((e) => e.date))].sort();
  return days.filter((d) => !schedule.some((e) => e.date === d && e.posted));
}

/** @param {string} file @returns {Promise<ScheduleEntry[]>} */
export async function readSchedule(file) {
  try {
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Re-reads the file, merges `patch` into entry `n`, writes it back atomically
 * in the format `shorts kit` uses. A key set to undefined is removed.
 * @param {string} file @param {string} n @param {Partial<ScheduleEntry>} patch
 */
export async function patchEntry(file, n, patch) {
  const schedule = await readSchedule(file);
  const e = schedule.find((x) => x.n === n);
  if (!e) throw new Error(`no entry ${n} in ${file}`);
  Object.assign(e, patch);
  await writeSchedule(file, schedule);
}

/** Atomic write in the format `shorts kit` has always used. @param {string} file @param {ScheduleEntry[]} schedule */
export async function writeSchedule(file, schedule) {
  const tmp = `${file}.tmp-${process.pid}`;
  await fs.writeFile(tmp, JSON.stringify(schedule, null, 1) + '\n');
  await fs.rename(tmp, file);
}

/**
 * Books a packed reel on the schedule (what `shorts kit` does). A reel that
 * was already posted is left exactly as it is: re-running `kit` on an old
 * episode must never put it back in the queue. Otherwise it keeps a booking
 * that is still in the future, or takes the next free day; `blocked` and a
 * half-finished upload are dropped, because the file has just been replaced.
 * @param {ScheduleEntry[]} schedule
 * @param {{n: string, dir: string, file: string}} reel
 * @param {{today: string, now: string, slots: string[], pinned?: {date: string, time: string} | null}} o
 * @returns {{schedule: ScheduleEntry[], slot: {date: string, time: string}, posted: boolean}}
 */
export function bookEntry(schedule, reel, {today, now, slots, pinned}) {
  const old = schedule.find((e) => e.n === reel.n);
  if (old?.posted) return {schedule, slot: {date: old.date, time: old.time}, posted: true};
  const others = schedule.filter((e) => e.n !== reel.n);
  const kept = old && `${old.date} ${old.time}` > `${today} ${now}` ? {date: old.date, time: old.time} : null;
  // A held-back reel will never post, so it does not take up its day.
  const slot = pinned ?? kept ?? nextInstaSlot(others.filter((e) => !e.blocked), today, slots, now);
  const next = [...others, {n: reel.n, dir: reel.dir, file: reel.file, date: slot.date, time: slot.time}];
  next.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  return {schedule: next, slot, posted: false};
}
