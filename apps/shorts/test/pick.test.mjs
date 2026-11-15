import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {parseBlocklist} from '../src/config.mjs';
import {bannedReason, filter, rank} from '../src/filters.mjs';
import {Ledger} from '../src/ledger.mjs';
import {fetchAll} from '../src/steps/fetch.mjs';
import {shortlist} from '../src/steps/pick.mjs';
import {isBlocked, normalizeUrl, productDomain} from '../src/urls.mjs';

/** @typedef {import('../src/types.mjs').Candidate} Candidate */

const NOW = new Date('2026-10-21T01:00:00Z');
const hoursAgo = (/** @type {number} */ h) => new Date(NOW.getTime() - h * 3600_000).toISOString();

/** @param {Partial<Candidate>} p @returns {Candidate} */
const cand = (p) => ({
  source: 'hn',
  id: `hn:${p.url}`,
  title: 'Thing',
  url: 'https://thing.dev',
  sourceUrl: 'https://news.ycombinator.com/item?id=1',
  sourceLabel: 'Show HN',
  score: 50,
  comments: 0,
  postedAt: hoursAgo(5),
  text: '',
  tags: [],
  ...p,
});

const emptyLedger = {conflict: () => null};

test('urls: canonical form drops tracking, www, trailing slash, hash', () => {
  assert.equal(normalizeUrl('http://www.Inkwell.dev/?utm_source=hn#top'), 'https://inkwell.dev');
  assert.equal(normalizeUrl('https://inkwell.dev/docs/'), 'https://inkwell.dev/docs');
  assert.equal(normalizeUrl('https://inkwell.dev/?b=2&a=1'), 'https://inkwell.dev/?a=1&b=2');
});

test('urls: product domain', () => {
  assert.equal(productDomain('https://app.inkwell.dev/x'), 'inkwell.dev');
  assert.equal(productDomain('https://foo.co.uk'), 'foo.co.uk');
  assert.equal(productDomain('https://me.github.io/proj'), 'me.github.io');
  assert.equal(productDomain('https://inkwell.vercel.app'), 'inkwell.vercel.app');
  assert.equal(productDomain('https://github.com/Owner/Repo/tree/main'), 'github.com/owner/repo');
});

test('urls: blocklist matches subdomains only on label boundaries', () => {
  assert.ok(isBlocked('https://app.evil.com/x', ['evil.com']));
  assert.ok(isBlocked('https://evil.com', ['evil.com']));
  assert.ok(!isBlocked('https://notevil.com', ['evil.com']));
});

test('blocklist file parsing', () => {
  assert.deepEqual(parseBlocklist('# header\nEvil.com  # asked 2026-11-02\nhttps://www.x.io/path\n\n'), ['evil.com', 'x.io']);
});

test('content filter', () => {
  assert.match(String(bannedReason(cand({title: 'Launch your memecoin in 1 click'}))), /memecoin/);
  assert.match(String(bannedReason(cand({text: 'An online casino for devs'}))), /casino/);
  assert.equal(bannedReason(cand({title: 'Tokenizer for LLMs'})), null); // "token" alone is fine
  assert.equal(bannedReason(cand({title: 'Docs that write themselves'})), null);
});

test('rank: velocity normalised per source, repos discounted', () => {
  const r = rank(
    [
      cand({url: 'https://a.dev', score: 100, postedAt: hoursAgo(10)}), // 10/h
      cand({url: 'https://b.dev', score: 60, postedAt: hoursAgo(2)}), // 30/h → top HN
      cand({source: 'github', url: 'https://c.dev', score: 1000, postedAt: hoursAgo(100)}), // 10/h → top GH (1.0)
      cand({url: 'https://github.com/o/d', score: 60, postedAt: hoursAgo(2)}), // 30/h but repo ×0.6
    ],
    NOW,
  );
  assert.deepEqual(
    r.map((c) => [c.url, c.velocity]),
    [
      ['https://c.dev', 1], // tie on velocity → higher raw score first
      ['https://b.dev', 1],
      ['https://github.com/o/d', 0.6],
      ['https://a.dev', 0.333],
    ],
  );
  assert.deepEqual(r.map((c) => c.rank), [1, 2, 3, 4]);
});

test('filter: blocklist, ledger, content, in-run duplicates, reachability', async () => {
  const ledger = {conflict: (/** @type {string} */ u) => (u.includes('old.dev') ? 'already featured as #3' : null)};
  const {kept, rejected} = await filter(
    [
      cand({url: 'https://ok.dev'}),
      cand({url: 'https://ok.dev', id: 'github:1'}),
      cand({url: 'https://app.evil.com'}),
      cand({url: 'https://old.dev'}),
      cand({url: 'https://bet.dev', title: 'Sports betting copilot'}),
      cand({url: 'https://down.dev'}),
    ],
    {ledger, blocked: ['evil.com'], reachable: async (u) => !u.includes('down')},
  );
  assert.deepEqual(kept.map((c) => c.url), ['https://ok.dev']);
  assert.deepEqual(
    Object.fromEntries(rejected.map((r) => [r.url + (r.id === 'github:1' ? '#2' : ''), r.reason.replace(/ \(.*/, '')])),
    {
      'https://ok.dev#2': 'duplicate in this run',
      'https://app.evil.com': 'blocklist',
      'https://old.dev': 'already featured as #3',
      'https://bet.dev': 'content filter',
      'https://down.dev': 'unreachable',
    },
  );
});

test('ledger: episode numbers, url + product-domain dedupe, persistence', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'shorts-test-'));
  const file = path.join(dir, 'ledger.json');
  const l = await Ledger.open(file);
  assert.equal(l.nextEpisode(), 1);
  const e = l.add({url: 'https://www.inkwell.dev/?ref=hn', source: 'hn', sourceId: 'hn:1', title: 'Inkwell', status: 'queued', date: '2026-10-21'});
  assert.equal(e.episode, 1);
  assert.equal(e.domain, 'inkwell.dev');
  assert.match(String(l.conflict('https://inkwell.dev')), /already featured as #1/);
  assert.match(String(l.conflict('https://app.inkwell.dev/new')), /same product as #1/);
  assert.equal(l.conflict('https://other.dev'), null);

  l.update(1, {status: 'failed'});
  assert.equal(l.conflict('https://inkwell.dev'), null, 'a failed episode can be retried');
  await l.save();

  const again = await Ledger.open(file);
  assert.equal(again.entries.length, 1);
  assert.equal(again.nextEpisode(), 2);
});

test('fetchAll: one failing source is reported, not fatal', async () => {
  const res = await fetchAll(
    [
      {name: 'hn', fetch: async () => [cand({})]},
      {name: 'github', fetch: async () => { throw new Error('HTTP 403'); }},
    ],
    {now: NOW, lookbackHours: 36},
  );
  assert.equal(res.candidates.length, 1);
  assert.deepEqual(res.errors, [{source: 'github', error: 'HTTP 403'}]);
});

test('shortlist: only checks reachability for the top 2×size, never pads', async () => {
  /** @type {string[]} */
  const checked = [];
  const cands = Array.from({length: 10}, (_, i) => cand({url: `https://p${i}.dev`, score: 100 - i}));
  const res = await shortlist(cands, {
    now: NOW,
    size: 2,
    ledger: emptyLedger,
    blocked: [],
    reachable: async (u) => (checked.push(u), u !== 'https://p0.dev' && u !== 'https://p2.dev'),
  });
  assert.deepEqual(checked.sort(), ['https://p0.dev', 'https://p1.dev', 'https://p2.dev', 'https://p3.dev']);
  assert.deepEqual(res.shortlist.map((c) => c.url), ['https://p1.dev', 'https://p3.dev']);
  assert.deepEqual(res.shortlist.map((c) => c.rank), [1, 2]);

  const none = await shortlist(cands.slice(0, 1), {now: NOW, size: 2, ledger: emptyLedger, blocked: [], reachable: async () => false});
  assert.equal(none.shortlist.length, 0);
});
