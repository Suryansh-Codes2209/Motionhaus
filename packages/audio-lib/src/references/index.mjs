// Launch-video reference research: one interface over curated picks, YouTube
// (RSS + Data API), Product Hunt, Vimeo and Hacker News. Stores only links,
// metadata and derived notes; never downloads video files.
import path from 'node:path';
import {createJsonCache, hashKey} from '../cache.mjs';
import {createHttp, NetworkError} from '../http.mjs';
import {analyzeDetails} from './analyze.mjs';
import {buildBrief} from './brief.mjs';
import {createQuota} from './quota.mjs';
import {createCurated} from './sources/curated.mjs';
import {createHackerNews} from './sources/hackernews.mjs';
import {createProductHunt} from './sources/producthunt.mjs';
import {createVimeo} from './sources/vimeo.mjs';
import {createYoutubeRss} from './sources/youtube-rss.mjs';
import {createYoutube} from './sources/youtube.mjs';
import {fetchTranscript} from './transcript.mjs';
import {canonicalUrl, classifyUrl, isoOrNull} from './util.mjs';

/** @typedef {import('./types.mjs').Reference} Reference */
/** @typedef {import('./types.mjs').SourceName} SourceName */
/** @typedef {import('./types.mjs').RefSource} RefSource */
/** @typedef {import('./types.mjs').VideoDetails} VideoDetails */
/** @typedef {import('./analyze.mjs').ReferenceNotes} ReferenceNotes */

export const SOURCE_NAMES = /** @type {const} */ (['curated', 'youtube-rss', 'youtube', 'producthunt', 'vimeo', 'hackernews']);
const OFFLINE_COOLDOWN_MS = 5 * 60_000;

/**
 * Where state lives. Per the plugin docs, ${CLAUDE_PLUGIN_ROOT} is replaced on
 * every update, so caches go to ${CLAUDE_PLUGIN_DATA} when Claude Code provides it.
 * curated.yaml is written in place in a dev checkout, but in an installed
 * (cached) copy it goes to the data dir so saves survive updates.
 * @param {string} rootDir @param {Record<string, string | undefined>} env
 */
export function referencePaths(rootDir, env) {
  const data = env.CLAUDE_PLUGIN_DATA;
  const seedFile = path.join(rootDir, 'references', 'curated.yaml');
  const installedCopy = rootDir.split(path.sep).join('/').includes('/.claude/plugins/cache/');
  return {
    cacheDir: env.REFERENCES_CACHE_DIR ?? (data ? path.join(data, 'references') : path.join(rootDir, 'workspace', 'cache', 'references')),
    seedFile,
    userFile: env.LAUNCHREEL_REFERENCES_FILE ?? (installedCopy && data ? path.join(data, 'curated.yaml') : seedFile),
    channelsFile: env.LAUNCHREEL_CHANNELS_FILE ?? path.join(rootDir, 'references', 'channels.yaml'),
  };
}

/**
 * @typedef {object} ReferenceLibraryOptions
 * @property {string} rootDir
 * @property {Record<string, string | undefined>} [env]
 * @property {typeof fetch} [fetchImpl]
 * @property {(ms: number) => Promise<void>} [sleepFn]
 * @property {(m: string) => void} [log]
 * @property {() => Date} [now]
 */

/** @param {ReferenceLibraryOptions} o */
export function createReferenceLibrary(o) {
  const env = o.env ?? process.env;
  const log = o.log ?? ((m) => process.stderr.write(`[references] ${m}\n`));
  const paths = referencePaths(o.rootDir, env);
  const ttlMs = Number(env.REFERENCES_CACHE_TTL_HOURS ?? 24) * 3_600_000;
  const searchCache = createJsonCache(path.join(paths.cacheDir, 'search'), {ttlMs});
  const analysisCache = createJsonCache(path.join(paths.cacheDir, 'analysis'), {ttlMs});

  /** @param {string} provider @param {number} minIntervalMs */
  const http = (provider, minIntervalMs) => createHttp({provider, minIntervalMs, fetchImpl: o.fetchImpl, sleepFn: o.sleepFn});
  const clients = {
    rss: http('youtube-rss', 200),
    youtube: http('youtube', 200),
    producthunt: http('producthunt', 1000),
    vimeo: http('vimeo', 1000),
    hackernews: http('hackernews', 250),
    oembed: http('oembed', 250),
  };
  const quota = createQuota(
    path.join(paths.cacheDir, 'youtube-quota.json'),
    {search: Number(env.YOUTUBE_SEARCH_DAILY_LIMIT ?? 100), units: Number(env.YOUTUBE_DAILY_UNITS ?? 10_000)},
    o.now,
  );

  const curated = createCurated({seedFile: paths.seedFile, userFile: paths.userFile, log});
  const rss = createYoutubeRss({channelsFile: paths.channelsFile, http: clients.rss, cache: searchCache, log});
  const youtube = createYoutube({env, http: clients.youtube, quota});
  const producthunt = createProductHunt({env, http: clients.producthunt});
  const vimeo = createVimeo({env, http: clients.vimeo});
  const hackernews = createHackerNews({http: clients.hackernews});
  /** @type {RefSource[]} */
  const sources = [curated, rss, youtube, producthunt, vimeo, hackernews];
  for (const s of sources) if (!s.enabled) log(`${s.name} disabled: ${s.disabledReason}`);

  /** @type {Map<string, number>} */
  const offlineUntil = new Map();

  /**
   * @param {{query: string, category?: string, sources?: SourceName[], maxResults?: number, maxDurationSec?: number, sinceDate?: string}} a
   * @returns {Promise<{results: Reference[], warnings: string[]}>}
   */
  async function search(a) {
    const limit = Math.max(1, Math.min(Math.floor(a.maxResults ?? 10), 25));
    const wanted = a.sources?.length ? a.sources : SOURCE_NAMES;
    for (const s of wanted) if (!SOURCE_NAMES.includes(s)) throw new Error(`unknown source "${s}" (use ${SOURCE_NAMES.join(', ')})`);
    if (a.sinceDate && !isoOrNull(a.sinceDate)) throw new Error(`sinceDate must be an ISO date, got "${a.sinceDate}"`);
    /** @type {string[]} */
    const warnings = [];
    const opts = {query: a.query ?? '', category: a.category, limit: Math.min(limit * 2, 25), maxDurationSec: a.maxDurationSec, sinceDate: a.sinceDate};

    const lists = await Promise.all(
      sources.filter((s) => wanted.includes(s.name)).map(async (s) => {
        if (!s.enabled) {
          warnings.push(`${s.name} disabled: ${s.disabledReason}`);
          return [];
        }
        // Curated is local and always fresh; RSS caches per feed internally.
        const cacheable = s.name !== 'curated' && s.name !== 'youtube-rss';
        const key = hashKey({s: s.name, ...opts, query: opts.query.trim().toLowerCase()});
        if (cacheable) {
          const hit = await searchCache.get(key);
          if (hit) return /** @type {Reference[]} */ (hit);
        }
        if (Date.now() < (offlineUntil.get(s.name) ?? 0)) {
          warnings.push(`${s.name} skipped: unreachable recently (network restricted?)`);
          return [];
        }
        try {
          const found = await s.search(opts);
          if (cacheable) await searchCache.set(key, found);
          return found;
        } catch (err) {
          const e = /** @type {Error} */ (err);
          if (e instanceof NetworkError) offlineUntil.set(s.name, Date.now() + OFFLINE_COOLDOWN_MS);
          log(`${s.name} search failed: ${e.message}`);
          warnings.push(`${s.name} failed: ${e.message}`);
          return [];
        }
      }),
    );

    const since = a.sinceDate ? new Date(a.sinceDate).getTime() : null;
    /** @param {Reference} r */
    const keep = (r) => {
      if (a.maxDurationSec !== undefined && r.durationSec !== null && r.durationSec > a.maxDurationSec) return false;
      // Unknown dates only pass for hand-picked entries.
      if (since !== null && (r.publishedAt ? new Date(r.publishedAt).getTime() < since : r.source !== 'curated')) return false;
      return true;
    };
    const filtered = lists.map((l) => l.filter(keep));
    // Curated first, then round-robin across the other sources; dedupe by canonical URL.
    const [first, ...rest] = filtered;
    const others = wanted.includes('curated') ? rest : filtered;
    // Curated picks rank first, but leave at least half the slots for discovery
    // when other sources were asked for too.
    const curatedCap = others.length ? Math.ceil(limit / 2) : limit;
    /** @type {Reference[]} */
    const merged = [...(wanted.includes('curated') ? first.slice(0, curatedCap) : [])];
    for (let i = 0; i < Math.max(0, ...others.map((l) => l.length)); i++) for (const l of others) if (l[i]) merged.push(l[i]);
    const seen = new Set();
    const results = merged.filter((r) => {
      const k = canonicalUrl(r.url);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return {results: results.slice(0, limit), warnings};
  }

  /** oEmbed (official, no key) as a metadata fallback. @param {string} url @returns {Promise<VideoDetails | null>} */
  async function oembed(url) {
    const c = classifyUrl(url);
    const endpoint =
      c.kind === 'youtube' ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonicalUrl(url))}` :
      c.kind === 'vimeo' ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(canonicalUrl(url))}` : null;
    if (!endpoint) return null;
    const d = await clients.oembed.getJson(endpoint);
    return {
      url,
      source: 'oembed',
      title: d.title ?? null,
      creator: d.author_name ?? null,
      publishedAt: isoOrNull(d.upload_date),
      durationSec: typeof d.duration === 'number' && d.duration > 0 ? d.duration : null,
      viewCount: null,
      description: d.description ?? null,
      tags: [],
    };
  }

  /** Best metadata available for a URL, from official APIs only. @param {string} url @param {string[]} warnings */
  async function details(url, warnings) {
    const c = classifyUrl(url);
    /** @type {Array<() => Promise<VideoDetails | null>>} */
    const attempts = [];
    if (c.kind === 'youtube' && c.id) {
      const id = c.id;
      if (youtube.enabled) attempts.push(() => youtube.details(id));
      attempts.push(async () => {
        const hit = (await rss.entries()).find((r) => r.url === canonicalUrl(url));
        return hit ? {url, source: 'youtube-rss', title: hit.title, creator: hit.creator, publishedAt: hit.publishedAt, durationSec: null, viewCount: hit.viewCount ?? null, description: hit.description, tags: []} : null;
      });
      attempts.push(() => oembed(url));
    } else if (c.kind === 'vimeo' && c.id) {
      const id = c.id;
      if (vimeo.enabled) attempts.push(() => vimeo.details(id));
      attempts.push(() => oembed(url));
    } else if (c.kind === 'producthunt' && c.id) {
      const slug = c.id;
      if (producthunt.enabled) attempts.push(() => producthunt.details(slug));
      else warnings.push('producthunt disabled: set PRODUCT_HUNT_TOKEN to read this launch');
    } else if (c.kind === 'hackernews' && c.id) {
      const id = c.id;
      attempts.push(() => hackernews.details(id));
    } else {
      warnings.push('no official metadata API for this host; only curated notes (if any) were used');
    }
    for (const attempt of attempts) {
      try {
        const d = await attempt();
        if (d) return d;
      } catch (err) {
        warnings.push(/** @type {Error} */ (err).message);
      }
    }
    return null;
  }

  /** @param {string} url @returns {Promise<ReferenceNotes>} */
  async function analyze(url) {
    if (!/^https?:\/\//i.test(url ?? '')) throw new Error('analyze_reference needs an http(s) URL');
    const key = hashKey({analyze: canonicalUrl(url)});
    /** @type {ReferenceNotes | undefined} */
    const hit = await analysisCache.get(key);
    if (hit) return hit;
    /** @type {string[]} */
    const warnings = [];
    const [d, entry, transcript] = await Promise.all([
      details(url, warnings),
      curated.find(url),
      fetchTranscript(url, {env, vimeo, http: clients.vimeo}),
    ]);
    const notes = analyzeDetails({url: canonicalUrl(url), details: d, curated: entry, transcript, warnings});
    if (d || entry) await analysisCache.set(key, notes);
    return notes;
  }

  /**
   * Append a reference to curated.yaml with whatever metadata can be confirmed.
   * @param {{url: string, notes?: string, tags?: string[], title?: string, company?: string, category?: string}} a
   */
  async function save(a) {
    if (!/^https?:\/\//i.test(a.url ?? '')) throw new Error('save_reference needs an http(s) URL');
    /** @type {string[]} */
    const warnings = [];
    const d = await details(a.url, warnings).catch(() => null);
    const res = await curated.append({
      title: a.title ?? d?.title ?? a.url,
      url: canonicalUrl(a.url),
      company: a.company ?? d?.creator ?? undefined,
      category: a.category,
      length: d?.durationSec ?? undefined,
      notes: a.notes,
      tags: (a.tags ?? []).map(String),
      publishedAt: d?.publishedAt ?? undefined,
      savedAt: new Date().toISOString().slice(0, 10),
    });
    return {...res, url: canonicalUrl(a.url), title: a.title ?? d?.title ?? null, warnings};
  }

  /** @param {{productDescription: string, referenceUrls: string[]}} a */
  async function brief(a) {
    if (!a.productDescription?.trim()) throw new Error('productDescription is required');
    const urls = (a.referenceUrls ?? []).slice(0, 10);
    const analyses = await Promise.all(urls.map((u) => analyze(u).catch((err) => ({url: u, error: /** @type {Error} */ (err).message}))));
    const ok = /** @type {ReferenceNotes[]} */ (analyses.filter((x) => !('error' in x)));
    const failed = analyses.filter((x) => 'error' in x);
    return {...buildBrief(a.productDescription.trim(), ok), ...(failed.length ? {failedReferences: failed} : {})};
  }

  return {
    search,
    analyze,
    save,
    brief,
    quota,
    paths,
    sources: sources.map((s) => ({name: s.name, enabled: s.enabled, reason: s.disabledReason})),
  };
}

/** @typedef {ReturnType<typeof createReferenceLibrary>} ReferenceLibrary */
