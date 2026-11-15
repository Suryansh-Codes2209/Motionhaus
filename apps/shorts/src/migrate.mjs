// `shorts channel migrate`: moves an install from before channels existed
// onto the channel layout, as the channel "launch-radar".
//
//   <data>/shorts/{episodes,long,runs,review,ledger.json,…}  →  <data>/channels/launch-radar/
//   <data>/shorts/cache                                      stays (shared tooling)
//   apps/shorts/{series.json,brand,blocklist.txt}            →  copied in as channel.json, brand/, blocklist.txt
//   channel logins in the root .env                          →  <config>/channels/launch-radar.env
//
// The channel posts to a live account from timers, so every step can be run
// again safely: a run that stops part-way is finished by the next one, and
// nothing is moved or overwritten twice. Files are renamed on the same disk,
// never copied and deleted.
import fs from 'node:fs/promises';
import path from 'node:path';
import {CHANNEL_KEYS, channelDir, readEnvFile, secretsFile, writeDefault} from './channels.mjs';

export const MIGRATED_SLUG = 'launch-radar';
const KEEP = new Set(['cache', '.DS_Store']);

const exists = (/** @type {string} */ p) => fs.stat(p).then(() => true, () => false);
const count = async (/** @type {string} */ dir) => (await fs.readdir(dir, {withFileTypes: true}).catch(() => [])).filter((e) => e.isDirectory()).length;

/** What there is to protect: episode folders, ledger entries, schedule entries. @param {string} root the folder holding episodes/, ledger.json, review/ */
export async function inventory(root) {
  const json = (/** @type {string} */ f) => fs.readFile(path.join(root, f), 'utf8').then(JSON.parse, () => null);
  const ledger = await json('ledger.json');
  const schedule = await json(path.join('review', 'instagram-reels', 'schedule.json'));
  return {
    episodes: await count(path.join(root, 'episodes')),
    long: await count(path.join(root, 'long')),
    ledger: Array.isArray(ledger?.entries) ? ledger.entries.length : 0,
    schedule: Array.isArray(schedule) ? schedule.length : 0,
    posted: Array.isArray(schedule) ? schedule.filter((/** @type {any} */ e) => e.posted).length : 0,
  };
}

/** Removes the given keys from a .env file's text, keeping every other line. @param {string} text @param {string[]} keys */
export function withoutKeys(text, keys) {
  return text
    .split(/\r?\n/)
    .filter((l) => !keys.some((k) => new RegExp(`^\\s*(export\\s+)?${k}\\s*=`).test(l)))
    .join('\n');
}

/**
 * @typedef {object} Timers
 * @property {() => Promise<boolean>} running    a poster or maker run is in progress
 * @property {() => Promise<string[]>} loaded     which old timers are installed now ('poster', 'maker')
 * @property {() => Promise<void>} removeOld      boots out the old timers and deletes their plists
 * @property {(which: string[]) => Promise<void>} install  loads the channel's timers
 */

/**
 * @param {{data: string, config: string, rootEnvFile: string, defaultsDir: string, dryRun?: boolean, timers: Timers, log?: (line: string) => void}} o
 * @returns {Promise<{status: 'migrated' | 'already' | 'nothing' | 'dry-run', moved: string[], before: Awaited<ReturnType<typeof inventory>>, after: Awaited<ReturnType<typeof inventory>>}>}
 */
export async function migrate({data, config, rootEnvFile, defaultsDir, dryRun = false, timers, log = () => {}}) {
  const old = path.join(data, 'shorts');
  const dir = channelDir(data, MIGRATED_SLUG);
  const marker = path.join(dir, '.migrated');
  const stateFile = path.join(dir, '.migration.json');

  if (await exists(marker)) {
    const inv = await inventory(dir);
    return {status: 'already', moved: [], before: inv, after: inv};
  }
  const toMove = (await fs.readdir(old).catch(() => [])).filter((n) => !KEEP.has(n)).sort();
  const started = await exists(stateFile);
  if (!toMove.length && !started) {
    const inv = await inventory(dir);
    return {status: 'nothing', moved: [], before: inv, after: inv};
  }

  // What must still be there at the end. Recorded at the first run, so a
  // resumed run compares against the original, not against a half-moved tree.
  /** @type {{before: Awaited<ReturnType<typeof inventory>>, timers: string[] | null}} */
  const state = started ? JSON.parse(await fs.readFile(stateFile, 'utf8')) : {before: await inventory(old), timers: null};

  const rootEnv = readEnvFile(rootEnvFile);
  const keys = CHANNEL_KEYS.filter((k) => rootEnv[k] !== undefined);

  if (dryRun) {
    log(`would create ${dir}`);
    log(`would copy ${path.join(defaultsDir, 'series.json')} → channel.json (with mascot: true), brand/, blocklist.txt`);
    for (const n of toMove) log(`would move ${path.join(old, n)} → ${path.join(dir, n)}`);
    log(`would leave ${path.join(old, 'cache')} where it is (shared tooling)`);
    log(`would move ${keys.join(', ') || 'no keys'} from ${rootEnvFile} → ${secretsFile(MIGRATED_SLUG, config)}`);
    log(`would set the default channel to ${MIGRATED_SLUG} and reinstall the timers that are loaded now`);
    return {status: 'dry-run', moved: toMove, before: state.before, after: state.before};
  }

  // 1. Nothing may be posting or making while files move.
  if (await timers.running()) throw new Error('a poster or maker run is in progress: wait for it to finish, then run `shorts channel migrate` again');
  const lock = path.join(old, 'review', 'instagram-reels', 'schedule.json.lock');
  if (await exists(lock)) throw new Error(`a post is in progress (${lock}): wait for it to finish, then run \`shorts channel migrate\` again`);

  // A login already in the channel's file that disagrees with the shared one
  // means two different accounts: stop before anything changes.
  const secrets = secretsFile(MIGRATED_SLUG, config);
  const have = readEnvFile(secrets);
  const clash = keys.filter((k) => have[k] !== undefined && have[k] !== rootEnv[k]);
  if (clash.length) throw new Error(`${clash.join(', ')} in ${secrets} differs from the value in ${rootEnvFile}: decide which is right, remove the other, and run again`);

  await fs.mkdir(dir, {recursive: true});
  // 2. Old timers off. Which were installed is written down BEFORE they are
  // removed, and kept across a resumed run: forgetting it would end the
  // migration "successfully" with no timers and no posts.
  if (state.timers === null) state.timers = await timers.loaded();
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2) + '\n');
  await timers.removeOld();
  log(`old timers removed (${state.timers.join(', ') || 'none were installed'})`);

  // 3. The channel's settings, from the repo defaults (the first channel's settings).
  if (!(await exists(path.join(dir, 'channel.json')))) {
    const series = JSON.parse(await fs.readFile(path.join(defaultsDir, 'series.json'), 'utf8'));
    await fs.writeFile(path.join(dir, 'channel.json'), JSON.stringify({...series, mascot: true}, null, 2) + '\n');
  }
  if (!(await exists(path.join(dir, 'brand')))) await fs.cp(path.join(defaultsDir, 'brand'), path.join(dir, 'brand'), {recursive: true});
  if (!(await exists(path.join(dir, 'blocklist.txt')))) await fs.copyFile(path.join(defaultsDir, 'blocklist.txt'), path.join(dir, 'blocklist.txt')).catch(() => fs.writeFile(path.join(dir, 'blocklist.txt'), ''));

  // 4. The generated files. A rename either happens or does not; an entry
  // whose destination already exists is a conflict to stop on, never to merge.
  const moved = [];
  for (const n of toMove) {
    const to = path.join(dir, n);
    if (await exists(to)) throw new Error(`cannot move ${path.join(old, n)}: ${to} already exists. Nothing was overwritten; look at both, remove the one that is wrong, and run again`);
    await fs.rename(path.join(old, n), to);
    moved.push(n);
  }
  log(`moved ${moved.length} entries into ${dir}`);

  // 5. Logins: written to the channel's own file first, removed from the shared one after.
  if (keys.length) {
    await fs.mkdir(path.dirname(secrets), {recursive: true, mode: 0o700});
    const add = keys.filter((k) => have[k] === undefined).map((k) => `${k}=${rootEnv[k]}`);
    const head = (await exists(secrets)) ? await fs.readFile(secrets, 'utf8') : `# Logins and switches for the "${MIGRATED_SLUG}" channel only.\n`;
    await fs.writeFile(secrets, head.replace(/\n*$/, '\n') + add.join('\n') + (add.length ? '\n' : ''), {mode: 0o600});
    await fs.chmod(secrets, 0o600);
    const written = readEnvFile(secrets);
    for (const k of keys) if (written[k] !== rootEnv[k]) throw new Error(`could not write ${k} to ${secrets}: the shared .env was left as it is`);
    // Replace the shared file in one step: a crash mid-write must not leave
    // a truncated .env (it also holds the app secrets every channel shares).
    const text = await fs.readFile(rootEnvFile, 'utf8');
    const tmp = `${rootEnvFile}.tmp-${process.pid}`;
    await fs.writeFile(tmp, withoutKeys(text, keys), {mode: 0o600});
    await fs.rename(tmp, rootEnvFile);
    log(`moved ${keys.join(', ')} to ${secrets}`);
  }

  // 6. The default channel.
  await writeDefault(data, MIGRATED_SLUG);

  // 8 (before 7, so a count mismatch never leaves live timers on a bad tree).
  const after = await inventory(dir);
  for (const k of /** @type {const} */ (['episodes', 'long', 'ledger', 'schedule', 'posted']))
    if (after[k] !== state.before[k]) throw new Error(`after the move, ${k} is ${after[k]} but was ${state.before[k]}: timers were NOT reinstalled. Nothing was deleted; compare ${old} and ${dir}`);

  // 7. Timers back, under the channel's labels.
  await timers.install(state.timers);
  log(state.timers.length ? `timers installed (${state.timers.join(', ')})` : '! NO TIMERS were installed before, so none are installed now: run `shorts autopilot install` if this channel should post by itself');

  await fs.writeFile(marker, `${new Date().toISOString()}\n`);
  await fs.rm(stateFile, {force: true});
  return {status: 'migrated', moved, before: state.before, after};
}
