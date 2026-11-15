// Vimeo API (needs VIMEO_TOKEN, an access token with the "public" scope):
// keyword search plus a search within the Staff Picks channel.
import {isoOrNull, truncate} from '../util.mjs';

const API = 'https://api.vimeo.com';
const FIELDS = 'uri,name,description,link,duration,created_time,release_time,user.name,stats.plays,tags.name';

/** @typedef {import('../types.mjs').Reference} Reference */
/** @typedef {import('../types.mjs').RefSource} RefSource */
/** @typedef {import('../types.mjs').VideoDetails} VideoDetails */

/** @param {any} v @param {string[]} [extraTags] @returns {Reference} */
export function toReference(v, extraTags = []) {
  const id = String(v.uri ?? '').split('/').pop() ?? '';
  const plays = Number(v.stats?.plays);
  return {
    id: `vimeo:${id}`,
    source: 'vimeo',
    title: String(v.name ?? id),
    creator: String(v.user?.name ?? 'Unknown'),
    url: v.link ?? `https://vimeo.com/${id}`,
    publishedAt: isoOrNull(v.release_time ?? v.created_time),
    durationSec: typeof v.duration === 'number' && v.duration > 0 ? v.duration : null,
    ...(Number.isFinite(plays) ? {viewCount: plays} : {}),
    description: String(v.description ?? ''),
    tags: [...extraTags, ...(v.tags ?? []).map((/** @type {any} */ t) => String(t.name ?? '')).filter(Boolean)].slice(0, 15),
  };
}

/**
 * @param {{env: Record<string, string | undefined>, http: import('../../http.mjs').Http}} o
 */
export function createVimeo({env, http}) {
  const token = env.VIMEO_TOKEN;
  const headers = {authorization: `bearer ${token}`, accept: 'application/vnd.vimeo.*+json;version=3.4'};

  /** @param {string} path @param {URLSearchParams} p */
  const get = (path, p) => http.getJson(`${API}${path}?${p}`, {headers});

  /** @type {RefSource & {details: (id: string) => Promise<VideoDetails | null>, textTracks: (id: string) => Promise<{language: string, link: string}[]>}} */
  const src = {
    name: 'vimeo',
    enabled: !!token,
    disabledReason: token ? undefined : 'set VIMEO_TOKEN to enable (developer.vimeo.com/apps → generate an access token, "public" scope)',
    async search(opts) {
      const q = [opts.query, opts.category].filter(Boolean).join(' ');
      const per = String(Math.min(opts.limit, 25));
      const [all, picks] = await Promise.all([
        get('/videos', new URLSearchParams({query: q, per_page: per, sort: 'relevant', fields: FIELDS})),
        get('/channels/staffpicks/videos', new URLSearchParams({query: q, per_page: per, fields: FIELDS})).catch(() => ({data: []})),
      ]);
      const staff = (picks.data ?? []).map((/** @type {any} */ v) => toReference(v, ['staff-pick']));
      const seen = new Set(staff.map((/** @type {Reference} */ r) => r.id));
      const rest = (all.data ?? []).map((/** @type {any} */ v) => toReference(v)).filter((/** @type {Reference} */ r) => !seen.has(r.id));
      return [...staff, ...rest].slice(0, opts.limit).map((r) => ({...r, description: truncate(r.description, 400)}));
    },
    async details(id) {
      const v = await get(`/videos/${encodeURIComponent(id)}`, new URLSearchParams({fields: FIELDS}));
      const r = toReference(v);
      return {...r, source: 'vimeo', viewCount: r.viewCount ?? null};
    },
    async textTracks(id) {
      const d = await get(`/videos/${encodeURIComponent(id)}/texttracks`, new URLSearchParams({fields: 'language,link,active'}));
      return (d.data ?? []).filter((/** @type {any} */ t) => t.link).map((/** @type {any} */ t) => ({language: String(t.language ?? ''), link: String(t.link)}));
    },
  };
  return src;
}
