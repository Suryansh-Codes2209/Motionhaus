import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {creditsText, fetchPhotos, fromCommons, fromOpenverse, searchPhotos, shortCredit, usedPhotoCredits} from '../src/photos.mjs';

const ov = {id: 'a1', title: 'Server room', creator: 'Jane', url: 'https://x/a.jpg', foreign_landing_url: 'https://flickr/a', license: 'by', license_version: '2.0', width: 2400, height: 1600};
const ovNc = {...ov, id: 'a2', license: 'by-nc'};
const commons = {
  pageid: 7,
  title: 'File:Linus.jpg',
  imageinfo: [{thumburl: 'https://up/l.jpg', thumbwidth: 2000, thumbheight: 1333, descriptionurl: 'https://commons/l', extmetadata: {Artist: {value: '<a href="x">Krd</a>'}, LicenseShortName: {value: 'CC BY-SA 4.0'}, ObjectName: {value: 'Linus'}}}],
};

test('parses both sources and fails closed on NC', () => {
  assert.equal(fromOpenverse(ov).license, 'CC-BY');
  assert.equal(fromOpenverse(ovNc).allowsCommercialUse, false);
  const c = fromCommons(commons);
  assert.equal(c?.creator, 'Krd');
  assert.equal(c?.license, 'CC-BY-SA');
  assert.equal(shortCredit(/** @type {any} */ (c)), 'Photo: Krd / CC BY-SA');
});

/** @param {Record<string, any>} routes */
const fakeFetch = (routes) => /** @type {any} */ (async (/** @type {string} */ url) => {
  const key = Object.keys(routes).find((k) => url.includes(k));
  const body = key ? routes[key] : null;
  return {ok: !!body, status: body ? 200 : 404, headers: new Map([['content-type', 'image/jpeg']]), json: async () => body, arrayBuffer: async () => new ArrayBuffer(4)};
});

test('search keeps safe, large results; fetch writes manifest and credits only for used files', async () => {
  const f = fakeFetch({'api.openverse.org': {results: [ov, ovNc]}, 'commons.wikimedia.org': {query: {pages: {7: commons}}}, 'https://x/a.jpg': {}, 'https://up/l.jpg': {}});
  const found = await searchPhotos('servers', {fetch: f});
  assert.deepEqual(found.map((r) => r.id), ['openverse:a1', 'commons:7']);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'photos-'));
  const got = await fetchPhotos(dir, 'Server room!', {n: 2, fetch: f});
  assert.deepEqual(got.map((g) => g.file), ['photos/server-room-1.jpg', 'photos/server-room-2.jpg']);
  assert.match(await fs.readFile(path.join(dir, 'photo-credits.txt'), 'utf8'), /Jane/);
  await fs.writeFile(path.join(dir, 'script.json'), JSON.stringify({scenes: [{type: 'photo', images: ['photos/server-room-2.jpg']}]}));
  const used = await usedPhotoCredits(dir);
  assert.match(used, /- Krd, CC BY-SA 4\.0: https:\/\/commons\.wikimedia\.org\/\?curid=7/);
  assert.doesNotMatch(used, /Jane/);
});

test('credits text is empty with no photos', () => assert.equal(creditsText([]), ''));
