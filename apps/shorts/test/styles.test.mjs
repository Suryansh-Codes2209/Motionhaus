import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PALETTES} from '../src/palettes.mjs';
import {isStyle, pickStyle, STYLE_NAMES, STYLES} from '../src/styles.mjs';

test('every style names palettes that exist', () => {
  for (const s of STYLE_NAMES) {
    assert.ok(PALETTES[STYLES[s].palette], `${s}: ${STYLES[s].palette}`);
    for (const p of STYLES[s].palettes) assert.ok(PALETTES[p], `${s}: ${p}`);
  }
  assert.ok(isStyle('vox'));
  assert.ok(!isStyle('toString'));
});

test('pickStyle: matches the story to a style', () => {
  assert.equal(pickStyle({title: 'Show HN: a Rust CLI for git history'}), 'terminal');
  assert.equal(pickStyle({title: 'An AI agent that designs your UI'}), 'neon');
  assert.equal(pickStyle({title: 'How our sync engine works: a new protocol'}), 'explainer');
  assert.equal(pickStyle({title: 'Why everyone is fighting over TV ads'}), 'vox');
  // real 2026-10-23 candidates
  assert.equal(pickStyle({title: 'Uberblok – an interactive museum of ZFS internals', text: 'I worked in storage… a coding agent helped'}), 'explainer');
  assert.equal(pickStyle({title: 'OnKey – I\'m a bad singer, so I built an app to show where I\'m off-key'}), 'vox');
  assert.equal(pickStyle({title: '3d-model-anything', text: 'Capture iPhone LiDAR and photos, reconstruct editable Three.js rooms'}), 'neon');
  assert.equal(pickStyle({title: 'A free Claude Code skill that adds real sound effects'}), 'toybox');
  assert.equal(pickStyle({title: 'Gaussian splat viewer with layers you can peel apart'}), '3d');
  assert.equal(pickStyle({title: '3 free tools you need for Claude video edits'}), 'headshot');
  assert.equal(pickStyle({title: 'opentrap', text: 'A free, open-source alternative to Burp Suite: an intercepting proxy and web app security testing suite'}), 'terminal');
});

test('pickStyle: never repeats the previous episode, prefers least recent', () => {
  assert.notEqual(pickStyle({title: 'A Rust CLI'}, ['terminal']), 'terminal');
  // nothing matches → oldest non-radar style (a never-used one first)
  const all = ['vox', 'neon', 'explainer', 'toybox', '3d', 'headshot', 'terminal'];
  assert.equal(pickStyle({title: 'Bloop'}, all), 'terminal');
  assert.equal(pickStyle({title: 'Bloop'}, all.slice(0, -1)), 'terminal');
  assert.equal(pickStyle({title: 'Bloop'}, ['vox', 'neon', 'explainer']), 'toybox');
});
