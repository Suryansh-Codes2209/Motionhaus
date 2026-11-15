import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {test} from 'node:test';
import {createHttp, HttpError, NetworkError, redact} from '../src/http.mjs';
import {audio, json, mockFetch, noSleep, tmpDir} from './helpers.mjs';

test('retries 429 and 5xx with backoff, then succeeds', async () => {
  let n = 0;
  /** @type {number[]} */
  const sleeps = [];
  const {fetchImpl} = mockFetch([{match: /./, reply: () => (++n < 3 ? json({}, n === 1 ? 429 : 503) : json({ok: true}))}]);
  const http = createHttp({provider: 't', minIntervalMs: 0, fetchImpl, sleepFn: async (ms) => void sleeps.push(ms)});
  assert.deepEqual(await http.getJson('https://x.test/a'), {ok: true});
  assert.equal(n, 3);
  assert.equal(sleeps.filter((s) => s > 0).length, 2);
});

test('gives up after the retry budget', async () => {
  const {fetchImpl, calls} = mockFetch([{match: /./, reply: () => json({}, 500)}]);
  const http = createHttp({provider: 't', minIntervalMs: 0, retries: 2, fetchImpl, sleepFn: noSleep});
  await assert.rejects(http.getJson('https://x.test/a'), (e) => e instanceof HttpError && e.status === 500);
  assert.equal(calls.length, 3);
});

test('does not retry 4xx other than 429', async () => {
  const {fetchImpl, calls} = mockFetch([{match: /./, reply: () => json({}, 401)}]);
  const http = createHttp({provider: 't', minIntervalMs: 0, fetchImpl, sleepFn: noSleep});
  await assert.rejects(http.getJson('https://x.test/a'), HttpError);
  assert.equal(calls.length, 1);
});

test('network failures and timeouts become NetworkError', async () => {
  const {fetchImpl} = mockFetch([]);
  const http = createHttp({provider: 't', minIntervalMs: 0, retries: 1, fetchImpl, sleepFn: noSleep});
  await assert.rejects(http.getJson('https://x.test/a'), NetworkError);

  /** @type {typeof fetch} */
  const hang = (_u, init) =>
    new Promise((_r, reject) => {
      // AbortSignal.timeout's timer is unref'd; keep the event loop alive like a real socket would.
      const keepAlive = setInterval(() => {}, 10);
      init?.signal?.addEventListener('abort', () => {
        clearInterval(keepAlive);
        reject(init.signal?.reason);
      });
    });
  const slow = createHttp({provider: 't', minIntervalMs: 0, retries: 0, timeoutMs: 20, fetchImpl: hang, sleepFn: noSleep});
  await assert.rejects(slow.getJson('https://x.test/a'), /timed out/);
});

test('every request carries a timeout signal', async () => {
  const {fetchImpl, calls} = mockFetch([{match: /./, reply: () => json({})}]);
  await createHttp({provider: 't', minIntervalMs: 0, fetchImpl}).getJson('https://x.test/a');
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test('download streams to disk and rejects HTML or oversized bodies', async () => {
  const dir = await tmpDir();
  const {fetchImpl} = mockFetch([
    {match: /ok/, reply: () => audio()},
    {match: /html/, reply: () => new Response('<html>', {headers: {'content-type': 'text/html'}})},
  ]);
  const http = createHttp({provider: 't', minIntervalMs: 0, fetchImpl, sleepFn: noSleep});
  const dest = path.join(dir, 'a.mp3');
  const r = await http.download('https://x.test/ok', dest);
  assert.equal(r.bytes, 6);
  assert.equal((await fs.readFile(dest)).length, 6);
  await assert.rejects(http.download('https://x.test/html', path.join(dir, 'b')), /expected audio/);
  await assert.rejects(http.download('https://x.test/ok', path.join(dir, 'c'), {maxBytes: 3}), /exceeded/);
  assert.deepEqual((await fs.readdir(dir)).sort(), ['a.mp3']);
});

test('redacts credentials from URLs', () => {
  assert.equal(redact('https://a.test/?client_id=abc&q=x&token=zzz'), 'https://a.test/?client_id=***&q=x&token=***');
});
