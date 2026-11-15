// New, fast-rising GitHub repos that have a product homepage, via the official
// REST search API (GitHub Trending has no API and is not scraped).
/** @typedef {import('../types.mjs').Candidate} Candidate */
/** @typedef {import('../types.mjs').Source} Source */

const API = 'https://api.github.com';

/** @param {any} r @returns {Candidate | null} */
export function toCandidate(r) {
  const homepage = String(r?.homepage ?? '').trim();
  if (!r?.id || !/^https?:\/\//i.test(homepage)) return null; // need a site to capture
  if (/^https?:\/\/(www\.)?github\.com\//i.test(homepage)) return null;
  return {
    source: 'github',
    id: `github:${r.id}`,
    title: String(r.name ?? r.full_name ?? ''),
    url: homepage,
    sourceUrl: String(r.html_url),
    sourceLabel: 'GitHub',
    score: Number(r.stargazers_count ?? 0),
    comments: 0,
    postedAt: new Date(r.created_at).toISOString(),
    text: String(r.description ?? '').slice(0, 2000),
    tags: ['github', ...(Array.isArray(r.topics) ? r.topics.slice(0, 8).map(String) : [])],
  };
}

/** @param {Date} d */
const ymd = (d) => d.toISOString().slice(0, 10);

/**
 * @param {{http: {getJson: (url: string, init?: RequestInit) => Promise<any>}, minStars: number, maxAgeDays: number, token?: string}} o
 * @returns {Source}
 */
export function createGithub({http, minStars, maxAgeDays, token}) {
  return {
    name: 'github',
    async fetch({now}) {
      const since = new Date(now.getTime() - maxAgeDays * 86400_000);
      const q = `created:>${ymd(since)} stars:>=${minStars} archived:false fork:false`;
      const p = new URLSearchParams({q, sort: 'stars', order: 'desc', per_page: '50'});
      /** @type {Record<string, string>} */
      const headers = {accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28'};
      if (token) headers.authorization = `Bearer ${token}`;
      const data = await http.getJson(`${API}/search/repositories?${p}`, {headers});
      return (data.items ?? []).map(toCandidate).filter(/** @param {Candidate | null} c @returns {c is Candidate} */ (c) => c !== null);
    },
  };
}
