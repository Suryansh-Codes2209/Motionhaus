// Paths, channel settings, blocklist and logins for the Shorts pipeline.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadDotEnv} from '@motionhaus/audio-lib/env.mjs';
import {channelDir, configHome, dataRoot, loadChannelEnv, readEnvFile, resolveChannel, secretsFile, validateChannel} from './channels.mjs';

// Code lives in apps/shorts. Everything a channel owns (its settings, brand,
// episodes, review queue, ledger) lives in that channel's folder under the
// data root; see channels.mjs. The only generated files that are not per
// channel are the shared tooling caches in <data>/shorts/cache.
export const SHORTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_DIR = path.resolve(SHORTS_DIR, '..', '..');
export const WORKSPACE_DIR = dataRoot();

/**
 * @typedef {object} Series
 * @property {string} name
 * @property {string} handle
 * @property {number} perDay
 * @property {string[]} [anchors]  names with YouTube search demand; a short's title leads with one
 * @property {number} shortlist
 * @property {number} lookbackHours
 * @property {{provider: 'kokoro' | 'say' | 'chatterbox', id: string, speed: number, ref?: string}} voice  ref: chatterbox voice-clone sample (path from the channel folder, or from apps/shorts)
 * @property {{wordsPerPage: number}} captions
 * @property {{bg: string, fg: string, muted: string, accent: string, accent2: string}} colors
 * @property {{hn: {enabled: boolean, minPoints: number}, github: {enabled: boolean, minStars: number, maxAgeDays: number}}} sources
 * @property {string} [template]  the template this channel started from (launches, news-explainer, facts-lists, how-to)
 * @property {Partial<import('./channel-settings.mjs').Rules>} [rules]
 * @property {Partial<import('./channel-settings.mjs').Publish>} [publish]
 * @property {Partial<import('./channel-settings.mjs').Stories>} [stories]
 * @property {boolean} [mascot]  the channel has mascot art (headshot shorts without a face take, long-form host)
 * @property {{handle: string, hashtags?: string[], maxHashtags?: number, slotsIST?: string[], autoPostAfter?: number}} [instagram]
 */

/**
 * Settings, paths and logins for one channel. The channel is `channel` when
 * given, else resolved from MOTIONHAUS_CHANNEL, the default, or the only
 * channel (channels.mjs → resolveChannel); it is never guessed.
 * @param {{channel?: string, data?: string, config?: string}} [o]
 */
export async function loadConfig({channel, data = dataRoot(), config = configHome()} = {}) {
  const rootEnvFile = path.join(REPO_DIR, '.env');
  const rootEnv = readEnvFile(rootEnvFile);
  const slug = await resolveChannel({flag: channel, env: process.env.MOTIONHAUS_CHANNEL, data});
  const dir = channelDir(data, slug);
  const file = path.join(dir, 'channel.json');
  const series = /** @type {Series} */ (JSON.parse(await fs.readFile(file, 'utf8')));
  const errs = validateChannel(series);
  if (errs.length) throw new Error(`${file}: ${errs.join('; ')}`);
  const blocked = parseBlocklist(await fs.readFile(path.join(dir, 'blocklist.txt'), 'utf8').catch(() => ''));

  // The channel's own file: its logins and switches, and optionally its own
  // Google / Meta app. Channel logins are never taken from the shared .env or
  // the shell (loadChannelEnv), so one channel cannot post as another.
  const own = loadChannelEnv(slug, {config, rootEnv, processEnv: process.env, maker: !!process.env.MOTIONHAUS_MAKER});
  for (const w of own.warnings) console.error(`! ${w}`);
  // Shared keys (audio providers, GitHub, app ids) still come from the shell,
  // then the root .env; other modules read them from process.env.
  loadDotEnv(rootEnvFile);
  const shared = (/** @type {string} */ k) => own.values[k] || process.env[k] || '';

  return {
    series,
    blocked,
    channel: {slug, dir, secretsFile: secretsFile(slug, config)},
    paths: {
      dir: SHORTS_DIR,
      data: dir,
      root: data,
      ledger: path.join(dir, 'ledger.json'),
      runs: path.join(dir, 'runs'),
      episodes: path.join(dir, 'episodes'),
      long: path.join(dir, 'long'),
      review: path.join(dir, 'review'),
      brand: path.join(dir, 'brand'),
      // machine tooling shared by every channel (and by apps/reels, audio-lib, film-qa): never per channel
      cache: path.join(data, 'shorts', 'cache'),
      models: path.join(data, 'shorts', 'cache', 'models'),
    },
    env: {
      githubToken: process.env.GITHUB_TOKEN || undefined,
      youtube: {
        clientId: shared('YOUTUBE_CLIENT_ID'),
        clientSecret: shared('YOUTUBE_CLIENT_SECRET'),
        refreshToken: own.values.YOUTUBE_REFRESH_TOKEN || undefined,
        uploadMode: own.values.YOUTUBE_UPLOAD_MODE === 'auto' ? /** @type {const} */ ('auto') : /** @type {const} */ ('manual'),
      },
      instagram: {
        appId: shared('META_APP_ID'),
        appSecret: shared('META_APP_SECRET'),
        pageToken: own.values.INSTAGRAM_PAGE_TOKEN || '',
        igUserId: own.values.INSTAGRAM_USER_ID || '',
        // 'auto' lets the timer post; anything else means reels are uploaded by hand
        mode: own.values.INSTAGRAM_UPLOAD_MODE === 'auto' ? /** @type {const} */ ('auto') : /** @type {const} */ ('manual'),
      },
    },
    envFile: rootEnvFile,
  };
}

/** @typedef {Awaited<ReturnType<typeof loadConfig>>} Config */

/** One domain per line; `#` comments. @param {string} text */
export function parseBlocklist(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, ''))
    .filter(Boolean);
}

/**
 * Sets KEY=value in a .env file (creating it if needed), keeping other lines.
 * @param {string} file @param {string} key @param {string} value
 */
export async function upsertEnv(file, key, value) {
  const text = await fs.readFile(file, 'utf8').catch(() => '');
  const lines = text.split(/\r?\n/);
  const i = lines.findIndex((l) => new RegExp(`^\\s*(export\\s+)?${key}\\s*=`).test(l));
  if (i >= 0) lines[i] = `${key}=${value}`;
  else lines.splice(lines[lines.length - 1] === '' ? lines.length - 1 : lines.length, 0, `${key}=${value}`);
  await fs.writeFile(file, lines.join('\n').replace(/\n*$/, '\n'), {mode: 0o600});
}
