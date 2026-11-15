import assert from 'node:assert/strict';
import {test} from 'node:test';
import {OUTRO_OVERLAP} from '../shorts/timing.ts';
import {chapterStarts, END_SCREEN_SEC, endCardFrames, longDuration, timestamp} from './timing.ts';

const tl = {items: [{index: 0, from: 0, enter: 4}, {index: 1, from: 300, enter: 9}, {index: 2, from: 900, enter: 15}], total: 1200};

test('chapterStarts: first chapter at 0, others when their scene content enters, sorted', () => {
  const ch = chapterStarts(tl, [{title: 'Verdict', scene: 2}, {title: 'Hook', scene: 0}, {title: 'How', scene: 1}]);
  assert.deepEqual(ch.map((c) => [c.title, c.from]), [['Hook', 0], ['How', 309], ['Verdict', 915]]);
  assert.throws(() => chapterStarts(tl, [{title: 'x', scene: 9}]), /scene 9/);
});

test('endCardFrames: holds for the end screen, longer if the outro VO needs it', () => {
  assert.equal(endCardFrames({outro: {text: '', voice: null}}, 30), END_SCREEN_SEC * 30);
  assert.equal(endCardFrames({outro: {text: '', voice: {src: '', durationSec: 12, words: []}}}, 30), 390);
  assert.equal(longDuration(1200, {outro: {text: '', voice: null}}, 30), 1200 - OUTRO_OVERLAP + END_SCREEN_SEC * 30);
});

test('timestamp: m:ss', () => {
  assert.equal(timestamp(0, 30), '0:00');
  assert.equal(timestamp(30 * 65 + 29, 30), '1:05');
});
