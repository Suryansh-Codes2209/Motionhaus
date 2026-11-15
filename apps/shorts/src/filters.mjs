// Editorial filters (spec §2) and launch scoring (spec §6.2).
import {DEFAULT_STORIES} from './channel-settings.mjs';
import {bannedMatch} from './stories.mjs';
import {isBlocked, isRepoUrl} from './urls.mjs';

/** @typedef {import('./types.mjs').Candidate} Candidate */
/** @typedef {import('./types.mjs').Ranked} Ranked */
/** @typedef {import('./types.mjs').Rejected} Rejected */

/**
 * Content the channel never covers (channel.json → stories.banned), matched
 * on whole words in the title and text.
 * @param {Candidate} c @param {string[]} [banned]
 */
export function bannedReason(c, banned = DEFAULT_STORIES.banned) {
  const hit = bannedMatch(`${c.title}\n${c.text}`, banned);
  return hit ? `content filter (${hit})` : null;
}

/**
 * Points (or stars) per hour since posting, normalised to 0..1 within each
 * source so HN points and GitHub stars compete fairly. Product sites beat
 * bare repo links (they capture far better) by a fixed factor.
 * A feed without scores (RSS) ranks by how new the story is. The
 * product-site factor applies only to channels about products.
 * @param {Candidate[]} cands @param {Date} now @param {{identity?: 'product' | 'story'}} [o] @returns {Ranked[]}
 */
export function rank(cands, now, {identity = 'product'} = {}) {
  const raw = cands.map((c) => {
    const hours = Math.max(1, (now.getTime() - new Date(c.postedAt).getTime()) / 3600_000);
    return (c.score > 0 ? c.score : 1) / hours;
  });
  /** @type {Map<string, number>} */
  const max = new Map();
  cands.forEach((c, i) => max.set(c.source, Math.max(max.get(c.source) ?? 0, raw[i])));
  return cands
    .map((c, i) => ({...c, velocity: (raw[i] / (max.get(c.source) || 1)) * (identity === 'product' && isRepoUrl(c.url) ? 0.6 : 1), rank: 0}))
    .sort((a, b) => b.velocity - a.velocity || b.score - a.score)
    .map((c, i) => ({...c, velocity: Math.round(c.velocity * 1000) / 1000, rank: i + 1}));
}

/**
 * @param {Candidate[]} cands
 * @param {{ledger: {conflict: (url: string, title?: string) => string | null}, blocked: string[], banned?: string[], reachable?: (url: string) => Promise<boolean>}} o
 * @returns {Promise<{kept: Candidate[], rejected: Rejected[]}>}
 */
export async function filter(cands, {ledger, blocked, banned, reachable}) {
  /** @type {Candidate[]} */
  const kept = [];
  /** @type {Rejected[]} */
  const rejected = [];
  /** @type {Set<string>} */
  const seen = new Set();
  for (const c of cands) {
    const reason =
      (isBlocked(c.url, blocked) ? 'blocklist' : null) ??
      ledger.conflict(c.url, c.title) ??
      bannedReason(c, banned) ??
      (seen.has(c.url) ? 'duplicate in this run' : null);
    if (reason) rejected.push({id: c.id, url: c.url, reason});
    else {
      seen.add(c.url);
      kept.push(c);
    }
  }
  if (!reachable) return {kept, rejected};
  const ok = await Promise.all(kept.map((c) => reachable(c.url).catch(() => false)));
  return {
    kept: kept.filter((_, i) => ok[i]),
    rejected: [...rejected, ...kept.filter((_, i) => !ok[i]).map((c) => ({id: c.id, url: c.url, reason: 'unreachable'}))],
  };
}

/** @param {typeof fetch} [fetchImpl] */
export function makeReachable(fetchImpl = globalThis.fetch) {
  /** @param {string} url */
  return async (url) => {
    const res = await fetchImpl(url, {redirect: 'follow', signal: AbortSignal.timeout(10000), headers: {'user-agent': 'Mozilla/5.0 Motionhaus/0.3 (link check)'}});
    await res.body?.cancel().catch(() => {});
    return res.status < 400 || res.status === 403; // 403: bot walls still render for the browser capture
  };
}
