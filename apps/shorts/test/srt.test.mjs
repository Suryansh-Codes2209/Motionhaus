import assert from 'node:assert/strict';
import {test} from 'node:test';
import {scriptWords} from '../src/captions/align.mjs';
import {buildCues, formatSrt, spokenText, srtTime, subtitleWords, wrap} from '../src/captions/srt.mjs';

/** @param {string} text @param {number} startMs @param {number} endMs */
const at = (text, startMs, endMs) => ({text, startMs, endMs});

test('srtTime: hh:mm:ss,mmm', () => {
  assert.equal(srtTime(0), '00:00:00,000');
  assert.equal(srtTime(62345), '00:01:02,345');
  assert.equal(srtTime(3723004), '01:02:03,004');
});

test('spokenText: keeps punctuation, drops emphasis marks, aligned with scriptWords', () => {
  const vo = 'Import a SQL file into TypeScript, *fully typed.* — The creator of Zod built it.';
  assert.deepEqual(spokenText(vo).slice(5, 8), ['TypeScript,', 'fully', 'typed.']);
  assert.equal(spokenText(vo).length, scriptWords(vo).length);
});

test('subtitleWords: offsets each clip and restores punctuation', () => {
  const words = subtitleWords([
    {fromMs: 1000, text: 'Hello, *world.*', words: [at('Hello', 0, 300), at('world', 300, 700)]},
    {fromMs: 5000, words: [at('bye', 0, 200)]},
  ]);
  assert.deepEqual(words, [at('Hello,', 1000, 1300), at('world.', 1300, 1700), at('bye', 5000, 5200)]);
});

test('subtitleWords: falls back to caption text when the script does not line up', () => {
  const [w] = subtitleWords([{fromMs: 0, text: 'one two', words: [at('one', 0, 100)]}]);
  assert.equal(w.text, 'one');
});

test('buildCues: breaks at sentence ends and pauses, holds, never overlaps', () => {
  const cues = buildCues([at('Meet', 0, 200), at('Reylo.', 200, 600), at('It', 700, 800), at('types', 800, 1100), at('SQL', 2000, 2300)]);
  assert.deepEqual(cues.map((c) => c.lines.join(' ')), ['Meet Reylo.', 'It types', 'SQL']);
  assert.equal(cues[0].endMs, 700); // hold capped by the next cue
  assert.equal(cues[1].endMs, 1900); // held to the 1.2s minimum
  assert.equal(cues[2].endMs, 3200); // min 1.2s on screen
});

test('buildCues: caps characters and duration', () => {
  const words = Array.from({length: 40}, (_, i) => at('word', i * 250, i * 250 + 240));
  const cues = buildCues(words);
  for (const c of cues) {
    assert.ok(c.lines.length <= 2);
    assert.ok(c.lines.every((l) => l.length <= 42), c.lines.join('|'));
    assert.ok(c.endMs - c.startMs <= 6400);
  }
});

test('wrap: one line when short, balanced two lines otherwise', () => {
  assert.deepEqual(wrap(['short', 'line'], 42), ['short line']);
  const [a, b] = wrap('Plain SQL in, typed results out, and no codegen step at all'.split(' '), 42);
  assert.ok(a.length <= 42 && b.length <= 42);
  assert.ok(a.endsWith(','));
});

test('formatSrt: numbered blocks', () => {
  assert.equal(formatSrt([{startMs: 0, endMs: 1500, lines: ['Hi.']}, {startMs: 1500, endMs: 3000, lines: ['a', 'b']}]), '1\n00:00:00,000 --> 00:00:01,500\nHi.\n\n2\n00:00:01,500 --> 00:00:03,000\na\nb\n');
});
