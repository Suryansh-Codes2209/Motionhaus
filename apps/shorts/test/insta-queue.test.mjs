import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {dueEntry, istNow, missedDays, patchEntry, queuedAhead, readSchedule} from '../src/insta-queue.mjs';

const S = [
  {n: '043', dir: '043-a', file: 'a.mp4', date: '2026-11-12', time: '19:30'},
  {n: '044', dir: '044-b', file: 'b.mp4', date: '2026-11-13', time: '19:30'},
  {n: '045', dir: '045-c', file: 'c.mp4', date: '2026-11-14', time: '19:30'},
];
const posted = {id: 'M', permalink: 'p', at: '2026-11-13T14:01:00.000Z'};

test('due: today, time passed, unposted', () => assert.equal(dueEntry(S, {date: '2026-11-13', time: '19:31', after: 43}).entry?.n, '044'));
test('due exactly at the slot time', () => assert.equal(dueEntry(S, {date: '2026-11-13', time: '19:30', after: 43}).entry?.n, '044'));
test('not due before the slot', () => {
  const r = dueEntry(S, {date: '2026-11-13', time: '19:29', after: 43});
  assert.equal(r.entry, null);
  assert.match(r.reason, /19:30/);
});
test('past-dated entries are never due', () => assert.equal(dueEntry(S, {date: '2026-11-13', time: '23:00', after: 0}).entry?.n, '044'));
test('a past-dated unposted entry alone is not due', () => {
  const r = dueEntry(S.slice(0, 1), {date: '2026-11-13', time: '23:00', after: 0});
  assert.equal(r.entry, null);
  assert.match(r.reason, /nothing queued/);
});
test('nothing queued today', () => assert.match(dueEntry(S, {date: '2026-11-15', time: '20:00', after: 0}).reason, /nothing queued/));
test('autoPostAfter blocks by number, not string', () => {
  const r = dueEntry(S, {date: '2026-11-13', time: '20:00', after: 44});
  assert.equal(r.entry, null);
  assert.match(r.reason, /autoPostAfter/);
  assert.equal(dueEntry([{...S[1], n: '100'}], {date: '2026-11-13', time: '20:00', after: 99}).entry?.n, '100');
  assert.equal(dueEntry([{...S[1], n: '9'}], {date: '2026-11-13', time: '20:00', after: 10}).entry, null);
});
test('autoPostAfter unset refuses', () => {
  for (const after of [undefined, NaN, /** @type {any} */ (null), /** @type {any} */ ('44')]) {
    const r = dueEntry(S, {date: '2026-11-13', time: '20:00', after});
    assert.equal(r.entry, null);
    assert.match(r.reason, /set instagram\.autoPostAfter/);
  }
});
test('one a day: a posted entry today means done', () => {
  const two = [{...S[1], posted}, {...S[1], n: '046', dir: '046-d', time: '21:30'}];
  const r = dueEntry(two, {date: '2026-11-13', time: '22:00', after: 0});
  assert.equal(r.entry, null);
  assert.match(r.reason, /already posted today/);
});
test('blocked entry is skipped; the next one today is taken', () => {
  const blocked = {reason: 'gate red', at: 'x'};
  assert.match(dueEntry([{...S[1], blocked}], {date: '2026-11-13', time: '20:00', after: 0}).reason, /blocked/);
  const two = [{...S[1], blocked}, {...S[1], n: '046', dir: '046-d', time: '21:30'}];
  assert.equal(dueEntry(two, {date: '2026-11-13', time: '21:30', after: 0}).entry?.n, '046');
});
test('earliest slot first when two are queued for today', () => {
  const two = [{...S[1], n: '046', time: '21:30'}, S[1]];
  assert.equal(dueEntry(two, {date: '2026-11-13', time: '22:00', after: 0}).entry?.n, '044');
});

test('istNow', () => {
  assert.deepEqual(istNow(new Date('2026-11-13T14:01:00Z')), {date: '2026-11-13', time: '19:31'});
  assert.deepEqual(istNow(new Date('2026-11-13T19:00:00Z')), {date: '2026-11-14', time: '00:30'});
});

test('queuedAhead counts future days with something still to post', () => {
  assert.equal(queuedAhead(S, '2026-11-13'), 1);
  assert.equal(queuedAhead(S, '2026-11-11'), 3);
  assert.equal(queuedAhead([...S, {...S[2], n: '047'}], '2026-11-13'), 1);
  assert.equal(queuedAhead([{...S[2], posted}], '2026-11-13'), 0);
  assert.equal(queuedAhead([{...S[2], blocked: {reason: 'r', at: 'x'}}], '2026-11-13'), 0);
});

test('missedDays: days with a reel queued and none posted', () => {
  assert.deepEqual(missedDays(S, {date: '2026-11-13', since: '2026-11-12'}), ['2026-11-12']);
  assert.deepEqual(missedDays(S, {date: '2026-11-13', since: '2026-11-13'}), []);
  assert.deepEqual(missedDays([{...S[0], posted}, S[1]], {date: '2026-11-13', since: '2026-11-01'}), []);
  assert.deepEqual(missedDays(S, {date: '2026-11-15', since: '2026-11-13'}), ['2026-11-13', '2026-11-14']);
});

test('patchEntry keeps other entries and the file format', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'igq-'));
  const file = path.join(dir, 'schedule.json');
  await fs.writeFile(file, JSON.stringify(S, null, 1) + '\n');
  await patchEntry(file, '044', {posted});
  const text = await fs.readFile(file, 'utf8');
  assert.equal(text, JSON.stringify([S[0], {...S[1], posted}, S[2]], null, 1) + '\n');
  assert.deepEqual((await fs.readdir(dir)).sort(), ['schedule.json']);
  await assert.rejects(patchEntry(file, '999', {posted}), /no entry 999/);
  assert.deepEqual(await readSchedule(path.join(dir, 'missing.json')), []);
});

// --- from the whole-branch review (I1): `shorts kit` must not undo what the poster recorded ---
import {bookEntry} from '../src/insta-queue.mjs';

const clock = {today: '2026-11-13', now: '12:00', slots: ['19:30']};

test('bookEntry: a posted reel is never rebooked', () => {
  const sched = [{...S[1], posted}, S[2]];
  const r = bookEntry(sched, {n: '044', dir: '044-b', file: 'b.mp4'}, clock);
  assert.equal(r.posted, true);
  assert.deepEqual(r.schedule, sched);
  assert.deepEqual(r.slot, {date: '2026-11-13', time: '19:30'});
  const pinned = bookEntry(sched, {n: '044', dir: '044-b', file: 'b.mp4'}, {...clock, pinned: {date: '2026-12-01', time: '19:30'}});
  assert.deepEqual(pinned.schedule, sched);
});

test('bookEntry: a new reel takes the next free day; a future booking is kept', () => {
  const r = bookEntry(S, {n: '046', dir: '046-d', file: 'd.mp4'}, clock);
  assert.deepEqual(r.slot, {date: '2026-11-15', time: '19:30'});
  assert.equal(r.schedule.length, 4);
  const again = bookEntry(r.schedule, {n: '046', dir: '046-d', file: 'd2.mp4'}, clock);
  assert.deepEqual(again.slot, {date: '2026-11-15', time: '19:30'});
  assert.equal(again.schedule.find((e) => e.n === '046')?.file, 'd2.mp4');
  assert.equal(again.schedule.length, 4);
});

test('bookEntry: re-packing clears blocked and a stale upload, since the file is new', () => {
  const sched = [{...S[2], blocked: {reason: 'gate red', at: 'x'}, containerId: 'C0'}];
  const r = bookEntry(sched, {n: '045', dir: '045-c', file: 'c.mp4'}, clock);
  const e = r.schedule[0];
  assert.equal(e.blocked, undefined);
  assert.equal(e.containerId, undefined);
  assert.equal(e.date, '2026-11-14');
});

test('bookEntry: a pinned slot is used as given', () => {
  const r = bookEntry(S, {n: '046', dir: '046-d', file: 'd.mp4'}, {...clock, pinned: {date: '2026-12-01', time: '21:00'}});
  assert.deepEqual(r.slot, {date: '2026-12-01', time: '21:00'});
});

test('bookEntry: a held-back reel does not hold a day; a posted one does', () => {
  const sched = [
    {...S[2], blocked: {reason: 'gate red', at: 'x'}}, // 045 on 2026-11-14, held back
    {n: '044', dir: '044-b', file: 'b.mp4', date: '2026-11-13', time: '18:00', posted},
  ];
  const r = bookEntry(sched, {n: '074', dir: '074-new', file: 'n.mp4'}, {today: '2026-11-13', now: '20:00', slots: ['19:30']});
  assert.deepEqual(r.slot, {date: '2026-11-14', time: '19:30'});
  assert.equal(r.schedule.length, 3); // the held-back entry stays on record
});
