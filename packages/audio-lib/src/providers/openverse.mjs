// Openverse (api.openverse.org) — primary discovery source, aggregates CC audio
// from Freesound, Jamendo, Wikimedia and others. Works anonymously
// (20 req/min, 200/day); OPENVERSE_CLIENT_ID + OPENVERSE_CLIENT_SECRET raise the limits.
import {licenseFields} from '../licenses.mjs';

const API = 'https://api.openverse.org/v1';

/** @typedef {import('../types.mjs').Provider} Provider */
/** @typedef {import('../types.mjs').AudioResult} AudioResult */

/**
 * @param {{env: Record<string, string | undefined>, http: import('../http.mjs').Http, log: import('../types.mjs').Logger}} ctx
 * @returns {Provider}
 */
export function createOpenverse({env, http, log}) {
  const clientId = env.OPENVERSE_CLIENT_ID;
  const clientSecret = env.OPENVERSE_CLIENT_SECRET;
  /** @type {{token: string, expires: number} | null} */
  let token = null;

  /** @returns {Promise<Record<string, string>>} */
  async function authHeaders() {
    if (!clientId || !clientSecret) return {};
    if (token && Date.now() < token.expires) return {authorization: `Bearer ${token.token}`};
    try {
      const res = await http.request(`${API}/auth_tokens/token/`, {
        method: 'POST',
        headers: {'content-type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret}).toString(),
      });
      const j = /** @type {{access_token: string, expires_in?: number}} */ (await res.json());
      token = {token: j.access_token, expires: Date.now() + ((j.expires_in ?? 3600) - 60) * 1000};
      return {authorization: `Bearer ${token.token}`};
    } catch (err) {
      log(`openverse: OAuth token request failed, continuing anonymously (${/** @type {Error} */ (err).message})`);
      return {};
    }
  }

  return {
    name: 'openverse',
    enabled: true,
    types: ['music', 'sfx'],
    async search(query, opts) {
      const p = new URLSearchParams({
        q: query.slice(0, 200),
        page_size: String(Math.min(opts.limit, clientId ? 50 : 20)),
        filter_dead: 'true',
        mature: 'false',
      });
      // Server-side prefilter; the commercial filter is re-applied locally (fail closed).
      if (opts.commercialUseOnly) p.set('license', 'cc0,pdm,by,by-sa');
      if (opts.maxDurationSec !== undefined && opts.maxDurationSec <= 30) p.set('length', 'shortest,short');
      const data = await http.getJson(`${API}/audio/?${p}`, {headers: await authHeaders()});
      // The documented `category` filter returns nothing in practice (most items have
      // category: null), so filter client-side: drop only items that contradict the type.
      const wrong = opts.type === 'music' ? 'sound_effect' : 'music';
      return (data.results ?? []).filter((/** @type {any} */ r) => r.category !== wrong).map(toResult);
    },
  };
}

/** @param {any} r @returns {AudioResult} */
export function toResult(r) {
  const meta = {
    title: String(r.title ?? 'Untitled'),
    creator: String(r.creator ?? 'Unknown'),
    sourceUrl: r.foreign_landing_url ?? null,
  };
  return {
    id: `openverse:${r.id}`,
    provider: 'openverse',
    ...meta,
    // Openverse reports duration in milliseconds.
    durationSec: typeof r.duration === 'number' ? Math.round(r.duration / 100) / 10 : null,
    previewUrl: r.url ?? null,
    downloadUrl: r.url ?? null,
    ...licenseFields(meta, r.license, r.license_version ?? null, r.license_url ?? null),
  };
}
