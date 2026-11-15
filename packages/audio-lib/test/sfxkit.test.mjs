import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {test} from 'node:test';
import {
  analyze,
  buildKit,
  chooseCandidates,
  creditLines,
  installKit,
  kitConfig,
  levelGain,
  MAKE_AUDIO,
  peakStart,
  placeCues,
  readKit,
  roleAliases,
  roleOf,
  ROLES,
  trimWindow,
  variantFile,
  WHOOSH_LAG_FRAMES,
} from '../src/sfxkit.mjs';
import {tmpDir} from './helpers.mjs';

/** @param {Partial<import('../src/types.mjs').AudioResult>} o @returns {import('../src/types.mjs').AudioResult} */
const res = (o) => ({
  id: 'openverse:x',
  provider: 'openverse',
  title: 'Pop',
  creator: 'A',
  durationSec: 0.3,
  previewUrl: null,
  downloadUrl: 'https://cdn.example.org/x.mp3',
  license: 'CC0',
  licenseUrl: null,
  attributionText: '"Pop" by A',
  requiresAttribution: false,
  allowsCommercialUse: true,
  sourceUrl: null,
  ...o,
});

test('chooseCandidates: commercial-safe licences only, trusted providers, no packs, length in range', () => {
  const picked = chooseCandidates(
    [
      res({id: 'a', license: 'CC-BY-NC', allowsCommercialUse: false}),
      res({id: 'b', license: 'CC-BY-SA'}), // share-alike: not in the kit
      res({id: 'c', provider: 'archive', license: 'PD'}),
      res({id: 'd', title: 'Pop sound pack'}),
      res({id: 'e', durationSec: 9}),
      res({id: 'f', downloadUrl: null}),
      res({id: 'g', title: 'Mouth pop', creator: 'G'}),
    ],
    ROLES.pop,
  );
  assert.deepEqual(picked.map((r) => r.id), ['g']);
});

test('chooseCandidates: CC0 before CC-BY, best title fit first, distinct creators, deterministic', () => {
  const list = [
    res({id: 'by', title: 'Mouth pop', creator: 'B', license: 'CC-BY', requiresAttribution: true}),
    res({id: 'z', title: 'Pop', creator: 'Z'}),
    res({id: 'cc0', title: 'Mouth pop', creator: 'C'}),
    res({id: 'cc0b', title: 'Mouth pop 2', creator: 'C'}),
  ];
  const a = chooseCandidates(list, ROLES.pop).map((r) => r.id);
  const b = chooseCandidates([...list].reverse(), ROLES.pop).map((r) => r.id);
  assert.deepEqual(a, ['cc0', 'by', 'z']); // C's second take only if nothing else is left
  assert.deepEqual(a, b);
  assert.deepEqual(chooseCandidates(list, ROLES.pop, 4).map((r) => r.id), ['cc0', 'by', 'z', 'cc0b']);
});

/** A click at 100 ms, then a slow swell peaking at 400 ms. */
function signal() {
  const sr = 48000;
  const x = new Float32Array(sr); // 1 s
  for (let i = 0; i < sr; i++) {
    const t = i / sr;
    if (t >= 0.1 && t < 0.102) x[i] = 0.9;
    const swell = Math.max(0, 1 - Math.abs(t - 0.4) / 0.2);
    x[i] += 0.5 * swell * Math.sin(2 * Math.PI * 300 * t);
  }
  return {x, sr};
}

test('analyze: transient smoothing finds the click, whoosh smoothing finds the swell', () => {
  const {x, sr} = signal();
  const click = analyze(x, sr, {smoothMs: 2});
  assert.ok(Math.abs(click.peakMs - 100) <= 2, `click peak ${click.peakMs}`);
  const swell = analyze(x, sr, {smoothMs: 120});
  assert.ok(Math.abs(swell.peakMs - 400) <= 25, `swell peak ${swell.peakMs}`);
  assert.ok(swell.onsetMs < swell.peakMs && swell.endMs > swell.peakMs);
  assert.ok(click.peakDb > -1.5 && click.peakDb < 0);
  assert.equal(analyze(new Float32Array(4800), sr).peakDb, -Infinity);
});

test('analyze: onset skips leading silence', () => {
  const sr = 48000;
  const x = new Float32Array(sr / 2);
  for (let i = sr * 0.2; i < sr * 0.25; i++) x[i] = 0.5 * Math.exp(-(i - sr * 0.2) / 800);
  const a = analyze(x, sr, {smoothMs: 3});
  assert.ok(a.onsetMs >= 198 && a.onsetMs <= 201, `onset ${a.onsetMs}`);
  assert.ok(a.peakMs >= 199 && a.peakMs <= 203, `peak ${a.peakMs}`);
});

test('trimWindow keeps pre/post around the peak and drops leading silence', () => {
  const w = trimWindow({onsetMs: 200, peakMs: 202, endMs: 600, durationMs: 3000}, ROLES.pop);
  assert.ok(Math.abs(w.start - 0.192) < 1e-9); // onset - 8 ms (pre 15 ms would cut earlier)
  assert.ok(Math.abs(w.start + w.len - (0.202 + ROLES.pop.postSec)) < 1e-9);
  const r = trimWindow({onsetMs: 0, peakMs: 5000, endMs: 5200, durationMs: 5300}, ROLES.riser);
  assert.ok(Math.abs(r.start - (5 - ROLES.riser.preSec)) < 1e-9, 'long riser keeps its last seconds');
  assert.ok(r.fadeIn > 0.002, 'cutting into a sound fades in');
});

test('levelGain matches the role level but never pushes the sample peak past -1 dBFS', () => {
  assert.equal(levelGain({hotDb: -30, peakDb: -20}, -18), 12);
  assert.equal(levelGain({hotDb: -30, peakDb: -4}, -18), 3);
  assert.equal(levelGain({hotDb: -10, peakDb: -2}, -18), -8);
});

/** @returns {import('../src/sfxkit.mjs').Kit} */
const kit = () => {
  const f = (/** @type {any} */ role, /** @type {number} */ peakMs, extra = {}) => ({role, kind: /** @type {const} */ ('real'), durationMs: 500, onsetMs: 0, peakMs, hotDb: -15, peakDb: -2, ...extra});
  return {
    version: 1,
    builtAt: 'x',
    roles: {
      whoosh: {files: ['whoosh-1', 'whoosh-2'], aliases: {'whoosh-3': 'whoosh-1'}},
      pop: {files: ['pop-1', 'pop-2', 'pop-3'], aliases: {pop: 'pop-1'}},
      impact: {files: ['impact-1'], aliases: {impact: 'impact-1'}},
    },
    files: {
      'whoosh-1': f('whoosh', 300),
      'whoosh-2': f('whoosh', 100),
      'pop-1': f('pop', 10),
      'pop-2': f('pop', 40, {requiresAttribution: true, attribution: '"Pop 2" by B (CC BY 4.0)'}),
      'pop-3': f('pop', 0),
      'impact-1': f('impact', 20, {requiresAttribution: true, attribution: '"Boom" by C (CC BY 4.0)'}),
    },
  };
};

test('roleAliases: base name → first take; missing numbered names cycle the found takes', () => {
  assert.deepEqual(roleAliases('pop', ROLES.pop, ['pop-1', 'pop-2']), {pop: 'pop-1', 'pop-3': 'pop-1'});
  assert.deepEqual(roleAliases('whoosh', ROLES.whoosh, ['whoosh-1']), {'whoosh-2': 'whoosh-1', 'whoosh-3': 'whoosh-1'});
  assert.deepEqual(roleAliases('tick', ROLES.tick, []), {});
});

test('kitConfig: variant counts and peak offsets, aliases included', () => {
  const c = kitConfig(kit());
  assert.deepEqual(c.variants, {whoosh: 2, pop: 3, impact: 1});
  assert.equal(c.peakMs['whoosh-3'], 300);
  assert.equal(c.peakMs.pop, 10);
  assert.equal(c.peakMs.impact, 20);
});

test('variantFile rotates takes by index and falls back to the written name', () => {
  const c = kitConfig(kit());
  assert.equal(roleOf('whoosh-3'), 'whoosh');
  assert.deepEqual([0, 1, 2, 3].map((i) => variantFile('pop', i, c)), ['pop-1', 'pop-2', 'pop-3', 'pop-1']);
  assert.equal(variantFile('pop', undefined, c), 'pop');
  assert.equal(variantFile('pop', 2, undefined), 'pop');
  assert.equal(variantFile('impact', 5, c), 'impact', 'single take: base name');
  assert.equal(variantFile('tick', 1, c), 'tick', 'role missing from the kit: base name');
  assert.equal(variantFile('whoosh-3', 1, c), 'whoosh-2');
  for (let i = 0; i < 6; i++) assert.notEqual(variantFile('pop', i, c), variantFile('pop', i + 1, c), 'never the same take back to back');
});

test('peakStart lands the peak on the event frame', () => {
  const c = kitConfig(kit());
  assert.equal(peakStart(100, 'whoosh-1', c, 30), 91); // 300 ms = 9 frames early
  assert.equal(peakStart(100, 'pop-2', c, 30), 99);
  assert.equal(peakStart(100, 'pop', undefined, 30), 100);
});

test('placeCues: per-role rotation, whoosh peak after the cut, transients on the frame', () => {
  const c = kitConfig(kit());
  const out = placeCues(
    [
      {name: 'pop', frame: 30, volume: 1},
      {name: 'pop', frame: 40, volume: 1},
      {name: 'whoosh-1', frame: 60, volume: 1},
      {name: 'impact', frame: 60, volume: 1},
      {name: 'pop', frame: 90, volume: 1},
      {name: 'whoosh-2', frame: 3, volume: 1},
    ],
    c,
    30,
  );
  assert.deepEqual(out.map((x) => x.name), ['pop-1', 'pop-2', 'whoosh-1', 'impact', 'pop-3', 'whoosh-2']);
  assert.equal(out[0].frame, 30);
  assert.equal(out[1].frame, 39); // 40 ms peak ≈ 1 frame early
  assert.equal(out[2].frame, 60 + WHOOSH_LAG_FRAMES - 9);
  assert.equal(out[3].frame, 59);
  assert.equal(out[5].frame, 2); // 3 + 2 lag - 3 frames of peak
  assert.equal(out[2].volume, 1);
  // without a kit: names untouched, whooshes keep a lead-in
  const legacy = placeCues([{name: 'whoosh-1', frame: 60}, {name: 'pop', frame: 2}], undefined, 30);
  assert.deepEqual(legacy, [{name: 'whoosh-1', frame: 54}, {name: 'pop', frame: 2}]);
});

test('installKit copies takes + aliases and writes CC-BY credits only when needed', async () => {
  const root = await tmpDir();
  const kitDir = path.join(root, 'kit');
  await fs.mkdir(kitDir);
  const k = kit();
  for (const r of Object.values(k.roles)) for (const f of [...r.files, ...Object.keys(r.aliases)]) await fs.writeFile(path.join(kitDir, `${f}.wav`), f);
  const ep = path.join(root, 'ep');
  const sfx = path.join(ep, 'public', 'audio', 'sfx');
  await fs.mkdir(ep);
  const r = await installKit(k, kitDir, sfx, ep);
  assert.deepEqual((await fs.readdir(sfx)).sort(), ['impact-1.wav', 'impact.wav', 'pop-1.wav', 'pop-2.wav', 'pop-3.wav', 'pop.wav', 'whoosh-1.wav', 'whoosh-2.wav', 'whoosh-3.wav']);
  assert.equal(r.credits, path.join(ep, 'sfx-credits.txt'));
  assert.match(await fs.readFile(r.credits, 'utf8'), /"Pop 2" by B[\s\S]*"Boom" by C/);
  assert.deepEqual(creditLines(k).length, 2);
  for (const f of Object.values(k.files)) delete f.requiresAttribution;
  const again = await installKit(k, kitDir, sfx, ep);
  assert.equal(again.credits, null);
  await assert.rejects(fs.access(path.join(ep, 'sfx-credits.txt')), 'stale credits removed');
});

const hasFfmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], {stdio: 'ignore'});
    return true;
  } catch {
    return false;
  }
})();

test('buildKit offline, no earshot: every role falls back to measured synthesized takes, then is reused', {skip: !hasFfmpeg && 'ffmpeg not installed'}, async () => {
  const kitDir = path.join(await tmpDir(), 'sfx-kit');
  const k = await buildKit({kitDir, makeAudio: MAKE_AUDIO, lib: null, earshot: null, log: () => {}});
  assert.deepEqual(Object.keys(k.roles), Object.keys(ROLES));
  assert.ok(Object.values(k.files).every((f) => f.kind === 'synth'));
  assert.deepEqual(k.roles.whoosh.files, ['whoosh-1', 'whoosh-2', 'whoosh-3']);
  assert.deepEqual(k.roles.pop, {files: ['pop-1'], aliases: {pop: 'pop-1', 'pop-2': 'pop-1', 'pop-3': 'pop-1'}});
  // the synthesized whoosh swells to a late peak; the riser peaks near its end
  assert.ok(k.files['whoosh-1'].peakMs > 200, `whoosh peak ${k.files['whoosh-1'].peakMs}`);
  assert.ok(k.files['riser-1'].peakMs > k.files['riser-1'].durationMs * 0.7);
  assert.ok(k.files['pop-1'].peakMs < 30);
  assert.deepEqual(await readKit(kitDir), k);
  // cached: no rebuild, so the (missing) synth script is never run
  assert.deepEqual(await buildKit({kitDir, makeAudio: '/nonexistent', lib: null}), k);
});
