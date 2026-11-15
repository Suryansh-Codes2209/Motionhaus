import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bestBpm, BPM_RANGE, fitBeats, MIN_BEATS, voiceGaps} from '../src/beats.mjs';

// Mirror of the studio timeline (studio/src/timeline.ts) and its VO starts
// (shorts/timing.ts voiceClips: the transition start, the first scene at
// from + enter) at 30 fps, so the guarantees are checked against the real math.
/** @param {{type: string, beats: number}[]} scenes @param {number} bpm */
function timeline(scenes, bpm, fps = 30) {
  const fpb = (fps * 60) / bpm;
  const T = Math.max(1, Math.round(fpb));
  let beat = 0;
  return scenes.map((s, i) => {
    const from = Math.round(beat * fpb);
    beat += s.beats - 1;
    const hit = s.type === 'logo' || s.type === 'stat';
    const enter = i === 0 ? 4 : hit ? T : Math.round(T * 0.6);
    const next = i < scenes.length - 1 ? Math.round(beat * fpb) : from + Math.round(s.beats * fpb);
    return {from, vo: i === 0 ? from + enter : from, end: next, fpb};
  });
}

test('no VO → type minimum', () => {
  const out = fitBeats([{type: 'logo'}, {type: 'features'}, {type: 'mystery'}], [null, 0, undefined], 120);
  assert.deepEqual(out.map((s) => s.beats), [MIN_BEATS.logo, MIN_BEATS.features, 4]);
});

test('long VO stretches the scene, short VO keeps the minimum', () => {
  const three = [{type: 'hook'}, {type: 'screenshot'}, {type: 'cta'}];
  // 120 bpm → 2 beats/s. 5s VO in a middle scene: ceil((5 + 0.12) × 2) + 1 = 12
  assert.equal(fitBeats(three, [1, 5, 1], 120)[1].beats, 12);
  assert.equal(fitBeats(three, [1, 0.5, 1], 120)[1].beats, MIN_BEATS.screenshot);
  // first scene waits 0.3 beat: ceil(0.3 + 6.24) + 1 = 8
  assert.equal(fitBeats(three, [3, 1, 1], 120)[0].beats, 8);
  // the last scene runs into the outro, no overlap beat: ceil(8.24 + 0.1) = 9
  assert.equal(fitBeats(three, [1, 1, 4], 120)[2].beats, 9);
});

test('keeps other scene fields', () => {
  const [s] = fitBeats([{type: 'hook', lines: ['a']}], [1], 120);
  assert.deepEqual(s.lines, ['a']);
});

test('every VO ends a breath before the next starts, with under a beat of dead air, at several tempos', () => {
  const types = ['hook', 'logo', 'spotlight', 'features', 'stat', 'cta'];
  for (const bpm of [96, 110, 120, 128, 140]) {
    for (let trial = 0; trial < 50; trial++) {
      const vo = types.map(() => Math.round(Math.random() * 60) / 10); // 0–6s
      const scenes = fitBeats(types.map((type) => ({type})), vo, bpm);
      const tl = timeline(scenes, bpm);
      for (let i = 0; i < tl.length; i++) {
        const voEnd = tl[i].vo + vo[i] * 30;
        const nextVoStart = i < tl.length - 1 ? tl[i + 1].vo : tl[i].end - 2; // the outro voice: 2 frames before the end
        assert.ok(voEnd + 0.12 * 30 <= nextVoStart + 1, `bpm ${bpm} scene ${i}: VO ends ${voEnd.toFixed(1)}, next starts ${nextVoStart}`); // +1 frame for rounding
        const min = Math.max(/** @type {Record<string, number>} */ (MIN_BEATS)[types[i]], 0);
        if (vo[i] && scenes[i].beats > min) {
          // scene 0's 0.3-beat lead over-estimates the hook's 4-frame wait
          assert.ok(nextVoStart - voEnd <= 0.12 * 30 + tl[i].fpb * (i === 0 ? 1.3 : 1) + 1, `bpm ${bpm} scene ${i}: ${((nextVoStart - voEnd) / 30).toFixed(2)}s of dead air`);
        }
      }
    }
  }
});

test('bestBpm picks the in-range tempo with the least silence between lines', () => {
  const types = ['hook', 'spotlight', 'flow', 'stat', 'cta'].map((type) => ({type}));
  for (let trial = 0; trial < 30; trial++) {
    const vo = types.map(() => 2 + Math.round(Math.random() * 60) / 10); // 2–8s
    const bpm = bestBpm(types, vo);
    assert.ok(bpm >= BPM_RANGE[0] && bpm <= BPM_RANGE[1]);
    const gaps = (/** @type {number} */ b) => voiceGaps(fitBeats(types, vo, b), vo, b);
    assert.ok(gaps(bpm) <= gaps(120) + 0.05, `${bpm} bpm leaves ${gaps(bpm).toFixed(2)}s, 120 leaves ${gaps(120).toFixed(2)}s`);
  }
});
