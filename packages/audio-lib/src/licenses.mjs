// The single place where provider license strings become normalized licenses.
// Anything we can't confidently identify becomes 'unknown', and 'unknown' is
// treated as NOT safe for commercial use and as requiring attribution (fail closed).

/** @typedef {import('./types.mjs').License} License */
/** @typedef {import('./types.mjs').AudioResult} AudioResult */

/** @type {readonly License[]} */
export const LICENSES = ['CC0', 'PD', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'CC-BY-ND', 'unknown'];

/** Licenses that permit commercial use AND adaptation (syncing audio to video is an adaptation under CC). */
export const COMMERCIAL_SAFE = /** @type {readonly License[]} */ (['CC0', 'PD', 'CC-BY', 'CC-BY-SA']);

/** @type {Record<License, string>} */
const LABELS = {
  CC0: 'CC0',
  PD: 'Public Domain',
  'CC-BY': 'CC BY',
  'CC-BY-SA': 'CC BY-SA',
  'CC-BY-NC': 'CC BY-NC',
  'CC-BY-ND': 'CC BY-ND',
  unknown: 'Unknown license',
};

/** @type {Record<string, string>} */
const DEED_PATH = {
  'by': 'licenses/by',
  'by-sa': 'licenses/by-sa',
  'by-nd': 'licenses/by-nd',
  'by-nc': 'licenses/by-nc',
  'by-nc-sa': 'licenses/by-nc-sa',
  'by-nc-nd': 'licenses/by-nc-nd',
};

/**
 * @typedef {object} NormalizedLicense
 * @property {License} license
 * @property {string | null} version    e.g. '4.0', when the source states it
 * @property {string | null} variant    raw CC code, e.g. 'by-nc-sa' (NC variants all normalize to CC-BY-NC)
 * @property {string | null} url        canonical deed URL when known
 */

/** @param {string} code @returns {License} */
const fromCode = (code) => {
  if (code === 'zero' || code === 'cc0') return 'CC0';
  if (code === 'mark' || code === 'pdm' || code === 'publicdomain' || code === 'pd') return 'PD';
  if (!code.startsWith('by')) return 'unknown';
  const parts = code.split('-');
  if (parts.includes('sa') && parts.includes('nd')) return 'unknown'; // contradictory
  if (parts.includes('nc')) return 'CC-BY-NC';
  if (parts.includes('nd')) return 'CC-BY-ND';
  if (code === 'by-sa') return 'CC-BY-SA';
  if (code === 'by') return 'CC-BY';
  return 'unknown';
};

/** @param {string} code @param {string | null} version */
const ccUrl = (code, version) => {
  if (code === 'cc0' || code === 'zero') return `https://creativecommons.org/publicdomain/zero/${version ?? '1.0'}/`;
  if (code === 'pdm' || code === 'mark') return `https://creativecommons.org/publicdomain/mark/${version ?? '1.0'}/`;
  const p = DEED_PATH[code];
  if (!p) return null;
  return version ? `https://creativecommons.org/${p}/${version}/` : `https://creativecommons.org/${p}/`;
};

/**
 * Normalize any provider license representation: CC URLs, Openverse codes
 * ('by-nc-sa', 'cc0', 'pdm'), Freesound names ('Attribution NonCommercial',
 * 'Creative Commons 0') or free text ('CC BY-SA 4.0', 'Public Domain').
 * @param {string | null | undefined} raw
 * @param {string | null} [version]
 * @returns {NormalizedLicense}
 */
export function normalizeLicense(raw, version = null) {
  const unknown = {license: /** @type {License} */ ('unknown'), version: null, variant: null, url: null};
  if (!raw || typeof raw !== 'string') return unknown;
  const s = raw.trim().toLowerCase();
  if (!s) return unknown;

  // 1. Creative Commons URL.
  const url = s.match(/creativecommons\.org\/(licenses|publicdomain)\/([a-z-]+)\/?([\d.]+)?/);
  if (url) {
    const code = url[1] === 'publicdomain' ? (url[2] === 'zero' ? 'cc0' : url[2] === 'mark' ? 'pdm' : '') : url[2];
    const v = url[3] ?? version ?? null;
    const license = code ? fromCode(code) : 'unknown';
    if (license === 'unknown') return unknown;
    return {license, version: v, variant: code, url: ccUrl(code, v)};
  }
  // Non-CC URLs (e.g. a site's own terms page) are ambiguous.
  if (/^https?:\/\//.test(s)) return unknown;

  // 2. Bare CC code, as Openverse returns.
  const bare = s.replace(/^cc[\s_-]*/, '').replace(/_/g, '-');
  if (/^(by(-(nc|sa|nd))*|0|zero|pdm)$/.test(bare) || s === 'cc0') {
    const code = bare === '0' || bare === 'zero' || s === 'cc0' ? 'cc0' : bare;
    const license = fromCode(code);
    return {license, version: version ?? null, variant: code, url: ccUrl(code, version ?? null)};
  }

  // 3. Free text / names. Order matters: check the restrictive terms first.
  const v = s.match(/\b(\d\.\d)\b/)?.[1] ?? version ?? null;
  if (/sampling/.test(s)) return unknown; // Sampling+ licenses are retired and ambiguous for sync use
  if (/creative commons 0|\bcc0\b|cc zero|public domain dedication/.test(s)) {
    return {license: 'CC0', version: v ?? '1.0', variant: 'cc0', url: ccUrl('cc0', v ?? '1.0')};
  }
  if (/public domain|^pd$/.test(s)) return {license: 'PD', version: null, variant: 'pdm', url: null};

  const words = s.replace(/[^a-z]+/g, ' ');
  // A bare "by" only counts in a Creative Commons context ("Licensed by Sony" is not CC BY).
  const hasBy = /\battribution\b/.test(words) || (/\b(cc|creative commons)\b/.test(words) && /\bby\b/.test(words));
  if (!hasBy) return unknown;
  const nc = /\bnon ?commercial\b|\bnc\b/.test(words);
  const nd = /\bno ?deriv(ative)?s?\b|\bnd\b/.test(words);
  const sa = /\bshare ?alike\b|\bsa\b/.test(words);
  const code = ['by', nc && 'nc', sa && 'sa', nd && 'nd'].filter(Boolean).join('-');
  if (sa && nd) return unknown; // contradictory
  return {license: fromCode(code), version: v, variant: code, url: ccUrl(code, v)};
}

/** @param {License} license */
export const allowsCommercialUse = (license) => COMMERCIAL_SAFE.includes(license);

/** Unknown licenses require attribution too: we can't prove they don't. @param {License} license */
export const requiresAttribution = (license) => license !== 'CC0' && license !== 'PD';

/** @param {License} license @param {string | null} [version] */
export const licenseLabel = (license, version) =>
  license === 'CC0' || license === 'PD' || license === 'unknown' || !version
    ? LABELS[license]
    : `${LABELS[license]} ${version}`;

/**
 * Ready-to-paste credit line.
 * @param {{title: string, creator: string, sourceUrl: string | null, license: License, licenseUrl: string | null, version?: string | null}} r
 */
export function attributionLine(r) {
  const title = r.title ? `"${r.title}"` : 'Untitled';
  const by = r.creator ? ` by ${r.creator}` : '';
  const src = r.sourceUrl ? ` (${r.sourceUrl})` : '';
  if (r.license === 'CC0') return `${title}${by}${src}, dedicated to the public domain under CC0.`;
  if (r.license === 'PD') return `${title}${by}${src}, public domain.`;
  if (r.license === 'unknown') return `${title}${by}${src}. License unknown: verify with the source before use.`;
  const lic = licenseLabel(r.license, r.version);
  return `${title}${by}${src}, licensed under ${lic}${r.licenseUrl ? ` (${r.licenseUrl})` : ''}.`;
}

/**
 * Build the license-related fields of an AudioResult in one place.
 * @param {{title: string, creator: string, sourceUrl: string | null}} meta
 * @param {string | null | undefined} rawLicense
 * @param {string | null} [version]
 * @param {string | null} [explicitUrl] provider-supplied license URL (used when it parses to the same license)
 */
export function licenseFields(meta, rawLicense, version = null, explicitUrl = null) {
  const n = normalizeLicense(rawLicense, version);
  let licenseUrl = n.url;
  if (explicitUrl && normalizeLicense(explicitUrl).license === n.license) licenseUrl = explicitUrl;
  return {
    license: n.license,
    licenseUrl,
    requiresAttribution: requiresAttribution(n.license),
    allowsCommercialUse: allowsCommercialUse(n.license),
    attributionText: attributionLine({...meta, license: n.license, licenseUrl, version: n.version}),
  };
}

/**
 * Commercial-use filter. Fails closed: only results whose license is known
 * and in COMMERCIAL_SAFE pass; NC, ND and unknown are excluded.
 * @param {AudioResult} r
 */
export const isCommercialSafe = (r) => r.allowsCommercialUse === true && allowsCommercialUse(r.license);

/**
 * Apply the license-related search options.
 * @param {AudioResult[]} results
 * @param {{commercialUseOnly?: boolean, licenses?: License[]}} opts
 */
export function filterByLicense(results, opts) {
  let out = results;
  if (opts.commercialUseOnly) out = out.filter(isCommercialSafe);
  if (opts.licenses?.length) {
    const allowed = new Set(opts.licenses.map((l) => normalizeLicense(l).license));
    out = out.filter((r) => allowed.has(r.license));
  }
  return out;
}
