// Shared JSDoc types for launch-video reference research (no runtime code).

/** @typedef {'curated' | 'youtube-rss' | 'youtube' | 'producthunt' | 'vimeo' | 'hackernews'} SourceName */

/**
 * @typedef {object} Reference
 * @property {string} id               `<source>:<native id>`
 * @property {SourceName} source
 * @property {string} title
 * @property {string} creator
 * @property {string} url
 * @property {string | null} publishedAt  ISO 8601
 * @property {number | null} durationSec
 * @property {number} [viewCount]
 * @property {string} description
 * @property {string[]} tags
 */

/**
 * @typedef {object} RefSearchOptions
 * @property {string} query
 * @property {string} [category]
 * @property {number} limit            how many to ask the source for
 * @property {number} [maxDurationSec]
 * @property {string} [sinceDate]      ISO date
 */

/**
 * Everything a source knows about one video, for analyze_reference.
 * @typedef {object} VideoDetails
 * @property {string} url
 * @property {SourceName | 'oembed'} source
 * @property {string | null} title
 * @property {string | null} creator
 * @property {string | null} publishedAt
 * @property {number | null} durationSec
 * @property {number | null} viewCount
 * @property {string | null} description
 * @property {string[]} tags
 */

/**
 * @typedef {object} RefSource
 * @property {SourceName} name
 * @property {boolean} enabled
 * @property {string} [disabledReason]
 * @property {(opts: RefSearchOptions) => Promise<Reference[]>} search
 */

export {};
