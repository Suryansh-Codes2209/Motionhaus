// Small helpers shared by the reference sources.

const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'with', 'video', 'videos']);

/** @param {string} s */
export const tokens = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOP.has(t));

/**
 * How many query tokens appear in the text (prefix match on words).
 * @param {string[]} q @param {string} text
 */
export function matchScore(q, text) {
  const words = new Set(tokens(text));
  let score = 0;
  for (const t of q) if (words.has(t) || [...words].some((w) => w.startsWith(t))) score++;
  return score;
}

/** ISO 8601 duration (PT1M30S, P0D, PT2H) → seconds. @param {string | null | undefined} iso */
export function parseIsoDuration(iso) {
  if (!iso) return null;
  const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!m) return null;
  const [, d, h, min, s] = m;
  const total = Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
  return total > 0 ? total : null;
}

/** "1:02:03" / "2:05" / "0:07" → seconds. @param {string} ts */
export function parseTimestamp(ts) {
  const parts = ts.split(':').map(Number);
  if (parts.some((p) => !Number.isFinite(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/** @param {string} html */
export const stripHtml = (html) =>
  html
    .replace(/<p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&');

/** @param {string} s @param {number} n */
export const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** @param {string | null | undefined} v @returns {string | null} */
export function isoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Identify a video URL. Only hosts with official APIs are recognized.
 * @param {string} url
 * @returns {{kind: 'youtube' | 'vimeo' | 'producthunt' | 'hackernews' | 'other', id: string | null}}
 */
export function classifyUrl(url) {
  /** @type {URL} */
  let u;
  try {
    u = new URL(url);
  } catch {
    return {kind: 'other', id: null};
  }
  const host = u.hostname.replace(/^(www\.|m\.)/, '');
  if (host === 'youtu.be') return {kind: 'youtube', id: u.pathname.slice(1).split('/')[0] || null};
  if (host === 'youtube.com' || host === 'music.youtube.com') {
    const v = u.searchParams.get('v');
    if (v) return {kind: 'youtube', id: v};
    const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/);
    return {kind: 'youtube', id: m?.[1] ?? null};
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = u.pathname.match(/(?:^|\/)(\d{3,})(?:\/|$)/);
    return {kind: 'vimeo', id: m?.[1] ?? null};
  }
  if (host === 'producthunt.com') {
    const m = u.pathname.match(/^\/(?:posts|products)\/([\w-]+)/);
    return {kind: 'producthunt', id: m?.[1] ?? null};
  }
  if (host === 'news.ycombinator.com') return {kind: 'hackernews', id: u.searchParams.get('id')};
  return {kind: 'other', id: null};
}

/** Canonical URL for dedupe/lookup: YouTube and Vimeo URLs collapse to one form. @param {string} url */
export function canonicalUrl(url) {
  const c = classifyUrl(url);
  if (c.kind === 'youtube' && c.id) return `https://www.youtube.com/watch?v=${c.id}`;
  if (c.kind === 'vimeo' && c.id) return `https://vimeo.com/${c.id}`;
  if (c.kind === 'hackernews' && c.id) return `https://news.ycombinator.com/item?id=${c.id}`;
  return url.trim().replace(/\/$/, '');
}
