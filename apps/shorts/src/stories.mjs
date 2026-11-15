// Stories: what a channel covers, one per episode. This is where "have we
// done this one already?" is decided, and where episode numbers are handed out.
//
// Two ideas of "the same story", chosen per channel (channel.json →
// stories.identity):
//   product  the same link, the same product site, or the same product name.
//            A product that moves from its repository to its own site is
//            still the same product.
//   story    the same link or the same key. Two stories from one news site
//            are different stories; a similar headline is only a warning,
//            because "India beat Australia" can be true on two days. Two
//            keys from one reference page are also only a warning.
//
// A story is CLAIMED before it is written. A claim is a 24-hour reservation
// of the story and of an episode number: `shorts kit` turns it into a made
// episode, and a claim that is never packed expires, freeing both. So a run
// that fails half-way burns no number and blocks no story.
import fs from 'node:fs/promises';
import path from 'node:path';
import {firstSourceLink, Ledger} from './ledger.mjs';
import {isBlocked, normalizeUrl, productDomain} from './urls.mjs';

/** @typedef {import('./types.mjs').LedgerEntry} LedgerEntry */

export const CLAIM_HOURS = 24;

/** A name reduced to its letters and digits. @param {string} s */
export const nameKey = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

/** The name at the front of a headline: "Yogurt – an open-source X" → "Yogurt". @param {string} title */
export const leadName = (title) => title.split(/\s[–—-]\s|:\s|,\s|\s\|\s/)[0].trim();

/** A valid story key: lowercase letters, digits and dashes. @param {unknown} k */
export const isKey = (k) => typeof k === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(k);

/** @param {LedgerEntry} e @param {Date} now */
export const isExpiredClaim = (e, now) => e.status === 'claimed' && (!e.claimedAt || now.getTime() - new Date(e.claimedAt).getTime() > CLAIM_HOURS * 3600e3);

const STOP = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'to', 'for', 'and', 'is', 'are', 'was', 'at', 'by', 'with', 'from', 'as', 'it', 'its', 'this', 'that', 'how', 'why', 'what']);
const significant = (/** @type {string} */ t) => new Set(t.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w)));

/** Share of the shorter headline's significant words found in the other. @param {string} a @param {string} b */
export function titleOverlap(a, b) {
  const [x, y] = [significant(a), significant(b)];
  const small = x.size <= y.size ? x : y;
  const big = small === x ? y : x;
  if (small.size < 3) return 0;
  return [...small].filter((w) => big.has(w)).length / small.size;
}

const TAKEN = new Set(['queued', 'made', 'published', 'removed', 'claimed']);

/**
 * Whether a story may be covered, given what the ledger holds.
 * allowSameName: under `product`, a match on the name alone (different link,
 * different site) is let through: two products can share a name.
 * @param {LedgerEntry[]} entries
 * @param {{url: string, key?: string, title?: string}} story
 * @param {{identity: 'product' | 'story', now?: Date, allowSameName?: boolean}} o
 * @returns {{refuse: string | null, warn: string | null}}
 */
export function storyConflict(entries, story, {identity, now = new Date(), allowSameName = false}) {
  const url = normalizeUrl(story.url);
  const live = entries.filter((e) => TAKEN.has(e.status) && !isExpiredClaim(e, now) && !(story.key && e.status === 'claimed' && e.key === story.key));
  const tag = (/** @type {LedgerEntry} */ e) => `#${e.episode}${e.status === 'claimed' ? ' (claimed, not made yet)' : ''}`;
  /** @type {LedgerEntry | undefined} */
  let samePage;
  for (const e of live) {
    if (normalizeUrl(e.url) === url) {
      // Departs from the spec's "same link or key": one reference page (an
      // encyclopedia entry, a report) can carry two different stories, told apart by their keys.
      if (identity === 'story' && story.key && e.key && e.key !== story.key) {
        samePage ??= e;
        continue;
      }
      return {refuse: `already featured as ${tag(e)}`, warn: null};
    }
    if (story.key && e.key === story.key) return {refuse: `already featured as ${tag(e)} (same key "${story.key}")`, warn: null};
  }
  if (identity === 'product') {
    const domain = productDomain(story.url);
    for (const e of live) if (e.domain === domain) return {refuse: `same product as ${tag(e)} (${domain})`, warn: null};
    if (allowSameName) return {refuse: null, warn: null};
    // The lead name of the headline, and the key: a product that moved to a new
    // site under a descriptive headline still carries its name in its key.
    const lead = story.title ? nameKey(leadName(story.title)) : '';
    const key = story.key ? nameKey(story.key) : '';
    const same = (/** @type {string} */ a, /** @type {string | undefined} */ b) => a.length >= 3 && !!b && nameKey(b) === a;
    for (const e of live)
      if (same(lead, e.title) || same(key, e.key) || same(key, e.title))
        return {refuse: `same product as ${tag(e)} (same name "${e.title}") (a different product with the same name? add --allow-same-name)`, warn: null};
    return {refuse: null, warn: null};
  }
  if (samePage) return {refuse: null, warn: `the same page was the source of ${tag(samePage)} "${samePage.title}": make sure this is a different story`};
  if (story.title) {
    const near = live.find((e) => titleOverlap(e.title, /** @type {string} */ (story.title)) >= 0.7);
    if (near) return {refuse: null, warn: `the headline is close to ${tag(near)} "${near.title}": make sure this is a new story, not the same one again`};
  }
  return {refuse: null, warn: null};
}

/** Whole-word, case-insensitive match of a channel's banned patterns. @param {string} text @param {string[]} banned @returns {string | null} the words that matched */
export function bannedMatch(text, banned) {
  for (const p of banned) {
    const m = new RegExp(`\\b(${p})\\b`, 'i').exec(text);
    if (m) return m[0];
  }
  return null;
}

/**
 * Runs `fn` while holding the ledger's lock file, so two claims cannot read
 * the same "next number". A lock older than a minute is from a dead run.
 * @template T @param {string} ledgerFile @param {() => Promise<T>} fn @returns {Promise<T>}
 */
export async function withLedgerLock(ledgerFile, fn) {
  const lock = `${ledgerFile}.lock`;
  for (let i = 0; ; i++) {
    try {
      await (await fs.open(lock, 'wx')).close();
      break;
    } catch (err) {
      if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'EEXIST') throw err;
      const age = await fs.stat(lock).then((s) => Date.now() - s.mtimeMs, () => Infinity);
      if (age > 60_000) await fs.rm(lock, {force: true});
      else if (i > 400) throw new Error(`the ledger is locked by another run (${lock})`);
      else await new Promise((r) => setTimeout(r, 25 + Math.random() * 25));
    }
  }
  try {
    return await fn();
  } finally {
    await fs.rm(lock, {force: true});
  }
}

/**
 * Claims a story: checks it may be covered and reserves it and an episode
 * number for 24 hours. Claiming the same key again returns the same number.
 * @param {string} ledgerFile
 * @param {{title: string, url: string, key: string, source?: string}} story
 * @param {{identity: 'product' | 'story', banned?: string[], blocked?: string[], now?: Date, allowSameName?: boolean}} o
 * @returns {Promise<{episode: number, reused: boolean, warn: string | null}>}
 */
export async function claimStory(ledgerFile, story, {identity, banned = [], blocked = [], now = new Date(), allowSameName = false}) {
  if (!isKey(story.key)) throw new Error(`"${story.key}" is not a valid story key: use lowercase letters, digits and dashes (for example "agentes-chat")`);
  if (!story.title?.trim()) throw new Error('a story needs a title');
  try {
    new URL(story.url);
  } catch {
    throw new Error(`"${story.url}" is not a link: a story needs the full link of its main source`);
  }
  const hit = bannedMatch(story.title, banned);
  if (hit) throw new Error(`this channel does not cover that (stories.banned matched "${hit}")`);
  if (isBlocked(story.url, blocked)) throw new Error('that site is on this channel\'s blocklist');

  await fs.mkdir(path.dirname(ledgerFile), {recursive: true});
  return withLedgerLock(ledgerFile, async () => {
    const ledger = await Ledger.open(ledgerFile);
    // Expired claims are dropped here: their stories and numbers are free again.
    ledger.entries = ledger.entries.filter((e) => !isExpiredClaim(e, now));
    const mine = ledger.entries.find((e) => e.status === 'claimed' && e.key === story.key);
    const verdict = storyConflict(ledger.entries, story, {identity, now, allowSameName});
    if (verdict.refuse) throw new Error(verdict.refuse);
    if (mine) {
      Object.assign(mine, {title: story.title, url: story.url, domain: productDomain(story.url), claimedAt: now.toISOString()});
      await ledger.save();
      return {episode: mine.episode, reused: true, warn: verdict.warn};
    }
    const entry = ledger.add({url: story.url, source: story.source ?? 'manual', sourceId: story.key, title: story.title, status: 'claimed', date: now.toISOString().slice(0, 10), key: story.key, claimedAt: now.toISOString()}, now);
    await ledger.save();
    return {episode: entry.episode, reused: false, warn: verdict.warn};
  });
}

/**
 * The ledger entry for a packed short. Its link is the product's own page
 * when it has one, else where the story came from, else the first link its
 * sources name, else the link it was claimed under: a subject that is not a
 * product (a fact, a news story) is recorded too, so its number stays taken.
 * @param {{script: any, slug: string, claim?: LedgerEntry, date: string}} o
 * @returns {Omit<LedgerEntry, 'domain'>}
 */
export function episodeEntry({script, slug, claim, date}) {
  if (!Number.isInteger(script.episode)) throw new Error('script.json has no "episode" number: claim the story first (shorts story claim)');
  const brandUrl = typeof script.brand?.url === 'string' && script.brand.url ? (/^[a-z][a-z0-9+.-]*:\/\//i.test(script.brand.url) ? script.brand.url : `https://${script.brand.url}`) : '';
  const url = brandUrl || script.sourceUrl || firstSourceLink(script.sources) || claim?.url;
  if (!url) throw new Error('this episode has no link to record it under: claim the story first (shorts story claim) or give script.json a brand.url, sourceUrl or sources');
  return {
    episode: script.episode,
    key: script.key ?? claim?.key ?? slug,
    title: script.brand?.name ?? slug,
    url,
    source: script.sourceLabel ?? claim?.source ?? 'manual',
    sourceId: slug,
    status: 'made',
    date,
  };
}

/**
 * What `shorts kit` does to the ledger: the episode's claim (found by key or
 * by number) becomes a made episode under the claimed number. A script whose
 * number is not the one its story was claimed under is refused: recording it
 * would leave the claim behind, holding a second number for the same story.
 * @param {string} ledgerFile @param {{script: any, slug: string, now?: Date}} o
 * @returns {Promise<LedgerEntry>}
 */
export async function recordEpisode(ledgerFile, {script, slug, now = new Date()}) {
  await fs.mkdir(path.dirname(ledgerFile), {recursive: true});
  return withLedgerLock(ledgerFile, async () => {
    const ledger = await Ledger.open(ledgerFile);
    ledger.entries = ledger.entries.filter((e) => !isExpiredClaim(e, now));
    const live = ledger.entries.filter((e) => e.status === 'claimed');
    const claim = (script.key && live.find((e) => e.key === script.key)) || live.find((e) => e.episode === script.episode);
    if (claim && script.key && claim.key === script.key && claim.episode !== script.episode)
      throw new Error(`script.json says episode ${script.episode} but this story was claimed as #${claim.episode}: use the claimed number`);
    // the number is another story's live claim: recording over it would take that run's number
    if (claim && script.key && claim.key && claim.key !== script.key)
      throw new Error(`episode #${script.episode} is claimed by another story ("${claim.key}"): claim this story (shorts story claim) and use the number it gives`);
    const entry = ledger.upsert(episodeEntry({script, slug, claim, date: now.toISOString().slice(0, 10)}));
    await ledger.save();
    return entry;
  });
}

/**
 * Gives back a claim (its story and its number) before its 24 hours are up:
 * for a story dropped after claiming, and for a maker run that made nothing.
 * Only a claim is removed, never an episode.
 * @param {string} ledgerFile @param {string} key @returns {Promise<boolean>} whether a claim was removed
 */
export async function releaseClaim(ledgerFile, key) {
  if (!(await fs.stat(ledgerFile).then(() => true, () => false))) return false;
  return withLedgerLock(ledgerFile, async () => {
    const ledger = await Ledger.open(ledgerFile);
    const kept = ledger.entries.filter((e) => !(e.status === 'claimed' && e.key === key));
    if (kept.length === ledger.entries.length) return false;
    ledger.entries = kept;
    await ledger.save();
    return true;
  });
}
