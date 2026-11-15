import assert from 'node:assert/strict';
import {test} from 'node:test';
import {kitOf, peakStart, roleOf, variantFile, WHOOSH_LAG_FRAMES, type SfxKit} from '../audio/sfxKit.ts';
import type {LaunchConfig} from '../types';

const kit: SfxKit = {
  variants: {whoosh: 3, pop: 3, tick: 2, impact: 1},
  peakMs: {'whoosh-1': 120, 'whoosh-2': 330, 'whoosh-3': 80, 'pop-1': 10, 'pop-2': 40, 'pop-3': 5, pop: 10, 'tick-1': 8, 'tick-2': 8, tick: 8, impact: 20},
};

test('variantFile: index rotates a role\'s takes, never the same file back to back', () => {
  const pops = [0, 1, 2, 3, 4].map((i) => variantFile('pop', i, kit));
  assert.deepEqual(pops, ['pop-1', 'pop-2', 'pop-3', 'pop-1', 'pop-2']);
  for (let i = 1; i < pops.length; i++) assert.notEqual(pops[i], pops[i - 1]);
  assert.deepEqual([0, 1, 2].map((i) => variantFile('tick', i, kit)), ['tick-1', 'tick-2', 'tick-1']);
  assert.equal(variantFile('whoosh-3', 4, kit), 'whoosh-2');
  assert.equal(roleOf('whoosh-3'), 'whoosh');
});

test('variantFile falls back to the written name (always on disk)', () => {
  assert.equal(variantFile('pop', undefined, kit), 'pop');
  assert.equal(variantFile('pop', 3, undefined), 'pop');
  assert.equal(variantFile('impact', 2, kit), 'impact');
  assert.equal(variantFile('riser', 1, kit), 'riser');
});

test('peakStart: the measured peak lands on the event frame', () => {
  const cut = 300;
  // whoosh: SoundTrack passes cut + lag; a 330 ms peak starts 10 frames earlier
  assert.equal(peakStart(cut + WHOOSH_LAG_FRAMES, 'whoosh-2', kit, 30), cut + WHOOSH_LAG_FRAMES - 10);
  assert.equal(peakStart(90, 'pop-2', kit, 30), 89);
  assert.equal(peakStart(90, 'pop-1', kit, 60), 89);
  assert.equal(peakStart(90, 'tick', undefined, 30), 90);
  assert.equal(peakStart(90, 'unknown', kit, 30), 90);
});

test('kitOf reads the optional config.sfxKit', () => {
  const base = {sfx: true} as unknown as LaunchConfig;
  assert.equal(kitOf(base), undefined);
  assert.equal(kitOf({...base, sfxKit: kit} as LaunchConfig), kit);
});
