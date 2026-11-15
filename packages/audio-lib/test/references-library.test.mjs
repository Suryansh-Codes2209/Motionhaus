import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {test} from 'node:test';
import {createDispatcher} from '../src/mcp.mjs';
import {createReferenceLibrary, referencePaths} from '../src/references/index.mjs';
import {createReferenceToolHandlers, REFERENCE_TOOLS} from '../src/references/tools.mjs';
import {FEED, json, mockFetch, noSleep, tmpDir} from './helpers.mjs';

/** A fake plugin root with references/ files. */
async function makeRoot() {
  const root = await tmpDir();
  await fs.mkdir(path.join(root, 'references'));
  await fs.writeFile(path.join(root, 'references', 'curated.yaml'),
    '- title: "Curated keyboard launch"\n  url: "https://www.youtube.com/watch?v=CUR1"\n  company: "Raycast"\n  category: "hardware"\n  length: 50\n  notes: "hook: close-up of a keycap"\n  tags: ["launch"]\n');
  await fs.writeFile(path.join(root, 'references', 'channels.yaml'), '- name: "Linear"\n  channelId: "UCWivgq8xSp7QcXVyPHml-Aw"\n');
  return root;
}

/** @param {Record<string, string>} [env] */
async function setup(env = {}) {
  const root = await makeRoot();
  /** @type {string[]} */
  const logs = [];
  const {fetchImpl, calls} = mockFetch([
    {match: /feeds\/videos\.xml/, reply: () => new Response(FEED)},
    {match: /hn\.algolia\.com\/api\/v1\/search/, reply: () => json({hits: [{objectID: '1', title: 'Show HN: launch kit', url: 'https://kit.test', author: 'a', created_at: '2026-05-01T00:00:00Z', points: 3, _tags: ['show_hn']}]})},
    {match: /hn\.algolia\.com\/api\/v1\/items\/77/, reply: () => json({id: 77, title: 'Launch HN: Acme', author: 'b', created_at: '2026-04-01T00:00:00Z', url: 'https://acme.test', text: 'We launched'})},
    {match: /youtube\.com\/oembed/, reply: () => json({title: 'oEmbed title', author_name: 'Someone'})},
    {match: /vimeo\.com\/api\/oembed/, reply: () => json({title: 'Vimeo film', author_name: 'Studio', duration: 42, description: '0:00 Problem\n0:10 Product\n0:30 CTA', upload_date: '2026-01-02 10:00:00'})},
  ]);
  const lib = createReferenceLibrary({rootDir: root, env: {REFERENCES_CACHE_DIR: path.join(root, 'cache'), ...env}, fetchImpl, sleepFn: noSleep, log: (m) => void logs.push(m)});
  return {lib, calls, logs, root};
}

test('paths: state goes to CLAUDE_PLUGIN_DATA; curated.yaml stays in a dev checkout, moves for installed copies', () => {
  const dev = referencePaths('/src/launchreel', {CLAUDE_PLUGIN_DATA: '/data'});
  assert.equal(dev.cacheDir, '/data/references');
  assert.equal(dev.userFile, '/src/launchreel/references/curated.yaml');
  const installed = referencePaths('/Users/x/.claude/plugins/cache/mkt/launchreel/0.2.0', {CLAUDE_PLUGIN_DATA: '/data'});
  assert.equal(installed.userFile, '/data/curated.yaml');
  assert.equal(installed.seedFile, '/Users/x/.claude/plugins/cache/mkt/launchreel/0.2.0/references/curated.yaml');
  assert.equal(referencePaths('/r', {LAUNCHREEL_REFERENCES_FILE: '/mine.yaml'}).userFile, '/mine.yaml');
});

test('missing keys disable only those sources, with a clear log', async () => {
  const {lib, logs} = await setup();
  for (const name of ['youtube', 'producthunt', 'vimeo']) assert.ok(logs.some((l) => l.startsWith(`${name} disabled: set `)), name);
  const {results, warnings} = await lib.search({query: 'launch'});
  assert.equal(results[0].source, 'curated', 'curated results come first');
  assert.ok(results.some((r) => r.source === 'youtube-rss'));
  assert.ok(results.some((r) => r.source === 'hackernews'));
  assert.ok(warnings.some((w) => /youtube disabled/.test(w)));
});

test('search: source selection, filters, caching, validation', async () => {
  const {lib, calls} = await setup();
  const onlyHn = await lib.search({query: 'launch', sources: ['hackernews']});
  assert.deepEqual(onlyHn.results.map((r) => r.source), ['hackernews']);
  await lib.search({query: 'Launch ', sources: ['hackernews']});
  assert.equal(calls.filter((c) => c.url.includes('algolia')).length, 1, 'search results cached');

  const short = await lib.search({query: 'launch', sources: ['curated'], maxDurationSec: 30});
  assert.equal(short.results.length, 0, 'curated item is 50s');
  const recent = await lib.search({query: 'introducing', sources: ['youtube-rss'], sinceDate: '2026-07-01'});
  assert.equal(recent.results.length, 0, 'RSS entry is from June');
  await assert.rejects(lib.search({query: 'x', sources: /** @type {any} */ (['tiktok'])}), /unknown source/);
  await assert.rejects(lib.search({query: 'x', sinceDate: 'yesterday'}), /ISO date/);
});

test('network failures degrade to the remaining sources', async () => {
  const root = await makeRoot();
  const {fetchImpl} = mockFetch([]); // everything unreachable
  const lib = createReferenceLibrary({rootDir: root, env: {REFERENCES_CACHE_DIR: path.join(root, 'c')}, fetchImpl, sleepFn: noSleep, log: () => {}});
  const {results, warnings} = await lib.search({query: 'keyboard'});
  assert.deepEqual(results.map((r) => r.source), ['curated']);
  assert.ok(warnings.some((w) => /hackernews failed/.test(w)));
});

test('analyze: YouTube without a key falls back to RSS metadata; unknowns stay unknown', async () => {
  const {lib} = await setup();
  const n = await lib.analyze('https://youtu.be/rZk0QrxPpw8');
  assert.equal(n.title, 'Introducing coding sessions & more');
  assert.equal(n.viewCount, 16129);
  assert.equal(n.durationSec, 'unknown', 'RSS has no duration and we do not guess');
  assert.equal(n.length, 'unknown');
  assert.equal(n.transcript.available, false);
  assert.ok(n.basedOn.includes('metadata (youtube-rss)'));
});

test('analyze: Vimeo via oEmbed gives length + chapters; curated notes give the hook', async () => {
  const {lib} = await setup();
  const v = await lib.analyze('https://vimeo.com/555');
  assert.deepEqual(v.length, {seconds: 42, bucket: 'short (31–60s)'});
  assert.equal(v.hook !== 'unknown' && v.hook.text, 'Problem');
  assert.equal(Array.isArray(v.structure) && v.structure.length, 3);
  const c = await lib.analyze('https://www.youtube.com/watch?v=CUR1');
  assert.deepEqual(c.hook, {text: 'close-up of a keycap', basis: 'curated notes'});
  assert.equal(c.durationSec, 50);
  const hn = await lib.analyze('https://news.ycombinator.com/item?id=77');
  assert.equal(hn.title, 'Launch HN: Acme');
  const other = await lib.analyze('https://example.com/launch');
  assert.equal(other.title, 'unknown');
  assert.ok(other.warnings.some((w) => /no official metadata API/.test(w)));
  await assert.rejects(lib.analyze('ftp://x'), /http/);
});

test('save_reference appends to curated.yaml with confirmed metadata only', async () => {
  const {lib, root} = await setup();
  const res = await lib.save({url: 'https://vimeo.com/555', notes: 'Great cold open', tags: ['film']});
  assert.equal(res.added, true);
  const text = await fs.readFile(path.join(root, 'references', 'curated.yaml'), 'utf8');
  assert.match(text, /- title: "Vimeo film"\n  url: "https:\/\/vimeo.com\/555"\n  company: "Studio"\n  length: 42\n  notes: "Great cold open"\n  tags: \["film"\]/);
  assert.equal((await lib.save({url: 'https://vimeo.com/555'})).added, false);
  // The new entry is now searchable.
  assert.equal((await lib.search({query: 'vimeo film', sources: ['curated']})).results.length, 1);
});

test('build_launch_brief: combines analyses and reports failures', async () => {
  const {lib} = await setup();
  const b = await lib.brief({productDescription: 'A calm notes app for teams.', referenceUrls: ['https://vimeo.com/555', 'https://www.youtube.com/watch?v=CUR1', 'ftp://bad']});
  assert.equal(b.references.length, 2);
  assert.equal(b.suggestedLength.seconds, 46);
  assert.equal(b.failedReferences?.length, 1);
  assert.ok(b.sceneStructure.length >= 5);
  await assert.rejects(lib.brief({productDescription: ' ', referenceUrls: []}), /productDescription/);
});

test('MCP: reference tools are listed and callable alongside the audio tools', async () => {
  const {lib} = await setup();
  const dispatch = createDispatcher(createReferenceToolHandlers(lib), REFERENCE_TOOLS);
  const list = /** @type {any} */ (await dispatch({jsonrpc: '2.0', id: 1, method: 'tools/list'}));
  assert.deepEqual(list.result.tools.map((/** @type {any} */ t) => t.name), ['search_launch_references', 'analyze_reference', 'save_reference', 'build_launch_brief']);
  const res = /** @type {any} */ (await dispatch({jsonrpc: '2.0', id: 2, method: 'tools/call', params: {name: 'search_launch_references', arguments: {query: 'launch', maxResults: 2}}}));
  assert.equal(res.result.structuredContent.count, 2);
  for (const r of res.result.structuredContent.results) {
    for (const k of ['id', 'source', 'title', 'creator', 'url', 'publishedAt', 'durationSec', 'description', 'tags']) assert.ok(k in r, k);
    assert.ok(r.description.length <= 200);
  }
  const bad = /** @type {any} */ (await dispatch({jsonrpc: '2.0', id: 3, method: 'tools/call', params: {name: 'analyze_reference', arguments: {url: 'nope'}}}));
  assert.equal(bad.result.isError, true);
  const proto = /** @type {any} */ (await dispatch({jsonrpc: '2.0', id: 4, method: 'tools/call', params: {name: 'toString', arguments: {}}}));
  assert.equal(proto.error.code, -32602, 'prototype keys are not tools');
});
