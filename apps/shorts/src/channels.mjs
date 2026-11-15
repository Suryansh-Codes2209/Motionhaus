// Channels: one install runs several channels, and each is a folder.
//
//   <data>/channels.json                 {"default": "<slug>"}
//   <data>/channels/<slug>/channel.json  name, handles, look, voice, slots…
//   <data>/channels/<slug>/…             brand, episodes, review queue, ledger
//   <config>/channels/<slug>.env         that channel's logins (mode 600)
//
// <data> is MOTIONHAUS_DATA or <repo>/workspace. <config> is
// MOTIONHAUS_CONFIG_HOME or ~/.config/motionhaus: logins live outside the
// data tree because the unattended maker reads web pages it cannot trust and
// is allowed to write inside its channel's folder.
//
// Two rules matter more than the rest:
//   - a command never guesses which channel it is for;
//   - a channel never posts with another channel's login.
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSettings} from './channel-settings.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Keys that belong to one channel. Read only from that channel's env file. */
export const CHANNEL_KEYS = ['YOUTUBE_REFRESH_TOKEN', 'YOUTUBE_UPLOAD_MODE', 'INSTAGRAM_PAGE_TOKEN', 'INSTAGRAM_USER_ID', 'INSTAGRAM_UPLOAD_MODE'];

/** @param {unknown} s */
export const isSlug = (s) => typeof s === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(s);

export const dataRoot = () => path.resolve(process.env.MOTIONHAUS_DATA || path.join(REPO, 'workspace'));
export const configHome = () => path.resolve(process.env.MOTIONHAUS_CONFIG_HOME || path.join(os.homedir(), '.config', 'motionhaus'));

/** @param {string} data */
export const channelsDir = (data) => path.join(data, 'channels');
/** @param {string} data @param {string} slug */
export const channelDir = (data, slug) => path.join(data, 'channels', slug);
/** @param {string} slug @param {string} [config] */
export const secretsFile = (slug, config = configHome()) => path.join(config, 'channels', `${slug}.env`);

/** Slugs of the folders that hold a channel.json, sorted. @param {string} data */
export async function listChannels(data) {
  const entries = await fs.readdir(channelsDir(data), {withFileTypes: true}).catch(() => []);
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory() || !isSlug(e.name)) continue;
    if (await fs.stat(path.join(channelsDir(data), e.name, 'channel.json')).then(() => true, () => false)) out.push(e.name);
  }
  return out.sort();
}

/** @param {string} data @returns {Promise<string | null>} */
export async function readDefault(data) {
  const d = await fs.readFile(path.join(data, 'channels.json'), 'utf8').then(JSON.parse, () => null);
  return typeof d?.default === 'string' ? d.default : null;
}

/** @param {string} data @param {string} slug */
export async function writeDefault(data, slug) {
  await fs.mkdir(data, {recursive: true});
  await fs.writeFile(path.join(data, 'channels.json'), JSON.stringify({default: slug}, null, 2) + '\n');
}

/**
 * The channel a command acts on: --channel, then MOTIONHAUS_CHANNEL, then the
 * default, then the only channel there is. Anything else is an error that
 * lists the channels; it never picks one.
 * @param {{flag?: string, env?: string, data: string}} o
 */
export async function resolveChannel({flag, env, data}) {
  const all = await listChannels(data);
  const list = `(channels: ${all.join(', ') || 'none'})`;
  for (const asked of [flag, env]) {
    if (!asked) continue;
    if (!isSlug(asked)) throw new Error(`"${asked}" is not a valid channel name (lowercase letters, digits and dashes)`);
    if (!all.includes(asked)) throw new Error(`no channel "${asked}" ${list}`);
    return asked;
  }
  if (!all.length) throw new Error('no channels yet: run `shorts channel new <slug>`');
  const def = await readDefault(data);
  if (def) {
    if (!all.includes(def)) throw new Error(`the default channel "${def}" does not exist ${list}: run \`shorts channel default <slug>\``);
    return def;
  }
  if (all.length === 1) return all[0];
  throw new Error(`choose a channel with --channel ${list}`);
}

/**
 * True for an install from before channels existed: generated files sit in
 * <data>/shorts/ and there is no channel. (The shared tooling cache stays in
 * <data>/shorts/cache for good, so it does not count.)
 * @param {string} data
 */
export async function needsMigration(data) {
  // A migration that stopped part-way: a channel folder exists, but its
  // ledger or queue may still be in the old place and its timers are off.
  if (await migrationUnfinished(data)) return true;
  if ((await listChannels(data)).length) return false;
  const old = await fs.readdir(path.join(data, 'shorts')).catch(() => []);
  return old.some((n) => n !== 'cache' && n !== '.DS_Store');
}

/**
 * True while `shorts channel migrate` has started and not finished (it keeps
 * its progress in a `.migration.json` inside the channel it is filling).
 * @param {string} data
 */
export async function migrationUnfinished(data) {
  const entries = await fs.readdir(channelsDir(data), {withFileTypes: true}).catch(() => []);
  for (const e of entries) if (e.isDirectory() && (await fs.stat(path.join(channelsDir(data), e.name, '.migration.json')).then(() => true, () => false))) return true;
  return false;
}

/** The channel whose folder contains this path, or null. @param {string} data @param {string} absPath */
export function channelOf(data, absPath) {
  const rel = path.relative(channelsDir(data), path.resolve(absPath));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const slug = rel.split(path.sep)[0];
  return isSlug(slug) ? slug : null;
}

/** KEY=value lines of a file, or {} when it is missing. @param {string} file @returns {Record<string, string>} */
export function readEnvFile(file) {
  /** @type {Record<string, string>} */
  const out = {};
  let text;
  try {
    text = fsSync.readFileSync(file, 'utf8');
  } catch {
    return out;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    if (v !== '') out[m[1]] = v;
  }
  return out;
}

/**
 * A channel's own settings from its env file. The five channel keys are never
 * taken from the shared .env or the shell: if they are set there they are
 * ignored, with a warning, so a new channel cannot inherit another one's
 * login. Inside the maker run (`maker`) no login is loaded, only the upload
 * switches: making an episode needs no login.
 * @param {string} slug
 * @param {{config?: string, rootEnv?: Record<string, string | undefined>, processEnv?: Record<string, string | undefined>, maker?: boolean}} [o]
 * @returns {{values: Record<string, string>, warnings: string[]}}
 */
export function loadChannelEnv(slug, {config = configHome(), rootEnv = {}, processEnv = process.env, maker = false} = {}) {
  // The maker gets no login, only the two upload switches: the kit it packs
  // has to say whether the reel will post by itself.
  if (maker) {
    const all = readEnvFile(secretsFile(slug, config));
    return {values: Object.fromEntries(Object.entries(all).filter(([k]) => k.endsWith('_UPLOAD_MODE'))), warnings: []};
  }
  const stray = CHANNEL_KEYS.filter((k) => rootEnv[k] || processEnv[k]).sort();
  const warnings = stray.length ? [`${stray.join(', ')} set in the shared .env or the shell ${stray.length > 1 ? 'are' : 'is'} ignored: channel logins are read only from ${secretsFile(slug, config)}`] : [];
  return {values: readEnvFile(secretsFile(slug, config)), warnings};
}

/**
 * What is wrong with a channel.json, one line per problem, naming the field.
 * @param {any} c
 */
export function validateChannel(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return ['channel.json is not an object'];
  const errs = [];
  const str = (/** @type {any} */ v) => typeof v === 'string' && v.trim() !== '';
  const num = (/** @type {any} */ v) => typeof v === 'number' && Number.isFinite(v);
  if (!str(c.name)) errs.push('name is missing');
  if (typeof c.handle !== 'string') errs.push('handle is missing (use "" until the YouTube channel exists)');
  for (const k of ['bg', 'fg', 'muted', 'accent', 'accent2']) if (!str(c.colors?.[k])) errs.push(`colors.${k} is missing`);
  if (!str(c.voice?.provider)) errs.push('voice.provider is missing');
  if (!str(c.voice?.id)) errs.push('voice.id is missing');
  if (!num(c.voice?.speed)) errs.push('voice.speed is missing');
  if (!num(c.captions?.wordsPerPage)) errs.push('captions.wordsPerPage is missing');
  for (const k of ['perDay', 'shortlist', 'lookbackHours']) if (!num(c[k])) errs.push(`${k} is missing`);
  // `sources` (thresholds for the two launch finders) is optional: stories.feeds says which finders run.
  if (c.sources !== undefined && (typeof c.sources !== 'object' || c.sources === null)) errs.push('sources must be an object');
  errs.push(...validateSettings(c));
  if (c.instagram !== undefined) {
    const ig = c.instagram;
    if (typeof ig?.handle !== 'string') errs.push('instagram.handle is missing');
    if (ig?.hashtags !== undefined && !(Array.isArray(ig.hashtags) && ig.hashtags.every(str))) errs.push('instagram.hashtags must be a list of tags');
    if (ig?.slotsIST !== undefined && !(Array.isArray(ig.slotsIST) && ig.slotsIST.length && ig.slotsIST.every((/** @type {any} */ t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)))) errs.push('instagram.slotsIST must be times like "19:30"');
    if (ig?.autoPostAfter !== undefined && !num(ig.autoPostAfter)) errs.push('instagram.autoPostAfter must be a number');
  }
  return errs;
}

/**
 * Takes `--channel <slug>` (or `--channel=<slug>`) out of argv, wherever it
 * is, so the rest of the CLI reads its command and paths as before.
 * @param {string[]} argv @returns {string | undefined}
 */
export function takeChannelFlag(argv) {
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--channel') {
      const [, slug] = argv.splice(i, 2);
      if (!slug || slug.startsWith('--')) throw new Error('--channel needs a channel name');
      return slug;
    }
    if (argv[i].startsWith('--channel=')) return argv.splice(i, 1)[0].slice('--channel='.length);
  }
  return undefined;
}
