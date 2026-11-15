// Freesound (freesound.org/apiv2) — deep SFX catalogue. Needs FREESOUND_API_KEY.
// Downloads use the HQ MP3 preview by default. Original files need an OAuth2
// access token: set FREESOUND_OAUTH_TOKEN and FREESOUND_DOWNLOAD_ORIGINALS=1.
import {licenseFields} from '../licenses.mjs';

const API = 'https://freesound.org/apiv2';
const FIELDS = 'id,name,username,duration,license,previews,url,download';

/** @typedef {import('../types.mjs').Provider} Provider */
/** @typedef {import('../types.mjs').AudioResult} AudioResult */

/**
 * @param {{env: Record<string, string | undefined>, http: import('../http.mjs').Http}} ctx
 * @returns {Provider}
 */
export function createFreesound({env, http}) {
  const key = env.FREESOUND_API_KEY;
  const oauth = env.FREESOUND_OAUTH_TOKEN;
  const originals = env.FREESOUND_DOWNLOAD_ORIGINALS === '1' && !!oauth;
  return {
    name: 'freesound',
    enabled: !!key,
    disabledReason: key ? undefined : 'set FREESOUND_API_KEY to enable (free key: https://freesound.org/apiv2/apply)',
    types: ['sfx'],
    async search(query, opts) {
      const filters = [];
      const min = opts.minDurationSec ?? 0;
      const max = opts.maxDurationSec;
      if (min > 0 || max !== undefined) filters.push(`duration:[${min} TO ${max ?? '*'}]`);
      if (opts.commercialUseOnly) filters.push('license:("Attribution" OR "Creative Commons 0")');
      const p = new URLSearchParams({query, fields: FIELDS, page_size: String(Math.min(opts.limit, 50))});
      if (filters.length) p.set('filter', filters.join(' '));
      const data = await http.getJson(`${API}/search/?${p}`, {headers: {authorization: `Token ${key}`}});
      return (data.results ?? []).map((/** @type {any} */ s) => toResult(s, originals));
    },
    /** @param {AudioResult} result @returns {Promise<Record<string, string>>} */
    async downloadHeaders(result) {
      return originals && result.downloadUrl?.startsWith(API) ? {authorization: `Bearer ${oauth}`} : {};
    },
  };
}

/** @param {any} s @param {boolean} [originals] @returns {AudioResult} */
export function toResult(s, originals = false) {
  const meta = {
    title: String(s.name ?? 'Untitled'),
    creator: String(s.username ?? 'Unknown'),
    sourceUrl: s.url ?? `https://freesound.org/s/${s.id}/`,
  };
  const preview = s.previews?.['preview-hq-mp3'] ?? s.previews?.['preview-hq-ogg'] ?? null;
  return {
    id: `freesound:${s.id}`,
    provider: 'freesound',
    ...meta,
    durationSec: typeof s.duration === 'number' ? Math.round(s.duration * 10) / 10 : null,
    previewUrl: preview,
    downloadUrl: originals && s.download ? s.download : preview,
    ...licenseFields(meta, s.license),
  };
}
