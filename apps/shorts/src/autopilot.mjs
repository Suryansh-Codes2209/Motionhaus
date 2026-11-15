// The two unattended jobs, as launchd agents on this Mac:
//   poster  every 15 minutes from the Instagram slot until midnight IST,
//           runs `shorts insta-post` (it posts at most one reel a day, so a
//           Mac that was asleep at the slot still posts that evening);
//   maker   once a day, runs Claude Code headless to make the next episode.
// launchd runs a missed calendar job once when the Mac wakes.
import path from 'node:path';
import {queuedAhead} from './insta-queue.mjs';
import {isExpiredClaim} from './stories.mjs';

/** @typedef {import('./types.mjs').LedgerEntry} LedgerEntry */

/** Each channel has its own pair of timers. @param {string} slug */
export const labels = (slug) => ({poster: `com.motionhaus.${slug}.poster`, maker: `com.motionhaus.${slug}.maker`});
/** The single pair from before channels existed; `shorts channel migrate` removes them. */
export const OLD_LABELS = {poster: 'work.suryansh.motionhaus.poster', maker: 'work.suryansh.motionhaus.maker'};
export const MAKER_TIME_IST = '10:00';
/** The maker waits while this many days are already queued: a channel about what is new posts stale stories from a deep queue, and a deep queue posts them weeks late. */
export const MAX_QUEUED_DAYS = 3;

const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');

/** "19:30" → ["19:30", "19:45", … "23:45"]. @param {string} slotIST */
export function posterTimes(slotIST) {
  const [h, m] = slotIST.split(':').map(Number);
  const out = [];
  for (let t = h * 60 + m; t < 24 * 60; t += 15) out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  return out;
}

/**
 * An IST clock time as launchd wants it: in the machine's own time zone.
 * @param {string} hhmm @param {number} [localOffsetMin] minutes east of UTC (default: this machine now)
 */
export function istToLocal(hhmm, localOffsetMin = -new Date().getTimezoneOffset()) {
  const [h, m] = hhmm.split(':').map(Number);
  const t = (((h * 60 + m - 330 + localOffsetMin) % 1440) + 1440) % 1440;
  return {Hour: Math.floor(t / 60), Minute: t % 60};
}

const esc = (/** @type {string} */ s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * No WorkingDirectory, and the log lives outside the repo: launchd itself
 * (not node) opens both before the job starts, and macOS refuses it access
 * to ~/Documents, which fails the job with exit 78 before anything runs.
 * The commands use absolute paths, so they do not need a working directory.
 * @param {{label: string, args: string[], calendar: {Hour: number, Minute: number}[], logFile: string, pathDirs: string[]}} o
 */
export function plist({label, args, calendar, logFile, pathDirs}) {
  const PATH = [...new Set([...pathDirs, '/usr/bin', '/bin'])].join(':');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${esc(label)}</string>
  <key>ProgramArguments</key>
  <array>
${args.map((a) => `    <string>${esc(a)}</string>`).join('\n')}
  </array>
  <key>StartCalendarInterval</key>
  <array>
${calendar.map((c) => `    <dict>\n      <key>Hour</key>\n      <integer>${c.Hour}</integer>\n      <key>Minute</key>\n      <integer>${c.Minute}</integer>\n    </dict>`).join('\n')}
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${esc(PATH)}</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${esc(logFile)}</string>
  <key>StandardErrorPath</key>
  <string>${esc(logFile)}</string>
  <key>ProcessType</key>
  <string>Background</string>
</dict>
</plist>
`;
}

/**
 * @param {import('./insta-queue.mjs').ScheduleEntry[]} schedule @param {string} date today (IST)
 * @returns {{make: boolean, reason: string}}
 */
export function shouldMake(schedule, date) {
  const ahead = queuedAhead(schedule, date);
  return ahead >= MAX_QUEUED_DAYS
    ? {make: false, reason: `${ahead} days are already queued (the maker waits until fewer than ${MAX_QUEUED_DAYS} days are)`}
    : {make: true, reason: `${ahead} day${ahead === 1 ? '' : 's'} queued ahead`};
}

/**
 * The episodes a maker run made: ledger entries that are `made` now and were
 * not before. The ledger, not the Instagram queue, is the record: a channel
 * without Instagram books nothing, and `shorts kit` records every short.
 * @param {LedgerEntry[]} before @param {LedgerEntry[]} after @returns {LedgerEntry[]}
 */
export const newlyMade = (before, after) => after.filter((e) => e.status === 'made' && !before.some((b) => b.status === 'made' && b.episode === e.episode));

/**
 * Keys of the live claims a run left behind that were not there before it.
 * A run that made nothing releases them, so a failed run burns no number.
 * @param {LedgerEntry[]} before @param {LedgerEntry[]} after @param {Date} [now] @returns {string[]}
 */
export function newClaims(before, after, now = new Date()) {
  const had = new Set(before.filter((e) => e.status === 'claimed' && !isExpiredClaim(e, now)).map((e) => e.key));
  return after.filter((e) => e.status === 'claimed' && !isExpiredClaim(e, now) && typeof e.key === 'string' && !had.has(e.key)).map((e) => /** @type {string} */ (e.key));
}

/**
 * The maker's permission settings for one channel: the Bash rules from
 * maker-settings.json plus file rules with absolute paths (`//abs/path` in
 * Claude Code's rule syntax; a `./relative` Edit rule is ignored). It may
 * write only inside its own channel's folder, and there not the files that
 * decide what gets posted or who the channel is. It may not read any login:
 * the config home (where channel logins live) and the repo's .env are denied.
 * @param {{base: {permissions: {allow: string[], deny: string[]}}, repoDir: string, channelDir: string, configHome: string}} o
 */
export function makerSettings({base, repoDir, channelDir, configHome}) {
  const abs = (/** @type {string} */ p) => `/${path.resolve(p)}`; // "/Users/x" → "//Users/x"
  const guarded = ['ledger.json', 'autopilot-state.json', 'channel.json', path.join('review', 'instagram-reels', 'schedule.json')].map((f) => path.join(channelDir, f));
  return {
    permissions: {
      allow: [...base.permissions.allow, `Edit(${abs(channelDir)}/**)`],
      deny: [
        ...base.permissions.deny,
        ...guarded.map((f) => `Edit(${abs(f)})`),
        `Read(${abs(configHome)}/**)`,
        `Edit(${abs(configHome)}/**)`,
        `Read(${abs(repoDir)}/.env)`,
        `Read(${abs(repoDir)}/.env.*)`,
        `Edit(${abs(repoDir)}/.env)`,
      ],
    },
  };
}

/**
 * The maker's instructions for one channel: {{name}}, {{slug}} and {{dir}} in
 * the template are filled in. Throws if the template has a placeholder left.
 * @param {string} template @param {{name: string, slug: string, dir: string}} o
 */
export function makerPrompt(template, {name, slug, dir}) {
  const out = template.replaceAll('{{name}}', name).replaceAll('{{slug}}', slug).replaceAll('{{dir}}', dir);
  const left = out.match(/\{\{\w+\}\}/);
  if (left) throw new Error(`maker-prompt.md: unknown placeholder ${left[0]}`);
  return out;
}

/**
 * Arguments for `claude`: headless, only the pre-approved tools. The repo is
 * NOT loaded as a plugin: with `--plugin-dir <repo>` Claude Code refuses every
 * write inside that folder, and the workspace lives inside it (found on the
 * maker's first real runs). The prompt points at the skill files instead.
 * @param {{prompt: string, settingsFile: string}} o
 */
export function makerArgs({prompt, settingsFile}) {
  return ['-p', prompt, '--settings', settingsFile, '--permission-mode', 'dontAsk'];
}
