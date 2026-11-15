import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {createChannel, describeChannels, formatChannels} from '../src/channel-cmds.mjs';
import {readDefault, secretsFile, validateChannel} from '../src/channels.mjs';
import {loadConfig} from '../src/config.mjs';
import {cli} from './config.test.mjs';

const templatesDir = new URL('../templates', import.meta.url).pathname;
const fresh = async () => ({data: await fs.mkdtemp(path.join(os.tmpdir(), 'mh-data-')), config: await fs.mkdtemp(path.join(os.tmpdir(), 'mh-conf-'))});

test('createChannel: a valid channel with nothing borrowed from another one', async () => {
  const {data, config} = await fresh();
  const r = await createChannel({data, config, slug: 'ai-daily', name: 'AI Daily', templatesDir});
  const c = JSON.parse(await fs.readFile(path.join(r.dir, 'channel.json'), 'utf8'));
  assert.deepEqual(validateChannel(c), []);
  assert.equal(c.name, 'AI Daily');
  assert.equal(c.handle, '');
  assert.equal(c.instagram.handle, '');
  assert.equal('autoPostAfter' in c.instagram, false);
  assert.equal('mascot' in c, false);
  assert.doesNotMatch(JSON.stringify(c), /launchradar/i);
  await fs.stat(path.join(r.dir, 'brand', 'mark.svg'));
  await fs.stat(path.join(r.dir, 'blocklist.txt'));
  const secrets = await fs.readFile(secretsFile('ai-daily', config), 'utf8');
  assert.match(secrets, /INSTAGRAM_UPLOAD_MODE=manual/);
  assert.equal((await fs.stat(secretsFile('ai-daily', config))).mode & 0o777, 0o600);
  assert.equal(await readDefault(data), 'ai-daily'); // the first channel is the default
  const cfg = await loadConfig({channel: 'ai-daily', data, config});
  assert.equal(cfg.env.instagram.mode, 'manual');
  assert.equal(cfg.env.instagram.pageToken, '');
});

test('createChannel: refuses a bad or taken name; a second channel does not steal the default', async () => {
  const {data, config} = await fresh();
  await createChannel({data, config, slug: 'one', templatesDir});
  await assert.rejects(createChannel({data, config, slug: 'one', templatesDir}), /already exists/);
  await assert.rejects(createChannel({data, config, slug: 'Bad Name', templatesDir}), /not a valid channel name/);
  await assert.rejects(createChannel({data, config, slug: '../x', templatesDir}), /not a valid channel name/);
  await createChannel({data, config, slug: 'two', templatesDir});
  assert.equal(await readDefault(data), 'one');
});

test('describeChannels and the list', async () => {
  const {data, config} = await fresh();
  await createChannel({data, config, slug: 'one', name: 'One', templatesDir});
  await createChannel({data, config, slug: 'two', name: 'Two', templatesDir});
  await fs.appendFile(secretsFile('two', config), 'INSTAGRAM_PAGE_TOKEN=t\nINSTAGRAM_UPLOAD_MODE=auto\n');
  const rows = await describeChannels({data, config, loaded: async (slug) => ({poster: slug === 'two', maker: false})});
  assert.deepEqual(rows.map((r) => [r.slug, r.isDefault, r.instagramSignedIn, r.instagramMode]), [['one', true, false, 'manual'], ['two', false, true, 'auto']]);
  const text = formatChannels(rows);
  assert.match(text, /^\* one/m);
  assert.match(text, /timers: poster/);
  assert.equal(formatChannels([]), 'no channels yet: run `shorts channel new <slug>`');
});

test('cli: channel new, list, default work with no channel chosen', async () => {
  const i = await fresh();
  assert.match(cli(i, ['channel', 'list']).out, /no channels yet/);
  const made = cli(i, ['channel', 'new', 'first', '--name', 'First One']);
  assert.equal(made.code, 0);
  assert.match(made.out, /channel\.json/);
  cli(i, ['channel', 'new', 'second']);
  assert.match(cli(i, ['channel', 'list']).out, /\* first\s+First One/);
  assert.equal(cli(i, ['channel', 'default', 'second']).code, 0);
  assert.match(cli(i, ['channel', 'list']).out, /\* second/);
  assert.match(cli(i, ['channel', 'default', 'nope']).out, /no channel "nope"/);
  assert.match(cli(i, ['channel']).out, /usage: shorts channel/);
});

// --- from the whole-branch review ---

test('review I2: no new channel on an install that has not been migrated', async () => {
  const {data, config} = await fresh();
  await fs.mkdir(path.join(data, 'shorts', 'episodes'), {recursive: true});
  await assert.rejects(createChannel({data, config, slug: 'foo', templatesDir}), /run `shorts channel migrate` first/);
  assert.equal(await fs.stat(path.join(data, 'channels')).then(() => true, () => false), false);
});

test('review I4: a leftover login file is never adopted by a new channel', async () => {
  const {data, config} = await fresh();
  await fs.mkdir(path.dirname(secretsFile('foo', config)), {recursive: true});
  await fs.writeFile(secretsFile('foo', config), 'INSTAGRAM_PAGE_TOKEN=old\nINSTAGRAM_UPLOAD_MODE=auto\n');
  await assert.rejects(createChannel({data, config, slug: 'foo', templatesDir}), /login file .* already exists/);
  assert.equal(await fs.stat(path.join(data, 'channels', 'foo')).then(() => true, () => false), false);
});

test('review M7: channel new takes a name equal to the slug; unknown flags are refused', async () => {
  const i = await fresh();
  assert.equal(cli(i, ['channel', 'new', 'foo', '--name', 'foo']).code, 0);
  const r = cli(i, ['channel', 'migrate', '--dryrun']);
  assert.equal(r.code, 1);
  assert.match(r.out, /unknown option --dryrun/);
});
