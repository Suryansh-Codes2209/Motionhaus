// YouTube Data API v3 (needs YOUTUBE_API_KEY). search.list finds videos,
// videos.list fills in duration, views, tags and the full description.
// Every call is checked against the local quota guard first.
import {isoOrNull, parseIsoDuration, truncate} from '../util.mjs';

const API = 'https://www.googleapis.com/youtube/v3';

/** @typedef {import('../types.mjs').Reference} Reference */
/** @typedef {import('../types.mjs').RefSource} RefSource */
/** @typedef {import('../types.mjs').VideoDetails} VideoDetails */

/** @param {any} v @returns {Reference} */
export function toReference(v) {
  const s = v.snippet ?? {};
  const views = Number(v.statistics?.viewCount);
  return {
    id: `youtube:${v.id}`,
    source: 'youtube',
    title: String(s.title ?? v.id),
    creator: String(s.channelTitle ?? 'Unknown'),
    url: `https://www.youtube.com/watch?v=${v.id}`,
    publishedAt: isoOrNull(s.publishedAt),
    durationSec: parseIsoDuration(v.contentDetails?.duration),
    ...(Number.isFinite(views) ? {viewCount: views} : {}),
    description: String(s.description ?? ''),
    tags: Array.isArray(s.tags) ? s.tags.slice(0, 15).map(String) : [],
  };
}

/**
 * @param {{env: Record<string, string | undefined>, http: import('../../http.mjs').Http, quota: ReturnType<typeof import('../quota.mjs').createQuota>}} o
 */
export function createYoutube({env, http, quota}) {
  const key = env.YOUTUBE_API_KEY;
  const headers = {'x-goog-api-key': key ?? ''};

  /** @param {string[]} ids @returns {Promise<Reference[]>} */
  async function videos(ids) {
    if (!ids.length) return [];
    await quota.reserve('units', 1);
    const p = new URLSearchParams({part: 'snippet,contentDetails,statistics', id: ids.slice(0, 50).join(','), maxResults: '50'});
    const data = await http.getJson(`${API}/videos?${p}`, {headers});
    return (data.items ?? []).map(toReference);
  }

  /** @type {RefSource & {details: (id: string) => Promise<VideoDetails | null>}} */
  const src = {
    name: 'youtube',
    enabled: !!key,
    disabledReason: key ? undefined : 'set YOUTUBE_API_KEY to enable (Google Cloud console → YouTube Data API v3)',
    async search(opts) {
      await quota.reserve('search', 1);
      const p = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        q: [opts.query, opts.category].filter(Boolean).join(' '),
        maxResults: String(Math.min(opts.limit, 25)),
        order: 'relevance',
      });
      if (opts.sinceDate) p.set('publishedAfter', new Date(opts.sinceDate).toISOString());
      if (opts.maxDurationSec !== undefined && opts.maxDurationSec <= 240) p.set('videoDuration', 'short'); // < 4 min
      const data = await http.getJson(`${API}/search?${p}`, {headers});
      const ids = (data.items ?? []).map((/** @type {any} */ i) => i.id?.videoId).filter(Boolean);
      const full = await videos(ids);
      return full.map((r) => ({...r, description: truncate(r.description, 400)}));
    },
    async details(id) {
      const [r] = await videos([id]);
      if (!r) return null;
      return {
        url: r.url,
        source: 'youtube',
        title: r.title,
        creator: r.creator,
        publishedAt: r.publishedAt,
        durationSec: r.durationSec,
        viewCount: r.viewCount ?? null,
        description: r.description,
        tags: r.tags,
      };
    },
  };
  return src;
}
