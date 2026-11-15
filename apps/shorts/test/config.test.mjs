import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {channelDir, secretsFile, takeChannelFlag, writeDefault} from '../src/channels.mjs';
import {loadConfig} from '../src/config.mjs';

const SERIES = JSON.parse(await fs.readFile(new URL('../series.json', import.meta.url), 'utf8'));
const CLI = new URL('../src/cli.mjs', import.meta.url).pathname;

/** A temp install with channels a and b. @param {Record<string, Record<string, any>>} [channels] */
export async function install(channels = {a: {name: 'Alpha'}, b: {name: 'Beta'}}) {
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'mh-data-'));
  const config = await fs.mkdtemp(path.join(os.tmpdir(), 'mh-conf-'));
  for (const [slug, over] of Object.entries(channels)) {
    const dir = channelDir(data, slug);
    await fs.mkdir(path.join(dir, 'brand'), {recursive: true});
    await fs.writeFile(path.join(dir, 'channel.json'), JSON.stringify({...SERIES, ...over}));
    await fs.writeFile(path.join(dir, 'blocklist.txt'), `${slug}-blocked.com\n`);
  }
  return {data, config};
}

/** Runs the CLI against a temp install. @param {{data: string, config: string}} i @param {string[]} args @param {Record<string, string>} [env] */
export function cli(i, args, env = {}) {
  try {
    const out = execFileSync(process.execPath, [CLI, ...args], {encoding: 'utf8', env: {PATH: process.env.PATH ?? '', HOME: i.config, MOTIONHAUS_DATA: i.data, MOTIONHAUS_CONFIG_HOME: i.config, MOTIONHAUS_NO_BANNER: '1', ...env}, stdio: ['ignore', 'pipe', 'pipe']});
    return {code: 0, out};
  } catch (e) {
    const err = /** @type {any} */ (e);
    return {code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}`};
  }
}

test('loadConfig: each channel gets its own settings, paths and blocklist', async () => {
  const {data, config} = await install();
  const a = await loadConfig({channel: 'a', data, config});
  const b = await loadConfig({channel: 'b', data, config});
  assert.equal(a.series.name, 'Alpha');
  assert.equal(b.series.name, 'Beta');
  assert.deepEqual([a.channel.slug, a.channel.dir], ['a', channelDir(data, 'a')]);
  assert.equal(a.paths.ledger, path.join(data, 'channels', 'a', 'ledger.json'));
  assert.equal(b.paths.review, path.join(data, 'channels', 'b', 'review'));
  assert.equal(a.paths.brand, path.join(data, 'channels', 'a', 'brand'));
  assert.deepEqual(a.blocked, ['a-blocked.com']);
  // the tooling cache is one shared copy, never inside a channel
  assert.equal(a.paths.cache, path.join(data, 'shorts', 'cache'));
  assert.equal(a.paths.cache, b.paths.cache);
});

test('loadConfig: logins come only from the channel file', async () => {
  const {data, config} = await install();
  await fs.mkdir(path.dirname(secretsFile('a', config)), {recursive: true});
  await fs.writeFile(secretsFile('a', config), 'INSTAGRAM_PAGE_TOKEN=A_TOKEN\nINSTAGRAM_USER_ID=A_ID\nINSTAGRAM_UPLOAD_MODE=auto\nYOUTUBE_REFRESH_TOKEN=A_YT\n');
  const saved = {...process.env};
  process.env.INSTAGRAM_PAGE_TOKEN = 'SHELL_TOKEN';
  process.env.INSTAGRAM_UPLOAD_MODE = 'auto';
  const err = console.error;
  /** @type {string[]} */
  const warned = [];
  console.error = (m) => void warned.push(String(m));
  try {
    const a = await loadConfig({channel: 'a', data, config});
    const b = await loadConfig({channel: 'b', data, config});
    assert.deepEqual([a.env.instagram.pageToken, a.env.instagram.igUserId, a.env.instagram.mode, a.env.youtube.refreshToken], ['A_TOKEN', 'A_ID', 'auto', 'A_YT']);
    assert.deepEqual([b.env.instagram.pageToken, b.env.instagram.igUserId, b.env.instagram.mode, b.env.youtube.refreshToken], ['', '', 'manual', undefined]);
    assert.equal(a.channel.secretsFile, secretsFile('a', config));
    assert.ok(warned.some((w) => /INSTAGRAM_PAGE_TOKEN.*ignored/.test(w)));
    process.env.MOTIONHAUS_MAKER = '1';
    const m = await loadConfig({channel: 'a', data, config});
    assert.deepEqual([m.env.instagram.pageToken, m.env.instagram.igUserId, m.env.youtube.refreshToken], ['', '', undefined]); // the maker gets no login
    assert.equal(m.env.instagram.mode, 'auto'); // but knows the reel will post by itself
  } finally {
    console.error = err;
    for (const k of ['INSTAGRAM_PAGE_TOKEN', 'INSTAGRAM_UPLOAD_MODE', 'MOTIONHAUS_MAKER']) if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
  }
});

test('loadConfig: a broken channel.json names the file and the field', async () => {
  const {data, config} = await install({a: {name: ''}});
  await assert.rejects(loadConfig({channel: 'a', data, config}), /channels\/a\/channel\.json: name is missing/);
});

test('takeChannelFlag: removed from argv wherever it is', () => {
  const before = ['node', 'cli', '--channel', 'x', 'make', 'dir', '--render'];
  assert.equal(takeChannelFlag(before), 'x');
  assert.deepEqual(before, ['node', 'cli', 'make', 'dir', '--render']);
  const after = ['node', 'cli', 'make', 'dir', '--channel=y', '--render'];
  assert.equal(takeChannelFlag(after), 'y');
  assert.deepEqual(after, ['node', 'cli', 'make', 'dir', '--render']);
  assert.equal(takeChannelFlag(['node', 'cli', 'make', 'dir']), undefined);
  assert.throws(() => takeChannelFlag(['node', 'cli', 'make', '--channel']), /needs a channel name/);
});

test('cli: never guesses a channel; --channel and the default choose one', async () => {
  const i = await install();
  const none = cli(i, ['ledger']);
  assert.equal(none.code, 1);
  assert.match(none.out, /choose a channel with --channel \(channels: a, b\)/);
  assert.match(cli(i, ['--channel', 'a', 'ledger']).out, /ledger is empty/);
  assert.match(cli(i, ['ledger', '--channel', 'b']).out, /ledger is empty/);
  assert.match(cli(i, ['ledger'], {MOTIONHAUS_CHANNEL: 'b'}).out, /ledger is empty/);
  await writeDefault(i.data, 'a');
  assert.equal(cli(i, ['ledger']).code, 0);
  assert.match(cli(i, ['--channel', 'zzz', 'ledger']).out, /no channel "zzz"/);
});

test('cli: a path inside another channel is refused', async () => {
  const i = await install();
  const ep = path.join(channelDir(i.data, 'b'), 'episodes', 'x');
  await fs.mkdir(ep, {recursive: true});
  const r = cli(i, ['--channel', 'a', 'kit', ep]);
  assert.equal(r.code, 1);
  assert.match(r.out, /belongs to channel "b", not "a"/);
});

test('cli: an install from before channels is told to migrate, and the poster notifies', async () => {
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'mh-old-'));
  const config = await fs.mkdtemp(path.join(os.tmpdir(), 'mh-conf-'));
  await fs.mkdir(path.join(data, 'shorts', 'episodes'), {recursive: true});
  const r = cli({data, config}, ['ledger']);
  assert.equal(r.code, 1);
  assert.match(r.out, /run `shorts channel migrate`/);
  cli({data, config}, ['insta-post']);
  cli({data, config}, ['insta-post']);
  const log = await fs.readFile(path.join(data, 'shorts', 'autopilot.log'), 'utf8');
  assert.equal(log.trim().split('\n').length, 1); // once a day, not every 15 minutes
  assert.match(log, /posting is stopped/);
});

test('review I3: the maker cannot act on another channel with --channel', async () => {
  const i = await install();
  const r = cli(i, ['--channel', 'b', 'ledger'], {MOTIONHAUS_MAKER: '1', MOTIONHAUS_CHANNEL: 'a'});
  assert.equal(r.code, 1);
  assert.match(r.out, /maker for channel "a" may not act on channel "b"/);
  assert.equal(cli(i, ['--channel', 'a', 'ledger'], {MOTIONHAUS_MAKER: '1', MOTIONHAUS_CHANNEL: 'a'}).code, 0);
  assert.equal(cli(i, ['ledger'], {MOTIONHAUS_MAKER: '1', MOTIONHAUS_CHANNEL: 'a'}).code, 0);
  assert.equal(cli(i, ['ledger'], {MOTIONHAUS_MAKER: '1'}).code, 1); // a maker run always knows its channel
});

test('an unfinished migration blocks every command, except the child the migration itself starts', async () => {
  const i = await install({'launch-radar': {name: 'Launch Radar'}});
  await fs.writeFile(path.join(channelDir(i.data, 'launch-radar'), '.migration.json'), '{}');
  const blocked = cli(i, ['ledger']);
  assert.equal(blocked.code, 1);
  assert.match(blocked.out, /did not finish: run `shorts channel migrate`/);
  // found at the real cutover: the migration's own `autopilot install` was refused by this very check
  assert.equal(cli(i, ['ledger'], {MOTIONHAUS_MIGRATING: '1'}).code, 0);
});
