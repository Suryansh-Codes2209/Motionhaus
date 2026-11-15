// The unified audio library: one search/download interface over every provider,
// with per-provider rate limits, disk caches and graceful degradation.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {recordUse, readManifest, exportAttribution as formatManifest} from './attribution.mjs';
import {createJsonCache, hashKey} from './cache.mjs';
import {createHttp, NetworkError} from './http.mjs';
import {filterByLicense, LICENSES} from './licenses.mjs';
import {createArchive} from './providers/archive.mjs';
import {createFreesound} from './providers/freesound.mjs';
import {createJamendo} from './providers/jamendo.mjs';
import {createLocalPacks} from './providers/localpacks.mjs';
import {createOpenverse} from './providers/openverse.mjs';

/** @typedef {import('./types.mjs').AudioResult} AudioResult */
/** @typedef {import('./types.mjs').SearchOptions} SearchOptions */
/** @typedef {import('./types.mjs').Provider} Provider */
/** @typedef {import('./types.mjs').Logger} Logger */

/** Plugin root (the Motionhaus repo), three levels above this file (packages/audio-lib/src). */
export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const OFFLINE_COOLDOWN_MS = 5 * 60_000;
const EXT_BY_TYPE = /** @type {Record<string, string>} */ ({
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/ogg': '.ogg',
  'application/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/wave': '.wav',
  'audio/flac': '.flac',
  'audio/x-flac': '.flac',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'audio/opus': '.opus',
});
const KNOWN_EXT = new Set(Object.values(EXT_BY_TYPE));

/**
 * @typedef {object} LibraryOptions
 * @property {Record<string, string | undefined>} [env]   defaults to process.env
 * @property {string} [cacheDir]
 * @property {string} [packsDir]
 * @property {typeof fetch} [fetchImpl]
 * @property {(ms: number) => Promise<void>} [sleepFn]
 * @property {Logger} [log]
 * @property {Provider[]} [providers]                   override (tests)
 */

/**
 * @typedef {object} SearchReport
 * @property {AudioResult[]} results
 * @property {string[]} warnings      providers that failed, were skipped or are disabled
 */

/** @param {LibraryOptions} [o] */
export function createAudioLibrary(o = {}) {
  const env = o.env ?? process.env;
  const log = o.log ?? ((m) => process.stderr.write(`[audio-lib] ${m}\n`));
  // ${CLAUDE_PLUGIN_ROOT} is replaced on plugin updates; keep state in ${CLAUDE_PLUGIN_DATA} when available.
  const dataRoot = env.CLAUDE_PLUGIN_DATA ? path.join(env.CLAUDE_PLUGIN_DATA, 'audio-lib') : path.join(ROOT_DIR, 'workspace', 'cache', 'audio-lib');
  const cacheDir = path.resolve(o.cacheDir ?? env.AUDIO_CACHE_DIR ?? dataRoot);
  const packsDir = path.resolve(o.packsDir ?? env.AUDIO_PACKS_DIR ?? path.join(ROOT_DIR, 'assets', 'audio-packs'));
  const ttlMs = Number(env.AUDIO_CACHE_TTL_HOURS ?? 24) * 3_600_000;
  const maxBytes = Number(env.AUDIO_MAX_DOWNLOAD_MB ?? 200) * 1e6;
  const offlineOnly = env.AUDIO_OFFLINE === '1';
  const only = env.AUDIO_PROVIDERS ? new Set(env.AUDIO_PROVIDERS.split(',').map((s) => s.trim())) : null;

  const searchCache = createJsonCache(path.join(cacheDir, 'search'), {ttlMs});
  const resultStore = createJsonCache(path.join(cacheDir, 'results'));

  /** @param {string} provider @param {number} minIntervalMs */
  const http = (provider, minIntervalMs) =>
    createHttp({provider, minIntervalMs, fetchImpl: o.fetchImpl, sleepFn: o.sleepFn});
  const ovKeyed = !!(env.OPENVERSE_CLIENT_ID && env.OPENVERSE_CLIENT_SECRET);
  /** @type {Record<string, import('./http.mjs').Http>} */
  const clients = {
    openverse: http('openverse', ovKeyed ? 1000 : 3000), // anonymous: 20 requests/min
    freesound: http('freesound', 1000),
    jamendo: http('jamendo', 500),
    archive: http('archive', 300),
  };
  const providers = o.providers ?? [
    createOpenverse({env, http: clients.openverse, log}),
    createFreesound({env, http: clients.freesound}),
    createJamendo({env, http: clients.jamendo}),
    createArchive({http: clients.archive}),
    createLocalPacks({packsDir}),
  ];
  /** @type {Record<string, Provider>} */
  const byName = Object.fromEntries(providers.map((p) => [p.name, p]));

  /** @type {Map<string, number>} provider → offline until (ms) */
  const offlineUntil = new Map();
  /** @type {Map<string, AudioResult>} */
  const recent = new Map();

  for (const p of providers) {
    if (!p.enabled) log(`${p.name} disabled: ${p.disabledReason ?? 'not configured'}`);
    else if (only && !only.has(p.name)) log(`${p.name} disabled by AUDIO_PROVIDERS`);
    else if (offlineOnly && !p.offlineCapable) log(`${p.name} skipped: AUDIO_OFFLINE=1`);
  }

  /** @param {Provider} p */
  const usable = (p) => p.enabled && (!only || only.has(p.name)) && (!offlineOnly || !!p.offlineCapable);

  /**
   * @param {string} query
   * @param {SearchOptions} opts
   * @returns {Promise<SearchReport>}
   */
  async function searchDetailed(query, opts) {
    if (opts?.type !== 'music' && opts?.type !== 'sfx') throw new Error('search: opts.type must be "music" or "sfx"');
    for (const l of opts.licenses ?? []) {
      if (!LICENSES.includes(l)) throw new Error(`search: unknown license "${l}" (use ${LICENSES.join(', ')})`);
    }
    const limit = Math.max(1, Math.min(Math.floor(opts.limit ?? 10), 50));
    const commercialUseOnly = opts.commercialUseOnly === true;
    /** @type {string[]} */
    const warnings = [];
    const active = providers.filter((p) => p.types.includes(opts.type) && usable(p));
    for (const p of providers) {
      if (p.types.includes(opts.type) && !p.enabled) warnings.push(`${p.name} disabled: ${p.disabledReason ?? 'not configured'}`);
    }

    const providerOpts = {
      type: opts.type,
      minDurationSec: opts.minDurationSec,
      maxDurationSec: opts.maxDurationSec,
      commercialUseOnly,
      limit: Math.min(limit * 2, 50),
    };
    const lists = await Promise.all(
      active.map(async (p) => {
        const until = offlineUntil.get(p.name) ?? 0;
        const key = hashKey({p: p.name, q: query.trim().toLowerCase(), ...providerOpts});
        const cached = p.offlineCapable ? undefined : await searchCache.get(key);
        if (cached) return /** @type {AudioResult[]} */ (cached);
        if (Date.now() < until) {
          warnings.push(`${p.name} skipped: unreachable recently (network restricted?)`);
          return [];
        }
        try {
          const found = await p.search(query, providerOpts);
          if (!p.offlineCapable) await searchCache.set(key, found);
          return found;
        } catch (err) {
          const e = /** @type {Error} */ (err);
          if (e instanceof NetworkError) {
            offlineUntil.set(p.name, Date.now() + OFFLINE_COOLDOWN_MS);
            log(`${p.name} unreachable, skipping it for 5 min: ${e.message}`);
          } else {
            log(`${p.name} search failed: ${e.message}`);
          }
          warnings.push(`${p.name} failed: ${e.message}`);
          return [];
        }
      }),
    );

    const filtered = lists.map((list) =>
      filterByLicense(list, {commercialUseOnly, licenses: opts.licenses}).filter((r) => fitsDuration(r, opts)),
    );
    const results = interleave(filtered).slice(0, limit);
    for (const r of results) {
      recent.set(r.id, r);
      await resultStore.set(hashKey(r.id), r);
    }
    return {results, warnings};
  }

  /** @param {string} query @param {SearchOptions} opts */
  async function search(query, opts) {
    return (await searchDetailed(query, opts)).results;
  }

  /** Look up a result returned by an earlier search (this process or a previous one). @param {string} id */
  async function getResult(id) {
    return recent.get(id) ?? /** @type {AudioResult | undefined} */ (await resultStore.get(hashKey(id)));
  }

  /**
   * Download `result` into `destDir`, write `<file>.license.json` next to it and
   * update the folder's ATTRIBUTION manifest. Downloads are deduped by provider+id.
   * @param {AudioResult} result
   * @param {string} destDir
   * @returns {Promise<string>} absolute path of the local file
   */
  async function download(result, destDir) {
    const p = byName[result.provider];
    if (!p) throw new Error(`download: unknown provider "${result.provider}"`);
    if (!result.downloadUrl) throw new Error(`download: ${result.id} has no download URL`);
    const dir = path.resolve(destDir);
    const cached = await cachedFile(result);
    const src = cached ?? (await fetchToCache(p, result));
    const dest = path.join(dir, `${slug(result.title)}-${result.provider}-${hashKey(result.id).slice(0, 8)}${path.extname(src)}`);
    await fs.mkdir(dir, {recursive: true});
    if (!(await exists(dest))) await fs.copyFile(src, dest);
    const sidecar = {...result, localPath: dest, downloadedAt: new Date().toISOString()};
    await fs.writeFile(`${dest}.license.json`, JSON.stringify(sidecar, null, 2) + '\n');
    await recordUse(dir, result, dest);
    return dest;
  }

  /** @param {AudioResult} r */
  const cacheBase = (r) => path.join(cacheDir, 'downloads', r.provider, hashKey(r.id));

  /** @param {AudioResult} r @returns {Promise<string | null>} */
  async function cachedFile(r) {
    const base = cacheBase(r);
    try {
      const names = await fs.readdir(path.dirname(base));
      const hit = names.find((n) => n.startsWith(`${path.basename(base)}.`) && !n.includes('.part-'));
      return hit ? path.join(path.dirname(base), hit) : null;
    } catch {
      return null;
    }
  }

  /** @param {Provider} p @param {AudioResult} r */
  async function fetchToCache(p, r) {
    const base = cacheBase(r);
    await fs.mkdir(path.dirname(base), {recursive: true});
    const urlExt = extFromUrl(/** @type {string} */ (r.downloadUrl));
    if (p.copyTo) {
      const out = `${base}${urlExt || '.bin'}`;
      await p.copyTo(r, out);
      return out;
    }
    const client = clients[p.name] ?? http(p.name, 0);
    const tmp = `${base}.download`;
    const headers = p.downloadHeaders ? await p.downloadHeaders(r) : {};
    const {contentType} = await client.download(/** @type {string} */ (r.downloadUrl), tmp, {headers, maxBytes});
    const out = `${base}${EXT_BY_TYPE[contentType] ?? (urlExt || '.mp3')}`;
    await fs.rename(tmp, out);
    return out;
  }

  /**
   * Credits for everything used in `dir` (a project's audio folder).
   * @param {string} dir @param {'text' | 'markdown' | 'json'} [format]
   */
  async function exportAttribution(dir, format = 'text') {
    return formatManifest(await readManifest(path.resolve(dir)), format);
  }

  return {
    search,
    searchDetailed,
    download,
    getResult,
    exportAttribution,
    providers: providers.map((p) => ({name: p.name, enabled: usable(p), types: p.types, reason: p.disabledReason})),
    cacheDir,
    packsDir,
  };
}

/** Unknown durations pass: a missing duration is not a licensing risk. @param {AudioResult} r @param {SearchOptions} o */
function fitsDuration(r, o) {
  if (r.durationSec === null) return true;
  if (o.minDurationSec !== undefined && r.durationSec < o.minDurationSec) return false;
  if (o.maxDurationSec !== undefined && r.durationSec > o.maxDurationSec) return false;
  return true;
}

/** Round-robin across providers (keeps each provider's ranking), dropping duplicates of the same source page. @param {AudioResult[][]} lists */
function interleave(lists) {
  /** @type {AudioResult[]} */
  const out = [];
  const seen = new Set();
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) {
    for (const l of lists) {
      const r = l[i];
      if (!r) continue;
      const k = r.sourceUrl?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') ?? r.id;
      if (seen.has(k) || seen.has(r.id)) continue;
      seen.add(k);
      seen.add(r.id);
      out.push(r);
    }
  }
  return out;
}

/** @param {string} url */
function extFromUrl(url) {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    return KNOWN_EXT.has(ext) ? ext : '';
  } catch {
    return '';
  }
}

/** @param {string} s */
export const slug = (s) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'audio';

/** @param {string} f */
const exists = (f) => fs.access(f).then(() => true, () => false);

/** @typedef {ReturnType<typeof createAudioLibrary>} AudioLibrary */
