// Agent-facing tools for launch-video reference research.
import {truncate} from './util.mjs';
import {SOURCE_NAMES} from './index.mjs';

/** @typedef {import('./index.mjs').ReferenceLibrary} ReferenceLibrary */
/** @typedef {import('./types.mjs').Reference} Reference */

export const REFERENCE_TOOLS = [
  {
    name: 'search_launch_references',
    description: [
      'Find real product launch videos to use as references. Searches the user\'s curated picks first, then official YouTube channel feeds',
      '(Linear, Vercel, Stripe, Figma, Raycast, Framer, Notion, Cursor), YouTube search, Product Hunt launches with videos, Vimeo (incl. Staff Picks) and Show HN / Launch HN.',
      'Returns compact metadata and links only (no video files). Sources without a configured key are skipped and listed in warnings.',
      'YouTube search has a small daily quota: prefer curated and youtube-rss first, and only add "youtube" when those are not enough.',
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        query: {type: 'string', description: 'e.g. "AI agent launch", "keyboard", "developer tool announcement"'},
        category: {type: 'string', description: 'Optional category, e.g. devtools, design-tools, hardware (curated category / Product Hunt topic slug)'},
        sources: {type: 'array', items: {type: 'string', enum: [...SOURCE_NAMES]}, description: 'Limit to these sources'},
        maxResults: {type: 'integer', minimum: 1, maximum: 25, default: 10},
        maxDurationSec: {type: 'number', minimum: 1, description: 'Drop videos known to be longer (unknown lengths are kept)'},
        sinceDate: {type: 'string', description: 'ISO date, e.g. 2026-01-01'},
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'analyze_reference',
    description: [
      'Structured notes on one launch video URL: length, hook, structure (chapters), pacing and tone, built only from official metadata,',
      'description chapters, curated notes and (when available) an official transcript. Fields that cannot be supported by evidence are "unknown";',
      'report them as unknown to the user and never guess. "basedOn" lists the evidence used.',
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {url: {type: 'string', description: 'YouTube, Vimeo, Product Hunt or Hacker News URL (others: curated notes only)'}},
      required: ['url'],
      additionalProperties: false,
    },
  },
  {
    name: 'save_reference',
    description:
      'Append a launch video to the user\'s curated references (curated.yaml) with your notes and tags. Title, company, length and date are filled from official metadata when available. Only save when the user asks or agrees.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {type: 'string'},
        notes: {type: 'string', description: 'What makes it a good reference. Prefix a line with "hook:" to record its opening.'},
        tags: {type: 'array', items: {type: 'string'}},
        category: {type: 'string'},
      },
      required: ['url'],
      additionalProperties: false,
    },
  },
  {
    name: 'build_launch_brief',
    description: [
      'Turn a product description and 3–5 analyzed reference URLs into a launch-video brief: suggested length, hook, scene structure on a beat grid,',
      'pacing (BPM), and music/SFX mood keywords ready for search_audio. Each value states its basis; "unknowns" lists what the references could not tell us.',
      'Present the brief to the user with the reference links.',
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        productDescription: {type: 'string'},
        referenceUrls: {type: 'array', items: {type: 'string'}, minItems: 1, maxItems: 10},
      },
      required: ['productDescription', 'referenceUrls'],
      additionalProperties: false,
    },
  },
];

/** @param {Reference} r */
const compact = (r) => ({
  id: r.id,
  source: r.source,
  title: truncate(r.title, 120),
  creator: truncate(r.creator, 60),
  url: r.url,
  publishedAt: r.publishedAt,
  durationSec: r.durationSec,
  ...(r.viewCount !== undefined ? {viewCount: r.viewCount} : {}),
  description: truncate(r.description.replace(/\s+/g, ' ').trim(), 200),
  tags: r.tags.slice(0, 8),
});

/** @param {ReferenceLibrary} lib */
export function createReferenceToolHandlers(lib) {
  return {
    /** @param {any} a */
    async search_launch_references(a) {
      if (typeof a?.query !== 'string') throw new Error('query is required');
      const {results, warnings} = await lib.search({...a, maxResults: Math.min(Number(a.maxResults ?? 10) || 10, 25)});
      return {count: results.length, results: results.map(compact), ...(warnings.length ? {warnings} : {})};
    },
    /** @param {any} a */
    async analyze_reference(a) {
      return lib.analyze(String(a?.url ?? ''));
    },
    /** @param {any} a */
    async save_reference(a) {
      return lib.save({url: String(a?.url ?? ''), notes: a?.notes, tags: Array.isArray(a?.tags) ? a.tags : [], category: a?.category});
    },
    /** @param {any} a */
    async build_launch_brief(a) {
      return lib.brief({productDescription: String(a?.productDescription ?? ''), referenceUrls: Array.isArray(a?.referenceUrls) ? a.referenceUrls.map(String) : []});
    },
  };
}
