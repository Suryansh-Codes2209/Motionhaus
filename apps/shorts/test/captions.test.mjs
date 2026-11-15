import assert from 'node:assert/strict';
import {test} from 'node:test';
import {align, norm, scriptWords} from '../src/captions/align.mjs';
import {parseWhisperJson} from '../src/captions/whisper.mjs';
import {spokenText} from '../src/tts/kokoro.mjs';

/** @param {string} text @param {number} s @param {number} e */
const tok = (text, s, e) => ({text, startMs: s, endMs: e});

test('scriptWords: emphasis spans, punctuation cleanup', () => {
  assert.deepEqual(scriptWords('Your *whole room*, answering live.'), [
    {text: 'Your', emphasis: false, br: false},
    {text: 'whole', emphasis: true, br: false},
    {text: 'room', emphasis: true, br: true},
    {text: 'answering', emphasis: false, br: false},
    {text: 'live', emphasis: false, br: true},
  ]);
  assert.equal(scriptWords('the *big screen.*')[2].br, true);
  assert.deepEqual(scriptWords('Would you *use* it?').map((w) => [w.text, w.emphasis]), [
    ['Would', false],
    ['you', false],
    ['use', true],
    ['it?', false],
  ]);
});

test('norm', () => {
  assert.equal(norm("Show HN's"), 'showhns');
  assert.equal(norm('312'), '312');
});

test('align: exact match keeps whisper timing and script spelling', () => {
  const w = align('It hit 312 points.', [tok('It', 0, 200), tok('hit', 200, 400), tok('312', 400, 1000), tok('points.', 1000, 1400)], 1500);
  assert.deepEqual(w, [
    {text: 'It', startMs: 0, endMs: 200},
    {text: 'hit', startMs: 200, endMs: 400},
    {text: '312', startMs: 400, endMs: 1000},
    {text: 'points', startMs: 1000, endMs: 1400, br: true},
  ]);
});

test('align: misspelled brand name still matches (close edit distance)', () => {
  const w = align("It's called Oratora.", [tok("It's", 0, 150), tok('called', 150, 500), tok('Aratora.', 500, 1200)], 1300);
  assert.equal(w[2].text, 'Oratora');
  assert.equal(w[2].startMs, 500);
  assert.equal(w[2].endMs, 1200);
});

test('align: numbers spoken as words → interpolated inside the gap', () => {
  const w = align('It hit 312 points', [tok('It', 0, 200), tok('hit', 200, 400), tok('three', 400, 600), tok('hundred', 600, 800), tok('twelve', 800, 1000), tok('points', 1000, 1400)], 1500);
  assert.equal(w[2].text, '312');
  assert.ok(w[2].startMs >= 400 && w[2].endMs <= 1000, JSON.stringify(w[2]));
  assert.deepEqual([w[3].startMs, w[3].endMs], [1000, 1400]);
});

test('align: words whisper missed are interpolated; times are monotonic and bounded', () => {
  const w = align('one two three four five', [tok('one', 0, 300), tok('five', 1600, 2000)], 2100);
  assert.equal(w.length, 5);
  for (let i = 1; i < w.length; i++) assert.ok(w[i].startMs >= w[i - 1].endMs - 1);
  assert.ok(w[1].startMs >= 300 && w[3].endMs <= 1600);
  assert.ok(w[4].endMs <= 2100);
});

test('align: no tokens at all spreads words over the clip', () => {
  const w = align('a bb ccc', [], 900);
  assert.equal(w[0].startMs, 0);
  assert.ok(w[2].endMs <= 900);
});

test('align: emphasis carries through', () => {
  const w = align('Would you *use* it?', [tok('Would', 0, 200), tok('you', 200, 300), tok('use', 300, 500), tok('it?', 500, 700)], 800);
  assert.equal(w[2].emphasis, true);
  assert.equal('emphasis' in w[0], false);
});

test('parseWhisperJson drops empty, bracketed and zero-length segments', () => {
  const j = {transcription: [{text: '', offsets: {from: 0, to: 360}}, {text: ' Someone', offsets: {from: 360, to: 480}}, {text: ' [BLANK_AUDIO]', offsets: {from: 480, to: 900}}, {text: ' built', offsets: {from: 900, to: 900}}]};
  assert.deepEqual(parseWhisperJson(j), [{text: 'Someone', startMs: 360, endMs: 480}]);
});

test('spokenText: strips emphasis, applies whole-word respellings', () => {
  assert.equal(spokenText('Meet *Oratora*, not Oratoras', {Oratora: 'Ora-TOR-ah'}), 'Meet Ora-TOR-ah, not Oratoras');
  assert.equal(spokenText('Try Next.js', {'Next.js': 'Next J S'}), 'Try Next J S');
});
