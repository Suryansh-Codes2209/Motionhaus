import assert from 'node:assert/strict';
import {test} from 'node:test';
import {takeSegments} from '../src/steps/face.mjs';

/** @param {string} text @param {number} startMs @param {number} endMs */
const w = (text, startMs, endMs) => ({text, startMs, endMs});

test('takeSegments: one segment per line, padded into the pauses, words relative', () => {
  const words = [w('Claude', 500, 800), w("can't", 820, 1000), w('hear', 1020, 1300), w('So', 2300, 2450), w('it', 2470, 2600), w('fakes', 2620, 3000), w('Follow', 4000, 4400)];
  const segs = takeSegments(["Claude can't hear.", null, 'So it fakes.', 'Follow'], words, 5000);
  assert.equal(segs[1], null);
  assert.deepEqual(segs.map((s) => s && [s.startMs, s.endMs]), [[350, 1550], null, [2150, 3250], [3850, 4650]]);
  assert.deepEqual(segs[0]?.words[0], w('Claude', 150, 450));
  assert.equal(segs[2]?.words.length, 3);
});

test('takeSegments: tight gaps split at the midpoint, never overlap', () => {
  const words = [w('one', 0, 400), w('two', 460, 800)];
  const [a, b] = takeSegments(['one', 'two'], words, 900);
  assert.deepEqual([a?.startMs, a?.endMs, b?.startMs, b?.endMs], [0, 430, 430, 850]);
});
