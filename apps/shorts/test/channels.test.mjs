import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {CHANNEL_KEYS, channelDir, channelOf, isSlug, listChannels, loadChannelEnv, needsMigration, readDefault, resolveChannel, secretsFile, validateChannel, writeDefault} from '../src/channels.mjs';

/** A temp data root with the named channels. @param {string[]} slugs */
async function dataRoot(slugs = []) {
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'mh-data-'));
  for (const s of slugs) {
    await fs.mkdir(channelDir(data, s), {recursive: true});
    await fs.writeFile(path.join(channelDir(data, s), 'channel.json'), '{}');
  }
  return data;
}

test('isSlug: lowercase letters, digits and dashes', () => {
  for (const ok of ['launch-radar', 'a', 'ch2', '9lives']) assert.equal(isSlug(ok), true, ok);
  for (const bad of ['', 'Launch', 'a b', '-a', 'a/b', '..', 'a_b', 'a.b']) assert.equal(isSlug(bad), false, bad);
});

test('listChannels: only folders with a channel.json, sorted', async () => {
  const data = await dataRoot(['zeta', 'alpha']);
  await fs.mkdir(path.join(data, 'channels', 'not-a-channel'));
  assert.deepEqual(await listChannels(data), ['alpha', 'zeta']);
  assert.deepEqual(await listChannels(await dataRoot()), []);
});

test('resolveChannel: flag, then env, then default, then the only one', async () => {
  const data = await dataRoot(['a', 'b', 'c']);
  await writeDefault(data, 'c');
  assert.equal(await readDefault(data), 'c');
  assert.equal(await resolveChannel({flag: 'a', env: 'b', data}), 'a');
  assert.equal(await resolveChannel({env: 'b', data}), 'b');
  assert.equal(await resolveChannel({data}), 'c');
  const one = await dataRoot(['solo']);
  assert.equal(await resolveChannel({data: one}), 'solo');
});

test('resolveChannel: never guesses', async () => {
  const two = await dataRoot(['a', 'b']);
  await assert.rejects(resolveChannel({data: two}), /choose a channel with --channel \(channels: a, b\)/);
  await assert.rejects(resolveChannel({flag: 'x', data: two}), /no channel "x" \(channels: a, b\)/);
  await assert.rejects(resolveChannel({env: 'x', data: two}), /no channel "x"/);
  await assert.rejects(resolveChannel({flag: '../a', data: two}), /not a valid channel name/);
  await assert.rejects(resolveChannel({data: await dataRoot()}), /no channels yet: run `shorts channel new <slug>`/);
  // a default that points at a deleted channel is not silently replaced
  await fs.writeFile(path.join(two, 'channels.json'), '{"default": "gone"}');
  await assert.rejects(resolveChannel({data: two}), /default channel "gone" does not exist/);
});

test('needsMigration: old layout with data and no channels', async () => {
  const data = await dataRoot();
  assert.equal(await needsMigration(data), false); // fresh install
  await fs.mkdir(path.join(data, 'shorts', 'cache'), {recursive: true});
  assert.equal(await needsMigration(data), false); // only the shared tooling
  await fs.mkdir(path.join(data, 'shorts', 'episodes'));
  assert.equal(await needsMigration(data), true);
  await fs.mkdir(channelDir(data, 'x'), {recursive: true});
  await fs.writeFile(path.join(channelDir(data, 'x'), 'channel.json'), '{}');
  assert.equal(await needsMigration(data), false);
});

test('channelOf: which channel a path sits in', async () => {
  const data = await dataRoot(['a', 'b']);
  assert.equal(channelOf(data, path.join(data, 'channels', 'b', 'episodes', 'x')), 'b');
  assert.equal(channelOf(data, path.join(data, 'channels', 'a')), 'a');
  assert.equal(channelOf(data, path.join(data, 'launch-films', 'x')), null);
  assert.equal(channelOf(data, '/somewhere/else'), null);
});

test('loadChannelEnv: a channel reads its logins only from its own file', async () => {
  const config = await fs.mkdtemp(path.join(os.tmpdir(), 'mh-conf-'));
  await fs.mkdir(path.dirname(secretsFile('a', config)), {recursive: true});
  await fs.writeFile(secretsFile('a', config), 'INSTAGRAM_PAGE_TOKEN=A_TOKEN\nINSTAGRAM_UPLOAD_MODE=auto\nMETA_APP_ID=own-app\n# c\n');
  const rootEnv = {INSTAGRAM_PAGE_TOKEN: 'ROOT', INSTAGRAM_USER_ID: 'ROOT_ID', META_APP_ID: 'shared'};
  const processEnv = {YOUTUBE_REFRESH_TOKEN: 'SHELL'};
  const a = loadChannelEnv('a', {config, rootEnv, processEnv});
  assert.equal(a.values.INSTAGRAM_PAGE_TOKEN, 'A_TOKEN');
  assert.equal(a.values.INSTAGRAM_UPLOAD_MODE, 'auto');
  assert.equal(a.values.META_APP_ID, 'own-app'); // a channel may bring its own app
  assert.equal(a.values.INSTAGRAM_USER_ID, undefined); // never inherited
  assert.equal(a.values.YOUTUBE_REFRESH_TOKEN, undefined);
  assert.equal(a.warnings.length, 1);
  assert.match(a.warnings[0], /INSTAGRAM_PAGE_TOKEN, INSTAGRAM_USER_ID, YOUTUBE_REFRESH_TOKEN/);
  // a channel with no file gets nothing, not another channel's login
  const b = loadChannelEnv('b', {config, rootEnv, processEnv});
  for (const k of CHANNEL_KEYS) assert.equal(b.values[k], undefined, k);
  // inside the maker run no login is loaded at all
  // inside the maker run no login is loaded, only the two upload switches (so a kit it packs
  // still says whether the reel posts by itself)
  assert.deepEqual(loadChannelEnv('a', {config, rootEnv: {}, processEnv: {}, maker: true}).values, {INSTAGRAM_UPLOAD_MODE: 'auto'});
  assert.deepEqual(loadChannelEnv('a', {config, rootEnv: {}, processEnv: {}}).warnings, []);
});

test('validateChannel: accepts the shipped defaults, names what is missing', async () => {
  const series = JSON.parse(await fs.readFile(new URL('../series.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateChannel(series), []);
  assert.match(validateChannel({...series, name: ''}).join(), /name/);
  assert.match(validateChannel({...series, colors: {...series.colors, accent: undefined}}).join(), /colors\.accent/);
  assert.match(validateChannel({...series, voice: {id: 'x'}}).join(), /voice\.provider/);
  assert.match(validateChannel({...series, instagram: {...series.instagram, slotsIST: ['7pm']}}).join(), /instagram\.slotsIST/);
  assert.match(validateChannel(null).join(), /not an object/);
  const {instagram, ...noIg} = series;
  assert.deepEqual(validateChannel(noIg), []); // a YouTube-only channel
});
