import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {test} from 'node:test';
import {DEFAULT_PUBLISH, DEFAULT_RULES, fill, hasInstagram, publishOf, rulesOf, storiesOf, validateSettings} from '../src/channel-settings.mjs';
import {validateChannel} from '../src/channels.mjs';
import {instaCaption, instaChecks, instaScript} from '../src/instagram.mjs';
import {buildProps} from '../src/props.mjs';
import {assertScenesFit, retentionChecks} from '../src/retention.mjs';
import {insertBody, sourcesBlock} from '../src/youtube.mjs';
import {cli, install} from './config.test.mjs';

const series = JSON.parse(await fs.readFile(new URL('../series.json', import.meta.url), 'utf8'));
const script = JSON.parse(await fs.readFile(new URL('../sample/oratora.script.json', import.meta.url), 'utf8'));
const before = JSON.parse(await fs.readFile(new URL('./fixtures/launch-radar-before.json', import.meta.url), 'utf8'));
const meta = {title: 'Claude Code can now rehearse your pitch? Oratora just launched', description: 'Oratora listens to your talk and scores it.\n\nMore below.', tags: ['ai', 'public speaking'], comment: 'Would you practise with an AI coach?', privacy: /** @type {const} */ ('public')};

test('Launch Radar, with a channel.json from before these settings, publishes exactly what it did', () => {
  // `before` was captured from the code as it was before channel settings existed.
  assert.equal(instaCaption(script, meta, series), before.caption);
  assert.equal(instaCaption({...script, sourceUrl: `https://${script.brand.url}`}, meta, series), before.captionOwnSite);
  assert.equal(instaCaption({...script, sourceLabel: 'GitHub', sourceUrl: 'https://github.com/x/oratora', instagram: {makers: ['@maker'], hashtags: ['voiceai']}}, meta, series), before.captionVia);
  assert.equal(instaCaption({...script, ownProject: true}, meta, series), before.captionOwnProject);
  assert.deepEqual(instaScript(script, meta, publishOf(series)).outro, before.igOutro);
  assert.deepEqual(insertBody(meta, publishOf(series).youtube), before.body);
  const props = buildProps(script, {scenes: script.scenes.map(() => null), outro: null}, series, {});
  const {badge, ...rest} = props.series;
  assert.deepEqual(rest, before.propsSeries);
  assert.equal(badge, `#${String(script.episode).padStart(3, '0')} · via ${before.sourceLabel}`); // the text the badge used to assemble itself
  assert.equal(props.sourceLabel, before.sourceLabel);
  assert.deepEqual({url: props.config.brand.url, font: props.config.brand.font}, before.brand);
});

test('the same checks fire for Launch Radar as before (wording may differ, the set may not)', () => {
  const rules = rulesOf(series);
  const names = (/** @type {{rule: string}[]} */ c) => c.map((x) => x.rule);
  assert.equal(retentionChecks(script, {meta, anchors: series.anchors, rules}).length, before.retention.length);
  assert.deepEqual(names(retentionChecks(script, {meta, anchors: series.anchors, rules})), ['words', 'subjectInFrame0', 'shortFirstSentence', 'shortFirstSentence']);
  const bad = {...script, scenes: script.scenes.slice(0, 2).map((/** @type {any} */ s, /** @type {number} */ i) => (i ? s : {type: 'type', vo: 'Someone built a thing that is very long and goes on and on for many words here.'}))};
  assert.equal(retentionChecks(bad, {meta: {title: 'A thing #shorts', comment: 'no'}, anchors: series.anchors, rules}).length, before.retentionBad.length);
  assert.equal(instaChecks(script, {rules}).length, before.insta.length);
  assert.equal(instaChecks({...script, instagram: {hashtags: ['#ai']}, scenes: [{type: 'type', vo: 'x'}]}, {rules}).length, before.instaBad.length);
});

test('defaults are the old constants; a channel overrides only what it names', () => {
  assert.deepEqual(rulesOf({}), DEFAULT_RULES);
  assert.deepEqual(publishOf(undefined), DEFAULT_PUBLISH);
  assert.deepEqual(rulesOf({rules: {titleAnchor: false, words: [62, 100]}}), {...DEFAULT_RULES, titleAnchor: false, words: [62, 100]});
  const p = publishOf({publish: {credit: {direct: 'Sourced below.'}, youtube: {categoryId: '27'}}});
  assert.equal(p.credit.direct, 'Sourced below.');
  assert.equal(p.credit.own, DEFAULT_PUBLISH.credit.own);
  assert.deepEqual(p.youtube, {categoryId: '27', language: 'en'});
  assert.equal(storiesOf({}).identity, 'product');
  assert.deepEqual(storiesOf({stories: {identity: 'story', feeds: []}}).feeds, []);
  assert.equal(storiesOf({}).banned.length, 4);
});

test('fill: a placeholder with no value takes its separator and joining word with it', () => {
  assert.equal(fill('#{n} · via {source}', {n: '042', source: 'GitHub'}), '#042 · via GitHub');
  assert.equal(fill('#{n} · via {source}', {n: '042', source: undefined}), '#042');
  assert.equal(fill('#{n} · via {source}', {n: '042', source: ''}), '#042');
  assert.equal(fill('{name} #{n}', {name: 'Facts Daily', n: '007'}), 'Facts Daily #007');
  assert.equal(fill('Found via {source}. Not affiliated.', {source: 'Show HN'}), 'Found via Show HN. Not affiliated.');
  assert.equal(fill('#{n}', {n: '001', source: 'x'}), '#001');
});

test('fill: a value is inserted as written; a missing placeholder at the start takes the separator after it', () => {
  assert.equal(fill('#{n} · via {source}', {n: '042', source: 'Tom $& Jerry $$ Co $1'}), '#042 · via Tom $& Jerry $$ Co $1');
  assert.equal(fill('{source} · #{n}', {n: '042', source: undefined}), '#042');
  assert.equal(fill('via {source} | #{n}', {n: '042', source: ''}), '#042');
  assert.equal(fill('{source} · #{n}', {n: '042', source: 'Reuters'}), 'Reuters · #042');
});

test('a rule that is off prints nothing; the general ones still apply', () => {
  const rules = rulesOf({rules: {titleAnchor: false, subjectInFrame0: false, endsOnQuestion: false, shortsTag: false}});
  const text = {scenes: [{type: 'type', vo: 'Someone ' + 'word '.repeat(20)}, {type: 'stat', vo: 'no question here.'}], outro: {vo: 'bye'}};
  const got = retentionChecks(text, {meta: {title: 'No anchor at all #shorts', comment: 'statement'}, anchors: ['Claude'], rules}).map((c) => c.rule);
  assert.deepEqual([...new Set(got)].sort(), ['scenes', 'shortFirstSentence', 'words']);
  assert.deepEqual(instaChecks({...text, instagram: {hashtags: ['#ai']}}, {rules: {...rules, broadHashtags: []}}), []);
});

test('the channel sets its own numbers and its own too-broad tags', () => {
  const s = {scenes: Array.from({length: 8}, () => ({type: 'stat', image: 'a.png', vo: 'ten words here to make the count come out right ok?'})), outro: {vo: ''}};
  assert.deepEqual(retentionChecks(s, {rules: rulesOf({rules: {scenes: [5, 8], words: [62, 100], shortFirstSentence: false}})}), []);
  assert.deepEqual(retentionChecks(s, {rules: rulesOf({rules: {shortFirstSentence: false}})}).map((c) => c.rule), ['scenes', 'words']); // the launch defaults: 5–7 scenes, 62–84 words
  const tagged = {...s, instagram: {hashtags: ['#cricket', 'news']}};
  assert.match(instaChecks(tagged, {rules: rulesOf({rules: {broadHashtags: ['#news']}})})[0].message, /#news is too broad/);
});

test('a channel without Instagram gets no Instagram checks', () => {
  assert.equal(hasInstagram({instagram: {handle: '@x'}}), true);
  assert.equal(hasInstagram({instagram: {handle: ''}}), false);
  assert.equal(hasInstagram({}), false);
  assert.deepEqual(instaChecks({scenes: [{type: 'type', vo: 'x'}]}, {instagram: false}), []);
});

test('the category and language on YouTube are the channel\'s', () => {
  assert.equal(insertBody(meta).snippet.categoryId, '28');
  const b = insertBody(meta, {categoryId: '27', language: 'hi'});
  assert.deepEqual([b.snippet.categoryId, b.snippet.defaultLanguage, b.snippet.defaultAudioLanguage], ['27', 'hi', 'hi']);
});

test('credit lines and the share end card come from the channel', () => {
  const mine = {...series, publish: {shareOutro: 'Send this to a friend who loves trivia', credit: {direct: 'Sources in the description.', via: 'Spotted on {source}.'}}};
  assert.match(instaCaption(script, meta, mine), /\nSources in the description\.\n/);
  assert.match(instaCaption({...script, sourceLabel: 'Reuters', sourceUrl: 'https://reuters.com/x'}, meta, mine), /\nSpotted on Reuters\.\n/);
  assert.deepEqual(instaScript(script, meta, publishOf(mine)).outro, {text: 'Send this to a friend who loves trivia', vo: 'Send this to a friend who loves trivia.'});
  // no source label: the "via" line is never printed with a hole in it
  const {sourceLabel: _s, ...noLabel} = script;
  assert.doesNotMatch(instaCaption({...noLabel, sourceUrl: 'https://example.com/a'}, meta, mine), /undefined|Spotted on \./);
});

test('the badge follows the channel\'s template, with or without a source', () => {
  const voice = {scenes: script.scenes.map(() => null), outro: null};
  assert.equal(buildProps(script, voice, {...series, publish: {badge: '#{n}'}}, {}).series.badge, `#${String(script.episode).padStart(3, '0')}`);
  const {sourceLabel: _s, ...noLabel} = script;
  assert.equal(buildProps(noLabel, voice, series, {}).series.badge, `#${String(script.episode).padStart(3, '0')}`);
});

test('validateSettings names what is wrong; the shipped defaults pass', () => {
  assert.deepEqual(validateSettings(series), []);
  assert.match(validateSettings({rules: {titelAnchor: true}}).join(), /rules\.titelAnchor is not a rule/);
  assert.match(validateSettings({rules: {words: [100, 62]}}).join(), /rules\.words must be \[min, max\]/);
  assert.match(validateSettings({stories: {identity: 'thing'}}).join(), /stories\.identity/);
  assert.match(validateSettings({stories: {banned: ['(']}}).join(), /broken pattern/);
  assert.match(validateChannel({...series, rules: {nope: 1}}).join(), /rules\.nope/);
});

// --- a subject that is not a product ---

const facts = /** @type {any} */ ({
  episode: 3,
  key: 'octopus-hearts',
  brand: {name: 'Octopus hearts'},
  style: 'vox',
  scenes: [
    {type: 'photo', image: 'photos/octopus-1.jpg', vo: 'An octopus has three hearts.'},
    {type: 'stat', vo: 'Two pump blood through the gills. The third feeds the body, and it stops when the animal swims.'},
  ],
  outro: {text: 'Follow for one fact a day', vo: 'Follow for one fact a day.'},
  sources: {'three hearts': 'Smithsonian Ocean, https://ocean.si.edu/ocean-life/invertebrates/octopus (read 2026-11-14)', 'the systemic heart stops while swimming': 'a paper I once read'},
});

test('a script without a page or font of its own still builds, with an empty link', () => {
  const p = buildProps(facts, {scenes: facts.scenes.map(() => null), outro: null}, {...series, publish: {badge: '#{n}'}}, {});
  assert.deepEqual([p.config.brand.url, p.config.brand.font, p.config.brand.name], ['', 'Inter', 'Octopus hearts']);
  assert.equal(p.sourceLabel, '');
  assert.equal(p.series.badge, '#003');
});

test('product scenes are refused for a subject with no page', () => {
  assertScenesFit(facts);
  assert.throws(() => assertScenesFit({...facts, scenes: [...facts.scenes, {type: 'screenshot'}]}), /scene 3 is "screenshot".*brand\.url/);
  assertScenesFit({...facts, brand: {name: 'X', url: 'x.dev'}, scenes: [{type: 'spotlight'}]}); // a product keeps them
});

test('sourcesRequired: every claim names a link', () => {
  const rules = rulesOf({rules: {sourcesRequired: true, titleAnchor: false, subjectInFrame0: false, endsOnQuestion: false, scenes: [1, 8], words: [1, 100]}});
  const got = retentionChecks(facts, {rules});
  assert.deepEqual(got.map((c) => c.rule), ['sourcesRequired']);
  assert.match(got[0].message, /"the systemic heart stops while swimming" has no link/);
  assert.match(retentionChecks({...facts, sources: undefined}, {rules})[0].message, /no "sources"/);
  assert.match(retentionChecks({...facts, sources: {}}, {rules})[0].message, /no "sources"/);
  assert.deepEqual(retentionChecks({...facts, sources: {a: 'https://a.org/x'}}, {rules}), []);
  // off by default: launch scripts are not held to it
  assert.equal(retentionChecks(facts, {rules: rulesOf({rules: {titleAnchor: false, subjectInFrame0: false, endsOnQuestion: false, scenes: [1, 8], words: [1, 100]}})}).length, 0);
});

test('sourcesBlock: the distinct links, for the description', () => {
  assert.equal(sourcesBlock(facts.sources), 'Sources:\nhttps://ocean.si.edu/ocean-life/invertebrates/octopus');
  assert.equal(sourcesBlock({a: 'see https://a.org/x.', b: 'https://a.org/x and https://b.org/y)'}), 'Sources:\nhttps://a.org/x\nhttps://b.org/y');
  assert.equal(sourcesBlock(undefined), '');
  assert.equal(sourcesBlock({a: 'no link'}), '');
});

test('cli: a channel without Instagram loads, and capture checks its arguments', async () => {
  const {instagram: _ig, ...noIg} = series;
  const i = await install({yt: {...noIg, name: 'YouTube Only', handle: '@ytonly'}});
  assert.equal(cli(i, ['--channel', 'yt', 'ledger']).code, 0);
  const bad = cli(i, ['--channel', 'yt', 'capture', 'some/dir', 'not-a-link']);
  assert.equal(bad.code, 1);
  assert.match(bad.out, /usage: shorts capture/);
});

test('badgeSource: a badge that names the source needs a sourceLabel in the script', () => {
  const rules = rulesOf({rules: {titleAnchor: false, subjectInFrame0: false, endsOnQuestion: false, shortFirstSentence: false, scenes: [1, 8], words: [1, 100]}});
  const {sourceLabel: _s, ...noLabel} = facts;
  const got = retentionChecks(noLabel, {rules, badge: '#{n} · via {source}'});
  assert.deepEqual(got.map((c) => c.rule), ['badgeSource']);
  assert.equal(got[0].message, 'the badge shows where the story was found but script.json has no "sourceLabel"');
  assert.deepEqual(retentionChecks({...noLabel, sourceLabel: 'Reuters'}, {rules, badge: '#{n} · via {source}'}), []);
  assert.deepEqual(retentionChecks(noLabel, {rules, badge: '#{n}'}), []);
  assert.deepEqual(retentionChecks(noLabel, {rules}), []); // no badge given: nothing to check
  assert.deepEqual(retentionChecks(noLabel, {rules: {...rules, badgeSource: false}, badge: '#{n} · via {source}'}), []);
  assert.equal(DEFAULT_RULES.badgeSource, true);
});

test('validateSettings: a yes/no rule must be true or false', () => {
  assert.match(validateSettings({rules: {endsOnQuestion: 'false'}}).join(), /rules\.endsOnQuestion must be true or false/);
  assert.deepEqual(validateSettings({rules: {endsOnQuestion: false, badgeSource: true}}), []);
});
