import assert from 'node:assert/strict';
import {test} from 'node:test';
import {motionWarnings, pacingWarnings} from '../src/motion.mjs';

const script = (/** @type {Record<string, any>[]} */ scenes, extra = {}) => ({scenes, ...extra});
const hook = {type: 'hook', image: 'hook.png', lines: ['Fake Claude Code', '*hid a backdoor*']};

test('a varied short passes', () => {
  const w = motionWarnings(script([{...hook, variant: 'band'}, {type: 'stat', hits: [{fx: 'punch', at: 3}], transition: 'flash'}, {type: 'type', style: 'echo', zoom: 'in'}], {captions: 'pill'}));
  assert.deepEqual(w, []);
});

test('unknown names are reported, not rendered as defaults', () => {
  const w = motionWarnings(script([{...hook, variant: 'bandd'}, {type: 'type', style: 'boom', transition: 'wizz', grade: 'sepia', fx: ['rain'], hits: [{fx: 'pow', at: 1}]}], {captions: 'karaoke'}));
  for (const name of ['bandd', 'boom', 'wizz', 'sepia', 'rain', 'pow', 'karaoke']) assert.ok(w.some((x) => x.includes(`"${name}"`)), name);
});

test('a short with no accents is flat', () => {
  assert.ok(motionWarnings(script([hook, {type: 'stat'}])).some((w) => w.startsWith('flat edit')));
  assert.ok(!motionWarnings(script([hook, {type: 'stat', hits: [{fx: 'punch', at: 2}]}])).some((w) => w.startsWith('flat edit')));
});

test('too many hits, and a repeated hook variant', () => {
  const hits = Array.from({length: 6}, (_, i) => ({fx: 'flash', at: i}));
  assert.ok(motionWarnings(script([hook, {type: 'stat', hits}])).some((w) => w.startsWith('6 hits')));
  assert.ok(motionWarnings(script([{...hook, variant: 'echo'}, {type: 'stat', zoom: 'in'}]), {previousHook: 'echo'}).some((w) => w.includes('previous episode')));
});

test('keyword variants need a keyword', () => {
  assert.ok(motionWarnings(script([{type: 'hook', variant: 'tag', lines: ['no emphasis here'], zoom: 'in'}])).some((w) => w.includes('no keyword')));
  assert.ok(motionWarnings(script([{...hook, variant: 'tag', keyword: 'supercalifragilistic', zoom: 'in'}])).some((w) => w.includes('characters')));
});

test('long-form skips the short-only checks', () => {
  assert.deepEqual(motionWarnings(script([hook, {type: 'stat'}], {format: 'long'})), []);
});

const vo = (/** @type {number} */ n) => Array.from({length: n}, () => 'word').join(' ');
const paced = (/** @type {string | undefined} */ pacing, /** @type {[string, number][]} */ scenes) => ({...(pacing ? {pacing} : {}), scenes: scenes.map(([type, n]) => ({type, vo: vo(n)})), outro: {vo: vo(4)}});

test('pacing: a staccato short with quick cuts and a hold passes', () => {
  const s = paced('staccato', [['hook', 9], ['type', 5], ['stat', 6], ['photo', 7], ['spotlight', 24], ['type', 8], ['cta', 7]]);
  assert.deepEqual(pacingWarnings(s), []);
});

test('pacing: shape rules', () => {
  assert.ok(pacingWarnings(paced('staccato', [['hook', 12], ['type', 14], ['stat', 12], ['photo', 13], ['spotlight', 12], ['cta', 7]])).some((w) => w.includes('quick cuts')));
  assert.ok(pacingWarnings(paced('slowBurn', [['hook', 9], ['type', 5], ['document', 15], ['stat', 12], ['cta', 7]])).some((w) => w.includes('hold scene')));
  assert.ok(pacingWarnings(paced('coldOpen', [['clip', 12], ['hook', 5], ['stat', 25], ['type', 12], ['cta', 7]])).some((w) => w.includes('coldOpen')));
  assert.ok(pacingWarnings(paced('staccato', [['hook', 9], ['cta', 7]])).some((w) => w.includes('scenes')));
  assert.ok(pacingWarnings(paced('waltz', [['hook', 9]]))[0].includes('not a thing'));
});

test('pacing: metronome scenes are flagged', () => {
  assert.ok(pacingWarnings(paced(undefined, [['hook', 16], ['spotlight', 17], ['code', 18], ['spotlight', 16], ['cta', 8]])).some((w) => w.startsWith('even pacing')));
});

test('pacing: never the previous episode\'s shape, order or length', () => {
  const prev = paced(undefined, [['hook', 16], ['spotlight', 9], ['code', 26], ['spotlight', 16], ['cta', 8]]);
  const w = pacingWarnings(structuredClone(prev), {previous: prev});
  assert.ok(w.some((x) => x.includes('pacing "steady" was used')));
  assert.ok(w.some((x) => x.includes('same scene order')));
  assert.ok(w.some((x) => x.includes('same length')));
  const next = paced('staccato', [['hook', 9], ['type', 5], ['stat', 6], ['photo', 7], ['spotlight', 24], ['type', 8], ['cta', 7]]);
  assert.deepEqual(pacingWarnings(next, {previous: prev}), []);
});
