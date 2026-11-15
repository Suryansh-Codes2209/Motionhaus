// Optional live smoke test. Skipped unless the provider's key is present:
//   FREESOUND_API_KEY=… JAMENDO_CLIENT_ID=… npm run test:smoke
// Openverse/Internet Archive need no key; they run only with AUDIO_SMOKE=1.
import assert from 'node:assert/strict';
import path from 'node:path';
import {test} from 'node:test';
import {loadDotEnv} from '../src/env.mjs';
import {createAudioLibrary, ROOT_DIR} from '../src/library.mjs';
import {tmpDir} from './helpers.mjs';

loadDotEnv(path.join(ROOT_DIR, '.env'));
const env = process.env;

/** @param {string} provider @param {'music' | 'sfx'} type @param {string} query */
async function live(provider, type, query) {
  const lib = createAudioLibrary({env: {...env, AUDIO_PROVIDERS: provider}, cacheDir: await tmpDir(), log: () => {}});
  const {results, warnings} = await lib.searchDetailed(query, {type, limit: 3});
  assert.deepEqual(warnings.filter((w) => w.startsWith(provider)), []);
  assert.ok(results.length > 0, `${provider} returned no results`);
  for (const r of results) {
    assert.equal(r.provider, provider);
    assert.ok(r.attributionText.length > 0);
  }
}

test('freesound live', {skip: !env.FREESOUND_API_KEY && 'FREESOUND_API_KEY not set'}, () => live('freesound', 'sfx', 'whoosh'));
test('jamendo live', {skip: !env.JAMENDO_CLIENT_ID && 'JAMENDO_CLIENT_ID not set'}, () => live('jamendo', 'music', 'electronic'));
test('openverse live', {skip: env.AUDIO_SMOKE !== '1' && 'AUDIO_SMOKE!=1'}, () => live('openverse', 'sfx', 'whoosh'));
test('archive live', {skip: env.AUDIO_SMOKE !== '1' && 'AUDIO_SMOKE!=1'}, () => live('archive', 'music', 'piano'));
