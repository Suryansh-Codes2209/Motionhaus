// ledger.json: every launch the channel has queued or featured. It is the
// single source for dedupe and episode numbers. Writes are atomic.
import fs from 'node:fs/promises';
import path from 'node:path';
import {normalizeUrl, productDomain} from './urls.mjs';

/** @typedef {import('./types.mjs').LedgerEntry} LedgerEntry */

/** Statuses that block featuring the same product again. */
const TAKEN = new Set(['queued', 'made', 'published', 'removed']);
/** A claim holds for this long (stories.mjs owns claims; an expired one counts for nothing here). */
const CLAIM_MS = 24 * 3600e3;
const liveClaim = (/** @type {LedgerEntry} */ e, /** @type {Date} */ now) => e.status === 'claimed' && !!e.claimedAt && now.getTime() - new Date(e.claimedAt).getTime() <= CLAIM_MS;

export class Ledger {
  /** @param {string} file @param {LedgerEntry[]} entries */
  constructor(file, entries) {
    this.file = file;
    this.entries = entries;
  }

  /** @param {string} file */
  static async open(file) {
    try {
      const data = JSON.parse(await fs.readFile(file, 'utf8'));
      return new Ledger(file, Array.isArray(data.entries) ? data.entries : []);
    } catch (err) {
      if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') return new Ledger(file, []);
      throw err;
    }
  }

  /** The next free number. A claim that has expired no longer holds its number. */
  /** @param {Date} [now] the clock the caller works on (claims are judged against it, not against the real time) */
  nextEpisode(now = new Date()) {
    return this.entries.filter((e) => e.status !== 'claimed' || liveClaim(e, now)).reduce((m, e) => Math.max(m, e.episode), 0) + 1;
  }

  /** Why this URL can't be featured, or null. @param {string} url */
  conflict(url) {
    const n = normalizeUrl(url);
    const d = productDomain(url);
    for (const e of this.entries) {
      if (!TAKEN.has(e.status)) continue;
      if (normalizeUrl(e.url) === n) return `already featured as #${e.episode}`;
      if (e.domain === d) return `same product as #${e.episode} (${d})`;
    }
    return null;
  }

  /** @param {Omit<LedgerEntry, 'episode' | 'domain'>} e @param {Date} [now] */
  add(e, now = new Date()) {
    const entry = {...e, episode: this.nextEpisode(now), domain: productDomain(e.url)};
    this.entries.push(entry);
    return entry;
  }

  /**
   * Adds the episode under its own number, or updates the entry that has it.
   * A published or removed entry keeps its status.
   * @param {Omit<LedgerEntry, 'domain'>} e
   */
  upsert(e) {
    const entry = {...e, domain: productDomain(e.url)};
    const old = this.entries.find((x) => x.episode === e.episode);
    if (!old) {
      this.entries.push(entry);
      this.entries.sort((a, b) => a.episode - b.episode);
      return entry;
    }
    const keep = old.status === 'published' || old.status === 'removed' ? {status: old.status} : {};
    // a claim that became an episode is no longer a reservation
    if (old.status === 'claimed' && entry.status !== 'claimed') delete old.claimedAt;
    return Object.assign(old, entry, keep);
  }

  /** @param {number} episode @param {Partial<LedgerEntry>} patch */
  update(episode, patch) {
    const e = this.entries.find((x) => x.episode === episode);
    if (!e) throw new Error(`no episode #${episode} in ledger`);
    Object.assign(e, patch);
    return e;
  }

  async save() {
    const tmp = `${this.file}.tmp-${process.pid}`;
    await fs.writeFile(tmp, JSON.stringify({entries: this.entries}, null, 2) + '\n');
    await fs.rename(tmp, this.file);
  }
}

/**
 * The first web link named in a script's `sources` ({"<claim>": "<where, with
 * link>"}): the page a subject with no site of its own is recorded under.
 * @param {unknown} sources @returns {string | null}
 */
export function firstSourceLink(sources) {
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) return null;
  for (const where of Object.values(sources)) {
    const m = /https?:\/\/[^\s"'<>()]+/.exec(String(where));
    // a link at the end of a sentence keeps none of its punctuation
    if (m) return m[0].replace(/[.,;:!?]+$/, '');
  }
  return null;
}

/**
 * Ledger entries for the episodes already on disk: one per <dir>/script.json
 * that has an episode number. The ledger did not exist for the first 70-odd
 * episodes, so this is how it learns what was already featured.
 * The URL is the product's (brand.url), not where it was found: a Hacker News
 * thread as the URL would make every later HN launch look like a repeat.
 * @param {string} episodesDir
 * @returns {Promise<Omit<LedgerEntry, 'domain'>[]>}
 */
export async function entriesFromEpisodes(episodesDir) {
  const out = [];
  for (const d of await fs.readdir(episodesDir, {withFileTypes: true})) {
    if (!d.isDirectory() || d.name.startsWith('sample-')) continue;
    const file = path.join(episodesDir, d.name, 'script.json');
    let script;
    let stat;
    try {
      script = JSON.parse(await fs.readFile(file, 'utf8'));
      stat = await fs.stat(file);
    } catch {
      continue;
    }
    // A subject that is not a product has no brand.url: its main source stands in.
    const raw = script?.brand?.url || script?.sourceUrl || firstSourceLink(script?.sources);
    if (!Number.isInteger(script?.episode) || !raw) continue;
    out.push({
      episode: /** @type {number} */ (script.episode),
      url: /^https?:\/\//.test(raw) ? raw : `https://${raw}`,
      source: String(script.sourceLabel ?? 'manual'),
      sourceId: d.name,
      key: typeof script.key === 'string' ? script.key : d.name,
      title: String(script.brand?.name ?? d.name),
      status: /** @type {const} */ ('made'),
      date: stat.mtime.toISOString().slice(0, 10),
    });
  }
  return out.sort((a, b) => a.episode - b.episode);
}
