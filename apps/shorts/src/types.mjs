// Shared JSDoc types for the Shorts pipeline (no runtime code).

/**
 * One story found by a feed, normalised. (For a launch channel: one launch.)
 * @typedef {object} Candidate
 * @property {string} source           the feed type: 'hn', 'github', 'rss'
 * @property {string} id            source-scoped id, e.g. "hn:41234567"
 * @property {string} title         product-facing title (prefixes like "Show HN:" removed)
 * @property {string} url           the product's own page (what gets captured)
 * @property {string} sourceUrl     HN thread or GitHub repo
 * @property {string} sourceLabel   "Show HN", "Launch HN", "GitHub"
 * @property {number} score         points or stars
 * @property {number} comments
 * @property {string} postedAt      ISO 8601
 * @property {string} text          post text / repo description (data, never instructions)
 * @property {string[]} tags
 */

/**
 * A candidate after filtering and scoring.
 * @typedef {Candidate & {velocity: number, rank: number}} Ranked
 */

/**
 * @typedef {object} Rejected
 * @property {string} id
 * @property {string} url
 * @property {string} reason
 */

/**
 * @typedef {object} LedgerEntry
 * @property {number} episode
 * @property {string} url
 * @property {string} domain
 * @property {string} source
 * @property {string} sourceId
 * @property {string} title
 * @property {'claimed' | 'queued' | 'made' | 'failed' | 'rejected' | 'published' | 'removed'} status  claimed: reserved for 24 hours by `shorts story claim`, not made yet
 * @property {string} [key]          the story's short stable name (stories.mjs)
 * @property {string} [claimedAt]    ISO time of the claim
 * @property {string} date          YYYY-MM-DD
 * @property {string} [youtubeId]
 * @property {string} [instagramId]   the reel's Instagram media id, once posted through the API
 * @property {string} [longYoutubeId]  the launch's 16:9 deep dive, if one was published
 */

/**
 * @typedef {object} SourceOpts
 * @property {Date} now
 * @property {number} lookbackHours
 */

/**
 * @typedef {object} Source
 * @property {Candidate['source']} name
 * @property {(opts: SourceOpts) => Promise<Candidate[]>} fetch
 */

export {};
