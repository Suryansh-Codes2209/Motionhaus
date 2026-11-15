import assert from 'node:assert/strict';

// The handle and niche tags are a channel's own settings now, not defaults in the code.
const LR = {instagram: {handle: '@thelaunchradar.hq', hashtags: ['#aitools', '#devtools', '#opensource', '#buildinpublic', '#indiehackers']}};
import {test} from 'node:test';
import {hashtags, instaCaption, instaScript, instaWarnings, lastQuestion, nextInstaSlot} from '../src/instagram.mjs';

const script = {
  episode: 30,
  sourceLabel: 'GitHub',
  sourceUrl: 'https://github.com/VictorTaelin/uniichat',
  brand: {name: 'UniiChat', url: 'uniichat.com'},
  scenes: [
    {type: 'hook', image: 'site/hero.png', vo: 'UniiChat is one AI chat that *never* ends.'},
    {type: 'cta', vo: 'Would you want one chat, forever?'},
  ],
  outro: {text: 'Follow for tomorrow\'s launch', vo: 'Follow for tomorrow\'s launch.'},
};
const meta = {title: 'An AI chat that never ends? #shorts', description: 'UniiChat is an AI agent with one chat. It remembers.\n\n🔗 https://uniichat.com'};

test('the question comes from the last scene that asks one', () => assert.equal(lastQuestion(script), 'Would you want one chat, forever?'));

test('defaults: YouTube title as hook, share-prompt outro', () => {
  const ig = instaScript(script, meta);
  assert.equal(ig.hook, 'An AI chat that never ends?');
  assert.equal(ig.about, 'UniiChat is an AI agent with one chat.');
  assert.match(ig.outro.text, /^Send this/);
});

test('caption: hook first, links, credit, question, ≤ 6 niche tags', () => {
  const c = instaCaption({...script, instagram: {hashtags: ['aimemory'], makers: ['@taelin']}}, meta, LR);
  const lines = c.split('\n');
  assert.equal(lines[0], 'An AI chat that never ends?');
  assert.ok(c.includes('🌐 https://uniichat.com') && c.includes('🔗 https://github.com/VictorTaelin/uniichat'));
  assert.ok(c.includes('Made by @taelin') && c.includes('Found via GitHub'));
  assert.ok(c.includes('Would you want one chat, forever? 👇'));
  const tags = lines[lines.length - 1].split(' ');
  assert.equal(tags[0], '#aimemory');
  assert.equal(tags.length, 6);
  assert.ok(!tags.includes('#ai'));
});

test('a launch found on its own site gets one link and no "found via"', () => {
  const c = instaCaption({...script, sourceLabel: '24fps.dev', sourceUrl: 'https://24fps.dev', brand: {name: '24fps', url: '24fps.dev'}}, meta, LR);
  assert.equal(c.match(/24fps\.dev/g)?.length, 1);
  assert.ok(c.includes("it's a new launch") && !c.includes('Found via'));
});

test('hashtags dedupe and cap', () => assert.deepEqual(hashtags(['#a', '#b'], ['B', 'c'], 2), ['#b', '#c']));

test('warnings: no block, typed opener, broad tag', () => {
  const w = instaWarnings({...script, scenes: [{type: 'type', vo: 'Hi.'}], instagram: {hashtags: ['#ai']}});
  assert.ok(w.some((x) => /types words/.test(x)));
  assert.ok(w.some((x) => /too broad/.test(x)));
  assert.ok(w.some((x) => /no question/.test(x)));
  assert.ok(instaWarnings(script).some((x) => /no "instagram" block/.test(x)));
  assert.deepEqual(instaWarnings({...script, instagram: {}}), []);
});

test('one reel a day: the next free date', () => {
  const s = [{date: '2026-10-29'}, {date: '2026-10-30'}];
  assert.deepEqual(nextInstaSlot(s, '2026-10-29', ['19:30']), {date: '2026-10-31', time: '19:30'});
  assert.deepEqual(nextInstaSlot([], '2026-10-29', ['19:30']), {date: '2026-10-29', time: '19:30'});
});

test('a slot already past today is skipped', () => {
  assert.deepEqual(nextInstaSlot([], '2026-10-28', ['19:30'], '23:28'), {date: '2026-10-29', time: '19:30'});
  assert.deepEqual(nextInstaSlot([], '2026-10-28', ['13:00', '19:30'], '15:00'), {date: '2026-10-28', time: '19:30'});
  assert.deepEqual(nextInstaSlot([{date: '2026-10-28'}], '2026-10-28', ['13:00', '19:30'], '15:00'), {date: '2026-10-28', time: '19:30'});
});

test('igConfig: a channel without an Instagram handle is an error, not a borrowed handle', async () => {
  const {igConfig} = await import('../src/instagram.mjs');
  assert.throws(() => igConfig({}), /instagram\.handle is missing/);
  assert.throws(() => igConfig({instagram: {handle: ''}}), /instagram\.handle is missing/);
  const c = igConfig({instagram: {handle: '@mine'}});
  assert.deepEqual([c.handle, c.hashtags, c.maxHashtags, c.slotsIST], ['@mine', [], 6, ['19:30']]);
});
