import assert from 'node:assert/strict';
import {test} from 'node:test';
import {captionPages, duckGain, faceWindows, OUTRO_OVERLAP, outroFrames, shortDuration, voiceClips} from './timing.ts';

const w = (text: string, startMs: number, endMs: number) => ({text, startMs, endMs});

test('voiceClips: VO starts with the transition (first scene: from + enter), skips scenes without VO', () => {
  const tl = {items: [{index: 0, from: 0, enter: 4}, {index: 1, from: 90, enter: 15}], total: 200};
  const v = {src: 'vo/0.wav', durationSec: 2, words: []};
  assert.deepEqual(voiceClips(tl, [null, v], 30), [{scene: 1, from: 90, frames: 60, words: []}]);
  assert.deepEqual(voiceClips(tl, [v, null], 30), [{scene: 0, from: 4, frames: 60, words: []}]);
});

test('outro length and total duration', () => {
  assert.equal(outroFrames({outro: {text: 'x', voice: null}}, 30), 48);
  assert.equal(outroFrames({outro: {text: 'x', voice: {src: 'a', durationSec: 2, words: []}}}, 30), 78);
  assert.equal(shortDuration(600, {outro: {text: 'x', voice: null}}, 30), 600 - OUTRO_OVERLAP + 48);
});

test('captionPages: max words, punctuation and pause breaks, hold', () => {
  const pages = captionPages(
    [
      {from: 0, words: [w('Someone', 0, 300), w('just', 300, 500), w('built', 500, 800), w('this.', 800, 1100), w('It', 1200, 1300)]},
      {from: 100, words: [w('Wow', 0, 300)]}, // starts at frame 100
    ],
    30,
    3,
  );
  assert.deepEqual(
    pages.map((p) => [p.words.map((x) => x.text).join(' '), p.from, p.to]),
    [
      ['Someone just built', 0, 24], // ends when the next page starts
      ['this.', 24, 36], // punctuation closes the page; held until the next page starts
      ['It', 36, 48], // last word ends 39, +9 frames hold = 48
      ['Wow', 100, 118],
    ],
  );
});

test('captionPages: br, char limit and emphasis', () => {
  const pages = captionPages(
    [{from: 0, words: [{...w('Ask', 0, 100), br: true}, w('extraordinarily', 100, 300), w('long', 300, 400), {...w('words', 400, 500), emphasis: true}]}],
    30,
  );
  assert.deepEqual(pages.map((p) => p.words.map((x) => x.text).join(' ')), ['Ask', 'extraordinarily', 'long words']);
  assert.equal(pages[2].words[1].emphasis, true);
});

test('captionPages: a pause > 0.35s starts a new page', () => {
  const pages = captionPages([{from: 0, words: [w('one', 0, 200), w('two', 800, 1000)]}], 30);
  assert.equal(pages.length, 2);
});

test('duckGain: full outside, duck inside, linear ramps', () => {
  const clips = [{from: 100, frames: 50}];
  assert.equal(duckGain(0, clips, 0.2, 10), 1);
  assert.equal(duckGain(120, clips, 0.2, 10), 0.2);
  assert.ok(Math.abs(duckGain(95, clips, 0.2, 10) - 0.6) < 1e-9);
  assert.ok(Math.abs(duckGain(155, clips, 0.2, 10) - 0.6) < 1e-9);
  assert.equal(duckGain(161, clips, 0.2, 10), 1);
});

test('faceWindows: each take runs from its VO start to the next, holding before and after', () => {
  const ws = faceWindows([{from: 10, frames: 50}, {from: 90, frames: 40}], 200);
  assert.deepEqual(ws, [{from: 0, len: 90, lead: 10, play: 50}, {from: 90, len: 110, lead: 0, play: 40}]);
});
