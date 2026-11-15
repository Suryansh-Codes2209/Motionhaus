import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {postDue} from '../src/insta-post.mjs';

const CAPTION = 'A hook\n\nWhat it is.\nMade by @maker.one @second\n\nWould you use it? 👇\n\n#devtools';

/**
 * A temp review/instagram-reels folder with three kits and fakes for
 * everything postDue touches.
 * @param {{entries?: any[], ig?: Record<string, any>, gate?: any, deps?: Record<string, any>}} [o]
 */
async function setup(o = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'igpost-'));
  const entries = o.entries ?? [
    {n: '043', dir: '043-a', file: 'a.mp4', date: '2026-11-12', time: '19:30'},
    {n: '044', dir: '044-b', file: 'b.mp4', date: '2026-11-13', time: '19:30'},
    {n: '045', dir: '045-c', file: 'c.mp4', date: '2026-11-14', time: '19:30'},
  ];
  for (const e of entries) {
    await fs.mkdir(path.join(root, e.dir), {recursive: true});
    await fs.writeFile(path.join(root, e.dir, e.file), Buffer.alloc(64, 1));
    await fs.writeFile(path.join(root, e.dir, 'caption.txt'), CAPTION + '\n');
  }
  const scheduleFile = path.join(root, 'schedule.json');
  await fs.writeFile(scheduleFile, JSON.stringify(entries, null, 1) + '\n');
  /** @type {{file: string, opts: any}[]} */
  const published = [];
  /** @type {{title: string, body: string}[]} */
  const notes = [];
  /** @type {string[]} */
  const gated = [];
  /** @type {any[]} */
  const recorded = [];
  /** @type {string[]} */
  const waited = [];
  const ig = {
    publishReel: async (/** @type {string} */ file, /** @type {any} */ opts, /** @type {any} */ onStep) => {
      published.push({file, opts});
      await onStep?.('container', 'C1');
      return {id: 'M1', permalink: 'https://www.instagram.com/reel/x/', containerId: 'C1'};
    },
    containerStatus: async () => 'EXPIRED',
    // By default a saved upload never finishes, so recovery starts over.
    waitFinished: async (/** @type {string} */ id) => { waited.push(id); throw new Error('Instagram is still processing the reel after 10 minutes'); },
    publish: async () => ({id: 'M2', permalink: 'https://www.instagram.com/reel/y/'}),
    ...o.ig,
  };
  const deps = {
    scheduleFile,
    kitsDir: root,
    stateFile: path.join(root, '.autopilot-state.json'),
    now: {date: '2026-11-13', time: '19:31', iso: '2026-11-13T14:01:00.000Z'},
    after: 43,
    slotTime: '19:30',
    channelName: 'Alpha Channel',
    coverFrameMs: 1200,
    ig,
    gate: o.gate ?? (async (/** @type {string} */ f) => (gated.push(f), {verdict: 'green', reasons: []})),
    notify: async (/** @type {string} */ title, /** @type {string} */ body) => void notes.push({title, body}),
    onPosted: async (/** @type {any} */ entry, /** @type {any} */ r) => void recorded.push({n: entry.n, id: r.id}),
    ...o.deps,
  };
  const schedule = async () => JSON.parse(await fs.readFile(scheduleFile, 'utf8'));
  const entry = async (/** @type {string} */ n) => (await schedule()).find((/** @type {any} */ e) => e.n === n);
  return {root, deps, published, notes, gated, recorded, waited, schedule, entry, scheduleFile};
}

test('posts the due entry with its caption, cover frame and tags', async () => {
  const t = await setup();
  const r = await postDue(t.deps);
  assert.equal(r.outcome, 'posted');
  assert.equal(t.published.length, 1);
  assert.equal(t.published[0].file, path.join(t.root, '044-b', 'b.mp4'));
  assert.deepEqual(t.published[0].opts, {caption: CAPTION, thumbOffsetMs: 1200, shareToFeed: true, userTags: ['@maker.one', '@second']});
  assert.deepEqual(t.gated, [path.join(t.root, '044-b', 'b.mp4')]);
  const e = await t.entry('044');
  assert.deepEqual(e.posted, {id: 'M1', permalink: 'https://www.instagram.com/reel/x/', at: '2026-11-13T14:01:00.000Z'});
  assert.equal('containerId' in e, false);
  assert.equal(t.notes.length, 1);
  assert.match(t.notes[0].body, /instagram\.com\/reel\/x/);
  assert.deepEqual(t.recorded, [{n: '044', id: 'M1'}]);
  assert.equal((await t.entry('043')).posted, undefined); // the backlog is untouched
  await assert.rejects(fs.stat(`${t.scheduleFile}.lock`)); // lock released
});

test('a second run the same day does nothing', async () => {
  const t = await setup();
  await postDue(t.deps);
  const r = await postDue({...t.deps, now: {date: '2026-11-13', time: '19:46', iso: 'x'}});
  assert.equal(r.outcome, 'idle');
  assert.match(r.detail, /already posted today/);
  assert.equal(t.published.length, 1);
  assert.equal(t.notes.length, 1);
});

test('before the slot: idle, nothing sent, no notification', async () => {
  const t = await setup({deps: {now: {date: '2026-11-13', time: '10:00', iso: 'x'}}});
  const r = await postDue(t.deps);
  assert.equal(r.outcome, 'idle');
  assert.equal(t.published.length, 0);
  assert.equal(t.notes.length, 0);
});

test('a red gate blocks the reel and says why', async () => {
  const t = await setup({gate: async () => ({verdict: 'red', reasons: ['near-blank frames at 3–4s']})});
  const r = await postDue(t.deps);
  assert.equal(r.outcome, 'blocked');
  assert.equal(t.published.length, 0);
  const e = await t.entry('044');
  assert.match(e.blocked.reason, /near-blank frames/);
  assert.equal(t.notes.length, 1);
  assert.match(t.notes[0].body, /near-blank/);
  // and it stays blocked on the next run, quietly
  assert.equal((await postDue(t.deps)).outcome, 'idle');
  assert.equal(t.notes.length, 1);
});

test('a gate that cannot run fails the run and posts nothing', async () => {
  const t = await setup({gate: async () => { throw new Error('ffmpeg not found'); }});
  const r = await postDue(t.deps);
  assert.equal(r.outcome, 'failed');
  assert.equal(t.published.length, 0);
  assert.equal((await t.entry('044')).blocked, undefined);
});

test('a failed upload leaves the entry unposted and notifies once per error', async () => {
  const t = await setup({ig: {publishReel: async () => { throw new Error('Instagram API 500: try later'); }}});
  assert.equal((await postDue(t.deps)).outcome, 'failed');
  assert.equal((await postDue(t.deps)).outcome, 'failed');
  assert.equal((await t.entry('044')).posted, undefined);
  assert.equal(t.notes.length, 1);
  assert.match(t.notes[0].body, /try later/);
});

test('a dead token points at insta-auth', async () => {
  const dead = Object.assign(new Error('Instagram API 400: Error validating access token'), {code: 190});
  const t = await setup({ig: {publishReel: async () => { throw dead; }}});
  await postDue(t.deps);
  assert.match(t.notes[0].body, /shorts insta-auth/);
});

test('crash recovery: an upload that was already published is recorded, not repeated', async () => {
  const t = await setup({ig: {containerStatus: async () => 'PUBLISHED'}});
  await fs.writeFile(t.scheduleFile, JSON.stringify((await t.schedule()).map((/** @type {any} */ e) => (e.n === '044' ? {...e, containerId: 'C0'} : e)), null, 1) + '\n');
  const r = await postDue(t.deps);
  assert.equal(r.outcome, 'posted');
  assert.equal(t.published.length, 0);
  const e = await t.entry('044');
  assert.equal(e.posted.at, '2026-11-13T14:01:00.000Z');
  assert.equal('containerId' in e, false);
});

test('crash recovery: a processed upload is published without uploading again', async () => {
  /** @type {string[]} */
  const pubs = [];
  const t = await setup({ig: {containerStatus: async () => 'FINISHED', publish: async (/** @type {string} */ id) => (pubs.push(id), {id: 'M2', permalink: 'https://www.instagram.com/reel/y/'})}});
  await fs.writeFile(t.scheduleFile, JSON.stringify((await t.schedule()).map((/** @type {any} */ e) => (e.n === '044' ? {...e, containerId: 'C0'} : e)), null, 1) + '\n');
  const r = await postDue(t.deps);
  assert.equal(r.outcome, 'posted');
  assert.deepEqual(pubs, ['C0']);
  assert.equal(t.published.length, 0);
  assert.equal((await t.entry('044')).posted.id, 'M2');
});

test('crash recovery: a dead upload starts over', async () => {
  const t = await setup({ig: {containerStatus: async () => 'ERROR'}});
  await fs.writeFile(t.scheduleFile, JSON.stringify((await t.schedule()).map((/** @type {any} */ e) => (e.n === '044' ? {...e, containerId: 'C0'} : e)), null, 1) + '\n');
  assert.equal((await postDue(t.deps)).outcome, 'posted');
  assert.equal(t.published.length, 1);
  assert.deepEqual(t.waited, []); // a dead container is not waited for
});

test('the container id is saved while the upload is in flight', async () => {
  /** @type {any} */
  let during = null;
  const t = await setup();
  t.deps.ig.publishReel = async (/** @type {string} */ _f, /** @type {any} */ _o, /** @type {any} */ onStep) => {
    await onStep('container', 'C9');
    during = await t.entry('044');
    return {id: 'M1', permalink: 'p', containerId: 'C9'};
  };
  await postDue(t.deps);
  assert.equal(during.containerId, 'C9');
});

test('autoPostAfter unset: refuses, and says so once', async () => {
  const t = await setup({deps: {after: undefined}});
  const r = await postDue(t.deps);
  assert.equal(r.outcome, 'idle');
  assert.match(r.detail, /set instagram\.autoPostAfter/);
  assert.equal(t.published.length, 0);
  await postDue(t.deps);
  assert.equal(t.notes.length, 1);
});

test('nothing queued today after the slot: one notification', async () => {
  const t = await setup({deps: {now: {date: '2026-11-20', time: '19:45', iso: 'x'}}});
  assert.equal((await postDue(t.deps)).outcome, 'idle');
  await postDue(t.deps);
  assert.equal(t.notes.length, 1);
  assert.match(t.notes[0].body, /nothing queued/i);
});

test('a held lock means another run is posting', async () => {
  const t = await setup();
  await fs.writeFile(`${t.scheduleFile}.lock`, 'x');
  const r = await postDue(t.deps);
  assert.equal(r.outcome, 'idle');
  assert.match(r.detail, /another run/);
  assert.equal(t.published.length, 0);
  await fs.stat(`${t.scheduleFile}.lock`); // not ours to remove
});

test('a stale lock is taken over', async () => {
  const t = await setup();
  await fs.writeFile(`${t.scheduleFile}.lock`, 'x');
  const old = new Date(Date.now() - 31 * 60_000);
  await fs.utimes(`${t.scheduleFile}.lock`, old, old);
  assert.equal((await postDue(t.deps)).outcome, 'posted');
});

test('--kit posts a named kit regardless of date and autoPostAfter, but never twice', async () => {
  const t = await setup({deps: {kit: '043-a', after: undefined}});
  assert.equal((await postDue(t.deps)).outcome, 'posted');
  assert.equal(t.published[0].file, path.join(t.root, '043-a', 'a.mp4'));
  const again = await postDue(t.deps);
  assert.equal(again.outcome, 'failed');
  assert.match(again.detail, /already posted/);
  assert.equal(t.published.length, 1);
  const missing = await postDue({...t.deps, kit: '999-nope'});
  assert.match(missing.detail, /no kit 999-nope/);
});

test('--dry-run sends nothing and changes nothing', async () => {
  const t = await setup({deps: {dryRun: true}});
  const before = await fs.readFile(t.scheduleFile, 'utf8');
  const r = await postDue(t.deps);
  assert.equal(r.outcome, 'idle');
  assert.match(r.detail, /would post #044/);
  assert.equal(t.published.length, 0);
  assert.equal(await fs.readFile(t.scheduleFile, 'utf8'), before);
  assert.equal(t.notes.length, 0);
});

test('a missing reel file or caption fails with the path', async () => {
  const t = await setup();
  await fs.rm(path.join(t.root, '044-b', 'caption.txt'));
  const r = await postDue(t.deps);
  assert.equal(r.outcome, 'failed');
  assert.match(r.detail, /caption\.txt/);
  assert.equal(t.published.length, 0);
});

test('days missed while the Mac was off are reported once', async () => {
  const t = await setup({deps: {now: {date: '2026-11-14', time: '10:00', iso: 'x'}, after: 0}});
  await fs.writeFile(t.deps.stateFile, JSON.stringify({lastRun: '2026-11-12', notified: {}}));
  await postDue(t.deps);
  assert.equal(t.notes.length, 1);
  assert.match(t.notes[0].body, /2026-11-12, 2026-11-13/);
  await postDue(t.deps);
  assert.equal(t.notes.length, 1);
});

// --- from the whole-branch review ---

test('review C1: a status check that fails keeps the recovery record and posts nothing', async () => {
  const t = await setup({ig: {containerStatus: async () => { throw new Error('Instagram API 503: timeout'); }}});
  await fs.writeFile(t.scheduleFile, JSON.stringify((await t.schedule()).map((/** @type {any} */ e) => (e.n === '044' ? {...e, containerId: 'C0'} : e)), null, 1) + '\n');
  const r = await postDue(t.deps);
  assert.equal(r.outcome, 'failed');
  assert.equal(t.published.length, 0);
  assert.equal((await t.entry('044')).containerId, 'C0');
});

test('crash recovery: an upload still processing is waited for and published from the same container', async () => {
  /** @type {string[]} */
  const pubs = [];
  const t = await setup({ig: {
    containerStatus: async () => 'IN_PROGRESS',
    waitFinished: async () => 'FINISHED',
    publish: async (/** @type {string} */ id) => (pubs.push(id), {id: 'M2', permalink: 'https://www.instagram.com/reel/y/'}),
  }});
  await fs.writeFile(t.scheduleFile, JSON.stringify((await t.schedule()).map((/** @type {any} */ e) => (e.n === '044' ? {...e, containerId: 'C0'} : e)), null, 1) + '\n');
  assert.equal((await postDue(t.deps)).outcome, 'posted');
  assert.equal(t.published.length, 0);
  assert.deepEqual(pubs, ['C0']);
  const e = await t.entry('044');
  assert.equal(e.posted.id, 'M2');
  assert.equal('containerId' in e, false);
});

test('crash recovery: an upload still processing that never finishes is started over', async () => {
  const t = await setup({ig: {containerStatus: async () => 'IN_PROGRESS'}});
  await fs.writeFile(t.scheduleFile, JSON.stringify((await t.schedule()).map((/** @type {any} */ e) => (e.n === '044' ? {...e, containerId: 'C0'} : e)), null, 1) + '\n');
  assert.equal((await postDue(t.deps)).outcome, 'posted');
  assert.deepEqual(t.waited, ['C0']);
  assert.equal(t.published.length, 1);
  assert.equal((await t.entry('044')).posted.id, 'M1');
});

test('review I4: a maker handle Instagram rejects does not cost the day: retried without tags', async () => {
  /** @type {any[]} */
  const tries = [];
  const t = await setup();
  t.deps.ig.publishReel = async (/** @type {string} */ _f, /** @type {any} */ opts, /** @type {any} */ onStep) => {
    tries.push(opts.userTags);
    if (opts.userTags.length) throw new Error('Instagram API 400: Invalid user tag');
    await onStep('container', 'C1');
    return {id: 'M1', permalink: 'https://www.instagram.com/reel/x/', containerId: 'C1'};
  };
  const r = await postDue(t.deps);
  assert.equal(r.outcome, 'posted');
  assert.deepEqual(tries, [['@maker.one', '@second'], []]);
  assert.match(t.notes[0].body, /without the maker tags/);
});

test('review I4: no retry once the upload has started, or for a dead token', async () => {
  let calls = 0;
  const t = await setup();
  t.deps.ig.publishReel = async (/** @type {string} */ _f, /** @type {any} */ _o, /** @type {any} */ onStep) => {
    calls++;
    await onStep('container', 'C1');
    throw new Error('Instagram API 500: later');
  };
  assert.equal((await postDue(t.deps)).outcome, 'failed');
  assert.equal(calls, 1);
  const dead = await setup();
  let n = 0;
  dead.deps.ig.publishReel = async () => { n++; throw Object.assign(new Error('Instagram API 400: token'), {code: 190}); };
  await postDue(dead.deps);
  assert.equal(n, 1);
});

test('a reel posted off its day (--kit) is recorded on the day it actually went up', async () => {
  const t = await setup({deps: {kit: '045-c', after: undefined, now: {date: '2026-11-13', time: '18:05', iso: '2026-11-13T12:35:00.000Z'}}});
  assert.equal((await postDue(t.deps)).outcome, 'posted');
  const e = await t.entry('045');
  assert.deepEqual([e.date, e.time], ['2026-11-13', '18:05']);
});

test('notification titles carry the channel name, never another channel\'s', async () => {
  const t = await setup();
  await postDue(t.deps);
  assert.equal(t.notes[0].title, 'Alpha Channel #044 is on Instagram');
  const red = await setup({gate: async () => ({verdict: 'red', reasons: ['x']})});
  await postDue(red.deps);
  assert.equal(red.notes[0].title, 'Alpha Channel #044 was not posted');
  for (const n of [...t.notes, ...red.notes]) assert.doesNotMatch(n.title + n.body, /Launch Radar/);
});
