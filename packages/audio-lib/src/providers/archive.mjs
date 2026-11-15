// Internet Archive (archive.org) — no key. Only audio items that carry a
// licenseurl are searched; each item's metadata picks its first MP3 file.
import {licenseFields} from '../licenses.mjs';

const BASE = 'https://archive.org';
const COMMERCIAL_URLS = '(licenseurl:*publicdomain* OR licenseurl:*licenses\\/by\\/* OR licenseurl:*licenses\\/by-sa\\/*)';

/** @typedef {import('../types.mjs').Provider} Provider */
/** @typedef {import('../types.mjs').AudioResult} AudioResult */

/**
 * @param {{http: import('../http.mjs').Http}} ctx
 * @returns {Provider}
 */
export function createArchive({http}) {
  return {
    name: 'archive',
    enabled: true,
    types: ['music', 'sfx'],
    async search(query, opts) {
      const terms = query.replace(/[():"\\[\]{}^~*?!+-]/g, ' ').trim();
      const q = [
        'mediatype:audio',
        'licenseurl:*',
        opts.commercialUseOnly ? COMMERCIAL_URLS : '',
        opts.type === 'sfx' ? '(subject:"sound effects" OR subject:sfx OR subject:foley OR title:sfx)' : '',
        terms ? `(${terms})` : '',
      ].filter(Boolean).join(' AND ');
      const p = new URLSearchParams({q, rows: String(Math.min(opts.limit, 10)), output: 'json', 'sort[]': 'downloads desc'});
      for (const f of ['identifier', 'title', 'creator', 'licenseurl']) p.append('fl[]', f);
      const data = await http.getJson(`${BASE}/advancedsearch.php?${p}`);
      const docs = data.response?.docs ?? [];
      /** @type {AudioResult[]} */
      const out = [];
      for (const doc of docs) {
        try {
          const meta = await http.getJson(`${BASE}/metadata/${encodeURIComponent(doc.identifier)}`);
          const r = toResult(doc, meta);
          if (r) out.push(r);
        } catch {
          // One broken item shouldn't sink the whole search.
        }
      }
      return out;
    },
  };
}

/** "3763", "3763.4", "62:43", "1:02:43" → seconds. @param {unknown} v */
export function parseLength(v) {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v);
  if (s.includes(':')) return s.split(':').reduce((acc, part) => acc * 60 + Number(part), 0) || null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : null;
}

/** @param {unknown} v */
const first = (v) => (Array.isArray(v) ? v[0] : v);

/**
 * @param {any} doc  advancedsearch row
 * @param {any} meta /metadata/{id} response
 * @returns {AudioResult | null}
 */
export function toResult(doc, meta) {
  const files = /** @type {any[]} */ (meta?.files ?? []);
  const file = files.find((f) => /mp3/i.test(f.format ?? '') || /\.mp3$/i.test(f.name ?? ''));
  if (!file) return null;
  const id = String(doc.identifier);
  const m = meta.metadata ?? {};
  const licenseUrl = first(m.licenseurl) ?? first(doc.licenseurl) ?? null;
  const base = {
    title: String(first(file.title) ?? first(m.title) ?? first(doc.title) ?? id),
    creator: String(first(file.creator) ?? first(m.creator) ?? first(doc.creator) ?? 'Unknown'),
    sourceUrl: `${BASE}/details/${id}`,
  };
  const url = `${BASE}/download/${encodeURIComponent(id)}/${file.name.split('/').map(encodeURIComponent).join('/')}`;
  return {
    id: `archive:${id}/${file.name}`,
    provider: 'archive',
    ...base,
    durationSec: parseLength(file.length),
    previewUrl: url,
    downloadUrl: url,
    ...licenseFields(base, licenseUrl, null, licenseUrl),
  };
}
