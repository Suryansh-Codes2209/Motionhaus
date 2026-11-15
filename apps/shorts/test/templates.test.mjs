import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {createChannel, TEMPLATES, upgradeChannel} from '../src/channel-cmds.mjs';
import {DEFAULT_PUBLISH, DEFAULT_RULES, DEFAULT_STORIES, hasInstagram, publishOf, rulesOf, storiesOf} from '../src/channel-settings.mjs';
import {validateChannel} from '../src/channels.mjs';
import {loadConfig} from '../src/config.mjs';
import {instaCaption} from '../src/instagram.mjs';
import {cli} from './config.test.mjs';

const templatesDir = new URL('../templates', import.meta.url).pathname;
const fresh = async () => ({data: await fs.mkdtemp(path.join(os.tmpdir(), 'mh-data-')), config: await fs.mkdtemp(path.join(os.tmpdir(), 'mh-conf-'))});
const HEADINGS = ['What this channel covers', 'Who watches', 'Voice and point of view', 'Where stories come from', 'What makes a story worth covering', 'Sources of truth', 'Never', 'Shape of an episode', 'Visuals', 'Words that go out with it', 'What this channel has learned'];

for (const t of TEMPLATES) {
  test(`template ${t}: a valid channel, a brief with the eleven headings, nothing of another channel's`, async () => {
    const {data, config} = await fresh();
    const r = await createChannel({data, config, slug: 'mine', name: 'Mine', template: t, templatesDir});
    const c = JSON.parse(await fs.readFile(path.join(r.dir, 'channel.json'), 'utf8'));
    assert.deepEqual(validateChannel(c), []);
    assert.equal(c.template, t);
    assert.equal(c.name, 'Mine');
    assert.equal(hasInstagram(c), false); // no accounts until the owner adds them
    const brief = await fs.readFile(path.join(r.dir, 'brief.md'), 'utf8');
    HEADINGS.forEach((h, i) => assert.match(brief, new RegExp(`^## ${i + 1}\\. ${h}$`, 'm'), `${t}: heading ${i + 1}`));
    await fs.stat(path.join(r.dir, 'brand', 'mark.svg'));
    await fs.stat(path.join(r.dir, 'blocklist.txt'));
    const cfg = await loadConfig({channel: 'mine', data, config});
    assert.equal(cfg.series.template, t);
    // every rule and published line is spelled out in the template, so the owner can see and edit them
    for (const k of Object.keys(DEFAULT_RULES)) assert.ok(k in c.rules, `${t}: rules.${k}`);
    for (const k of Object.keys(DEFAULT_PUBLISH)) assert.ok(k in c.publish, `${t}: publish.${k}`);
    for (const k of Object.keys(DEFAULT_STORIES)) assert.ok(k in c.stories, `${t}: stories.${k}`);
  });
}

test('the templates differ where the spec says they do', async () => {
  const load = async (/** @type {string} */ t) => JSON.parse(await fs.readFile(path.join(templatesDir, t, 'channel.json'), 'utf8'));
  const [launches, news, facts, howto] = await Promise.all(TEMPLATES.map(load));
  assert.deepEqual([storiesOf(launches).identity, storiesOf(news).identity, storiesOf(facts).identity, storiesOf(howto).identity], ['product', 'story', 'story', 'story']);
  assert.deepEqual(storiesOf(launches).feeds.map((f) => f.type), ['hn', 'github']);
  for (const c of [news, facts, howto]) {
    const r = rulesOf(c);
    assert.deepEqual([r.titleAnchor, r.subjectInFrame0, r.sourcesRequired, r.shortFirstSentence, r.brightFrame0], [false, false, true, true, true]);
    assert.deepEqual([r.scenes, r.words], [[5, 8], [62, 100]]);
    assert.equal(publishOf(c).listSources, true);
    assert.deepEqual(storiesOf(c).feeds, []);
  }
  assert.deepEqual([rulesOf(launches).titleAnchor, rulesOf(launches).sourcesRequired, rulesOf(launches).scenes], [true, false, [5, 7]]);
  assert.equal(rulesOf(howto).endsOnQuestion, false);
  assert.equal(rulesOf(facts).endsOnQuestion, true);
  assert.deepEqual([publishOf(news).youtube.categoryId, publishOf(facts).youtube.categoryId, publishOf(howto).youtube.categoryId, publishOf(launches).youtube.categoryId], ['25', '27', '26', '28']);
  assert.equal(publishOf(facts).badge, '#{n}');
  // a non-launch caption never claims "featured because it's a new launch"
  const script = {brand: {name: 'Octopus hearts'}, scenes: [{type: 'photo', vo: 'An octopus has three hearts. Why?'}], sourceUrl: 'https://ocean.si.edu/x'};
  const caption = instaCaption(script, {title: 'An octopus has three hearts', description: 'Two for the gills.'}, {...facts, instagram: {handle: '@facts', hashtags: ['#oceanfacts']}});
  assert.match(caption, /Sources are linked in the YouTube description\./);
  assert.doesNotMatch(caption, /Not affiliated|launch|trending/);
});

test('no template or shared skill carries one channel\'s name, handle or numbers', async () => {
  // A channel's name and handle, and the shape of view-count and audit claims, never belong in shared files.
  const banned = /Launch Radar|launchradar|thelaunchradar|\bRado\b|\d+(\.\d+)?K views|\d+ boosted visits|stop at ~?\d+ views|\d+(–\d+)?x the views|\d+ to \d+ times the views/i;
  /** @param {string} dir @returns {Promise<string[]>} */
  const walk = async (dir) => (await Promise.all((await fs.readdir(dir, {withFileTypes: true})).map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])))).flat();
  const files = [...(await walk(templatesDir)), ...(await walk(new URL('../../../skills', import.meta.url).pathname)), new URL('../autopilot/maker-prompt.md', import.meta.url).pathname];
  for (const f of files.filter((f) => /\.(md|json|txt|svg)$/.test(f))) assert.doesNotMatch(await fs.readFile(f, 'utf8'), banned, f);
  // the shared code's comments too (the studio's .tsx files are not part of this check)
  for (const f of (await walk(new URL('../src', import.meta.url).pathname)).filter((f) => f.endsWith('.mjs'))) assert.doesNotMatch(await fs.readFile(f, 'utf8'), banned, f);
});

test('channel new: unknown template lists the four; the default is launches', async () => {
  const i = await fresh();
  const bad = cli(i, ['channel', 'new', 'x', '--template', 'podcasts']);
  assert.equal(bad.code, 1);
  assert.match(bad.out, /no template "podcasts" \(templates: launches, news-explainer, facts-lists, how-to\)/);
  assert.match(cli(i, ['channel', 'new', 'facts', '--template', 'facts-lists', '--name', 'Fact a Day']).out, /from the facts-lists template/);
  assert.match(cli(i, ['channel', 'new', 'plain']).out, /from the launches template/);
  assert.equal(cli(i, ['--channel', 'facts', 'story', 'claim', '--title', 'Octopuses have three hearts', '--url', 'https://ocean.si.edu/x', '--key', 'octopus-three-hearts']).code, 0);
});

/** A channel as part 1 left it: no template, no blocks, no brief, ledger without keys. */
async function oldChannel() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mh-chan-'));
  const series = JSON.parse(await fs.readFile(new URL('../series.json', import.meta.url), 'utf8'));
  await fs.writeFile(path.join(dir, 'channel.json'), JSON.stringify(series, null, 2));
  await fs.writeFile(path.join(dir, 'ledger.json'), JSON.stringify({entries: [{episode: 1, url: 'https://a.dev', domain: 'a.dev', source: 'manual', sourceId: 'alpha-tool', title: 'Alpha Tool', status: 'made', date: '2026-11-01'}, {episode: 2, url: 'https://b.dev', domain: 'b.dev', source: 'Show HN', sourceId: 'YT_ID9', title: 'B Thing!', status: 'published', date: '2026-11-02', key: 'kept-key'}]}));
  return {dir, series};
}

test('channel upgrade: adds the blocks with today\'s values, a brief and ledger keys; behaviour is unchanged', async () => {
  const {dir, series} = await oldChannel();
  const r = await upgradeChannel({dir, templatesDir, learned: 'Review of our numbers: openers with the thing on screen held best.'});
  assert.equal(r.changes.length, 3);
  const c = JSON.parse(await fs.readFile(path.join(dir, 'channel.json'), 'utf8'));
  assert.equal(c.template, 'launches');
  // exactly what the old file resolved to: nothing about the channel's behaviour changes
  assert.deepEqual(rulesOf(c), rulesOf(series));
  assert.deepEqual(publishOf(c), publishOf(series));
  assert.deepEqual(storiesOf(c), storiesOf(series));
  assert.deepEqual([c.name, c.anchors.length, c.instagram, c.mascot], [series.name, series.anchors.length, series.instagram, series.mascot]);
  const brief = await fs.readFile(path.join(dir, 'brief.md'), 'utf8');
  assert.match(brief, /## 11\. What this channel has learned\n\nReview of our numbers: openers with the thing on screen held best\.\n$/);
  assert.match(brief, /## 3\. Voice and point of view/);
  const led = JSON.parse(await fs.readFile(path.join(dir, 'ledger.json'), 'utf8')).entries;
  assert.deepEqual(led.map((/** @type {any} */ e) => e.key), ['alpha-tool', 'kept-key']);
  // again: nothing left to do, and the brief is not rewritten
  await fs.writeFile(path.join(dir, 'brief.md'), 'my own brief');
  assert.deepEqual((await upgradeChannel({dir, templatesDir})).changes, []);
  assert.equal(await fs.readFile(path.join(dir, 'brief.md'), 'utf8'), 'my own brief');
});

test('channel upgrade: lessons are inserted as written, "$1" and "$&" included', async () => {
  const {dir} = await oldChannel();
  await upgradeChannel({dir, templatesDir, learned: 'Costs went from $1 to $& per video.'});
  assert.match(await fs.readFile(path.join(dir, 'brief.md'), 'utf8'), /## 11\. What this channel has learned\n\nCosts went from \$1 to \$& per video\.\n$/);
});

test('channel upgrade: lessons fill a brief whose section 11 is still the placeholder, and never overwrite the owner\'s own', async () => {
  const {dir} = await oldChannel();
  await upgradeChannel({dir, templatesDir}); // a brief from the template, section 11 untouched
  const r = await upgradeChannel({dir, templatesDir, learned: 'Openers with the thing on screen held best.'});
  assert.equal(r.changes.length, 1);
  assert.match(r.changes[0], /brief\.md: section 11/);
  const brief = await fs.readFile(path.join(dir, 'brief.md'), 'utf8');
  assert.match(brief, /## 11\. What this channel has learned\n\nOpeners with the thing on screen held best\.\n$/);
  assert.match(brief, /## 3\. Voice and point of view/);
  await assert.rejects(upgradeChannel({dir, templatesDir, learned: 'More.'}), /brief\.md already has its own section 11: add the lessons by hand/);
  assert.equal(await fs.readFile(path.join(dir, 'brief.md'), 'utf8'), brief);
});

test('channel upgrade: kit notes go into publish.kitNotes only when it is empty', async () => {
  const {dir} = await oldChannel();
  const r = await upgradeChannel({dir, templatesDir, kitNotes: ['Check the cover crop', 'Tag the maker']});
  assert.ok(r.changes.some((c) => /publish\.kitNotes/.test(c)), r.changes.join());
  const read = async () => JSON.parse(await fs.readFile(path.join(dir, 'channel.json'), 'utf8'));
  assert.deepEqual((await read()).publish.kitNotes, ['Check the cover crop', 'Tag the maker']);
  assert.deepEqual((await upgradeChannel({dir, templatesDir, kitNotes: ['Other']})).changes, []);
  assert.deepEqual((await read()).publish.kitNotes, ['Check the cover crop', 'Tag the maker']);
});

test('cli: channel upgrade --kit-notes reads one note per line', async () => {
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'mh-data-'));
  const config = await fs.mkdtemp(path.join(os.tmpdir(), 'mh-conf-'));
  const {dir} = await oldChannel();
  await fs.mkdir(path.join(data, 'channels'), {recursive: true});
  await fs.cp(dir, path.join(data, 'channels', 'old'), {recursive: true});
  const notes = path.join(config, 'notes.txt');
  await fs.writeFile(notes, 'First note\n\n  Second note  \n');
  const r = cli({data, config}, ['--channel', 'old', 'channel', 'upgrade', '--kit-notes', notes]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /publish\.kitNotes/);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(data, 'channels', 'old', 'channel.json'), 'utf8')).publish.kitNotes, ['First note', 'Second note']);
});

test('channel upgrade --dry-run says what it would do and writes nothing', async () => {
  const {dir} = await oldChannel();
  const before = await fs.readFile(path.join(dir, 'channel.json'), 'utf8');
  const r = await upgradeChannel({dir, templatesDir, dryRun: true});
  assert.equal(r.changes.length, 3);
  assert.equal(await fs.readFile(path.join(dir, 'channel.json'), 'utf8'), before);
  assert.equal(await fs.stat(path.join(dir, 'brief.md')).then(() => true, () => false), false);
});
