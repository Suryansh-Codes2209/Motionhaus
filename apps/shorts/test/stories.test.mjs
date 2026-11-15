import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {rank} from '../src/filters.mjs';
import {entriesFromEpisodes, Ledger} from '../src/ledger.mjs';
import {createRss, parseFeed} from '../src/sources/rss.mjs';
import {cli, install} from './config.test.mjs';
import {bannedMatch, claimStory, episodeEntry, leadName, nameKey, recordEpisode, releaseClaim, storyConflict, titleOverlap} from '../src/stories.mjs';

const now = new Date('2026-11-14T06:00:00Z');
const hoursAgo = (/** @type {number} */ h) => new Date(now.getTime() - h * 3600e3).toISOString();
/** @param {Partial<import('../src/types.mjs').LedgerEntry>} e */
const entry = (e) => /** @type {any} */ ({episode: 1, url: 'https://github.com/frigade/yogurt', domain: 'github.com/frigade/yogurt', source: 'manual', sourceId: 'yogurt', key: 'yogurt', title: 'Yogurt', status: 'made', date: '2026-11-01', ...e});
const tmpLedger = async () => path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'stories-')), 'ledger.json');

test('product identity: same link, same site, or same name', () => {
  const led = [entry({})];
  const p = (/** @type {any} */ s) => storyConflict(led, s, {identity: 'product', now}).refuse;
  assert.match(String(p({url: 'https://github.com/frigade/yogurt'})), /already featured as #1/);
  assert.match(String(p({url: 'https://github.com/frigade/yogurt/releases'})), /same product as #1/);
  // the product moved from its repository to its own site: still the same product, caught by name
  assert.match(String(p({url: 'https://yogurt.so', title: 'Yogurt'})), /same product as #1 \(same name "Yogurt"\)/);
  assert.match(String(p({url: 'https://yogurt.so', title: 'Yogurt – an open-source product tour builder'})), /same name/);
  assert.equal(p({url: 'https://yoghurt.app', title: 'Yoghurt Maker'}), null);
  assert.equal(p({url: 'https://x.dev', title: 'AI'}), null); // a two-letter "name" is not a match
  assert.equal(p({url: 'https://other.dev', title: 'Something else'}), null);
});

test('story identity: same link or key; a close headline only warns', () => {
  const led = [entry({url: 'https://www.espn.com/cricket/story/1', domain: 'espn.com', key: 'ind-aus-2026-11-13', title: 'India beat Australia by 5 wickets in Perth'})];
  const s = (/** @type {any} */ x) => storyConflict(led, x, {identity: 'story', now});
  assert.match(String(s({url: 'https://espn.com/cricket/story/1'}).refuse), /already featured as #1/);
  assert.match(String(s({url: 'https://bbc.com/x', key: 'ind-aus-2026-11-13'}).refuse), /same key/);
  // another story from the same site is a different story
  assert.deepEqual(s({url: 'https://www.espn.com/cricket/story/2', key: 'eng-nz', title: 'England collapse in Wellington'}), {refuse: null, warn: null});
  const close = s({url: 'https://bbc.com/sport/9', key: 'ind-aus-2026-11-20', title: 'India beat Australia by 5 wickets again in Adelaide'});
  assert.equal(close.refuse, null);
  assert.match(String(close.warn), /close to #1/);
  assert.equal(titleOverlap('Two words', 'Two words'), 0); // too short to judge
});

test('names and banned patterns', () => {
  assert.equal(nameKey('Quiet.md'), 'quietmd');
  assert.equal(leadName('Yogurt – an open-source X'), 'Yogurt');
  assert.equal(leadName('agentes.chat: Slack with AI coworkers'), 'agentes.chat');
  assert.equal(bannedMatch('A new forex signals app', ['get rich|forex']), 'forex');
  assert.equal(bannedMatch('Iconic design tool', ['crypto|ico']), null); // whole words only
  assert.equal(bannedMatch('anything', []), null);
});

test('claim: hands out the next number, the same key gets the same number back', async () => {
  const file = await tmpLedger();
  const led = await Ledger.open(file);
  led.upsert({episode: 74, url: 'https://s2arm.com', source: 'manual', sourceId: 's2arm', title: 'S2Arm', status: 'made', date: '2026-11-12'});
  await led.save();
  const a = await claimStory(file, {title: 'agentes.chat', url: 'https://agentes.chat', key: 'agentes-chat'}, {identity: 'product', now});
  assert.deepEqual([a.episode, a.reused], [75, false]);
  const again = await claimStory(file, {title: 'agentes.chat', url: 'https://agentes.chat', key: 'agentes-chat'}, {identity: 'product', now: new Date(now.getTime() + 3600e3)});
  assert.deepEqual([again.episode, again.reused], [75, true]);
  const b = await claimStory(file, {title: 'Other Thing', url: 'https://other.dev', key: 'other-thing'}, {identity: 'product', now});
  assert.equal(b.episode, 76);
  await assert.rejects(claimStory(file, {title: 'agentes.chat', url: 'https://agentes.chat', key: 'agentes-again'}, {identity: 'product', now}), /already featured as #75 \(claimed, not made yet\)/);
  assert.equal((await Ledger.open(file)).entries.filter((e) => e.status === 'claimed').length, 2);
});

test('claim: an expired claim frees its story and its number', async () => {
  const file = await tmpLedger();
  await claimStory(file, {title: 'Failed Run', url: 'https://failed.dev', key: 'failed-run'}, {identity: 'product', now: new Date(hoursAgo(25))});
  assert.equal((await Ledger.open(file)).nextEpisode() >= 1, true);
  const next = await claimStory(file, {title: 'Fresh', url: 'https://fresh.dev', key: 'fresh'}, {identity: 'product', now});
  assert.equal(next.episode, 1); // the number was not burned
  const retry = await claimStory(file, {title: 'Failed Run', url: 'https://failed.dev', key: 'failed-run'}, {identity: 'product', now});
  assert.equal(retry.episode, 2); // and the story is free again
  assert.equal((await Ledger.open(file)).entries.some((e) => e.date === hoursAgo(25).slice(0, 10) && e.key === 'failed-run' && e.episode === 1), false);
});

test('claim: kit turns it into an episode; then it is taken for good', async () => {
  const file = await tmpLedger();
  const c = await claimStory(file, {title: 'Kept', url: 'https://kept.dev', key: 'kept'}, {identity: 'product', now: new Date(hoursAgo(30))});
  const led = await Ledger.open(file);
  led.upsert({episode: c.episode, url: 'https://kept.dev', source: 'manual', sourceId: 'kept', key: 'kept', title: 'Kept', status: 'made', date: '2026-11-13'}); // what `shorts kit` does
  await led.save();
  const after = (await Ledger.open(file)).entries[0];
  assert.equal(after.status, 'made');
  assert.equal('claimedAt' in after, false);
  await assert.rejects(claimStory(file, {title: 'Kept', url: 'https://kept.dev', key: 'kept'}, {identity: 'product', now}), /already featured as #1/);
});

test('claim: two runs at once get two numbers', async () => {
  const file = await tmpLedger();
  const got = await Promise.all(Array.from({length: 8}, (_, i) => claimStory(file, {title: `Story ${i} unique${i}`, url: `https://s${i}.dev`, key: `story-${i}`}, {identity: 'story', now})));
  assert.deepEqual(got.map((g) => g.episode).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
  // and the same story claimed twice at once is claimed once
  const file2 = await tmpLedger();
  // (product identity: under story identity one page may carry two stories, review I4)
  const same = await Promise.allSettled([1, 2, 3].map((n) => claimStory(file2, {title: 'One story', url: 'https://one.dev', key: `k${n}`}, {identity: 'product', now})));
  assert.equal(same.filter((s) => s.status === 'fulfilled').length, 1);
  await assert.rejects(fs.stat(`${file}.lock`));
});

test('claim: refuses a banned topic, a blocked site, a bad key or link', async () => {
  const file = await tmpLedger();
  const base = {title: 'Fine', url: 'https://fine.dev', key: 'fine'};
  await assert.rejects(claimStory(file, {...base, title: 'Best betting tips'}, {identity: 'story', banned: ['casino|betting'], now}), /does not cover that.*betting/);
  await assert.rejects(claimStory(file, base, {identity: 'story', blocked: ['fine.dev'], now}), /blocklist/);
  await assert.rejects(claimStory(file, {...base, key: 'Bad Key'}, {identity: 'story', now}), /not a valid story key/);
  await assert.rejects(claimStory(file, {...base, url: 'fine.dev'}, {identity: 'story', now}), /not a link/);
  assert.equal(await fs.stat(file).then(() => true, () => false), false);
});

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title>
<item><title>Rates held at 6.5% &amp; markets shrug</title><link>https://example.com/a?x=1&amp;y=2</link><pubDate>Fri, 13 Nov 2026 10:00:00 GMT</pubDate><description><![CDATA[<p>The central bank <b>held</b> rates.</p>]]></description></item>
<item><title>Old one</title><link>https://example.com/old</link><pubDate>Mon, 02 Nov 2026 10:00:00 GMT</pubDate></item>
<item><title>No link</title></item></channel></rss>`;
const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title type="html">A &#39;quoted&#39; post</title><link rel="self" href="https://r.example/self"/><link rel="alternate" href="https://r.example/post/1"/><updated>2026-11-14T01:00:00Z</updated><summary>Body</summary></entry></feed>`;

test('rss: RSS 2.0 and Atom items; only recent ones become candidates', async () => {
  assert.deepEqual(parseFeed(RSS).map((i) => [i.title, i.link]), [['Rates held at 6.5% & markets shrug', 'https://example.com/a?x=1&y=2'], ['Old one', 'https://example.com/old']]);
  assert.equal(parseFeed(RSS)[0].text, 'The central bank held rates.');
  assert.deepEqual(parseFeed(ATOM).map((i) => [i.title, i.link, i.date]), [["A 'quoted' post", 'https://r.example/post/1', '2026-11-14T01:00:00.000Z']]);
  const feed = createRss({url: 'https://www.example.com/feed.xml', fetchText: async () => RSS});
  const got = await feed.fetch({now, lookbackHours: 36});
  assert.deepEqual(got.map((c) => [c.source, c.title, c.sourceLabel, c.score]), [['rss', 'Rates held at 6.5% & markets shrug', 'example.com', 0]]);
  assert.equal(feed.name, 'rss:example.com');
  assert.equal((await createRss({url: 'https://x.com/f', label: 'X News', fetchText: async () => RSS}).fetch({now, lookbackHours: 36}))[0].sourceLabel, 'X News');
});

test('rank: feeds without scores rank by newness; the repository factor is for product channels only', () => {
  const c = (/** @type {any} */ o) => ({source: 'rss', id: o.url, title: 't', sourceUrl: o.url, sourceLabel: 'x', score: 0, comments: 0, text: '', tags: [], ...o});
  const r = rank([c({url: 'https://a.com/old', postedAt: hoursAgo(20)}), c({url: 'https://a.com/new', postedAt: hoursAgo(2)})], now, {identity: 'story'});
  assert.deepEqual(r.map((x) => x.url), ['https://a.com/new', 'https://a.com/old']);
  const repo = [c({source: 'github', url: 'https://github.com/o/r', score: 100, postedAt: hoursAgo(1)}), c({source: 'github', url: 'https://site.dev', score: 90, postedAt: hoursAgo(1)})];
  assert.equal(rank(repo, now, {identity: 'product'})[0].url, 'https://site.dev');
  assert.equal(rank(repo, now, {identity: 'story'})[0].url, 'https://github.com/o/r');
});

test('cli: story claim and check act on the chosen channel under its identity rule', async () => {
  const i = await install({a: {name: 'Alpha'}, b: {name: 'Beta', stories: {identity: 'story', feeds: []}}});
  const first = cli(i, ['--channel', 'a', 'story', 'claim', '--title', 'Yogurt', '--url', 'https://github.com/frigade/yogurt', '--key', 'yogurt']);
  assert.equal(first.code, 0);
  assert.match(first.out, /claimed #1 yogurt/);
  assert.match(cli(i, ['--channel', 'a', 'story', 'claim', '--title', 'Yogurt', '--url', 'https://github.com/frigade/yogurt', '--key', 'yogurt']).out, /claimed #1 yogurt \(your earlier claim/);
  const moved = cli(i, ['--channel', 'a', 'story', 'check', '--title', 'Yogurt', '--url', 'https://yogurt.so']);
  assert.equal(moved.code, 1);
  assert.match(moved.out, /no: same product as #1/);
  // channel b has its own ledger: the same story is free there
  assert.match(cli(i, ['--channel', 'b', 'story', 'check', '--title', 'Yogurt', '--url', 'https://yogurt.so']).out, /ok: not covered yet/);
  assert.match(cli(i, ['--channel', 'b', 'story', 'claim', '--title', 'x']).out, /usage: shorts story claim/);
  // a channel with no feeds says where its stories come from instead of failing
  const run = cli(i, ['--channel', 'b', 'fetch']);
  assert.equal(run.code, 0);
  assert.match(run.out, /no feeds.*search/);
});

// --- review C1: kit records every packed short, product or not ---

test('episodeEntry: the ledger entry for a packed short, product or not', () => {
  const day = '2026-11-14';
  const product = episodeEntry({script: {episode: 5, key: 'yogurt', brand: {name: 'Yogurt', url: 'yogurt.so'}, sourceLabel: 'Show HN'}, slug: 'yogurt', date: day});
  assert.deepEqual(product, {episode: 5, key: 'yogurt', title: 'Yogurt', url: 'https://yogurt.so', source: 'Show HN', sourceId: 'yogurt', status: 'made', date: day});
  // a subject with no page of its own: the first link its sources name
  const facts = episodeEntry({script: {episode: 3, key: 'octopus-hearts', brand: {name: 'Octopus hearts'}, sources: {'three hearts': 'Smithsonian Ocean, https://ocean.si.edu/octopus (read 2026-11-14)', other: 'https://b.org/y'}}, slug: 'octopus', date: day});
  assert.deepEqual([facts.url, facts.title, facts.key, facts.source], ['https://ocean.si.edu/octopus', 'Octopus hearts', 'octopus-hearts', 'manual']);
  // only the claim knows the link
  const claim = /** @type {any} */ ({episode: 4, key: 'rates-held', url: 'https://reuters.com/rates', source: 'Reuters', status: 'claimed'});
  const fromClaim = episodeEntry({script: {episode: 4}, slug: 'rates', claim, date: day});
  assert.deepEqual([fromClaim.url, fromClaim.key, fromClaim.title, fromClaim.source], ['https://reuters.com/rates', 'rates-held', 'rates', 'Reuters']);
  assert.throws(() => episodeEntry({script: {episode: 6, brand: {name: 'Nothing'}}, slug: 'nothing', date: day}), /this episode has no link to record it under: claim the story first \(shorts story claim\) or give script.json a brand.url, sourceUrl or sources/);
});

test('recordEpisode: a claim becomes a made episode; the number and the story stay taken', async () => {
  const file = await tmpLedger();
  const c = await claimStory(file, {title: 'Octopus hearts', url: 'https://ocean.si.edu/octopus', key: 'octopus-hearts'}, {identity: 'story', now});
  await recordEpisode(file, {script: {episode: c.episode, key: 'octopus-hearts', brand: {name: 'Octopus hearts'}, sources: {a: 'https://ocean.si.edu/octopus'}}, slug: 'octopus', now});
  const [e] = (await Ledger.open(file)).entries;
  assert.equal(e.status, 'made');
  assert.equal('claimedAt' in e, false);
  const later = new Date(now.getTime() + 25 * 3600e3);
  assert.equal((await claimStory(file, {title: 'Something else', url: 'https://x.org/a', key: 'something-else'}, {identity: 'story', now: later})).episode, c.episode + 1);
  await assert.rejects(claimStory(file, {title: 'Octopus hearts', url: 'https://ocean.si.edu/octopus', key: 'octopus-hearts'}, {identity: 'story', now: later}), /already featured/);
});

test('recordEpisode: a script number that is not the claimed one is refused, and nothing is left behind', async () => {
  const file = await tmpLedger();
  await claimStory(file, {title: 'One', url: 'https://one.dev', key: 'one'}, {identity: 'story', now});
  await assert.rejects(recordEpisode(file, {script: {episode: 9, key: 'one', sourceUrl: 'https://one.dev'}, slug: 'one', now}), /script.json says episode 9 but this story was claimed as #1: use the claimed number/);
  assert.deepEqual((await Ledger.open(file)).entries.map((e) => [e.episode, e.status]), [[1, 'claimed']]);
});

test('entriesFromEpisodes: an episode whose only link is in its sources is found', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'eps-'));
  await fs.mkdir(path.join(dir, 'octopus'));
  await fs.writeFile(path.join(dir, 'octopus', 'script.json'), JSON.stringify({episode: 3, brand: {name: 'Octopus hearts'}, sources: {a: 'Smithsonian, https://ocean.si.edu/octopus.'}}));
  const [e] = await entriesFromEpisodes(dir);
  assert.deepEqual([e.episode, e.url], [3, 'https://ocean.si.edu/octopus']);
});

// --- review I2: a failed run gives its number back ---

test('releaseClaim: frees the number; never removes an episode', async () => {
  const file = await tmpLedger();
  const a = await claimStory(file, {title: 'Story A', url: 'https://a.org/1', key: 'story-a'}, {identity: 'story', now});
  assert.equal(await releaseClaim(file, 'story-a'), true);
  assert.equal(await releaseClaim(file, 'story-a'), false);
  const b = await claimStory(file, {title: 'Story B', url: 'https://b.org/1', key: 'story-b'}, {identity: 'story', now});
  assert.equal(b.episode, a.episode);
  await recordEpisode(file, {script: {episode: b.episode, key: 'story-b', sourceUrl: 'https://b.org/1'}, slug: 'b', now});
  assert.equal(await releaseClaim(file, 'story-b'), false);
  assert.deepEqual((await Ledger.open(file)).entries.map((e) => [e.key, e.status]), [['story-b', 'made']]);
});

test('cli: story release', async () => {
  const i = await install({a: {name: 'Alpha', stories: {identity: 'story', feeds: []}}});
  assert.equal(cli(i, ['--channel', 'a', 'story', 'claim', '--title', 'A story', '--url', 'https://a.org/1', '--key', 'a-story']).code, 0);
  const r = cli(i, ['--channel', 'a', 'story', 'release', '--key', 'a-story']);
  assert.equal(r.code, 0);
  assert.match(r.out, /released a-story/);
  assert.match(cli(i, ['--channel', 'a', 'story', 'release', '--key', 'a-story']).out, /no claim "a-story" to release/);
  assert.match(cli(i, ['--channel', 'a', 'story', 'claim', '--title', 'Other', '--url', 'https://b.org/2', '--key', 'other']).out, /claimed #1 other/);
});

// --- review I3: product names, through the key too ---

test('product identity: a product that changed its link is caught through its key', () => {
  const moved = {url: 'https://yogurt.so', key: 'yogurt', title: 'This open-source app takes your meeting notes'};
  const withKey = [entry({url: 'https://github.com/FrigadeHQ/yogurt', domain: 'github.com/frigadehq/yogurt', key: 'yogurt-notes', title: 'Yogurt'})];
  assert.match(String(storyConflict([entry({url: 'https://github.com/FrigadeHQ/yogurt', domain: 'github.com/frigadehq/yogurt', key: 'yogurt', title: 'Meeting notes app'})], moved, {identity: 'product', now}).refuse), /#1 \(same key "yogurt"\)/);
  assert.match(String(storyConflict(withKey, moved, {identity: 'product', now}).refuse), /same product as #1 \(same name "Yogurt"\) \(a different product with the same name\? add --allow-same-name\)$/);
  const noKey = [/** @type {any} */ ({...entry({url: 'https://github.com/FrigadeHQ/yogurt', domain: 'github.com/frigadehq/yogurt', title: 'Yogurt'}), key: undefined})];
  assert.match(String(storyConflict(noKey, moved, {identity: 'product', now}).refuse), /same name "Yogurt"/);
});

test('product identity: allowSameName lets a different product with the same name through, never the same link or site', async () => {
  const led = [entry({url: 'https://atlas.dev', domain: 'atlas.dev', key: 'atlas', title: 'Atlas'})];
  const other = {url: 'https://getatlas.io', key: 'atlas-maps', title: 'Atlas: maps for your terminal'};
  assert.match(String(storyConflict(led, other, {identity: 'product', now}).refuse), /same name "Atlas"/);
  assert.deepEqual(storyConflict(led, other, {identity: 'product', now, allowSameName: true}), {refuse: null, warn: null});
  assert.match(String(storyConflict(led, {...other, url: 'https://atlas.dev/blog'}, {identity: 'product', now, allowSameName: true}).refuse), /same product as #1 \(atlas.dev\)/);
  const file = await tmpLedger();
  await claimStory(file, {title: 'Atlas', url: 'https://atlas.dev', key: 'atlas'}, {identity: 'product', now});
  await assert.rejects(claimStory(file, other, {identity: 'product', now}), /add --allow-same-name/);
  assert.equal((await claimStory(file, other, {identity: 'product', now, allowSameName: true})).episode, 2);
});

test('product identity: a feed candidate (link only, as `shorts pick` asks) is never refused by name', () => {
  const led = [entry({})];
  assert.equal(storyConflict(led, {url: 'https://yogurt.so'}, {identity: 'product', now}).refuse, null);
  assert.match(String(storyConflict(led, {url: 'https://github.com/frigade/yogurt/issues'}, {identity: 'product', now}).refuse), /same product/);
});

test('cli: story claim --allow-same-name', async () => {
  const i = await install({a: {name: 'Alpha'}});
  assert.equal(cli(i, ['--channel', 'a', 'story', 'claim', '--title', 'Atlas', '--url', 'https://atlas.dev', '--key', 'atlas']).code, 0);
  const no = cli(i, ['--channel', 'a', 'story', 'claim', '--title', 'Atlas', '--url', 'https://getatlas.io', '--key', 'atlas-maps']);
  assert.equal(no.code, 1);
  assert.match(no.out, /add --allow-same-name/);
  assert.match(cli(i, ['--channel', 'a', 'story', 'claim', '--title', 'Atlas', '--url', 'https://getatlas.io', '--key', 'atlas-maps', '--allow-same-name']).out, /claimed #2 atlas-maps/);
});

// --- review I4: one reference page, two stories ---

test('story identity: the same page under a different key only warns; same key or no keys still refuse', () => {
  const page = 'https://ocean.si.edu/ocean-life/invertebrates/octopus';
  const led = [entry({url: page, domain: 'ocean.si.edu', key: 'octopus-hearts', title: 'An octopus has three hearts'})];
  const s = (/** @type {any} */ x) => storyConflict(led, x, {identity: 'story', now});
  const other = s({url: page, key: 'octopus-blue-blood', title: 'Octopus blood is blue'});
  assert.equal(other.refuse, null);
  assert.equal(other.warn, 'the same page was the source of #1 "An octopus has three hearts": make sure this is a different story');
  assert.match(String(s({url: page, key: 'octopus-hearts'}).refuse), /already featured as #1/);
  assert.match(String(s({url: page}).refuse), /already featured as #1/);
  const keyless = [/** @type {any} */ ({...led[0], key: undefined})];
  assert.match(String(storyConflict(keyless, {url: page, key: 'octopus-blue-blood'}, {identity: 'story', now}).refuse), /already featured as #1/);
});

// --- review M4: feeds ---

test('rss: an undated item ranks as old as the window, not as the newest', async () => {
  const xml = `<rss><channel><item><title>Undated</title><link>https://example.com/u</link><pubDate>not a date</pubDate></item><item><title>Dated</title><link>https://example.com/d</link><pubDate>Fri, 13 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
  const got = await createRss({url: 'https://example.com/feed', fetchText: async () => xml}).fetch({now, lookbackHours: 36});
  assert.deepEqual(got.map((c) => [c.title, c.postedAt]), [['Undated', hoursAgo(36)], ['Dated', '2026-11-13T10:00:00.000Z']]);
});

test('rss: hex and named entities; a permalink guid stands in for a missing link', () => {
  const xml = `<rss><channel><item><title>It&#x2019;s here&nbsp;&mdash; 1&ndash;2 &amp;lt;b&amp;gt; more&hellip;</title><guid isPermaLink="true">https://example.com/p/9</guid></item><item><title>Not a link</title><guid isPermaLink="false">abc-123</guid></item></channel></rss>`;
  assert.deepEqual(parseFeed(xml).map((i) => [i.title, i.link]), [['It’s here — 1–2 &lt;b&gt; more…', 'https://example.com/p/9']]);
});
