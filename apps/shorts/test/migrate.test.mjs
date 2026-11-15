import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {channelDir, readDefault, readEnvFile, secretsFile} from '../src/channels.mjs';
import {loadConfig} from '../src/config.mjs';
import {inventory, migrate, withoutKeys} from '../src/migrate.mjs';

const defaultsDir = new URL('..', import.meta.url).pathname;

/** A temp install shaped like the real one before channels. */
async function oldInstall() {
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'mh-old-'));
  const config = await fs.mkdtemp(path.join(os.tmpdir(), 'mh-conf-'));
  const old = path.join(data, 'shorts');
  for (const d of ['episodes/alpha', 'episodes/beta', 'episodes/gamma', 'long/alpha', 'runs/2026-11-13', 'review/instagram-reels', 'review/youtube-shorts/001-alpha', 'cache/models', 'maker-runs', 'demos']) await fs.mkdir(path.join(old, d), {recursive: true});
  await fs.writeFile(path.join(old, 'episodes', 'alpha', 'script.json'), '{"episode": 1}');
  await fs.writeFile(path.join(old, 'ledger.json'), JSON.stringify({entries: [{episode: 1}, {episode: 2}, {episode: 3}]}));
  await fs.writeFile(path.join(old, 'review', 'instagram-reels', 'schedule.json'), JSON.stringify([{n: '001', posted: {id: 'M'}}, {n: '002'}]));
  await fs.writeFile(path.join(old, 'autopilot.log'), 'log\n');
  await fs.writeFile(path.join(old, 'autopilot-state.json'), '{"lastRun":"2026-11-13"}');
  await fs.writeFile(path.join(old, 'shorts-sheet.csv'), 'a,b\n');
  await fs.writeFile(path.join(old, 'cache', 'models', 'big.bin'), 'model');
  const rootEnvFile = path.join(data, 'root.env');
  await fs.writeFile(rootEnvFile, '# shared\nGITHUB_TOKEN=gh\nMETA_APP_ID=app\nYOUTUBE_REFRESH_TOKEN=yt-token\nYOUTUBE_UPLOAD_MODE=manual\n# instagram\nINSTAGRAM_PAGE_TOKEN=ig-token\nINSTAGRAM_USER_ID=ig-id\nINSTAGRAM_UPLOAD_MODE=auto\nTTS_PROVIDER=kokoro\n');
  /** @type {string[]} */
  const calls = [];
  let present = ['poster', 'maker'];
  const timers = {
    running: async () => false,
    loaded: async () => present,
    removeOld: async () => {
      calls.push('removeOld');
      present = [];
    },
    install: async (/** @type {string[]} */ which) => void calls.push(`install:${which.join('+')}`),
  };
  return {data, config, old, rootEnvFile, timers, calls, opts: {data, config, rootEnvFile, defaultsDir, timers}};
}

test('migrate: everything moves into the channel, the shared cache stays, logins are split', async () => {
  const t = await oldInstall();
  const before = await inventory(t.old);
  assert.deepEqual(before, {episodes: 3, long: 1, ledger: 3, schedule: 2, posted: 1});
  const r = await migrate(t.opts);
  assert.equal(r.status, 'migrated');
  const dir = channelDir(t.data, 'launch-radar');
  assert.deepEqual(r.after, before);
  assert.deepEqual(await inventory(dir), before);
  for (const f of ['episodes/alpha/script.json', 'ledger.json', 'review/instagram-reels/schedule.json', 'autopilot.log', 'autopilot-state.json', 'shorts-sheet.csv', 'demos', 'maker-runs', 'runs/2026-11-13', 'brand/mark.svg', 'blocklist.txt', 'channel.json', '.migrated'])
    await fs.stat(path.join(dir, f));
  // the shared tooling did not move, and nothing else is left behind
  assert.equal(await fs.readFile(path.join(t.old, 'cache', 'models', 'big.bin'), 'utf8'), 'model');
  assert.deepEqual((await fs.readdir(t.old)).filter((n) => n !== '.DS_Store'), ['cache']);
  await assert.rejects(fs.stat(path.join(dir, 'cache')));

  const channel = JSON.parse(await fs.readFile(path.join(dir, 'channel.json'), 'utf8'));
  assert.equal(channel.name, 'Launch Radar');
  assert.equal(channel.mascot, true);

  const secrets = readEnvFile(secretsFile('launch-radar', t.config));
  assert.deepEqual(secrets, {YOUTUBE_REFRESH_TOKEN: 'yt-token', YOUTUBE_UPLOAD_MODE: 'manual', INSTAGRAM_PAGE_TOKEN: 'ig-token', INSTAGRAM_USER_ID: 'ig-id', INSTAGRAM_UPLOAD_MODE: 'auto'});
  assert.equal((await fs.stat(secretsFile('launch-radar', t.config))).mode & 0o777, 0o600);
  const root = await fs.readFile(t.rootEnvFile, 'utf8');
  assert.deepEqual(readEnvFile(t.rootEnvFile), {GITHUB_TOKEN: 'gh', META_APP_ID: 'app', TTS_PROVIDER: 'kokoro'});
  assert.match(root, /# shared/); // comments and other lines kept

  assert.equal(await readDefault(t.data), 'launch-radar');
  assert.deepEqual(t.calls, ['removeOld', 'install:poster+maker']);

  // and the migrated channel loads with its login and mode
  const cfg = await loadConfig({data: t.data, config: t.config});
  assert.deepEqual([cfg.channel.slug, cfg.env.instagram.pageToken, cfg.env.instagram.mode], ['launch-radar', 'ig-token', 'auto']);
});

test('migrate: a second run is a no-op', async () => {
  const t = await oldInstall();
  await migrate(t.opts);
  const r = await migrate(t.opts);
  assert.equal(r.status, 'already');
  assert.deepEqual(t.calls, ['removeOld', 'install:poster+maker']); // timers untouched the second time
});

test('migrate --dry-run changes nothing', async () => {
  const t = await oldInstall();
  /** @type {string[]} */
  const lines = [];
  const r = await migrate({...t.opts, dryRun: true, log: (l) => void lines.push(l)});
  assert.equal(r.status, 'dry-run');
  assert.ok(lines.some((l) => /would move .*episodes/.test(l)));
  assert.ok(lines.some((l) => /would leave .*cache/.test(l)));
  assert.equal(await fs.stat(path.join(t.data, 'channels')).then(() => true, () => false), false);
  assert.equal(readEnvFile(t.rootEnvFile).INSTAGRAM_PAGE_TOKEN, 'ig-token');
  assert.deepEqual(t.calls, []);
  assert.deepEqual(await inventory(t.old), {episodes: 3, long: 1, ledger: 3, schedule: 2, posted: 1});
});

test('migrate: refused while a run is in progress or a post holds the lock', async () => {
  const t = await oldInstall();
  await assert.rejects(migrate({...t.opts, timers: {...t.timers, running: async () => true}}), /in progress/);
  await fs.writeFile(path.join(t.old, 'review', 'instagram-reels', 'schedule.json.lock'), '1');
  await assert.rejects(migrate(t.opts), /a post is in progress/);
  assert.deepEqual(await inventory(t.old), {episodes: 3, long: 1, ledger: 3, schedule: 2, posted: 1});
  assert.deepEqual(t.calls, []);
});

test('migrate: interrupted after the move, the next run finishes it without moving anything twice', async () => {
  const t = await oldInstall();
  // The first run dies when it reinstalls the timers: files moved, logins split, no marker.
  await assert.rejects(migrate({...t.opts, timers: {...t.timers, install: async () => { throw new Error('launchctl failed'); }}}), /launchctl failed/);
  const dir = channelDir(t.data, 'launch-radar');
  await assert.rejects(fs.stat(path.join(dir, '.migrated')));
  await fs.stat(path.join(dir, 'episodes', 'alpha'));
  const r = await migrate(t.opts);
  assert.equal(r.status, 'migrated');
  assert.deepEqual(r.after, {episodes: 3, long: 1, ledger: 3, schedule: 2, posted: 1});
  // the timers that were loaded before the FIRST run are the ones reinstalled
  assert.equal(t.calls.at(-1), 'install:poster+maker');
  assert.equal(readEnvFile(secretsFile('launch-radar', t.config)).INSTAGRAM_PAGE_TOKEN, 'ig-token');
  assert.equal((await fs.readFile(secretsFile('launch-radar', t.config), 'utf8')).match(/INSTAGRAM_PAGE_TOKEN/g)?.length, 1);
});

test('migrate: a destination that already exists stops the run and overwrites nothing', async () => {
  const t = await oldInstall();
  const dir = channelDir(t.data, 'launch-radar');
  await fs.mkdir(path.join(dir, 'episodes', 'other'), {recursive: true});
  await assert.rejects(migrate(t.opts), /already exists\. Nothing was overwritten/);
  await fs.stat(path.join(t.old, 'episodes', 'alpha', 'script.json'));
  await fs.stat(path.join(dir, 'episodes', 'other'));
  assert.equal(t.calls.includes('install:poster+maker'), false);
});

test('migrate: a fresh install with nothing to move does nothing', async () => {
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'mh-new-'));
  const t = await oldInstall();
  const r = await migrate({...t.opts, data});
  assert.equal(r.status, 'nothing');
  assert.deepEqual(t.calls, []);
});

test('withoutKeys removes only the named keys', () => {
  assert.equal(withoutKeys('A=1\nexport B=2\n# B is here\nC=3\n', ['B']), 'A=1\n# B is here\nC=3\n');
});

// --- from the whole-branch review ---

test('review C2: which timers were loaded survives a crash between removing them and saving the list', async () => {
  const t = await oldInstall();
  // The first run dies right after the old timers are booted out.
  const dying = {...t.timers, removeOld: async () => { await t.timers.removeOld(); throw new Error('rm plist failed'); }};
  await assert.rejects(migrate({...t.opts, timers: dying}), /rm plist failed/);
  const r = await migrate(t.opts); // now nothing is loaded any more
  assert.equal(r.status, 'migrated');
  assert.equal(t.calls.at(-1), 'install:poster+maker');
});

test('review C1: a half-finished migration is visible to every command', async () => {
  const {needsMigration, migrationUnfinished} = await import('../src/channels.mjs');
  const t = await oldInstall();
  await assert.rejects(migrate({...t.opts, timers: {...t.timers, install: async () => { throw new Error('launchctl failed'); }}}), /launchctl failed/);
  assert.equal(await migrationUnfinished(t.data), true);
  assert.equal(await needsMigration(t.data), true); // although a channel folder now exists
  await migrate(t.opts);
  assert.equal(await migrationUnfinished(t.data), false);
  assert.equal(await needsMigration(t.data), false);
});

test('review I4: a login already in the channel file that differs from the shared one stops the run', async () => {
  const t = await oldInstall();
  await fs.mkdir(path.dirname(secretsFile('launch-radar', t.config)), {recursive: true});
  await fs.writeFile(secretsFile('launch-radar', t.config), 'INSTAGRAM_PAGE_TOKEN=some-other-account\n');
  await assert.rejects(migrate(t.opts), /INSTAGRAM_PAGE_TOKEN.*differs/);
  assert.equal(readEnvFile(t.rootEnvFile).INSTAGRAM_PAGE_TOKEN, 'ig-token'); // nothing dropped
  assert.equal(readEnvFile(secretsFile('launch-radar', t.config)).INSTAGRAM_PAGE_TOKEN, 'some-other-account');
  assert.deepEqual(t.calls, []); // and it stopped before touching the timers or files
  assert.deepEqual(await inventory(t.old), {episodes: 3, long: 1, ledger: 3, schedule: 2, posted: 1});
});

test('review I5: the shared .env is replaced atomically (no temp file left, mode kept private)', async () => {
  const t = await oldInstall();
  await migrate(t.opts);
  assert.deepEqual((await fs.readdir(path.dirname(t.rootEnvFile))).filter((n) => n.startsWith('root.env')), ['root.env']);
  assert.equal((await fs.stat(t.rootEnvFile)).mode & 0o777, 0o600);
});
