import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createGithub, toCandidate as ghCandidate} from '../src/sources/github.mjs';
import {cleanTitle, createHn, toCandidate as hnCandidate} from '../src/sources/hn.mjs';

const NOW = new Date('2026-10-21T01:00:00Z');

/** Records the URL and returns canned JSON. @param {unknown} body */
function fakeHttp(body) {
  /** @type {{url: string, init?: RequestInit}[]} */
  const calls = [];
  return {
    calls,
    /** @param {string} url @param {RequestInit} [init] */
    async getJson(url, init) {
      calls.push({url, init});
      return body;
    },
  };
}

test('hn: strips Show/Launch HN prefixes', () => {
  assert.equal(cleanTitle('Show HN: Inkwell – docs that write themselves'), 'Inkwell – docs that write themselves');
  assert.equal(cleanTitle('Launch HN: Acme (YC W26) - agents for support'), 'Acme (YC W26) - agents for support');
  assert.equal(cleanTitle('Plain title'), 'Plain title');
});

test('hn: normalises a hit and drops text-only posts', () => {
  const c = hnCandidate({
    objectID: '41234567',
    title: 'Show HN: Inkwell',
    url: 'https://inkwell.dev',
    points: 312,
    num_comments: 88,
    created_at_i: 1760990000,
    story_text: '<p>Hi HN &amp; friends</p>',
    _tags: ['story', 'show_hn'],
  });
  assert.deepEqual(
    {...c, postedAt: undefined},
    {
      source: 'hn',
      id: 'hn:41234567',
      title: 'Inkwell',
      url: 'https://inkwell.dev',
      sourceUrl: 'https://news.ycombinator.com/item?id=41234567',
      sourceLabel: 'Show HN',
      score: 312,
      comments: 88,
      postedAt: undefined,
      text: 'Hi HN & friends',
      tags: ['show-hn'],
    },
  );
  assert.equal(hnCandidate({objectID: '1', title: 'Show HN: no link', _tags: ['show_hn']}), null);
  assert.equal(hnCandidate({objectID: '2', url: 'https://x.dev', _tags: ['launch_hn'], created_at_i: 1})?.sourceLabel, 'Launch HN');
});

test('hn: queries the lookback window and min points', async () => {
  const http = fakeHttp({hits: [{objectID: '9', title: 'Show HN: A', url: 'https://a.dev', points: 30, created_at_i: 1760990000, _tags: ['show_hn']}]});
  const out = await createHn({http, minPoints: 20}).fetch({now: NOW, lookbackHours: 36});
  assert.equal(out.length, 1);
  const u = new URL(http.calls[0].url);
  assert.equal(u.pathname, '/api/v1/search_by_date');
  assert.equal(u.searchParams.get('tags'), '(show_hn,launch_hn)');
  assert.equal(u.searchParams.get('numericFilters'), `created_at_i>${NOW.getTime() / 1000 - 36 * 3600},points>=20`);
});

test('github: needs a non-GitHub homepage', () => {
  const base = {id: 7, name: 'inkwell', html_url: 'https://github.com/o/inkwell', stargazers_count: 900, created_at: '2026-10-18T10:00:00Z', description: 'Docs', topics: ['docs']};
  assert.equal(ghCandidate({...base, homepage: 'https://inkwell.dev'})?.url, 'https://inkwell.dev');
  assert.equal(ghCandidate({...base, homepage: ''}), null);
  assert.equal(ghCandidate({...base, homepage: 'https://github.com/o/inkwell'}), null);
  assert.equal(ghCandidate({...base, homepage: 'inkwell.dev'}), null);
  assert.deepEqual(ghCandidate({...base, homepage: 'https://inkwell.dev'})?.tags, ['github', 'docs']);
});

test('github: search query, auth header only with a token', async () => {
  const http = fakeHttp({items: []});
  await createGithub({http, minStars: 150, maxAgeDays: 7}).fetch({now: NOW, lookbackHours: 36});
  const u = new URL(http.calls[0].url);
  assert.equal(u.searchParams.get('q'), 'created:>2026-10-14 stars:>=150 archived:false fork:false');
  assert.equal(u.searchParams.get('sort'), 'stars');
  const h = /** @type {Record<string, string>} */ (http.calls[0].init?.headers);
  assert.equal(h.authorization, undefined);

  const http2 = fakeHttp({items: []});
  await createGithub({http: http2, minStars: 150, maxAgeDays: 7, token: 't0k'}).fetch({now: NOW, lookbackHours: 36});
  assert.equal(/** @type {Record<string, string>} */ (http2.calls[0].init?.headers).authorization, 'Bearer t0k');
});
