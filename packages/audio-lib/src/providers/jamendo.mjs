// Jamendo (api.jamendo.com/v3.0) — music only. Needs JAMENDO_CLIENT_ID.
// Most Jamendo tracks are NonCommercial: the license comes from each track's
// license_ccurl and the commercial filter excludes them. Tracks whose artist
// disabled downloads (audiodownload_allowed=false) are dropped entirely.
import {licenseFields} from '../licenses.mjs';

const API = 'https://api.jamendo.com/v3.0';

/** @typedef {import('../types.mjs').Provider} Provider */
/** @typedef {import('../types.mjs').AudioResult} AudioResult */

/**
 * @param {{env: Record<string, string | undefined>, http: import('../http.mjs').Http}} ctx
 * @returns {Provider}
 */
export function createJamendo({env, http}) {
  const clientId = env.JAMENDO_CLIENT_ID;
  return {
    name: 'jamendo',
    enabled: !!clientId,
    disabledReason: clientId ? undefined : 'set JAMENDO_CLIENT_ID to enable (free: https://devportal.jamendo.com)',
    types: ['music'],
    async search(query, opts) {
      const p = new URLSearchParams({
        client_id: /** @type {string} */ (clientId),
        format: 'json',
        // NC tracks dominate, so over-fetch when they'll be filtered out.
        limit: String(Math.min(opts.commercialUseOnly ? opts.limit * 3 : opts.limit, 100)),
        search: query,
        include: 'licenses',
        audioformat: 'mp32',
        audiodlformat: 'mp32',
      });
      if (opts.minDurationSec !== undefined || opts.maxDurationSec !== undefined) {
        p.set('durationbetween', `${Math.floor(opts.minDurationSec ?? 0)}_${Math.ceil(opts.maxDurationSec ?? 99999)}`);
      }
      const data = await http.getJson(`${API}/tracks/?${p}`);
      if (data.headers && data.headers.status !== 'success') {
        throw new Error(`jamendo: ${data.headers.error_message || data.headers.status} (code ${data.headers.code})`);
      }
      return (data.results ?? []).filter((/** @type {any} */ t) => t.audiodownload_allowed !== false && t.audiodownload).map(toResult);
    },
  };
}

/** @param {any} t @returns {AudioResult} */
export function toResult(t) {
  const meta = {
    title: String(t.name ?? 'Untitled'),
    creator: String(t.artist_name ?? 'Unknown'),
    sourceUrl: t.shareurl ?? `https://www.jamendo.com/track/${t.id}`,
  };
  return {
    id: `jamendo:${t.id}`,
    provider: 'jamendo',
    ...meta,
    durationSec: typeof t.duration === 'number' ? t.duration : Number(t.duration) || null,
    previewUrl: t.audio || null,
    downloadUrl: t.audiodownload || null,
    ...licenseFields(meta, t.license_ccurl),
  };
}
