import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {test} from 'node:test';
import {createHttp} from '../src/http.mjs';
import {createArchive, parseLength} from '../src/providers/archive.mjs';
import {createFreesound} from '../src/providers/freesound.mjs';
import {createJamendo} from '../src/providers/jamendo.mjs';
import {createLocalPacks, detectLicenseInText} from '../src/providers/localpacks.mjs';
import {createOpenverse} from '../src/providers/openverse.mjs';
import {header, json, mockFetch, noSleep, tmpDir, wavBytes} from './helpers.mjs';

/** @param {typeof fetch} fetchImpl */
const httpFor = (fetchImpl) => createHttp({provider: 't', minIntervalMs: 0, fetchImpl, sleepFn: noSleep});
const log = () => {};
const sfx = {type: /** @type {const} */ ('sfx'), commercialUseOnly: false, limit: 10};

// --- Openverse --------------------------------------------------------------

const ovItem = {
  id: 'eab8a6e2',
  title: 'Deep Whoosh #1',
  foreign_landing_url: 'https://freesound.org/people/Kinoton/sounds/351256',
  url: 'https://cdn.freesound.org/previews/351/351256_2247456-hq.mp3',
  creator: 'Kinoton',
  license: 'cc0',
  license_version: '1.0',
  license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  duration: 3155,
};

test('openverse: maps fields, ms → s, and prefilters licenses', async () => {
  const {fetchImpl, calls} = mockFetch([
    {match: /api\.openverse\.org\/v1\/audio/, reply: () => json({results: [ovItem, {...ovItem, id: 'song', category: 'music'}]})},
  ]);
  const p = createOpenverse({env: {}, http: httpFor(fetchImpl), log});
  const rs = await p.search('whoosh', {...sfx, commercialUseOnly: true, maxDurationSec: 5});
  assert.equal(rs.length, 1, 'items categorized as music are dropped from sfx searches');
  const [r] = rs;
  const u = new URL(calls[0].url);
  assert.equal(u.searchParams.get('category'), null);
  assert.equal(u.searchParams.get('license'), 'cc0,pdm,by,by-sa');
  assert.equal(u.searchParams.get('page_size'), '10');
  assert.equal(header(calls[0].init, 'authorization'), null);
  assert.equal(r.id, 'openverse:eab8a6e2');
  assert.equal(r.durationSec, 3.2);
  assert.equal(r.license, 'CC0');
  assert.equal(r.allowsCommercialUse, true);
  assert.equal(r.sourceUrl, ovItem.foreign_landing_url);
  assert.equal(r.downloadUrl, ovItem.url);
});

test('openverse: uses an OAuth bearer token when a client is configured', async () => {
  const {fetchImpl, calls} = mockFetch([
    {match: /auth_tokens\/token/, reply: () => json({access_token: 'tok', expires_in: 3600})},
    {match: /\/audio\//, reply: () => json({results: []})},
  ]);
  const p = createOpenverse({env: {OPENVERSE_CLIENT_ID: 'id', OPENVERSE_CLIENT_SECRET: 's'}, http: httpFor(fetchImpl), log});
  await p.search('x', {...sfx, type: 'music'});
  await p.search('y', {...sfx, type: 'music'});
  assert.equal(calls.filter((c) => /token/.test(c.url)).length, 1);
  assert.equal(header(calls[1].init, 'authorization'), 'Bearer tok');
});

// --- Freesound --------------------------------------------------------------

const fsSound = {
  id: 351256,
  name: 'Deep Whoosh',
  username: 'Kinoton',
  duration: 3.155,
  license: 'Attribution NonCommercial',
  url: 'https://freesound.org/people/Kinoton/sounds/351256/',
  download: 'https://freesound.org/apiv2/sounds/351256/download/',
  previews: {'preview-hq-mp3': 'https://cdn.freesound.org/previews/351/351256-hq.mp3'},
};

test('freesound: disabled without a key', () => {
  const p = createFreesound({env: {}, http: httpFor(mockFetch([]).fetchImpl)});
  assert.equal(p.enabled, false);
  assert.match(String(p.disabledReason), /FREESOUND_API_KEY/);
});

test('freesound: token auth, filters, preview download, license', async () => {
  const {fetchImpl, calls} = mockFetch([{match: /freesound\.org\/apiv2\/search\//, reply: () => json({results: [fsSound]})}]);
  const p = createFreesound({env: {FREESOUND_API_KEY: 'k'}, http: httpFor(fetchImpl)});
  const [r] = await p.search('whoosh', {...sfx, commercialUseOnly: true, minDurationSec: 1, maxDurationSec: 4});
  assert.equal(header(calls[0].init, 'authorization'), 'Token k');
  assert.ok(!calls[0].url.includes('token='), 'key must not be in the URL');
  const filter = String(new URL(calls[0].url).searchParams.get('filter'));
  assert.match(filter, /duration:\[1 TO 4\]/);
  assert.match(filter, /license:\("Attribution" OR "Creative Commons 0"\)/);
  assert.equal(r.downloadUrl, fsSound.previews['preview-hq-mp3']);
  assert.equal(r.license, 'CC-BY-NC');
  assert.equal(r.allowsCommercialUse, false);
  assert.deepEqual(await p.downloadHeaders?.(r), {});
});

test('freesound: original downloads only with OAuth token + opt-in', async () => {
  const {fetchImpl} = mockFetch([{match: /search/, reply: () => json({results: [fsSound]})}]);
  const p = createFreesound({
    env: {FREESOUND_API_KEY: 'k', FREESOUND_OAUTH_TOKEN: 'o', FREESOUND_DOWNLOAD_ORIGINALS: '1'},
    http: httpFor(fetchImpl),
  });
  const [r] = await p.search('whoosh', sfx);
  assert.equal(r.downloadUrl, fsSound.download);
  assert.deepEqual(await p.downloadHeaders?.(r), {authorization: 'Bearer o'});
});

// --- Jamendo ----------------------------------------------------------------

const track = (/** @type {object} */ o) => ({
  id: '1',
  name: 'Sunrise',
  artist_name: 'Artist',
  duration: 180,
  audio: 'https://prod-1.storage.jamendo.com/?trackid=1&format=mp31',
  audiodownload: 'https://prod-1.storage.jamendo.com/download/track/1/mp32/',
  audiodownload_allowed: true,
  license_ccurl: 'http://creativecommons.org/licenses/by-nc-sa/3.0/',
  shareurl: 'https://www.jamendo.com/track/1',
  ...o,
});

test('jamendo: disabled without client id', () => {
  assert.equal(createJamendo({env: {}, http: httpFor(mockFetch([]).fetchImpl)}).enabled, false);
});

test('jamendo: maps tracks, surfaces NC, drops download-disallowed tracks', async () => {
  const {fetchImpl, calls} = mockFetch([
    {
      match: /api\.jamendo\.com\/v3\.0\/tracks/,
      reply: () =>
        json({
          headers: {status: 'success', code: 0},
          results: [
            track({}),
            track({id: '2', license_ccurl: 'http://creativecommons.org/licenses/by/3.0/'}),
            track({id: '3', audiodownload_allowed: false, audiodownload: ''}),
          ],
        }),
    },
  ]);
  const p = createJamendo({env: {JAMENDO_CLIENT_ID: 'cid'}, http: httpFor(fetchImpl)});
  const rs = await p.search('upbeat', {type: 'music', commercialUseOnly: false, limit: 10, maxDurationSec: 200});
  const u = new URL(calls[0].url);
  assert.equal(u.searchParams.get('client_id'), 'cid');
  assert.equal(u.searchParams.get('durationbetween'), '0_200');
  assert.deepEqual(rs.map((r) => [r.id, r.license, r.allowsCommercialUse]), [
    ['jamendo:1', 'CC-BY-NC', false],
    ['jamendo:2', 'CC-BY', true],
  ]);
  assert.equal(rs[0].downloadUrl, track({}).audiodownload);
});

test('jamendo: API error headers become errors', async () => {
  const {fetchImpl} = mockFetch([{match: /jamendo/, reply: () => json({headers: {status: 'failed', code: 5, error_message: 'bad client id'}, results: []})}]);
  const p = createJamendo({env: {JAMENDO_CLIENT_ID: 'x'}, http: httpFor(fetchImpl)});
  await assert.rejects(p.search('a', {type: 'music', commercialUseOnly: false, limit: 5}), /bad client id/);
});

// --- Internet Archive -------------------------------------------------------

test('archive: restricts to licensed audio, picks the MP3 and parses length', async () => {
  const {fetchImpl, calls} = mockFetch([
    {
      match: /advancedsearch\.php/,
      reply: () => json({response: {docs: [
        {identifier: 'item1', title: 'Rain', licenseurl: 'http://creativecommons.org/publicdomain/zero/1.0/'},
        {identifier: 'nomp3', title: 'X', licenseurl: 'http://creativecommons.org/licenses/by/3.0/'},
      ]}}),
    },
    {
      match: /metadata\/item1/,
      reply: () => json({
        metadata: {title: 'Rain', creator: ['Someone'], licenseurl: 'http://creativecommons.org/publicdomain/zero/1.0/'},
        files: [
          {name: 'rain.flac', format: 'Flac', length: '75'},
          {name: 'rain loop.mp3', format: 'VBR MP3', length: '01:15'},
        ],
      }),
    },
    {match: /metadata\/nomp3/, reply: () => json({metadata: {}, files: [{name: 'a.png', format: 'PNG'}]})},
  ]);
  const p = createArchive({http: httpFor(fetchImpl)});
  const rs = await p.search('rain (heavy)', {type: 'music', commercialUseOnly: true, limit: 5});
  const q = String(new URL(calls[0].url).searchParams.get('q'));
  assert.match(q, /mediatype:audio/);
  assert.match(q, /licenseurl:\*/);
  assert.match(q, /publicdomain/);
  assert.ok(!q.includes('(heavy)'), 'query syntax must be stripped');
  assert.equal(rs.length, 1);
  assert.equal(rs[0].id, 'archive:item1/rain loop.mp3');
  assert.equal(rs[0].durationSec, 75);
  assert.equal(rs[0].creator, 'Someone');
  assert.equal(rs[0].license, 'CC0');
  assert.equal(rs[0].downloadUrl, 'https://archive.org/download/item1/rain%20loop.mp3');
  assert.equal(rs[0].sourceUrl, 'https://archive.org/details/item1');
});

test('archive: parseLength', () => {
  assert.equal(parseLength('3763'), 3763);
  assert.equal(parseLength('62:43'), 3763);
  assert.equal(parseLength('1:02:43'), 3763);
  assert.equal(parseLength(''), null);
  assert.equal(parseLength(undefined), null);
});

// --- Local packs ------------------------------------------------------------

test('local packs: indexes names, reads licenses, WAV duration, offline', async () => {
  const dir = await tmpDir();
  await fs.mkdir(path.join(dir, 'kenney_interface-sounds', 'Audio'), {recursive: true});
  await fs.writeFile(path.join(dir, 'kenney_interface-sounds', 'License.txt'),
    'Interface Sounds by Kenney (www.kenney.nl)\nLicense: (Creative Commons Zero, CC0)\nhttp://creativecommons.org/publicdomain/zero/1.0/\n');
  await fs.writeFile(path.join(dir, 'kenney_interface-sounds', 'Audio', 'clickSwitch_01.wav'), wavBytes(2));
  await fs.writeFile(path.join(dir, 'kenney_interface-sounds', 'Audio', 'error_003.ogg'), 'x');
  await fs.mkdir(path.join(dir, 'oga-mixed', 'music'), {recursive: true});
  await fs.writeFile(path.join(dir, 'oga-mixed', 'README.txt'), 'Some tracks CC-BY 3.0, others CC0.');
  await fs.writeFile(path.join(dir, 'oga-mixed', 'music', 'battle-theme.ogg'), 'x');
  await fs.mkdir(path.join(dir, 'by-pack'), {recursive: true});
  await fs.writeFile(path.join(dir, 'by-pack', 'pack.json'), JSON.stringify({license: 'CC-BY 4.0', creator: 'Jane', sourceUrl: 'https://opengameart.org/x', type: 'sfx'}));
  await fs.writeFile(path.join(dir, 'by-pack', 'laser click.mp3'), 'x');

  const p = createLocalPacks({packsDir: dir});
  const clicks = await p.search('click', sfx);
  assert.deepEqual(clicks.map((r) => r.id).sort(), ['local:by-pack/laser click.mp3', 'local:kenney_interface-sounds/Audio/clickSwitch_01.wav']);
  const kenney = clicks.find((r) => r.id.includes('kenney'));
  assert.equal(kenney?.license, 'CC0');
  assert.equal(kenney?.creator, 'Kenney');
  assert.equal(kenney?.durationSec, 2);
  const jane = clicks.find((r) => r.id.includes('by-pack'));
  assert.equal(jane?.license, 'CC-BY');
  assert.match(String(jane?.attributionText), /by Jane/);

  // Two licenses in one readme → unknown; folder name "music" → music type.
  const [battle] = await p.search('battle', {...sfx, type: 'music'});
  assert.equal(battle.license, 'unknown');
  assert.equal(battle.allowsCommercialUse, false);

  // copyTo refuses paths outside the packs dir.
  await assert.rejects(p.copyTo?.({...battle, id: 'local:../../etc/passwd'}, path.join(dir, 'x')) ?? Promise.reject(new Error('escapes')), /escapes/);
});

test('local packs: missing directory just returns nothing', async () => {
  const p = createLocalPacks({packsDir: '/nonexistent/audio-packs'});
  assert.deepEqual(await p.search('anything', sfx), []);
});

test('detectLicenseInText', () => {
  assert.equal(detectLicenseInText('CC0 1.0 Universal — public domain dedication'), 'CC0');
  assert.equal(detectLicenseInText('Licensed CC-BY 3.0'), 'CC-BY');
  assert.equal(detectLicenseInText('Use however you like'), null);
  assert.equal(detectLicenseInText('CC-BY-NC 4.0 and CC0'), null);
});
