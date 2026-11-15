import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildProps, dropBeat, filmSeconds} from '../src/props.mjs';

const series = {name: 'Launch Radar', handle: '@thelaunchradar', colors: {bg: '#000'}, captions: {wordsPerPage: 3}};
const script = {
  episode: 7,
  sourceLabel: 'Show HN',
  brand: {name: 'X'},
  scenes: [
    {type: 'hook', lines: ['a'], vo: 'Hello there'},
    {type: 'logo', vo: ''},
    {type: 'cta', headline: 'h', url: 'x.dev', vo: 'Bye'},
  ],
  outro: {text: "Follow for tomorrow's launch", vo: 'Follow.'},
};
const v = (/** @type {number} */ d) => ({src: 'vo/x.wav', durationSec: d, words: []});

test('buildProps: strips vo lines, fits beats, carries series + voice', () => {
  const p = buildProps(script, {scenes: [v(3), null, v(1)], outro: v(1)}, series);
  assert.equal(p.episode, 7);
  assert.equal(p.config.format, '9:16');
  assert.equal(p.config.scenes.some((s) => 'vo' in s), false);
  assert.deepEqual(p.config.scenes.map((s) => s.beats), [8, 4, 6]);
  assert.equal(p.voice.length, 3);
  assert.equal(p.voice[1], null);
  assert.equal(p.outro.voice?.durationSec, 1);
  assert.equal(p.captions?.wordsPerPage, 3);
  assert.equal(p.config.look.motionBlur, true);
  assert.equal(buildProps(script, {scenes: [null, null, null], outro: null}, series, {motionBlur: false}).config.look.motionBlur, false);
});

test('filmSeconds and dropBeat follow the template timeline', () => {
  const scenes = [{type: 'hook', beats: 6}, {type: 'logo', beats: 5}, {type: 'cta', beats: 7}];
  assert.equal(filmSeconds(scenes, 120), ((6 + 5 + 7 - 2) * 60) / 120);
  assert.equal(dropBeat(scenes), 6); // matches SKILL.md's example: hook 6 beats → --drop-beat 6
  assert.equal(dropBeat([{type: 'hook', beats: 6}]), 0);
});


test('palette: rotates by episode, explicit name wins, colours brand + series', async () => {
  const {PALETTES} = await import('../src/palettes.mjs');
  const p2 = buildProps({...script, episode: 2}, {scenes: [null, null, null], outro: null}, series);
  assert.deepEqual(p2.series.colors, PALETTES.signal);
  assert.deepEqual(p2.config.brand.colors, PALETTES.signal);
  const pu = buildProps({...script, palette: 'paper', kicker: 'K'}, {scenes: [null, null, null], outro: null}, series);
  assert.equal(pu.series.colors.bg, PALETTES.paper.bg);
  assert.equal(pu.kicker, 'K');
  const keep = buildProps({...script, brand: {name: 'X', colors: {bg: '#123456'}}, productColors: true}, {scenes: [null, null, null], outro: null}, series);
  assert.equal(keep.config.brand.colors.bg, '#123456');
  assert.throws(() => buildProps({...script, palette: 'nope'}, {scenes: [null, null, null], outro: null}, series), /unknown palette/);
});

test('buildProps: edit style passes through and brings its palette', () => {
  const radar = buildProps(script, {scenes: [null, null, null], outro: null}, series);
  assert.equal(radar.config.style, 'radar');
  const vox = buildProps({...script, style: 'vox'}, {scenes: [null, null, null], outro: null}, series);
  assert.equal(vox.config.style, 'vox');
  assert.equal(vox.config.brand.colors.bg, '#EFE6D2'); // newsprint
  assert.equal(vox.series.colors.accent, '#FFD43B');
  const picked = buildProps({...script, style: 'vox', palette: 'paper'}, {scenes: [null, null, null], outro: null}, series);
  assert.equal(picked.config.brand.colors.bg, '#F4EFE6');
  assert.throws(() => buildProps({...script, style: /** @type {any} */ ('wobbly')}, {scenes: [null, null, null], outro: null}, series), /unknown style "wobbly"/);
});

test('buildProps: new style scenes get their minimum beats', () => {
  const scenes = ['clipping', 'document', 'flow', 'bento', 'log'].map((type) => ({type, vo: ''}));
  const p = buildProps({...script, scenes}, {scenes: scenes.map(() => null), outro: null}, series);
  assert.deepEqual(p.config.scenes.map((s) => s.beats), [7, 7, 7, 7, 7]);
});

test('buildProps: long format is 16:9, no burned-in captions, carries chapters + thumbnails', () => {
  const long = {
    ...script,
    format: /** @type {const} */ ('long'),
    chapters: [{title: 'The hook', scene: 0}],
    thumbnail: {variants: [{headline: 'Typed *SQL*', focus: /** @type {const} */ ('screenshot')}]},
  };
  const p = buildProps(long, {scenes: [v(3), null, v(1)], outro: v(1)}, series);
  assert.equal(p.config.format, '16:9');
  assert.equal(p.captions, null);
  assert.deepEqual(p.chapters, long.chapters);
  assert.equal(p.thumbnail?.variants[0].headline, 'Typed *SQL*');
  assert.equal(buildProps(script, {scenes: [null, null, null], outro: null}, series).config.format, '9:16');
});

test('headshot without a face take needs the channel to have a mascot', async () => {
  const {assertHost} = await import('../src/steps/make.mjs');
  assert.throws(() => assertHost({style: 'headshot'}, {}), /no mascot.*`face` take/);
  assert.throws(() => assertHost({style: 'headshot'}, {mascot: false}), /no mascot/);
  assertHost({style: 'headshot'}, {mascot: true});
  assertHost({style: 'headshot', face: 'take.mp4'}, {});
  assertHost({style: 'vox'}, {});
});
