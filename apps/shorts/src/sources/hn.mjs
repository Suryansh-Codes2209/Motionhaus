// Show HN / Launch HN posts via the Algolia HN Search API (no key, commercial use OK).
/** @typedef {import('../types.mjs').Candidate} Candidate */
/** @typedef {import('../types.mjs').Source} Source */

const API = 'https://hn.algolia.com/api/v1';

/** Algolia returns HTML in story_text. @param {string} s */
const stripHtml = (s) =>
  s
    .replace(/<p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .trim();

/** "Show HN: Inkwell – docs that write themselves" → "Inkwell – docs that write themselves". @param {string} t */
export const cleanTitle = (t) => t.replace(/^\s*(show|launch)\s+hn\s*[:–-]\s*/i, '').trim();

/** @param {any} h @returns {Candidate | null} */
export function toCandidate(h) {
  if (!h?.objectID || !h.url) return null; // text-only posts have nothing to capture
  const tags = /** @type {string[]} */ (h._tags ?? []);
  const launch = tags.includes('launch_hn');
  return {
    source: 'hn',
    id: `hn:${h.objectID}`,
    title: cleanTitle(String(h.title ?? '')),
    url: String(h.url),
    sourceUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
    sourceLabel: launch ? 'Launch HN' : 'Show HN',
    score: Number(h.points ?? 0),
    comments: Number(h.num_comments ?? 0),
    postedAt: new Date(Number(h.created_at_i) * 1000).toISOString(),
    text: stripHtml(String(h.story_text ?? '')).slice(0, 2000),
    tags: [launch ? 'launch-hn' : 'show-hn'],
  };
}

/**
 * @param {{http: {getJson: (url: string) => Promise<any>}, minPoints: number}} o
 * @returns {Source}
 */
export function createHn({http, minPoints}) {
  return {
    name: 'hn',
    async fetch({now, lookbackHours}) {
      const since = Math.floor(now.getTime() / 1000 - lookbackHours * 3600);
      const p = new URLSearchParams({
        tags: '(show_hn,launch_hn)',
        numericFilters: `created_at_i>${since},points>=${minPoints}`,
        hitsPerPage: '50',
      });
      const data = await http.getJson(`${API}/search_by_date?${p}`);
      return (data.hits ?? []).map(toCandidate).filter(/** @param {Candidate | null} c @returns {c is Candidate} */ (c) => c !== null);
    },
  };
}
