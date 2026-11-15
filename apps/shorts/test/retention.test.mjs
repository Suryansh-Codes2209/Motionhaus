import assert from 'node:assert/strict';
import {test} from 'node:test';
import {findAnchor, retentionWarnings} from '../src/retention.mjs';

const anchors = ['Claude', 'Claude Code', 'ChatGPT', 'Three.js', 'Wes Bos', 'Mac'];

const good = {
  scenes: [
    {type: 'hook', image: 'site/hero.png', vo: 'Wes Bos just turned a real room into *Three.js.*'},
    {type: 'screenshot', vo: 'He scanned his office with an iPhone, and a coding agent rebuilt every object as editable code.'},
    {type: 'spotlight', vo: 'Wait, it gets better: the lamps and the shadows are real lights you can move around the scene.'},
    {type: 'stat', vo: 'And the whole repo picked up two thousand stars on GitHub in a single day after launch.'},
    {type: 'cta', vo: 'So which room in your house would you scan first, and what would you build there?'},
  ],
  outro: {vo: "Follow for tomorrow's launch."},
};
const meta = {title: 'Wes Bos turned his room into Three.js', comment: 'Which room would you scan? 👇'};

test('a 30–38 s, anchored short has no warnings', () => assert.deepEqual(retentionWarnings(good, {meta, anchors}), []));

test('flags the old 17–21 s format', () => {
  const short = {scenes: good.scenes.slice(0, 4).map((s) => ({...s, vo: 'Four short words here.'})), outro: good.outro};
  const w = retentionWarnings(short).join('\n');
  for (const s of ['4 scenes', 'too short', 'no question']) assert.match(w, new RegExp(s));
});

test('flags a text-only opener and a run-up first sentence', () => {
  const s = {...good, scenes: [{type: 'hook', vo: 'Someone on GitHub just built a way to turn any room you own into an editable scene.'}, ...good.scenes.slice(1)]};
  const w = retentionWarnings(s).join('\n');
  for (const x of ['does not show the subject', 'first VO sentence is 17 words', 'run-up']) assert.match(w, new RegExp(x));
});

test('a hook video counts as the product in frame 0', () => {
  const s = {...good, scenes: [{type: 'hook', video: 'demo.mp4', vo: good.scenes[0].vo}, ...good.scenes.slice(1)]};
  assert.deepEqual(retentionWarnings(s), []);
});

test('title checks: anchor, its position, #shorts, comment question', () => {
  const w = (/** @type {any} */ m) => retentionWarnings(good, {meta: m, anchors}).join('\n');
  assert.match(w({title: 'This game is a flying cat with a machine gun', comment: '?'}), /no searchable anchor/);
  assert.match(w({title: 'These 244 pixel art effects come from a Claude Code skill', comment: '?'}), /not in the first 3 words/);
  assert.match(w({title: 'Claude Code makes pixel art #shorts', comment: '?'}), /#shorts/);
  assert.match(w({title: 'Claude Code makes pixel art', comment: 'links only'}), /no question/);
  assert.equal(w({title: 'Free ChatGPT alternative runs on your own computer', comment: 'Would you? 👇'}), '');
});

test('findAnchor matches whole words, longest first', () => {
  assert.equal(findAnchor('A Claude Code skill', anchors), 'Claude Code');
  assert.equal(findAnchor('Macro recorder', anchors), null);
  assert.equal(findAnchor('Three.js room', anchors), 'Three.js');
});

test('long-form scripts are skipped', () => assert.deepEqual(retentionWarnings({format: 'long', scenes: Array(9).fill({type: 'hook'})}), []));
