import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {test} from 'node:test';
import {analyzeDetails, detectTone, lengthBucket, parseChapters, UNKNOWN} from '../src/references/analyze.mjs';
import {buildBrief} from '../src/references/brief.mjs';
import {createQuota, pacificDay, QuotaError} from '../src/references/quota.mjs';
import {parseVtt} from '../src/references/transcript.mjs';
import {canonicalUrl, classifyUrl, matchScore, parseIsoDuration, tokens} from '../src/references/util.mjs';
import {dumpYamlItem, parseYamlList, YamlError} from '../src/references/yaml.mjs';
import {tmpDir} from './helpers.mjs';

// --- YAML subset ------------------------------------------------------------

test('yaml: parses the curated format', () => {
  const items = parseYamlList(`# comment
- title: "Intro: \\"quoted\\""
  url: https://youtu.be/abc#t=1   # trailing comment
  length: 45
  live: false
  tags: [launch, "two words", 'it''s']
  notes: |
    hook: cold open on the UI
    second line

-
  title: Block list
  url: 'https://vimeo.com/123'
  tags:
    - a
    - b
  folded: >
    one
    two
`);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    title: 'Intro: "quoted"',
    url: 'https://youtu.be/abc#t=1',
    length: 45,
    live: false,
    tags: ['launch', 'two words', "it's"],
    notes: 'hook: cold open on the UI\nsecond line',
  });
  assert.deepEqual(items[1], {title: 'Block list', url: 'https://vimeo.com/123', tags: ['a', 'b'], folded: 'one two'});
});

test('yaml: dump round-trips', () => {
  const item = {title: 'He said "hi": ok', url: 'https://x.test/?a=1#b', length: 30, tags: ['a', 'b c'], notes: 'line1\nline2'};
  assert.deepEqual(parseYamlList(dumpYamlItem(item) + '\n' + dumpYamlItem({title: 'x', url: 'y'})), [item, {title: 'x', url: 'y'}]);
});

test('yaml: rejects unsupported syntax with a line number', () => {
  assert.throws(() => parseYamlList('title: x\n'), (e) => e instanceof YamlError && e.line === 1);
  assert.throws(() => parseYamlList('- a: 1\n    b: 2\n'), /line 2: unexpected indentation/);
  assert.throws(() => parseYamlList('- a: {x: 1}\n'), /unsupported/);
  assert.throws(() => parseYamlList('- a: 1\n  a: 2\n'), /duplicate key/);
  assert.throws(() => parseYamlList('- a: "unterminated\n'), /bad double-quoted/);
});

// --- normalization helpers --------------------------------------------------

test('util: URL classification and canonical form', () => {
  assert.deepEqual(classifyUrl('https://youtu.be/rZk0QrxPpw8?t=3'), {kind: 'youtube', id: 'rZk0QrxPpw8'});
  assert.deepEqual(classifyUrl('https://www.youtube.com/shorts/abcdefgh'), {kind: 'youtube', id: 'abcdefgh'});
  assert.deepEqual(classifyUrl('https://m.youtube.com/watch?v=X1&list=y'), {kind: 'youtube', id: 'X1'});
  assert.deepEqual(classifyUrl('https://vimeo.com/channels/staffpicks/76979871'), {kind: 'vimeo', id: '76979871'});
  assert.deepEqual(classifyUrl('https://www.producthunt.com/posts/raycast-2'), {kind: 'producthunt', id: 'raycast-2'});
  assert.deepEqual(classifyUrl('https://news.ycombinator.com/item?id=42'), {kind: 'hackernews', id: '42'});
  assert.equal(classifyUrl('not a url').kind, 'other');
  assert.equal(canonicalUrl('https://youtu.be/abc?si=x'), 'https://www.youtube.com/watch?v=abc');
  assert.equal(canonicalUrl('https://example.com/a/'), 'https://example.com/a');
});

test('util: durations, tokens, matching', () => {
  assert.equal(parseIsoDuration('PT1M30S'), 90);
  assert.equal(parseIsoDuration('PT2H'), 7200);
  assert.equal(parseIsoDuration('P0D'), null);
  assert.equal(parseIsoDuration('garbage'), null);
  assert.deepEqual(tokens('The AI-agent launch video'), ['ai', 'agent', 'launch']);
  assert.equal(matchScore(['launch', 'agent'], 'Introducing agents for launches'), 2);
});

// --- analysis ---------------------------------------------------------------

test('analyze: chapters from descriptions', () => {
  const ch = parseChapters('Intro text\n0:00 Cold open\n0:08 – The problem\n(0:21) Demo\n1:02 Pricing\nfooter', 75);
  assert.deepEqual(ch, [
    {start: 0, end: 8, title: 'Cold open'},
    {start: 8, end: 21, title: 'The problem'},
    {start: 21, end: 62, title: 'Demo'},
    {start: 62, end: 75, title: 'Pricing'},
  ]);
  assert.equal(parseChapters('0:30 Not from zero\n0:40 Second', 60), null);
  assert.equal(parseChapters('0:00 Only one', 60), null);
  assert.equal(parseChapters(null, 60), null);
});

test('analyze: everything unknown without evidence (no fabrication)', () => {
  const n = analyzeDetails({url: 'https://x.test/v', details: null, transcript: {available: false, reason: 'n/a'}});
  for (const k of /** @type {const} */ (['title', 'creator', 'publishedAt', 'durationSec', 'viewCount', 'length', 'hook', 'structure', 'pacing', 'tone'])) {
    assert.equal(n[k], UNKNOWN, k);
  }
  assert.deepEqual(n.basedOn, []);
});

test('analyze: uses metadata, chapters, curated notes and transcript with stated basis', () => {
  const details = {
    url: 'u', source: /** @type {const} */ ('youtube'), title: 'Introducing Agents', creator: 'Acme', publishedAt: '2026-01-01T00:00:00.000Z',
    durationSec: 60, viewCount: 1000, description: '0:00 Intro\n0:10 Faster than ever\n0:40 Get started', tags: ['ai'],
  };
  const a = analyzeDetails({url: 'u', details, transcript: {available: false, reason: 'x'}});
  assert.deepEqual(a.length, {seconds: 60, bucket: 'short (31–60s)'});
  assert.equal(a.hook, UNKNOWN, 'a generic "Intro" chapter is not a hook');
  assert.deepEqual(a.pacing, {sections: 3, medianSectionSec: 20, basis: 'description chapters'});
  assert.ok(a.tone !== UNKNOWN && a.tone.labels.includes('futuristic') && a.tone.labels.includes('energetic'));

  const withNotes = analyzeDetails({url: 'u', details, curated: {title: 't', url: 'u', notes: 'hook: black screen, one word'}, transcript: {available: false, reason: 'x'}});
  assert.deepEqual(withNotes.hook, {text: 'black screen, one word', basis: 'curated notes'});

  const withTranscript = analyzeDetails({
    url: 'u', details, transcript: {available: true, language: 'en', source: 'vimeo-texttracks', cues: [{start: 0.5, end: 2, text: 'Meetings are broken.'}, {start: 8, end: 9, text: 'later'}]},
  });
  assert.deepEqual(withTranscript.hook, {text: 'Meetings are broken.', basis: 'transcript, first 5 seconds'});
  assert.ok(withTranscript.basedOn.includes('transcript (vimeo-texttracks)'));
});

test('analyze: tone needs keyword evidence', () => {
  assert.deepEqual(detectTone('hello world'), {labels: [], evidence: []});
  assert.match(detectTone('A simple, calm CLI for developers').evidence.join(' '), /minimal: simple, calm/);
  assert.equal(lengthBucket(25), 'teaser (≤30s)');
});

test('transcript: WebVTT parsing', () => {
  const cues = parseVtt('WEBVTT\n\n1\n00:00:00.500 --> 00:00:02.000 align:start\n<v Speaker>Hello</v> there\n\n00:01:02.000 --> 00:01:03.250\nBye\n');
  assert.deepEqual(cues, [{start: 0.5, end: 2, text: 'Hello there'}, {start: 62, end: 63.25, text: 'Bye'}]);
});

// --- brief ------------------------------------------------------------------

test('brief: falls back to defaults and lists unknowns', () => {
  const unknownRef = analyzeDetails({url: 'u', details: null, transcript: {available: false, reason: 'x'}});
  const b = buildBrief('Notes app for teams. More text.', [unknownRef]);
  assert.equal(b.suggestedLength.seconds, 30);
  assert.match(b.suggestedLength.basis, /default/);
  assert.equal(b.pacing.bpm, 120);
  assert.deepEqual(b.unknowns.sort(), ['reference hooks', 'reference lengths', 'reference pacing', 'reference tone']);
  assert.deepEqual(b.sceneStructure.map((s) => s.scene), ['hook', 'logo', 'screenshot', 'features', 'screenshot', 'cta']);
  assert.match(b.hook.suggestion, /Notes app for teams/);
  assert.ok(b.music.moodKeywords.length > 0);
  assert.equal(b.sfx.searchAudio[0].type, 'sfx');
});

test('brief: derives length, pacing and mood from references', () => {
  const mk = (/** @type {number} */ d, /** @type {string} */ desc) =>
    analyzeDetails({url: `u${d}`, details: {url: 'u', source: 'youtube', title: 'Fast AI launch', creator: 'c', publishedAt: null, durationSec: d, viewCount: null, description: desc, tags: []}, transcript: {available: false, reason: 'x'}});
  const refs = [mk(40, '0:00 Problem\n0:03 Reveal\n0:06 Demo'), mk(50, ''), mk(200, '')];
  const b = buildBrief('An instant AI agent for support.', refs);
  assert.equal(b.suggestedLength.seconds, 50);
  assert.match(b.suggestedLength.basis, /median of 3/);
  assert.equal(b.pacing.bpm, 128, 'short sections → faster grid');
  assert.ok(b.tone !== UNKNOWN && b.tone.includes('energetic'));
  assert.ok(b.music.moodKeywords.includes('upbeat electronic'));
  assert.deepEqual(b.hook.referencePatterns, [{from: 'Fast AI launch', text: 'Problem', basis: 'first chapter title'}]);
  const beats = b.sceneStructure.reduce((n, s) => n + s.beats, 0);
  assert.ok(Math.abs((beats - 5) * (60 / 128) - 50) < 4, 'scene beats add up to ≈ the suggested length');
});

// --- quota ------------------------------------------------------------------

test('quota: stops before the daily limit and resets on a new Pacific day', async () => {
  const dir = await tmpDir();
  let now = new Date('2026-10-11T12:00:00Z');
  const q = createQuota(path.join(dir, 'q.json'), {search: 2, units: 3}, () => now);
  await q.reserve('search', 1);
  await q.reserve('search', 1);
  await assert.rejects(q.reserve('search', 1), QuotaError);
  await q.reserve('units', 3);
  await assert.rejects(q.reserve('units', 1), /quota reached/);
  assert.deepEqual(await q.usage(), {day: '2026-10-11', search: 2, units: 3});
  // 2026-10-12 08:00 UTC is still 2026-10-12 01:00 PDT → new day.
  now = new Date('2026-10-12T08:00:00Z');
  await q.reserve('search', 1);
  assert.equal((await q.usage()).search, 1);
  assert.equal(pacificDay(new Date('2026-10-12T06:00:00Z')), '2026-10-11', 'still the 11th in Pacific Time');
  assert.ok(JSON.parse(await fs.readFile(path.join(dir, 'q.json'), 'utf8')).day);
});
