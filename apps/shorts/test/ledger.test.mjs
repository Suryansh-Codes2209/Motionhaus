import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {entriesFromEpisodes, Ledger} from '../src/ledger.mjs';

/** @param {Record<string, any>} episodes  dir name → script.json contents (null = no script) */
async function episodesDir(episodes) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ledger-'));
  for (const [name, script] of Object.entries(episodes)) {
    await fs.mkdir(path.join(root, name), {recursive: true});
    if (script) await fs.writeFile(path.join(root, name, 'script.json'), typeof script === 'string' ? script : JSON.stringify(script));
  }
  return root;
}

const EPISODES = {
  'bo2-mac': {episode: 61, brand: {name: 'BO2 Mac', url: 'github.com/adrbn/bo2-mac'}, sourceUrl: 'https://news.ycombinator.com/item?id=50449891', sourceLabel: 'Show HN'},
  catcopter: {episode: 50, brand: {name: 'Catcopter', url: 'https://catcopter.com'}, sourceUrl: 'https://catcopter.com'},
  'no-number': {brand: {name: 'X', url: 'x.dev'}},
  'sample-oratora': {episode: 1, brand: {name: 'Oratora', url: 'oratora.live'}},
  'no-script': null,
  broken: '{not json',
};

test('entriesFromEpisodes: one entry per numbered episode, keyed on the product URL', async () => {
  const got = await entriesFromEpisodes(await episodesDir(EPISODES));
  assert.deepEqual(got.map((e) => e.episode), [50, 61]);
  const bo2 = got[1];
  assert.equal(bo2.url, 'https://github.com/adrbn/bo2-mac'); // the product, not the Hacker News thread
  assert.equal(bo2.title, 'BO2 Mac');
  assert.equal(bo2.source, 'Show HN');
  assert.equal(bo2.sourceId, 'bo2-mac');
  assert.equal(bo2.status, 'made');
  assert.match(bo2.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(got[0].source, 'manual');
});

test('after a backfill the ledger numbers and dedupes', async () => {
  const dir = await episodesDir(EPISODES);
  const ledger = await Ledger.open(path.join(dir, 'ledger.json'));
  for (const e of await entriesFromEpisodes(dir)) ledger.upsert(e);
  assert.equal(ledger.nextEpisode(), 62);
  assert.match(String(ledger.conflict('https://www.catcopter.com/')), /already featured as #50/);
  assert.match(String(ledger.conflict('https://github.com/adrbn/bo2-mac/releases')), /same product as #61/);
  assert.equal(ledger.conflict('https://github.com/someone/else'), null);
  await ledger.save();
  assert.equal((await Ledger.open(ledger.file)).entries.length, 2);
});

test('upsert: updates in place, never downgrades published, keeps ids', async () => {
  const ledger = new Ledger('unused', []);
  const base = {episode: 7, url: 'https://a.dev', source: 'manual', sourceId: 'a', title: 'A', date: '2026-11-01'};
  ledger.upsert({...base, status: 'published', youtubeId: 'YT'});
  const e = ledger.upsert({...base, title: 'A2', status: 'made'});
  assert.equal(ledger.entries.length, 1);
  assert.equal(e.status, 'published');
  assert.equal(e.youtubeId, 'YT');
  assert.equal(e.title, 'A2');
  assert.equal(e.domain, 'a.dev');
  ledger.upsert({...base, episode: 9, url: 'https://b.dev', status: 'made'});
  assert.deepEqual(ledger.entries.map((x) => x.episode), [7, 9]);
});
