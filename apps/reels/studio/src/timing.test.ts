import assert from 'node:assert/strict';
import {test} from 'node:test';
import {edgeGain, inSpans, zoomAt} from './timing.ts';

test('zoomAt holds steps and eases into the next one', () => {
  const z = [
    {frame: 0, scale: 1},
    {frame: 30, scale: 1.2},
  ];
  assert.equal(zoomAt(10, z), 1);
  assert.equal(zoomAt(40, z), 1.2);
  const mid = zoomAt(31, z);
  assert.ok(mid > 1 && mid < 1.2);
  assert.equal(zoomAt(5, []), 1);
});

test('edgeGain ramps both ends of a segment', () => {
  assert.equal(edgeGain(0, 30), 0.5);
  assert.equal(edgeGain(10, 30), 1);
  assert.equal(edgeGain(29, 30), 0.5);
});

test('inSpans', () => {
  assert.ok(inSpans(5, [{from: 0, to: 10}]));
  assert.ok(!inSpans(10, [{from: 0, to: 10}]));
});
