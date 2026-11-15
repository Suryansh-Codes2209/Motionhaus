import assert from 'node:assert/strict';
import {test} from 'node:test';
import {blankRuns, bluePurple, cutLike, cutStarts, fitGrid, frameDiffs, motionStats, parseLoudness} from '../src/metrics.mjs';
import {transitionStarts} from '../src/breakdown.mjs';
import {grade} from '../src/gate.mjs';

const W = 16, H = 12;
const flat = (/** @type {number} */ v) => new Uint8Array(W * H).fill(v);
// a textured frame: vertical bars, shifted by `o`
const bars = (/** @type {number} */ o) => Uint8Array.from({length: W * H}, (_, i) => (((i % W) + o) % 4 < 2 ? 40 : 200));

test('frameDiffs and cut detection find a hard cut but not steady motion', () => {
  const F = [...Array(10)].map((_, i) => flat(100 + i)).concat([...Array(10)].map((_, i) => flat(220 - i)));
  const d = frameDiffs(F);
  assert.equal(d.length, 19);
  assert.equal(d[0], 1);
  assert.equal(d[9], 111); // 109 → 220
  const like = cutLike(d);
  assert.deepEqual(cutStarts(like), [9]);
});

test('motionStats counts fast frames outside transitions', () => {
  const d = Float64Array.from([0, 0, 12, 12, 50, 0, 0, 0]);
  const trans = [false, false, false, false, true, false, false, false];
  const m = motionStats(d, trans, 12);
  assert.equal(m.fast_ratio, Number((2 / 7).toFixed(3)));
  assert.equal(m.longest_still_s, Number((3 / 12).toFixed(2)));
});

test('blankRuns flags a long flat stretch mid-film but not textured frames', () => {
  const fps = 12;
  const F = [...Array(12)].map((_, i) => bars(i)).concat([...Array(8)].map(() => flat(30)), [...Array(12)].map((_, i) => bars(i)));
  const trans = new Array(F.length - 1).fill(false);
  assert.deepEqual(blankRuns(F, W, H, trans, fps), [[1, 1.67]]);
  assert.deepEqual(blankRuns(F.map((_, i) => bars(i)), W, H, trans, fps), []);
});

test('bluePurple separates violet from navy', () => {
  const px = (/** @type {number[]} */ c) => Uint8Array.from({length: 30}, (_, i) => c[i % 3]);
  const violet = px([120, 60, 220]);
  const navy = px([20, 40, 90]); // hue ≈ 223°: just under the band
  assert.equal(bluePurple([violet, violet, violet, navy], 2).share, 0.75);
  assert.deepEqual(bluePurple([violet, violet, violet, navy], 2).spans, [[0, 1.5]]);
  assert.equal(bluePurple([navy, navy], 2).share, 0);
});

test('fitGrid recovers a steady cut rhythm and its BPM', () => {
  // cuts every 15 frames at 30 fps = every 0.5 s = 120 BPM quarter notes
  const g = fitGrid([10, 25, 40, 55, 70, 85], 30);
  assert.ok(g);
  assert.equal(g.step_frames, 15);
  assert.equal(g.bpm_if_step_is_quarter, 120);
  assert.equal(fitGrid([1, 2], 30), null);
});

test('transitionStarts debounces', () => {
  const d = Float64Array.from([0, 9, 9, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9]);
  assert.deepEqual(transitionStarts(d, {thresh: 5, debounce: 12}), [1, 16]);
});

test('parseLoudness reads the ebur128 summary', () => {
  const log = 'junk I: -30 LUFS\n  Summary:\n\n  Integrated loudness:\n    I:         -13.6 LUFS\n    Threshold: -24.0 LUFS\n\n  Loudness range:\n    LRA:         5.2 LU\n\n  True peak:\n    Peak:       -0.4 dBFS\n';
  assert.deepEqual(parseLoudness(log), {lufs: -13.6, lra: 5.2, true_peak_db: -0.4});
});

test('grade: animation gate is red on a slideshow, demoted for short clips; reel profile never reds on motion', () => {
  const base = {fast_ratio: 0.01, blank_run_s: 0, blue_purple_share: 0, fast_ratio_worst_window: 0.01, longest_still_s: 1, max_shot_s: 3, cuts_per_10s: 2};
  assert.equal(grade({...base, profile: 'animation', duration_s: 60}).verdict, 'red');
  const short = grade({...base, profile: 'animation', duration_s: 15});
  assert.equal(short.verdict, 'yellow');
  assert.ok(short.short_clip_note);
  assert.equal(grade({...base, profile: 'animation', duration_s: 15, blank_run_s: 0.5}).verdict, 'red');
  assert.equal(grade({...base, profile: 'reel', duration_s: 25, dead_air_s: 0.2, lufs: -14, lufs_off: 0, true_peak_db: -1.5}).verdict, 'green');
});
