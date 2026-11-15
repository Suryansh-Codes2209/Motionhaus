import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {test} from 'node:test';
import {createAudioLibrary} from '../src/library.mjs';
import {createDispatcher} from '../src/mcp.mjs';
import {createToolHandlers} from '../src/tools.mjs';
import {audio, json, mockFetch, noSleep, tmpDir, wavBytes} from './helpers.mjs';

const ov = (/** @type {string} */ id, /** @type {string} */ license) => ({
  id,
  title: `Sound ${id}`,
  creator: 'Creator',
  foreign_landing_url: `https://example.org/${id}`,
  url: `https://cdn.example.org/${id}.mp3`,
  license,
  license_version: '4.0',
  duration: 2000,
});

/** @param {Partial<Parameters<typeof createAudioLibrary>[0]>} [extra] */
async function setup(extra = {}) {
  const root = await tmpDir();
  /** @type {string[]} */
  const logs = [];
  const {fetchImpl, calls} = mockFetch([
    {match: /api\.openverse\.org\/v1\/audio/, reply: () => json({results: [ov('a', 'cc0'), ov('b', 'by-nc'), ov('c', 'by'), ov('d', 'sampling+')]})},
    {match: /cdn\.example\.org/, reply: () => audio()},
  ]);
  const lib = createAudioLibrary({
    env: {AUDIO_PROVIDERS: 'openverse,freesound,jamendo,local'},
    cacheDir: path.join(root, 'cache'),
    packsDir: path.join(root, 'packs'),
    fetchImpl,
    sleepFn: noSleep,
    log: (m) => void logs.push(m),
    ...extra,
  });
  return {lib, calls, logs, root};
}

test('missing keys disable only their provider, with a clear log', async () => {
  const {lib, logs} = await setup();
  assert.ok(logs.some((l) => /freesound disabled: set FREESOUND_API_KEY/.test(l)));
  assert.ok(logs.some((l) => /jamendo disabled: set JAMENDO_CLIENT_ID/.test(l)));
  const {results, warnings} = await lib.searchDetailed('whoosh', {type: 'sfx'});
  assert.equal(results.length, 4);
  assert.ok(warnings.some((w) => /freesound disabled/.test(w)));
});

test('commercialUseOnly excludes NC and unknown licenses', async () => {
  const {lib} = await setup();
  const rs = await lib.search('whoosh', {type: 'sfx', commercialUseOnly: true});
  assert.deepEqual(rs.map((r) => r.id), ['openverse:a', 'openverse:c']);
  assert.ok(rs.every((r) => r.allowsCommercialUse));
});

test('duration filters and limit apply', async () => {
  const {lib} = await setup();
  assert.equal((await lib.search('x', {type: 'sfx', maxDurationSec: 1})).length, 0);
  assert.equal((await lib.search('x', {type: 'sfx', limit: 2})).length, 2);
  await assert.rejects(lib.search('x', /** @type {any} */ ({type: 'video'})), /music" or "sfx/);
});

test('search results are cached on disk', async () => {
  const {lib, calls} = await setup();
  await lib.search('rain', {type: 'sfx'});
  await lib.search('Rain ', {type: 'sfx'});
  assert.equal(calls.length, 1);
});

test('unreachable providers degrade; local packs keep working offline', async () => {
  const root = await tmpDir();
  await fs.mkdir(path.join(root, 'packs', 'kenney'), {recursive: true});
  await fs.writeFile(path.join(root, 'packs', 'kenney', 'License.txt'), 'Creative Commons Zero, CC0');
  await fs.writeFile(path.join(root, 'packs', 'kenney', 'whoosh_1.wav'), wavBytes(1));
  /** @type {string[]} */
  const logs = [];
  const {fetchImpl, calls} = mockFetch([]); // every network call fails like a blocked egress
  const lib = createAudioLibrary({
    env: {},
    cacheDir: path.join(root, 'cache'),
    packsDir: path.join(root, 'packs'),
    fetchImpl,
    sleepFn: noSleep,
    log: (m) => void logs.push(m),
  });
  const first = await lib.searchDetailed('whoosh', {type: 'sfx', commercialUseOnly: true});
  assert.deepEqual(first.results.map((r) => r.id), ['local:kenney/whoosh_1.wav']);
  assert.ok(first.warnings.some((w) => /openverse failed/.test(w)));
  assert.ok(logs.some((l) => /openverse unreachable/.test(l)));

  // Within the cooldown the dead provider is not retried.
  const n = calls.length;
  const second = await lib.searchDetailed('whoosh', {type: 'sfx'});
  assert.equal(calls.length, n);
  assert.ok(second.warnings.some((w) => /skipped/.test(w)));

  // And the local file downloads (copies) without network.
  const dest = path.join(root, 'project');
  const file = await lib.download(first.results[0], dest);
  assert.equal((await fs.readFile(file)).length, wavBytes(1).length);
});

test('download writes the file, a license sidecar and the manifest; dedupes by provider+id', async () => {
  const {lib, calls, root} = await setup();
  const [r] = await lib.search('whoosh', {type: 'sfx', commercialUseOnly: true});
  const dest = path.join(root, 'public', 'audio');
  const file = await lib.download(r, dest);
  assert.match(path.basename(file), /^sound-a-openverse-[0-9a-f]{8}\.mp3$/);
  const sidecar = JSON.parse(await fs.readFile(`${file}.license.json`, 'utf8'));
  for (const k of ['id', 'provider', 'title', 'creator', 'durationSec', 'previewUrl', 'downloadUrl', 'license', 'licenseUrl',
    'attributionText', 'requiresAttribution', 'allowsCommercialUse', 'sourceUrl']) {
    assert.ok(k in sidecar, `sidecar missing ${k}`);
  }
  assert.equal(sidecar.license, 'CC0');

  const downloadsBefore = calls.filter((c) => c.url.includes('cdn.example.org')).length;
  const other = path.join(root, 'other-project');
  await lib.download(r, dest);
  await lib.download(r, other);
  assert.equal(calls.filter((c) => c.url.includes('cdn.example.org')).length, downloadsBefore, 'second download must hit the cache');

  const manifest = JSON.parse(await fs.readFile(path.join(dest, 'ATTRIBUTION.json'), 'utf8'));
  assert.equal(manifest.entries.length, 1);
  assert.match(await fs.readFile(path.join(dest, 'ATTRIBUTION.md'), 'utf8'), /## Sound a/);
  assert.match(await lib.exportAttribution(dest), /^Music & sound effects:\n- "Sound a" by Creator/);
  assert.match(await lib.exportAttribution(other, 'markdown'), /Sound a/);
});

test('tools: search_audio defaults to commercial-only and is compact; fetch_audio returns attribution', async () => {
  const {lib, root} = await setup();
  const tools = createToolHandlers(lib, {});
  const out = await tools.search_audio({query: 'whoosh', type: 'sfx', limit: 50});
  assert.equal(out.commercialUseOnly, true);
  assert.deepEqual(out.results.map((r) => r.id), ['openverse:a', 'openverse:c']);
  assert.ok(!('downloadUrl' in out.results[0]));
  const any = await tools.search_audio({query: 'whoosh', type: 'sfx', commercialUseOnly: false});
  assert.equal(any.count, 4);

  const fetched = await tools.fetch_audio({id: 'openverse:c', destDir: path.join(root, 'p')});
  assert.match(fetched.attributionLine, /licensed under CC BY 4\.0/);
  assert.equal(fetched.requiresAttribution, true);
  const nc = await tools.fetch_audio({id: 'openverse:b', destDir: path.join(root, 'p')});
  assert.match(nc.note, /WARNING/);
  await assert.rejects(tools.fetch_audio({id: 'openverse:nope'}), /Call search_audio first/);
});

test('fetch_audio works across restarts via the result store', async () => {
  const {lib, root} = await setup();
  await lib.search('whoosh', {type: 'sfx'});
  const again = createAudioLibrary({env: {}, cacheDir: path.join(root, 'cache'), packsDir: path.join(root, 'packs'), log: () => {}});
  assert.equal((await again.getResult('openverse:a'))?.title, 'Sound a');
});

test('mcp dispatcher speaks JSON-RPC', async () => {
  const {lib} = await setup();
  const dispatch = createDispatcher(createToolHandlers(lib, {}));
  const init = /** @type {any} */ (await dispatch({jsonrpc: '2.0', id: 1, method: 'initialize', params: {protocolVersion: '2025-06-18'}}));
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.equal(await dispatch({jsonrpc: '2.0', method: 'notifications/initialized'}), null);
  const list = /** @type {any} */ (await dispatch({jsonrpc: '2.0', id: 2, method: 'tools/list'}));
  assert.deepEqual(list.result.tools.map((/** @type {any} */ t) => t.name), ['search_audio', 'fetch_audio']);
  const call = /** @type {any} */ (await dispatch({jsonrpc: '2.0', id: 3, method: 'tools/call', params: {name: 'search_audio', arguments: {query: 'x', type: 'sfx'}}}));
  assert.equal(call.result.structuredContent.count, 2);
  const bad = /** @type {any} */ (await dispatch({jsonrpc: '2.0', id: 4, method: 'tools/call', params: {name: 'fetch_audio', arguments: {id: 'zzz'}}}));
  assert.equal(bad.result.isError, true);
  const unknown = /** @type {any} */ (await dispatch({jsonrpc: '2.0', id: 5, method: 'nope'}));
  assert.equal(unknown.error.code, -32601);
});
