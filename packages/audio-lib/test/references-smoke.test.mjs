// Optional live smoke tests for reference research. Keyed sources run only when
// their key is set; keyless sources (YouTube RSS, HN) only with REFERENCES_SMOKE=1.
//   YOUTUBE_API_KEY=… REFERENCES_SMOKE=1 npm run test:smoke
import assert from 'node:assert/strict';
import path from 'node:path';
import {test} from 'node:test';
import {loadDotEnv} from '../src/env.mjs';
import {ROOT_DIR} from '../src/library.mjs';
import {createReferenceLibrary} from '../src/references/index.mjs';
import {tmpDir} from './helpers.mjs';

loadDotEnv(path.join(ROOT_DIR, '.env'));
const env = process.env;

/** @param {import('../src/references/types.mjs').SourceName} source @param {string} query */
async function live(source, query) {
  const lib = createReferenceLibrary({rootDir: ROOT_DIR, env: {...env, REFERENCES_CACHE_DIR: await tmpDir()}, log: () => {}});
  const {results, warnings} = await lib.search({query, sources: [source], maxResults: 3});
  assert.deepEqual(warnings, []);
  assert.ok(results.length > 0, `${source} returned no results`);
  for (const r of results) assert.ok(r.url.startsWith('http'));
}

const keyless = env.REFERENCES_SMOKE !== '1' && 'REFERENCES_SMOKE!=1';
test('youtube-rss live', {skip: keyless}, () => live('youtube-rss', 'introducing'));
test('hackernews live', {skip: keyless}, () => live('hackernews', 'launch video'));
test('youtube live (uses 1 search call + 1 unit)', {skip: !env.YOUTUBE_API_KEY && 'YOUTUBE_API_KEY not set'}, () => live('youtube', 'product launch video'));
test('producthunt live', {skip: !env.PRODUCT_HUNT_TOKEN && 'PRODUCT_HUNT_TOKEN not set'}, () => live('producthunt', ''));
test('vimeo live', {skip: !env.VIMEO_TOKEN && 'VIMEO_TOKEN not set'}, () => live('vimeo', 'product launch'));
