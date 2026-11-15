import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {createInstagram, exchangeToken, findAccount, grantedPermissions, GRAPH_VERSION, validateReel} from '../src/instagram-api.mjs';

/**
 * A fetch that records calls and answers from `route(url, method, call)`.
 * @param {(url: string, method: string, n: number) => any} route  returns a JSON body, or {status, body}
 */
function fake(route) {
  /** @type {{url: string, method: string, headers: any, body: URLSearchParams, raw: any}[]} */
  const calls = [];
  /** @type {typeof fetch} */
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    const method = String(init.method ?? 'GET');
    const body = init.body instanceof URLSearchParams ? init.body : new URLSearchParams();
    calls.push({url, method, headers: init.headers ?? {}, body, raw: init.body});
    const r = route(url, method, calls.length);
    if (r && typeof r === 'object' && 'status' in r && 'body' in r) return Response.json(r.body, {status: r.status});
    return Response.json(r);
  };
  return {calls, fetchImpl};
}

async function tmpVideo(bytes = 1234) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-test-'));
  const file = path.join(dir, 'reel.mp4');
  await fs.writeFile(file, Buffer.alloc(bytes, 1));
  return file;
}

const noSleep = async () => {};

test('validateReel: caption and size limits', () => {
  assert.deepEqual(validateReel('ok #a @b', 1000), []);
  assert.match(validateReel('x'.repeat(2201), 1000).join(), /2,200/);
  assert.match(validateReel(Array(31).fill('#t').join(' '), 1000).join(), /30 hashtags/);
  assert.match(validateReel(Array(21).fill('@u').join(' '), 1000).join(), /20 mentions/);
  assert.match(validateReel('ok', 301 * 1024 * 1024).join(), /300 MB/);
  assert.match(validateReel('  ', 1000).join(), /empty/);
  assert.match(validateReel('ok', 0).join(), /empty/);
});

test('publishReel: container → rupload → poll → publish → permalink', async () => {
  const file = await tmpVideo();
  let polls = 0;
  const {calls, fetchImpl} = fake((url, method) => {
    if (url.includes('rupload.facebook.com')) return {success: true};
    if (method === 'POST' && url.endsWith('/IG/media')) return {id: 'C1'};
    if (url.includes('/C1?')) return {status_code: ++polls < 2 ? 'IN_PROGRESS' : 'FINISHED'};
    if (method === 'POST' && url.endsWith('/IG/media_publish')) return {id: 'M1'};
    if (url.includes('/M1?')) return {permalink: 'https://www.instagram.com/reel/x/'};
    throw new Error(`unexpected ${method} ${url}`);
  });
  const ig = createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: noSleep});
  /** @type {string[]} */
  const steps = [];
  const r = await ig.publishReel(file, {caption: 'cap', thumbOffsetMs: 1200, shareToFeed: true, userTags: ['@maker']}, (s, id) => void steps.push(`${s}:${id}`));
  assert.deepEqual(r, {id: 'M1', permalink: 'https://www.instagram.com/reel/x/', containerId: 'C1'});
  assert.deepEqual(steps, ['container:C1', 'uploaded:C1', 'finished:C1']);

  const create = calls[0];
  assert.equal(create.url, `https://graph.facebook.com/${GRAPH_VERSION}/IG/media`);
  assert.equal(GRAPH_VERSION, 'v27.0');
  assert.equal(create.body.get('media_type'), 'REELS');
  assert.equal(create.body.get('upload_type'), 'resumable');
  assert.equal(create.body.get('caption'), 'cap');
  assert.equal(create.body.get('thumb_offset'), '1200');
  assert.equal(create.body.get('share_to_feed'), 'true');
  assert.equal(create.body.get('user_tags'), JSON.stringify([{username: 'maker'}]));
  assert.equal(create.body.get('access_token'), 'PT');

  const up = calls[1];
  assert.equal(up.url, 'https://rupload.facebook.com/ig-api-upload/v27.0/C1');
  assert.equal(up.method, 'POST');
  assert.equal(up.headers.authorization, 'OAuth PT');
  assert.equal(up.headers.offset, '0');
  assert.equal(up.headers.file_size, '1234');
  assert.equal(up.raw.length, 1234);

  const pub = calls.find((c) => c.url.endsWith('/media_publish'));
  assert.equal(pub?.body.get('creation_id'), 'C1');
});

test('publishReel: no optional fields when not given', async () => {
  const file = await tmpVideo();
  const {calls, fetchImpl} = fake((url, method) => {
    if (url.includes('rupload')) return {success: true};
    if (url.endsWith('/media')) return {id: 'C1'};
    if (url.includes('/C1?')) return {status_code: 'FINISHED'};
    if (url.endsWith('/media_publish')) return {id: 'M1'};
    return {permalink: 'p'};
  });
  await createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: noSleep}).publishReel(file, {caption: 'cap'});
  assert.equal(calls[0].body.has('thumb_offset'), false);
  assert.equal(calls[0].body.has('user_tags'), false);
  assert.equal(calls[0].body.has('share_to_feed'), false);
});

test('publishReel: invalid caption fails before any request', async () => {
  const file = await tmpVideo();
  const {calls, fetchImpl} = fake(() => ({}));
  const ig = createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: noSleep});
  await assert.rejects(ig.publishReel(file, {caption: 'x'.repeat(3000)}), /2,200/);
  assert.equal(calls.length, 0);
});

for (const bad of ['ERROR', 'EXPIRED']) {
  test(`publishReel: ${bad} status throws and does not publish`, async () => {
    const file = await tmpVideo();
    const {calls, fetchImpl} = fake((url) => {
      if (url.includes('rupload')) return {success: true};
      if (url.endsWith('/media')) return {id: 'C1'};
      if (url.includes('/C1?')) return {status_code: bad, status: 'Error: bad video'};
      return {id: 'M1'};
    });
    const ig = createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: noSleep});
    await assert.rejects(ig.publishReel(file, {caption: 'cap'}), new RegExp(`status ${bad}`));
    assert.equal(calls.some((c) => c.url.endsWith('/media_publish')), false);
  });
}

test('upload that Instagram does not accept throws', async () => {
  const file = await tmpVideo();
  const {fetchImpl} = fake((url) => (url.includes('rupload') ? {success: false, message: 'nope'} : {id: 'C1'}));
  const ig = createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: noSleep});
  await assert.rejects(ig.upload('C1', file), /upload.*nope/i);
});

test('waitFinished gives up after 40 polls', async () => {
  const {calls, fetchImpl} = fake(() => ({status_code: 'IN_PROGRESS'}));
  const ig = createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: noSleep});
  await assert.rejects(ig.waitFinished('C1'), /still processing/);
  assert.equal(calls.length, 40);
});

test('publishReel: a failed upload reply whose bytes arrived anyway is still published', async () => {
  const file = await tmpVideo();
  let polls = 0;
  const {calls, fetchImpl} = fake((url, method) => {
    if (url.includes('rupload')) return {status: 400, body: {error: {message: 'Request processing failed', code: 1}}};
    if (method === 'POST' && url.endsWith('/IG/media')) return {id: 'C1'};
    if (url.includes('/C1?')) return {status_code: ++polls < 2 ? 'IN_PROGRESS' : 'FINISHED'};
    if (method === 'POST' && url.endsWith('/IG/media_publish')) return {id: 'M1'};
    if (url.includes('/M1?')) return {permalink: 'https://www.instagram.com/reel/x/'};
    throw new Error(`unexpected ${method} ${url}`);
  });
  const ig = createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: noSleep});
  /** @type {string[]} */
  const steps = [];
  const r = await ig.publishReel(file, {caption: 'cap'}, (s, id) => void steps.push(`${s}:${id}`));
  assert.deepEqual(r, {id: 'M1', permalink: 'https://www.instagram.com/reel/x/', containerId: 'C1'});
  assert.deepEqual(steps, ['container:C1', 'uploaded:C1', 'finished:C1']);
  assert.equal(calls.filter((c) => c.url.endsWith('/media_publish')).length, 1);
});

test('publishReel: a failed upload that never finishes processing rejects with the upload error', async () => {
  const file = await tmpVideo();
  let polls = 0;
  const {calls, fetchImpl} = fake((url, method) => {
    if (url.includes('rupload')) return {status: 400, body: {error: {message: 'Request processing failed', code: 1}}};
    if (method === 'POST' && url.endsWith('/IG/media')) return {id: 'C1'};
    if (url.includes('/C1?')) return (polls++, {status_code: 'IN_PROGRESS'});
    throw new Error(`unexpected ${method} ${url}`);
  });
  const ig = createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: noSleep});
  await assert.rejects(ig.publishReel(file, {caption: 'cap'}), /Request processing failed/);
  assert.equal(polls, 12);
  assert.equal(calls.some((c) => c.url.endsWith('/media_publish')), false);
});

const NOT_READY = {status: 400, body: {error: {message: 'Media ID is not available', code: 9007, error_subcode: 2207027, error_user_msg: 'The media is not ready for publishing, please wait for a moment'}}};

test('publish: "not ready" is retried after 10 s', async () => {
  let pubs = 0;
  const {fetchImpl} = fake((url) => {
    if (url.endsWith('/media_publish')) return ++pubs <= 2 ? NOT_READY : {id: 'M1'};
    if (url.includes('/M1?')) return {permalink: 'p'};
    throw new Error(`unexpected ${url}`);
  });
  /** @type {number[]} */
  const slept = [];
  const ig = createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: async (ms) => void slept.push(ms)});
  assert.deepEqual(await ig.publish('C1'), {id: 'M1', permalink: 'p'});
  assert.equal(pubs, 3);
  assert.deepEqual(slept, [10_000, 10_000]);
});

test('publish: still not ready after 4 attempts rejects', async () => {
  let pubs = 0;
  const {fetchImpl} = fake((url) => {
    if (url.endsWith('/media_publish')) return (pubs++, NOT_READY);
    throw new Error(`unexpected ${url}`);
  });
  const ig = createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: noSleep});
  const err = await ig.publish('C1').then(() => null, (e) => e);
  assert.match(err.message, /not ready for publishing/);
  assert.equal(err.code, 9007);
  assert.equal(err.subcode, 2207027);
  assert.equal(pubs, 4);
});

test('publish: any other error is not retried', async () => {
  let pubs = 0;
  const {fetchImpl} = fake((url) => {
    if (url.endsWith('/media_publish')) return (pubs++, {status: 400, body: {error: {message: 'Error validating access token', code: 190}}});
    throw new Error(`unexpected ${url}`);
  });
  const ig = createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: noSleep});
  await assert.rejects(ig.publish('C1'), /validating access token/);
  assert.equal(pubs, 1);
});

test('API error carries the Graph code', async () => {
  const {fetchImpl} = fake(() => ({status: 400, body: {error: {message: 'Error validating access token', code: 190}}}));
  const ig = createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: noSleep});
  const err = await ig.account().then(() => null, (e) => e);
  assert.match(err.message, /^Instagram API 400: Error validating access token/);
  assert.equal(err.code, 190);
});

test('a non-JSON error page still gives a readable error', async () => {
  /** @type {typeof fetch} */
  const fetchImpl = async () => new Response('<html>Bad Gateway</html>', {status: 502});
  const ig = createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: noSleep});
  await assert.rejects(ig.account(), /^Error: Instagram API 502: <html>Bad Gateway/);
});

test('account returns id and username', async () => {
  const {calls, fetchImpl} = fake(() => ({id: 'IG', username: 'thelaunchradar.hq'}));
  const ig = createInstagram({pageToken: 'PT', igUserId: 'IG', fetchImpl, sleep: noSleep});
  assert.deepEqual(await ig.account(), {id: 'IG', username: 'thelaunchradar.hq'});
  assert.match(calls[0].url, /\/IG\?fields=id%2Cusername&access_token=PT$/);
});

test('missing credentials name the command to run', () => {
  assert.throws(() => createInstagram({pageToken: '', igUserId: ''}), /shorts insta-auth/);
});

const PAGES = {
  data: [
    {name: 'Other', access_token: 'P0', instagram_business_account: {id: '1', username: 'other_account'}},
    {name: 'No IG', access_token: 'P1'},
    {name: 'Launch Radar', access_token: 'P2', instagram_business_account: {id: '2', username: 'thelaunchradar.hq'}},
  ],
};

test('findAccount picks the Page whose Instagram username matches the handle', async () => {
  const {calls, fetchImpl} = fake(() => PAGES);
  const a = await findAccount({userToken: 'UT', handle: '@TheLaunchRadar.HQ', fetchImpl});
  assert.deepEqual(a, {pageToken: 'P2', igUserId: '2', username: 'thelaunchradar.hq', page: 'Launch Radar'});
  assert.match(calls[0].url, /\/me\/accounts\?/);
  assert.match(calls[0].url, /access_token=UT/);
});

test('findAccount falls back to connected_instagram_account', async () => {
  const {fetchImpl} = fake(() => ({data: [{name: 'LR', access_token: 'P9', connected_instagram_account: {id: '9', username: 'thelaunchradar.hq'}}]}));
  assert.deepEqual(await findAccount({userToken: 'UT', handle: '@thelaunchradar.hq', fetchImpl}), {pageToken: 'P9', igUserId: '9', username: 'thelaunchradar.hq', page: 'LR'});
});

test('findAccount lists what it found when nothing matches', async () => {
  const {fetchImpl} = fake(() => ({data: PAGES.data.slice(0, 2)}));
  await assert.rejects(findAccount({userToken: 'UT', handle: '@thelaunchradar.hq', fetchImpl}), /found: @other_account/);
  const unlinked = fake(() => ({data: [{name: 'No IG', access_token: 'P1'}]}));
  await assert.rejects(findAccount({userToken: 'UT', handle: '@x', fetchImpl: unlinked.fetchImpl}), /Pages seen: "No IG"/);
  const none = fake(() => ({data: []}));
  await assert.rejects(findAccount({userToken: 'UT', handle: '@x', fetchImpl: none.fetchImpl}), /no Facebook Page/);
});

test('exchangeToken calls oauth/access_token with fb_exchange_token', async () => {
  const {calls, fetchImpl} = fake(() => ({access_token: 'LONG', expires_in: 5184000}));
  assert.equal(await exchangeToken({appId: 'A', appSecret: 'S', userToken: 'UT', fetchImpl}), 'LONG');
  const u = new URL(calls[0].url);
  assert.equal(u.pathname, `/${GRAPH_VERSION}/oauth/access_token`);
  assert.equal(u.searchParams.get('grant_type'), 'fb_exchange_token');
  assert.equal(u.searchParams.get('client_id'), 'A');
  assert.equal(u.searchParams.get('client_secret'), 'S');
  assert.equal(u.searchParams.get('fb_exchange_token'), 'UT');
});

test('grantedPermissions reports what the sign-in left out', async () => {
  const {fetchImpl} = fake(() => ({data: [{permission: 'pages_show_list', status: 'granted'}, {permission: 'instagram_basic', status: 'declined'}, {permission: 'public_profile', status: 'granted'}]}));
  const r = await grantedPermissions({userToken: 'UT', fetchImpl});
  assert.deepEqual(r.granted, ['pages_show_list', 'public_profile']);
  assert.deepEqual(r.missing, ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement']);
});
