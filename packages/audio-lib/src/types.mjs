// Shared JSDoc types for the audio library (no runtime code).

/** @typedef {'CC0' | 'PD' | 'CC-BY' | 'CC-BY-SA' | 'CC-BY-NC' | 'CC-BY-ND' | 'unknown'} License */
/** @typedef {'music' | 'sfx'} AudioType */

/**
 * @typedef {object} AudioResult
 * @property {string} id               `<provider>:<native id>`, stable across runs
 * @property {string} provider
 * @property {string} title
 * @property {string} creator
 * @property {number | null} durationSec
 * @property {string | null} previewUrl
 * @property {string | null} downloadUrl
 * @property {License} license
 * @property {string | null} licenseUrl
 * @property {string} attributionText
 * @property {boolean} requiresAttribution
 * @property {boolean} allowsCommercialUse
 * @property {string | null} sourceUrl
 */

/**
 * @typedef {object} SearchOptions
 * @property {AudioType} type
 * @property {number} [maxDurationSec]
 * @property {number} [minDurationSec]
 * @property {License[]} [licenses]
 * @property {boolean} [commercialUseOnly]
 * @property {number} [limit]
 */

/**
 * @typedef {object} ProviderSearchOptions
 * @property {AudioType} type
 * @property {number} [maxDurationSec]
 * @property {number} [minDurationSec]
 * @property {boolean} commercialUseOnly
 * @property {number} limit            how many to ask the provider for (already over-fetched)
 */

/**
 * @typedef {object} Provider
 * @property {string} name
 * @property {boolean} enabled
 * @property {string} [disabledReason]
 * @property {AudioType[]} types          which search types this provider serves
 * @property {boolean} [offlineCapable]   true for local packs
 * @property {(query: string, opts: ProviderSearchOptions) => Promise<AudioResult[]>} search
 * @property {(result: AudioResult) => Promise<Record<string, string>>} [downloadHeaders]
 * @property {(result: AudioResult, destPath: string) => Promise<void>} [copyTo] local providers copy instead of fetching
 */

/** @typedef {(msg: string) => void} Logger */

export {};
