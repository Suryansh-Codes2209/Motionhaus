import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {test} from 'node:test';
import {createJsonCache} from '../src/cache.mjs';
import {createHttp} from '../src/http.mjs';
import {createQuota} from '../src/references/quota.mjs';
import {createCurated} from '../src/references/sources/curated.mjs';
import {createHackerNews} from '../src/references/sources/hackernews.mjs';
import {createProductHunt} from '../src/references/sources/producthunt.mjs';
import {createVimeo} from '../src/references/sources/vimeo.mjs';
import {createYoutubeRss, parseFeed} from '../src/references/sources/youtube-rss.mjs';
import {createYoutube} from '../src/references/sources/youtube.mjs';
import {fetchTranscript} from '../src/references/transcript.mjs';
import {FEED, header, json, mockFetch, noSleep, tmpDir} from './helpers.mjs';

/** @param {typeof fetch} fetchImpl */
const httpFor = (fetchImpl) => createHttp({provider: 't', minIntervalMs: 0, fetchImpl, sleepFn: noSleep});
const base = {query: 'launch', limit: 10};
const log = () => {};

// --- curated ----------------------------------------------------------------

test('curated: searches seed + user file, user wins, appends without rewriting', async () => {
  const dir = await tmpDir();
  const seed = path.join(dir, 'seed.yaml');
  const user = path.join(dir, 'data', 'curated.yaml');
  await fs.writeFile(seed, '# my comment\n- title: "Seed launch"\n  url: "https://youtu.be/AAA"\n  category: "devtools"\n  length: 42\n  tags: ["keyboard"]\n');
  const c = createCurated({seedFile: seed, userFile: user, log});
  const [r] = await c.search({...base, query: 'keyboard'});
  assert.equal(r.id, 'curated:https://www.youtube.com/watch?v=AAA');
  assert.equal(r.durationSec, 42);
  assert.deepEqual(r.tags, ['devtools', 'keyboard']);
  assert.equal((await c.search({...base, query: 'launch', category: 'hardware'})).length, 0);

  // First save into a fresh data file copies the seed first, then appends.
  assert.deepEqual(await c.append({title: 'New', url: 'https://vimeo.com/1', tags: ['x'], notes: 'hook: big type'}), {file: user, added: true});
  const text = await fs.readFile(user, 'utf8');
  assert.ok(text.startsWith('# my comment'), 'existing content and comments are preserved');
  assert.match(text, /- title: "New"\n  url: "https:\/\/vimeo.com\/1"/);
  // Duplicates (same canonical URL) are not appended twice.
  assert.equal((await c.append({title: 'dup', url: 'https://youtube.com/watch?v=AAA'})).added, false);
  assert.equal((await c.all()).length, 2);
});

test('curated: refuses to append to a file it cannot parse; broken file is skipped in search', async () => {
  const dir = await tmpDir();
  const f = path.join(dir, 'c.yaml');
  await fs.writeFile(f, 'not: a list\n');
  /** @type {string[]} */
  const logs = [];
  const c = createCurated({seedFile: f, userFile: f, log: (m) => void logs.push(m)});
  assert.deepEqual(await c.search(base), []);
  assert.ok(logs.some((l) => /can't parse/.test(l)));
  await assert.rejects(c.append({title: 't', url: 'https://x.test/1'}), /line 1/);
  assert.equal(await fs.readFile(f, 'utf8'), 'not: a list\n');
});

// --- YouTube RSS ------------------------------------------------------------

test('youtube-rss: parses feeds, filters by query, caches feeds', async () => {
  assert.equal(parseFeed(FEED).length, 2);
  const [first] = parseFeed(FEED);
  assert.equal(first.title, 'Introducing coding sessions & more');
  assert.equal(first.viewCount, 16129);
  assert.equal(first.publishedAt, '2026-06-11T16:00:00.000Z');

  const dir = await tmpDir();
  const channelsFile = path.join(dir, 'channels.yaml');
  await fs.writeFile(channelsFile, '- name: "Linear"\n  channelId: "UCWivgq8xSp7QcXVyPHml-Aw"\n');
  const {fetchImpl, calls} = mockFetch([{match: /feeds\/videos\.xml\?channel_id=UCWivgq8xSp7QcXVyPHml-Aw/, reply: () => new Response(FEED)}]);
  const src = createYoutubeRss({channelsFile, http: httpFor(fetchImpl), cache: createJsonCache(path.join(dir, 'cache')), log});
  const rs = await src.search({...base, query: 'introducing'});
  assert.deepEqual(rs.map((r) => r.id), ['youtube-rss:rZk0QrxPpw8']);
  await src.search({...base, query: 'loops'});
  assert.equal(calls.length, 1, 'feed is cached');
});

// --- YouTube Data API -------------------------------------------------------

const ytVideo = {
  id: 'abc123',
  snippet: {title: 'Introducing X', channelTitle: 'Acme', publishedAt: '2026-05-01T00:00:00Z', description: '0:00 Hook\n0:05 Demo', tags: ['launch']},
  contentDetails: {duration: 'PT1M5S'},
  statistics: {viewCount: '1234'},
};

test('youtube: disabled without key', () => {
  const dirless = createQuota('/nonexistent/q.json', {search: 1, units: 1});
  const src = createYoutube({env: {}, http: httpFor(mockFetch([]).fetchImpl), quota: dirless});
  assert.equal(src.enabled, false);
  assert.match(String(src.disabledReason), /YOUTUBE_API_KEY/);
});

test('youtube: search + details, key in header, quota charged per call', async () => {
  const dir = await tmpDir();
  const quota = createQuota(path.join(dir, 'q.json'), {search: 100, units: 10000});
  const {fetchImpl, calls} = mockFetch([
    {match: /youtube\/v3\/search/, reply: () => json({items: [{id: {videoId: 'abc123'}}]})},
    {match: /youtube\/v3\/videos/, reply: () => json({items: [ytVideo]})},
  ]);
  const src = createYoutube({env: {YOUTUBE_API_KEY: 'K'}, http: httpFor(fetchImpl), quota});
  const [r] = await src.search({...base, sinceDate: '2026-01-01', maxDurationSec: 120});
  assert.equal(header(calls[0].init, 'x-goog-api-key'), 'K');
  assert.ok(!calls[0].url.includes('key='), 'key never in the URL');
  const sp = new URL(calls[0].url).searchParams;
  assert.equal(sp.get('videoDuration'), 'short');
  assert.equal(sp.get('publishedAfter'), '2026-01-01T00:00:00.000Z');
  assert.deepEqual(
    {id: r.id, durationSec: r.durationSec, viewCount: r.viewCount, creator: r.creator, url: r.url},
    {id: 'youtube:abc123', durationSec: 65, viewCount: 1234, creator: 'Acme', url: 'https://www.youtube.com/watch?v=abc123'},
  );
  assert.deepEqual(await quota.usage(), {day: (await quota.usage()).day, search: 1, units: 1});
  const d = await src.details('abc123');
  assert.equal(d?.description, ytVideo.snippet.description, 'details keep the full description');
});

test('youtube: refuses to call once the search quota is used up', async () => {
  const dir = await tmpDir();
  const quota = createQuota(path.join(dir, 'q.json'), {search: 0, units: 10000});
  const {fetchImpl, calls} = mockFetch([]);
  const src = createYoutube({env: {YOUTUBE_API_KEY: 'K'}, http: httpFor(fetchImpl), quota});
  await assert.rejects(src.search(base), /quota reached/);
  assert.equal(calls.length, 0);
});

// --- Product Hunt -----------------------------------------------------------

const phPost = (/** @type {object} */ o) => ({
  id: '1', name: 'Acme', slug: 'acme', tagline: 'Launch videos in seconds', description: 'Make a launch video', url: 'https://www.producthunt.com/posts/acme',
  website: 'https://acme.test', votesCount: 500, createdAt: '2026-09-01T07:00:00Z', featuredAt: '2026-09-01T07:00:00Z',
  makers: [{name: '[REDACTED]'}], topics: {edges: [{node: {name: 'Productivity'}}]},
  media: [{type: 'image', url: 'https://img'}, {type: 'video', url: 'https://thumb', videoUrl: 'https://www.youtube.com/watch?v=ph1'}],
  ...o,
});

test('producthunt: GraphQL with bearer token; only launches with video; redacted makers hidden', async () => {
  const {fetchImpl, calls} = mockFetch([
    {match: /api\.producthunt\.com\/v2\/api\/graphql/, reply: () => json({data: {posts: {edges: [{node: phPost({})}, {node: phPost({slug: 'novideo', media: []})}]}}})},
  ]);
  const src = createProductHunt({env: {PRODUCT_HUNT_TOKEN: 'T'}, http: httpFor(fetchImpl)});
  const rs = await src.search({...base, query: 'launch video', sinceDate: '2026-08-01'});
  assert.equal(header(calls[0].init, 'authorization'), 'Bearer T');
  const body = JSON.parse(String(calls[0].init.body));
  assert.match(body.query, /posts\(order: VOTES/);
  assert.equal(body.variables.after, '2026-08-01T00:00:00.000Z');
  assert.equal(rs.length, 1);
  assert.equal(rs[0].url, 'https://www.youtube.com/watch?v=ph1');
  assert.equal(rs[0].creator, 'Acme', 'redacted maker names are not shown');
  assert.deepEqual(rs[0].tags, ['product-hunt', 'productivity']);
  assert.equal(createProductHunt({env: {}, http: httpFor(fetchImpl)}).enabled, false);
});

test('producthunt: GraphQL errors surface', async () => {
  const {fetchImpl} = mockFetch([{match: /producthunt/, reply: () => json({errors: [{message: 'invalid_oauth_token'}]})}]);
  const src = createProductHunt({env: {PRODUCT_HUNT_TOKEN: 'bad'}, http: httpFor(fetchImpl)});
  await assert.rejects(src.search(base), /invalid_oauth_token/);
});

// --- Vimeo ------------------------------------------------------------------

const vimeoVideo = (/** @type {string} */ id) => ({
  uri: `/videos/${id}`, name: `Video ${id}`, description: 'A launch', link: `https://vimeo.com/${id}`, duration: 58,
  release_time: '2026-03-01T00:00:00+00:00', user: {name: 'Studio'}, stats: {plays: 99}, tags: [{name: 'motion'}],
});

test('vimeo: search + staff picks, bearer token and version header', async () => {
  const {fetchImpl, calls} = mockFetch([
    {match: /api\.vimeo\.com\/channels\/staffpicks\/videos/, reply: () => json({data: [vimeoVideo('2')]})},
    {match: /api\.vimeo\.com\/videos\?/, reply: () => json({data: [vimeoVideo('1'), vimeoVideo('2')]})},
  ]);
  const src = createVimeo({env: {VIMEO_TOKEN: 'V'}, http: httpFor(fetchImpl)});
  const rs = await src.search(base);
  assert.equal(header(calls[0].init, 'authorization'), 'bearer V');
  assert.match(String(header(calls[0].init, 'accept')), /version=3\.4/);
  assert.deepEqual(rs.map((r) => [r.id, r.tags[0]]), [['vimeo:2', 'staff-pick'], ['vimeo:1', 'motion']]);
  assert.equal(rs[1].durationSec, 58);
  assert.equal(rs[1].viewCount, 99);
  assert.equal(createVimeo({env: {}, http: httpFor(fetchImpl)}).enabled, false);
});

test('transcript: Vimeo text tracks via the API; YouTube reported unavailable; failures never throw', async () => {
  const {fetchImpl} = mockFetch([
    {match: /texttracks/, reply: () => json({data: [{language: 'en-US', link: 'https://captions.vimeo.test/1.vtt'}]})},
    {match: /captions\.vimeo\.test/, reply: () => new Response('WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nShip faster.\n')},
  ]);
  const http = httpFor(fetchImpl);
  const vimeo = createVimeo({env: {VIMEO_TOKEN: 'V'}, http});
  const t = await fetchTranscript('https://vimeo.com/123', {env: {}, vimeo, http});
  assert.equal(t.available, true);
  assert.equal(t.available && t.cues[0].text, 'Ship faster.');
  const yt = await fetchTranscript('https://youtu.be/x', {env: {}, vimeo, http});
  assert.equal(yt.available, false);
  const broken = await fetchTranscript('https://vimeo.com/123', {env: {}, vimeo: {enabled: true, textTracks: async () => { throw new Error('boom'); }}, http});
  assert.deepEqual(broken, {available: false, reason: 'transcript fetch failed: boom'});
  const off = await fetchTranscript('https://vimeo.com/123', {env: {REFERENCES_TRANSCRIPTS: '0'}, vimeo, http});
  assert.equal(off.available, false);
});

// --- Hacker News ------------------------------------------------------------

test('hackernews: Show HN / Launch HN search with date filter', async () => {
  const {fetchImpl, calls} = mockFetch([
    {match: /hn\.algolia\.com\/api\/v1\/search/, reply: () => json({hits: [{objectID: '9', title: 'Show HN: Acme', url: 'https://acme.test', author: 'pg', created_at: '2026-02-03T19:26:40Z', points: 40, num_comments: 5, story_text: 'Hi <p>we built &amp; shipped', _tags: ['story', 'show_hn']}]})},
  ]);
  const src = createHackerNews({http: httpFor(fetchImpl)});
  const [r] = await src.search({...base, sinceDate: '2026-01-01'});
  const sp = new URL(calls[0].url).searchParams;
  assert.equal(sp.get('tags'), '(show_hn,launch_hn)');
  assert.equal(sp.get('numericFilters'), `created_at_i>${Date.UTC(2026, 0, 1) / 1000}`);
  assert.equal(r.url, 'https://acme.test');
  assert.equal(r.description, 'Hi we built & shipped');
  assert.ok(r.tags.includes('show-hn') && r.tags.includes('points:40'));
});
