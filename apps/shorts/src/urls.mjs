// URL helpers: canonical form for dedupe, registrable-ish domain, blocklist match.

const TRACKING = /^(utm_\w+|ref|ref_src|source|fbclid|gclid|mc_cid|mc_eid)$/i;

/** Canonical URL for "have we featured this?" checks. @param {string} raw */
export function normalizeUrl(raw) {
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return raw.trim().toLowerCase();
  }
  u.protocol = 'https:';
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
  u.searchParams.sort();
  let s = u.toString();
  if (u.pathname !== '/' && s.endsWith('/') && !u.search) s = s.slice(0, -1);
  if (u.pathname === '/' && !u.search) s = s.replace(/\/$/, '');
  return s;
}

// Hosts where each user/project gets its own subdomain or path, so the
// "domain" that identifies a product must keep one more label.
const SHARED_HOSTS = ['github.io', 'vercel.app', 'netlify.app', 'pages.dev', 'fly.dev', 'onrender.com', 'herokuapp.com', 'gitlab.io', 'substack.com'];
const TWO_PART_TLDS = new Set(['co.uk', 'co.in', 'com.au', 'co.jp', 'com.br', 'co.nz', 'org.uk', 'ac.uk']);

/** "app.foo.com" → "foo.com"; "me.github.io" → "me.github.io"; "github.com/o/r" → "github.com/o/r". @param {string} raw */
export function productDomain(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return raw.toLowerCase();
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'github.com' || host === 'gitlab.com') {
    const [owner, repo] = u.pathname.split('/').filter(Boolean);
    return [host, owner, repo].filter(Boolean).join('/').toLowerCase();
  }
  const shared = SHARED_HOSTS.find((h) => host === h || host.endsWith(`.${h}`));
  if (shared) return host;
  const parts = host.split('.');
  const keep = TWO_PART_TLDS.has(parts.slice(-2).join('.')) ? 3 : 2;
  return parts.slice(-keep).join('.');
}

/** @param {string} url @param {string[]} blocked domains; subdomains match */
export function isBlocked(url, blocked) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return false;
  }
  return blocked.some((b) => host === b || host.endsWith(`.${b}`));
}

/** True for links to a code host rather than a product site. @param {string} url */
export function isRepoUrl(url) {
  return /^https?:\/\/(www\.)?(github\.com|gitlab\.com|codeberg\.org)\//i.test(url);
}
