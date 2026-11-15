import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildProps, repairTimings} from '../src/props.mjs';

const analysis = {
  duration: 27.8,
  silences: [
    {start: 5.2, end: 6.0},
    {start: 23.5, end: 27.8},
  ],
  words: [
    {text: 'So', start: 0, end: 0.24},
    {text: 'niche', start: 3.1, end: 3.4},
    {text: 'meri', start: 6.0, end: 6.4},
    {text: 'risk', start: 23.0, end: 23.5},
    {text: 'outro', start: 25, end: 26},
  ],
};

test('repairTimings spreads stacked zero-length words and squeezes the previous one', () => {
  const out = repairTimings([
    {text: 'interpreter,', start: 17.02, end: 18.0},
    {text: 'I', start: 18.0, end: 18.0},
    {text: 'can', start: 18.0, end: 18.0},
    {text: 'do', start: 18.0, end: 18.0},
    {text: 'anything', start: 18.0, end: 18.0},
    {text: 'meri', start: 18.0, end: 18.36},
  ]);
  for (let i = 1; i < out.length; i++) {
    assert.ok(out[i].start >= out[i - 1].start, `ordered at ${i}`);
    assert.ok(out[i].end - out[i].start >= 0.04, `${out[i].text} has length`);
    assert.ok(out[i - 1].end <= out[i].start + 1e-9, `no overlap at ${i}`);
  }
  assert.equal(out[5].start, 18.0);
});

test('repairTimings leaves good timings alone', () => {
  const w = [
    {text: 'a', start: 0, end: 0.3},
    {text: 'b', start: 0.3, end: 0.6},
  ];
  assert.deepEqual(repairTimings(w), w);
});

test('buildProps cuts pauses, trims, remaps captions and overlays to frames', () => {
  const p = buildProps(
    {
      trim: {end: 23.9},
      emphasis: ['niche'],
      overlays: [
        {type: 'sticker', at: 6.2, emoji: '🎤', label: 'Rap', group: 'days'},
        {type: 'sticker', at: 7, emoji: '➗', label: 'Maths', group: 'days', to: 8},
        {type: 'slam', from: 5.5, to: 7, text: 'BOOM'},
      ],
    },
    analysis,
  );
  // 5.28..5.92 cut; the trailing pause from 23.5 ends the reel at 23.58 → body = 23.58 - 0.64 = 22.94s
  assert.equal(p.segments.length, 2);
  assert.equal(p.outro?.from, Math.round(22.94 * 30));
  assert.equal(p.durationInFrames, Math.round(22.94 * 30) + 48);
  // the outro word at 25s is past the trim
  assert.ok(!p.captions.some((c) => c.words.some((w) => w.text === 'outro')));
  assert.ok(p.captions.some((c) => c.words.some((w) => w.text === 'niche' && w.emphasis)));
  // 'meri' at 6.0 lands at 6.0 - 0.64
  const meri = p.captions.flatMap((c) => c.words).find((w) => w.text === 'meri');
  assert.equal(meri?.from, Math.round((6.0 - 0.64) * 30));
  // a slam cued inside the cut snaps to the cut and hides captions
  const slam = p.overlays.find((o) => o.type === 'slam');
  assert.equal(slam.from, Math.round(5.28 * 30));
  assert.deepEqual(p.hideCaptions, [{from: slam.from, to: slam.to}]);
  assert.deepEqual(p.overlays.filter((o) => o.type === 'sticker').map((o) => o.slot), [0, 1]);
  // the open-ended sticker runs through the outro
  assert.equal(p.overlays[0].to, p.durationInFrames);
  assert.ok(p.sfx.some((s) => s.name === 'pop') && p.sfx.some((s) => s.name === 'impact'));
  assert.deepEqual(p.zooms.map((z) => z.scale), [1, 1.14]);
});

test('buildProps can switch off cuts, outro, music and sfx', () => {
  const p = buildProps({cuts: false, outro: false, music: false, sfx: false}, analysis);
  assert.equal(p.segments.length, 1);
  assert.equal(p.outro, null);
  assert.equal(p.music, null);
  assert.deepEqual(p.sfx, []);
  assert.equal(p.durationInFrames, Math.round(27.8 * 30));
});

test('cover titleWords marks *accent* words', async () => {
  const {titleWords} = await import('../src/cover.mjs');
  assert.deepEqual(titleWords('No *niche*  ever'), [
    {text: 'No', accent: false},
    {text: 'niche', accent: true},
    {text: 'ever', accent: false},
  ]);
});

test('editGap finds the longest stretch with no cut, zoom or overlay', async () => {
  const {editGap} = await import('../src/props.mjs');
  const g = editGap({fps: 30, durationInFrames: 400, segments: [{from: 0}, {from: 60}], zooms: [{frame: 90}], overlays: [{from: 300}], outro: {from: 360}});
  assert.deepEqual(g, {max_edit_gap_s: 7, max_edit_gap_at_s: 3});
});

test('sfx cues sit on event frames; placeCues rotates takes and aligns peaks', async () => {
  const {placeCues, WHOOSH_LAG_FRAMES} = await import('../../../packages/audio-lib/src/sfxkit.mjs');
  const p = buildProps(
    {
      overlays: [
        {type: 'sticker', at: 1, emoji: '🎤', label: 'A'},
        {type: 'sticker', at: 2, emoji: '🎧', label: 'B'},
        {type: 'slam', from: 3, to: 4, text: 'BOOM'},
      ],
    },
    analysis,
  );
  const slam = p.overlays.find((o) => o.type === 'slam');
  // whoosh + impact are both cued on the slam's entrance frame (no hand-tuned lead-in)
  assert.deepEqual(p.sfx.filter((s) => s.frame === slam.from).map((s) => s.name).sort(), ['impact', 'whoosh-1']);
  const kit = {variants: {pop: 3, whoosh: 3, impact: 1}, peakMs: {'pop-1': 0, 'pop-2': 34, 'pop-3': 0, 'whoosh-1': 200, impact: 0}};
  const placed = placeCues(p.sfx, kit, p.fps);
  const pops = placed.filter((s) => s.name.startsWith('pop'));
  assert.deepEqual(pops.map((s) => s.name), ['pop-1', 'pop-2']);
  assert.equal(pops[1].frame, p.sfx.filter((s) => s.name === 'pop')[1].frame - 1);
  const whoosh = placed.find((s) => s.name.startsWith('whoosh'));
  assert.equal(whoosh?.frame, slam.from + WHOOSH_LAG_FRAMES - 6);
  assert.equal(placed.find((s) => s.name === 'impact')?.frame, slam.from);
});
