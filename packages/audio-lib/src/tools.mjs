// Agent-facing tools: search_audio and fetch_audio. Transport-agnostic; the MCP
// server (mcp.mjs) and tests call these handlers directly.
import path from 'node:path';
import {LICENSES} from './licenses.mjs';
import {ROOT_DIR} from './library.mjs';

/** @typedef {import('./library.mjs').AudioLibrary} AudioLibrary */
/** @typedef {import('./types.mjs').AudioResult} AudioResult */

export const TOOLS = [
  {
    name: 'search_audio',
    description: [
      'Search free music and sound effects across Openverse, Freesound, Jamendo, the Internet Archive and local CC0 packs.',
      'Returns up to 10 compact results with license info. Pass a result id to fetch_audio to download it.',
      'Keep commercialUseOnly=true (the default) unless the user explicitly says the project is non-commercial:',
      'it keeps only CC0, public domain, CC BY and CC BY-SA, and drops NonCommercial, NoDerivatives and unknown licenses.',
      'Preview links can be shared with the user so they can listen before you download.',
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        query: {type: 'string', description: 'What it should sound like, e.g. "whoosh transition", "upbeat electronic"'},
        type: {type: 'string', enum: ['music', 'sfx'], description: 'music for tracks/beds, sfx for sound effects'},
        maxDurationSec: {type: 'number', minimum: 0},
        minDurationSec: {type: 'number', minimum: 0},
        licenses: {
          type: 'array',
          items: {type: 'string', enum: [...LICENSES]},
          description: 'Only return these normalized licenses',
        },
        commercialUseOnly: {type: 'boolean', default: true, description: 'Default true. Set false only if the user says the use is non-commercial.'},
        limit: {type: 'integer', minimum: 1, maximum: 10, default: 8},
      },
      required: ['query', 'type'],
      additionalProperties: false,
    },
  },
  {
    name: 'fetch_audio',
    description: [
      'Download a search_audio result by id. Saves the file plus a <file>.license.json sidecar and updates ATTRIBUTION.md/.json in the destination folder.',
      'Returns the local path and the ready-to-paste attribution line.',
      'ALWAYS show the attribution line and license to the user, and tell them when attribution is required',
      '(put it in the video description or credits). Warn the user if the license does not allow commercial use.',
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        id: {type: 'string', description: 'Result id from search_audio, e.g. "freesound:351256"'},
        destDir: {
          type: 'string',
          description: 'Absolute folder to save into, e.g. a Remotion project\'s public/audio/library. Defaults to AUDIO_DOWNLOAD_DIR, else the plugin data dir (or workspace/audio-library in a dev checkout).',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
];

/** @param {AudioResult} r */
const compact = (r) => ({
  id: r.id,
  title: r.title.slice(0, 100),
  creator: r.creator.slice(0, 60),
  provider: r.provider,
  durationSec: r.durationSec,
  license: r.license,
  commercialUse: r.allowsCommercialUse,
  attributionRequired: r.requiresAttribution,
  previewUrl: r.previewUrl,
  sourceUrl: r.sourceUrl,
});

/**
 * @param {AudioLibrary} lib
 * @param {Record<string, string | undefined>} [env]
 */
export function createToolHandlers(lib, env = process.env) {
  return {
    /** @param {any} a */
    async search_audio(a) {
      if (typeof a?.query !== 'string' || !a.query.trim()) throw new Error('query is required');
      const {results, warnings} = await lib.searchDetailed(a.query, {
        type: a.type,
        maxDurationSec: a.maxDurationSec,
        minDurationSec: a.minDurationSec,
        licenses: a.licenses,
        commercialUseOnly: a.commercialUseOnly !== false,
        limit: Math.min(Number(a.limit ?? 8) || 8, 10),
      });
      return {
        commercialUseOnly: a.commercialUseOnly !== false,
        count: results.length,
        results: results.map(compact),
        ...(warnings.length ? {warnings} : {}),
      };
    },
    /** @param {any} a */
    async fetch_audio(a) {
      if (typeof a?.id !== 'string') throw new Error('id is required');
      const result = await lib.getResult(a.id);
      if (!result) throw new Error(`Unknown id "${a.id}". Call search_audio first and use an id from its results.`);
      const fallback = env.CLAUDE_PLUGIN_DATA ? path.join(env.CLAUDE_PLUGIN_DATA, 'audio-library') : path.join(ROOT_DIR, 'workspace', 'audio-library');
      const destDir = path.resolve(a.destDir ?? env.AUDIO_DOWNLOAD_DIR ?? fallback);
      const file = await lib.download(result, destDir);
      return {
        path: file,
        license: result.license,
        licenseUrl: result.licenseUrl,
        allowsCommercialUse: result.allowsCommercialUse,
        requiresAttribution: result.requiresAttribution,
        attributionLine: result.attributionText,
        manifest: path.join(destDir, 'ATTRIBUTION.md'),
        note: result.allowsCommercialUse
          ? result.requiresAttribution
            ? 'Credit required: include the attribution line in the video description or credits.'
            : 'No attribution required, but crediting is good practice.'
          : 'WARNING: this license does not allow commercial use (or is unverified). Tell the user before using it.',
      };
    },
  };
}
