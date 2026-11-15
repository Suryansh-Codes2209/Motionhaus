// Curated references: the user's hand-picked launch videos in curated.yaml.
// Reads the shipped file plus the writable file (when they differ), and
// appends new entries without rewriting the file, so comments survive.
import fs from 'node:fs/promises';
import path from 'node:path';
import {canonicalUrl, isoOrNull, matchScore, tokens, truncate} from '../util.mjs';
import {dumpYamlItem, parseYamlList} from '../yaml.mjs';

/** @typedef {import('../types.mjs').Reference} Reference */
/** @typedef {import('../types.mjs').RefSource} RefSource */
/** @typedef {import('../yaml.mjs').Item} Item */

/**
 * @typedef {object} CuratedEntry
 * @property {string} title
 * @property {string} url
 * @property {string} [company]
 * @property {string} [category]
 * @property {number} [length]
 * @property {string} [notes]
 * @property {string[]} [tags]
 * @property {string} [publishedAt]
 * @property {string} [savedAt]
 */

/** @param {Item} it @returns {CuratedEntry | null} */
function toEntry(it) {
  if (typeof it.url !== 'string' || !it.url) return null;
  const str = (/** @type {unknown} */ v) => (typeof v === 'string' && v ? v : undefined);
  return {
    title: str(it.title) ?? it.url,
    url: it.url,
    company: str(it.company),
    category: str(it.category),
    length: typeof it.length === 'number' ? it.length : undefined,
    notes: str(it.notes),
    tags: Array.isArray(it.tags) ? it.tags : typeof it.tags === 'string' ? [it.tags] : [],
    publishedAt: str(it.publishedAt),
    savedAt: str(it.savedAt),
  };
}

/** @param {CuratedEntry} e @returns {Reference} */
export function toReference(e) {
  return {
    id: `curated:${canonicalUrl(e.url)}`,
    source: 'curated',
    title: e.title,
    creator: e.company ?? 'Unknown',
    url: e.url,
    publishedAt: isoOrNull(e.publishedAt),
    durationSec: e.length ?? null,
    description: truncate(e.notes ?? '', 400),
    tags: [...new Set([...(e.category ? [e.category] : []), ...(e.tags ?? [])])],
  };
}

/**
 * @param {{seedFile: string, userFile: string, log: (m: string) => void}} o
 */
export function createCurated({seedFile, userFile, log}) {
  /** @param {string} file @returns {Promise<CuratedEntry[]>} */
  async function readFile(file) {
    let text;
    try {
      text = await fs.readFile(file, 'utf8');
    } catch {
      return [];
    }
    try {
      return parseYamlList(text).map(toEntry).filter((e) => e !== null);
    } catch (err) {
      log(`curated: can't parse ${file} (${/** @type {Error} */ (err).message}); ignoring it`);
      return [];
    }
  }

  /** Seed + user entries, user entries winning on the same URL. */
  async function all() {
    const files = path.resolve(seedFile) === path.resolve(userFile) ? [userFile] : [seedFile, userFile];
    /** @type {Map<string, CuratedEntry>} */
    const byUrl = new Map();
    for (const f of files) for (const e of await readFile(f)) byUrl.set(canonicalUrl(e.url), e);
    return [...byUrl.values()];
  }

  /** @type {RefSource & {all: typeof all, find: (url: string) => Promise<CuratedEntry | undefined>, append: (e: CuratedEntry) => Promise<{file: string, added: boolean}>}} */
  const src = {
    name: 'curated',
    enabled: true,
    all,
    async search(opts) {
      const q = tokens(opts.query);
      const scored = (await all())
        .filter((e) => !opts.category || e.category?.toLowerCase() === opts.category.toLowerCase())
        .map((e) => ({e, score: matchScore(q, [e.title, e.company, e.category, e.notes, ...(e.tags ?? [])].join(' '))}))
        .filter((x) => q.length === 0 || x.score > 0)
        .sort((a, b) => b.score - a.score);
      return scored.slice(0, opts.limit).map((x) => toReference(x.e));
    },
    async find(url) {
      const c = canonicalUrl(url);
      return (await all()).find((e) => canonicalUrl(e.url) === c);
    },
    async append(entry) {
      if (await src.find(entry.url)) return {file: userFile, added: false};
      // Refuse to append to a file we can't parse: the user should fix it first.
      let existing = '';
      try {
        existing = await fs.readFile(userFile, 'utf8');
      } catch {
        // First save into a fresh data dir: start from the shipped seed so nothing is lost.
        if (path.resolve(seedFile) !== path.resolve(userFile)) existing = await fs.readFile(seedFile, 'utf8').catch(() => '');
      }
      parseYamlList(existing);
      /** @type {Item} */
      const item = {};
      for (const [k, v] of Object.entries(entry)) if (v !== undefined && !(Array.isArray(v) && v.length === 0 && k !== 'tags')) item[k] = v;
      const sep = existing === '' || existing.endsWith('\n\n') ? '' : existing.endsWith('\n') ? '\n' : '\n\n';
      await fs.mkdir(path.dirname(userFile), {recursive: true});
      await fs.writeFile(userFile, existing + sep + dumpYamlItem(item));
      return {file: userFile, added: true};
    },
  };
  return src;
}
