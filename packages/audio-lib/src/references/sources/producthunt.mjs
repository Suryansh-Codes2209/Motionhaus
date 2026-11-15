// Product Hunt API v2 (GraphQL, needs PRODUCT_HUNT_TOKEN, a developer token).
// The API has no text search, so this pulls the top-voted launches in a date
// range and filters them locally; only launches with a video are returned.
// Note: by default the Product Hunt API must not be used for commercial purposes.
import {isoOrNull, matchScore, tokens, truncate} from '../util.mjs';

const API = 'https://api.producthunt.com/v2/api/graphql';

const POST_FIELDS = `
  id name slug tagline description url website votesCount createdAt featuredAt
  makers { name }
  topics(first: 5) { edges { node { name } } }
  media { type url videoUrl }`;

const POSTS_QUERY = `query Posts($after: DateTime, $before: DateTime, $first: Int, $topic: String) {
  posts(order: VOTES, postedAfter: $after, postedBefore: $before, first: $first, topic: $topic) {
    edges { node { ${POST_FIELDS} } }
  }
}`;

const POST_QUERY = `query Post($slug: String) { post(slug: $slug) { ${POST_FIELDS} } }`;

/** @typedef {import('../types.mjs').Reference} Reference */
/** @typedef {import('../types.mjs').RefSource} RefSource */
/** @typedef {import('../types.mjs').VideoDetails} VideoDetails */

/** Maker names can be redacted by Product Hunt; don't present "[REDACTED]" as a creator. @param {any} p */
const creatorOf = (p) => {
  const names = (p.makers ?? []).map((/** @type {any} */ m) => m?.name).filter((/** @type {any} */ n) => n && !/redacted/i.test(n));
  return names.length ? names.slice(0, 3).join(', ') : String(p.name ?? 'Unknown');
};

/** @param {any} p @returns {string | null} */
export const videoUrlOf = (p) => (p.media ?? []).find((/** @type {any} */ m) => m?.type === 'video' && m.videoUrl)?.videoUrl ?? null;

/** @param {any} p @returns {Reference | null} */
export function toReference(p) {
  const video = videoUrlOf(p);
  if (!video) return null;
  const topics = (p.topics?.edges ?? []).map((/** @type {any} */ e) => String(e.node?.name ?? '')).filter(Boolean);
  return {
    id: `producthunt:${p.slug ?? p.id}`,
    source: 'producthunt',
    title: `${p.name}: ${p.tagline ?? ''}`.replace(/: $/, ''),
    creator: creatorOf(p),
    url: video,
    publishedAt: isoOrNull(p.featuredAt ?? p.createdAt),
    durationSec: null,
    description: truncate(`${p.description ?? p.tagline ?? ''} (Product Hunt: ${p.url}, ${p.votesCount ?? 0} votes)`, 400),
    tags: ['product-hunt', ...topics.map((/** @type {string} */ t) => t.toLowerCase())],
  };
}

/**
 * @param {{env: Record<string, string | undefined>, http: import('../../http.mjs').Http}} o
 */
export function createProductHunt({env, http}) {
  const token = env.PRODUCT_HUNT_TOKEN;

  /** @param {string} query @param {Record<string, unknown>} variables */
  async function gql(query, variables) {
    const res = await http.request(API, {
      method: 'POST',
      headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json'},
      body: JSON.stringify({query, variables}),
    });
    const data = await res.json();
    if (data.errors?.length) throw new Error(`producthunt: ${data.errors.map((/** @type {any} */ e) => e.message).join('; ')}`);
    return data.data;
  }

  /** @type {RefSource & {details: (slug: string) => Promise<VideoDetails | null>}} */
  const src = {
    name: 'producthunt',
    enabled: !!token,
    disabledReason: token ? undefined : 'set PRODUCT_HUNT_TOKEN to enable (developer token: https://www.producthunt.com/v2/oauth/applications)',
    async search(opts) {
      const before = new Date();
      const after = opts.sinceDate ? new Date(opts.sinceDate) : new Date(before.getTime() - 30 * 86_400_000);
      const data = await gql(POSTS_QUERY, {after: after.toISOString(), before: before.toISOString(), first: 20, topic: opts.category ?? null});
      const q = tokens(opts.query);
      const posts = (data?.posts?.edges ?? []).map((/** @type {any} */ e) => e.node);
      return posts
        .map((/** @type {any} */ p) => ({p, score: matchScore(q, `${p.name} ${p.tagline} ${p.description ?? ''}`)}))
        .filter((/** @type {any} */ x) => q.length === 0 || x.score > 0)
        .sort((/** @type {any} */ a, /** @type {any} */ b) => b.score - a.score)
        .map((/** @type {any} */ x) => toReference(x.p))
        .filter((/** @type {Reference | null} */ r) => r !== null)
        .slice(0, opts.limit);
    },
    async details(slug) {
      const p = (await gql(POST_QUERY, {slug}))?.post;
      if (!p) return null;
      return {
        url: p.url,
        source: 'producthunt',
        title: `${p.name}: ${p.tagline ?? ''}`.replace(/: $/, ''),
        creator: creatorOf(p),
        publishedAt: isoOrNull(p.featuredAt ?? p.createdAt),
        durationSec: null,
        viewCount: null,
        description: [p.description, videoUrlOf(p) ? `Launch video: ${videoUrlOf(p)}` : null].filter(Boolean).join('\n'),
        tags: (p.topics?.edges ?? []).map((/** @type {any} */ e) => String(e.node?.name ?? '').toLowerCase()).filter(Boolean),
      };
    },
  };
  return src;
}
