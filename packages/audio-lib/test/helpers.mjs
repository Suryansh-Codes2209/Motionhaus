// Test helpers: a routing fetch mock (no live HTTP in unit tests) and temp dirs.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * @typedef {object} Route
 * @property {RegExp} match
 * @property {(url: URL, init: RequestInit) => Response | Promise<Response>} reply
 */

/** @param {Route[]} routes */
export function mockFetch(routes) {
  /** @type {{url: string, init: RequestInit}[]} */
  const calls = [];
  /** @type {typeof fetch} */
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    calls.push({url, init});
    const route = routes.find((r) => r.match.test(url));
    if (!route) throw Object.assign(new TypeError('fetch failed'), {cause: {code: 'ENOTFOUND'}});
    return route.reply(new URL(url), init);
  };
  return {fetchImpl, calls};
}

/** @param {unknown} body @param {number} [status] */
export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});

/** @param {string} [type] */
export const audio = (type = 'audio/mpeg') => new Response(new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3]), {headers: {'content-type': type}});

export const noSleep = async () => {};

export async function tmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'audio-lib-test-'));
}

/** Header value from a RequestInit, regardless of shape. @param {RequestInit} init @param {string} name */
export const header = (init, name) => new Headers(init.headers).get(name);

/** A 1-second mono 8kHz 8-bit WAV. */
export function wavBytes(seconds = 1) {
  const rate = 8000;
  const data = rate * seconds;
  const b = Buffer.alloc(44 + data);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(36 + data, 4);
  b.write('WAVE', 8, 'ascii');
  b.write('fmt ', 12, 'ascii');
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28); // byte rate
  b.writeUInt16LE(1, 32);
  b.writeUInt16LE(8, 34);
  b.write('data', 36, 'ascii');
  b.writeUInt32LE(data, 40);
  return b;
}

/** A YouTube channel Atom feed fixture (two entries + one malformed). */
export const FEED = `<?xml version="1.0"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Linear</title>
 <entry>
  <yt:videoId>rZk0QrxPpw8</yt:videoId>
  <title>Introducing coding sessions &amp; more</title>
  <author><name>Linear</name></author>
  <published>2026-06-11T16:00:00+00:00</published>
  <media:group><media:description>Launch day. 0:00 Intro</media:description>
   <media:community><media:statistics views="16129"/></media:community></media:group>
 </entry>
 <entry>
  <yt:videoId>eQirSQ6Vpkw</yt:videoId>
  <title>Loops updates</title>
  <author><name>Linear</name></author>
  <published>2026-09-14T16:03:19+00:00</published>
  <media:group><media:description>Recurring workflows</media:description></media:group>
 </entry>
 <entry><title>no id</title></entry>
</feed>`;
