import assert from 'node:assert/strict';
import {test} from 'node:test';
import {findLoops, keptSeconds, speechWindows, timeLines, mapTime, mergeSpans, pageCaptions, parseSilences, planKeeps, zoomSteps} from '../src/edl.mjs';

const near = (/** @type {number | null} */ a, /** @type {number} */ b) => assert.ok(a !== null && Math.abs(a - b) < 1e-6, `${a} ≈ ${b}`);

test('planKeeps cuts long pauses with padding and ignores short ones', () => {
  const keeps = planKeeps(
    [
      {start: 2, end: 2.1}, // too short
      {start: 5.2, end: 6.0},
      {start: 15.5, end: 16.3},
    ],
    {start: 0, end: 24},
  );
  assert.equal(keeps.length, 3);
  near(keeps[0].end, 5.28);
  near(keeps[1].start, 5.92);
  near(keeps[1].from, 5.28);
  near(keptSeconds(keeps), 24 - 0.64 - 0.64);
});

test('planKeeps respects the trim range and silences outside it', () => {
  const keeps = planKeeps([{start: 23.5, end: 30}], {start: 0, end: 23.9});
  // a pause that runs into the trim point ends the reel instead
  assert.deepEqual(keeps.length, 1);
  near(keeps[0].end, 23.58);
  // a leading pause starts it later
  near(planKeeps([{start: 0, end: 1}], {start: 0, end: 5})[0].start, 0.92);
});

test('planKeeps with no silences keeps everything', () => {
  assert.deepEqual(planKeeps([], {start: 1, end: 9}), [{start: 1, end: 9, from: 0}]);
});

test('mapTime maps kept time, snaps cut time forward, nulls past the end', () => {
  const keeps = [
    {start: 0, end: 5, from: 0},
    {start: 6, end: 10, from: 5},
  ];
  near(mapTime(2, keeps), 2);
  near(mapTime(5.5, keeps), 5);
  near(mapTime(7, keeps), 6);
  assert.equal(mapTime(11, keeps), null);
});

test('pageCaptions breaks on size, punctuation and gaps, and holds pages', () => {
  const w = (/** @type {string} */ text, /** @type {number} */ start) => ({text, start, end: start + 0.2});
  const pages = pageCaptions([w('ho', 0), w('sakta', 0.2), w('hai,', 0.4), w('kal', 0.6), w('mythology', 0.8), w('pe', 1.0), w('gyaan', 1.2), w('next', 2)]);
  assert.deepEqual(
    pages.map((p) => p.words.map((x) => x.text).join(' ')),
    ['ho sakta hai,', 'kal mythology pe', 'gyaan', 'next'],
  );
  near(pages[0].end, pages[1].start);
});

test('zoomSteps: explicit zooms near a cut replace its auto step; no-op steps vanish', () => {
  const keeps = [
    {start: 0, end: 5, from: 0},
    {start: 6, end: 10, from: 5},
    {start: 11, end: 15, from: 9},
  ];
  const z = zoomSteps(keeps, [{at: 5.07, scale: 1.3}, {at: 7, scale: 1.3}]).map((x) => [x.at, x.scale]);
  assert.deepEqual(z, [[0, 1], [5.07, 1.3], [9, 1]]);
});

test('zoomSteps alternates per cut and lets explicit zooms win', () => {
  const keeps = [
    {start: 0, end: 5, from: 0},
    {start: 6, end: 10, from: 5},
    {start: 11, end: 12, from: 9},
  ];
  assert.deepEqual(
    zoomSteps(keeps, [{at: 5, scale: 1.3}, {at: 7, scale: 1.05}]).map((z) => [z.at, z.scale]),
    [[0, 1], [5, 1.3], [7, 1.05], [9, 1]],
  );
});

test('parseSilences reads ffmpeg output and closes a trailing silence', () => {
  const log = '[silencedetect] silence_start: 1.5\n[silencedetect] silence_end: 2.25 | silence_duration: 0.75\nsilence_start: 9.1\n';
  assert.deepEqual(parseSilences(log, 10), [{start: 1.5, end: 2.25}, {start: 9.1, end: 10}]);
});

test('mergeSpans joins a pause split by a click', () => {
  assert.deepEqual(mergeSpans([{start: 5.72, end: 6.03}, {start: 5.21, end: 5.61}], 0.15), [{start: 5.21, end: 6.03}]);
  assert.deepEqual(mergeSpans([{start: 1, end: 2}, {start: 2.5, end: 3}], 0.15).length, 2);
});

test('findLoops catches whisper repetition loops but not normal speech', () => {
  const w = (/** @type {string} */ s) => s.split(' ').map((text) => ({text}));
  assert.deepEqual(findLoops(w('tabhi tum grow meri particular niche meri particular niche meri particular niche bhai')), [{at: 3, phrase: 'meri particular niche', times: 3}]);
  assert.deepEqual(findLoops(w('ho sakta hai kal ho sakta hai aaj ho sakti hai kal')), []);
});

test('speechWindows and timeLines put each script line inside its measured window', () => {
  const win = speechWindows([{start: 5.2, end: 6.0}, {start: 8.9, end: 9.6}, {start: 12, end: 12.1}], 15);
  assert.deepEqual(win, [{start: 0, end: 5.2}, {start: 6.0, end: 8.9}, {start: 9.6, end: 15}]);
  const words = timeLines(['so whoever', 'ho hi *nahi* sakti', 'kal mythology'], win);
  assert.equal(words.length, 8);
  assert.equal(words[2].start, 6.0);
  assert.ok(Math.abs(words[5].end - 8.9) < 1e-9);
  assert.equal(words[4].text, 'nahi');
  assert.equal(words[4].emphasis, true);
  assert.ok(words[6].start >= 9.6);
  assert.throws(() => timeLines(['one'], win), /3 speech windows/);
  assert.equal(timeLines(['', 'a', 'b'], win)[0].start, 6.0);
});

test('timeLines accepts subtitle lines with their own spans', () => {
  const words = timeLines([{from: 7.5, to: 10, text: "I'm *obsessed* with coffee."}, {from: 14.5, to: 17.5, text: 'Literal coffee.'}], []);
  assert.equal(words[0].start, 7.5);
  assert.ok(Math.abs(words[3].end - 10) < 1e-9);
  assert.equal(words[1].emphasis, true);
  assert.equal(words[4].start, 14.5);
  assert.throws(() => timeLines(['a', {from: 0, to: 1, text: 'b'}], [{start: 0, end: 1}]), /not both/);
});

test('zoomSteps drops steps too small to read as a cut', () => {
  const keeps = [
    {start: 0, end: 5, from: 0},
    {start: 6, end: 10, from: 5},
  ];
  // explicit 1.15 at 4.5, then the cut's auto 1.14 at 5 would be a 1% wobble
  assert.deepEqual(zoomSteps(keeps, [{at: 4.5, scale: 1.15}]).map((z) => z.scale), [1, 1.15]);
});
