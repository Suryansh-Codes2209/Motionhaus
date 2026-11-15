// Hacker News via the Algolia HN Search API (no key): "Show HN" and
// "Launch HN" posts. These are launch discussions, not always videos; the
// url is the linked page (or the HN thread when there's none).
import {isoOrNull, stripHtml, truncate} from '../util.mjs';

const API = 'https://hn.algolia.com/api/v1';

/** @typedef {import('../types.mjs').Reference} Reference */
/** @typedef {import('../types.mjs').RefSource} RefSource */
/** @typedef {import('../types.mjs').VideoDetails} VideoDetails */

/** @param {any} h @returns {Reference} */
export function toReference(h) {
  const thread = `https://news.ycombinator.com/item?id=${h.objectID}`;
  const kind = (h._tags ?? []).find((/** @type {string} */ t) => t === 'show_hn' || t === 'launch_hn');
  return {
    id: `hackernews:${h.objectID}`,
    source: 'hackernews',
    title: String(h.title ?? ''),
    creator: String(h.author ?? 'Unknown'),
    url: h.url || thread,
    publishedAt: isoOrNull(h.created_at),
    durationSec: null,
    description: truncate(stripHtml(String(h.story_text ?? '')).replace(/\s+/g, ' ').trim() || `HN discussion: ${thread}`, 400),
    tags: [...(kind ? [kind.replace('_', '-')] : []), `points:${h.points ?? 0}`, `comments:${h.num_comments ?? 0}`, `thread:${thread}`],
  };
}

/** @param {{http: import('../../http.mjs').Http}} o */
export function createHackerNews({http}) {
  /** @type {RefSource & {details: (id: string) => Promise<VideoDetails | null>}} */
  const src = {
    name: 'hackernews',
    enabled: true,
    async search(opts) {
      const p = new URLSearchParams({
        query: [opts.query, opts.category].filter(Boolean).join(' '),
        tags: '(show_hn,launch_hn)',
        hitsPerPage: String(Math.min(opts.limit, 30)),
      });
      if (opts.sinceDate) p.set('numericFilters', `created_at_i>${Math.floor(new Date(opts.sinceDate).getTime() / 1000)}`);
      const data = await http.getJson(`${API}/search?${p}`);
      return (data.hits ?? []).map(toReference);
    },
    async details(id) {
      const h = await http.getJson(`${API}/items/${encodeURIComponent(id)}`);
      if (!h?.id) return null;
      return {
        url: `https://news.ycombinator.com/item?id=${h.id}`,
        source: 'hackernews',
        title: h.title ?? null,
        creator: h.author ?? null,
        publishedAt: isoOrNull(h.created_at),
        durationSec: null,
        viewCount: null,
        description: [h.url ? `Links to: ${h.url}` : null, h.text ? stripHtml(h.text) : null].filter(Boolean).join('\n'),
        tags: [],
      };
    },
  };
  return src;
}
