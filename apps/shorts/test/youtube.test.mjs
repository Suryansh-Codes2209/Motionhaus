import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {upsertEnv} from '../src/config.mjs';
import {createYouTube, insertBody, validateMeta} from '../src/youtube.mjs';

const meta = {title: 'Reverse engineer ANY app? #shorts', description: 'desc', tags: ['a', 'b c'], privacy: /** @type {const} */ ('public')};

test('validateMeta catches what YouTube rejects', () => {
  assert.deepEqual(validateMeta(meta), []);
  assert.match(validateMeta({...meta, title: 'x'.repeat(101)}).join(), /max 100/);
  assert.match(validateMeta({...meta, description: 'a <b> c'}).join(), /< or >/);
  assert.match(validateMeta({...meta, tags: Array(60).fill('tenletters')}).join(), /max 500/);
  assert.match(validateMeta({...meta, publishAt: '2026-10-22T14:00:00Z'}).join(), /privacy "private"/);
  assert.match(validateMeta({...meta, description: 'Email [your contact email]'}).join(), /placeholder/);
});

test('insertBody: category, kids flag, scheduling forces private', () => {
  const b = insertBody(meta);
  assert.equal(b.snippet.categoryId, '28');
  assert.equal(b.status.privacyStatus, 'public');
  assert.equal(b.status.selfDeclaredMadeForKids, false);
  const s = insertBody({...meta, privacy: undefined, publishAt: '2026-10-22T14:00:00.000Z'});
  assert.deepEqual([s.status.privacyStatus, s.status.publishAt], ['private', '2026-10-22T14:00:00.000Z']);
});

test('upload: refreshes once, resumable chunks via 308, returns id', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yt-test-'));
  const file = path.join(dir, 'v.mp4');
  await fs.writeFile(file, Buffer.alloc(9 * 1024 * 1024, 1)); // 2 chunks of ≤ 8 MB
  /** @type {{url: string, method: string, headers: any}[]} */
  const calls = [];
  /** @type {typeof fetch} */
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    calls.push({url, method: String(init.method ?? 'GET'), headers: init.headers});
    if (url.includes('oauth2.googleapis.com/token')) return Response.json({access_token: 'AT', expires_in: 3600});
    if (url.includes('uploadType=resumable')) return new Response(null, {status: 200, headers: {location: 'https://upload.example/session'}});
    if (url === 'https://upload.example/session') {
      const range = String(init.headers && /** @type {any} */ (init.headers)['content-range']);
      if (range.startsWith('bytes 0-')) return new Response(null, {status: 308, headers: {range: 'bytes=0-8388607'}});
      return Response.json({id: 'vid123'}, {status: 200});
    }
    throw new Error(`unexpected ${url}`);
  };
  const yt = createYouTube({clientId: 'c', clientSecret: 's', refreshToken: 'r', fetchImpl});
  /** @type {number[]} */
  const seen = [];
  const id = await yt.upload(file, meta, (sent) => seen.push(sent));
  assert.equal(id, 'vid123');
  assert.equal(calls.filter((c) => c.url.includes('/token')).length, 1, 'access token cached');
  const puts = calls.filter((c) => c.method === 'PUT');
  assert.deepEqual(puts.map((c) => c.headers['content-range']), ['bytes 0-8388607/9437184', 'bytes 8388608-9437183/9437184']);
  assert.deepEqual(seen, [8388608, 9437184]);
});

test('captions: multipart body with snippet + srt; thumbnail: raw png, size-checked', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yt-cap-'));
  const srt = path.join(dir, 'v.en.srt');
  const png = path.join(dir, 't.png');
  await fs.writeFile(srt, '1\n00:00:00,000 --> 00:00:01,000\nHi.\n');
  await fs.writeFile(png, Buffer.alloc(1000, 1));
  /** @type {{url: string, headers: any, body: any}[]} */
  const calls = [];
  /** @type {typeof fetch} */
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    if (url.includes('/token')) return Response.json({access_token: 'AT', expires_in: 3600});
    calls.push({url, headers: init.headers, body: init.body});
    return Response.json(url.includes('/captions') ? {id: 'cap1'} : {});
  };
  const yt = createYouTube({clientId: 'c', clientSecret: 's', refreshToken: 'r', fetchImpl});
  assert.equal(await yt.captions('vid', srt), 'cap1');
  const body = String(calls[0].body);
  assert.match(calls[0].url, /upload\/youtube\/v3\/captions\?uploadType=multipart&part=snippet/);
  assert.match(calls[0].headers['content-type'], /^multipart\/related; boundary=/);
  assert.match(body, /"videoId":"vid","language":"en"/);
  assert.match(body, /00:00:00,000 --> 00:00:01,000/);
  await yt.thumbnail('vid', png);
  assert.match(calls[1].url, /thumbnails\/set\?uploadType=media&videoId=vid/);
  assert.equal(calls[1].headers['content-type'], 'image/png');
  await fs.writeFile(png, Buffer.alloc(3 * 1024 * 1024, 1));
  await assert.rejects(yt.thumbnail('vid', png), /max 2 MB/);
});

test('upload refuses bad metadata before any request', async () => {
  let called = false;
  const yt = createYouTube({clientId: 'c', clientSecret: 's', refreshToken: 'r', fetchImpl: async () => ((called = true), Response.json({}))});
  await assert.rejects(yt.upload('/nope.mp4', {...meta, title: ''}), /title is empty/);
  assert.equal(called, false);
});

test('missing refresh token has a clear error', async () => {
  const yt = createYouTube({clientId: 'c', clientSecret: 's', fetchImpl: async () => Response.json({})});
  await assert.rejects(yt.channel(), /shorts auth/);
});

test('upsertEnv replaces or appends, keeps other lines', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'env-test-'));
  const f = path.join(dir, '.env');
  await fs.writeFile(f, '# keys\nA=1\nYOUTUBE_REFRESH_TOKEN=\n');
  await upsertEnv(f, 'YOUTUBE_REFRESH_TOKEN', 'tok');
  await upsertEnv(f, 'NEW', 'x');
  assert.equal(await fs.readFile(f, 'utf8'), '# keys\nA=1\nYOUTUBE_REFRESH_TOKEN=tok\nNEW=x\n');
  await upsertEnv(path.join(dir, 'fresh.env'), 'K', 'v');
  assert.equal(await fs.readFile(path.join(dir, 'fresh.env'), 'utf8'), 'K=v\n');
});
