import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {istToLocal, labels, makerArgs, makerPrompt, makerSettings, newClaims, newlyMade, OLD_LABELS, plist, posterTimes, shouldMake} from '../src/autopilot.mjs';
import {cli, install} from './config.test.mjs';

test('posterTimes: every 15 minutes from the slot to 23:45 IST', () => {
  const t = posterTimes('19:30');
  assert.equal(t.length, 18);
  assert.deepEqual([t[0], t[1], t.at(-1)], ['19:30', '19:45', '23:45']);
  assert.deepEqual(posterTimes('23:40'), ['23:40', '23:55']);
});

test('istToLocal converts an IST time to the machine time zone', () => {
  assert.deepEqual(istToLocal('19:30', 0), {Hour: 14, Minute: 0}); // a UTC machine
  assert.deepEqual(istToLocal('19:30', 330), {Hour: 19, Minute: 30}); // a Mac in India
  assert.deepEqual(istToLocal('02:00', 0), {Hour: 20, Minute: 30}); // wraps to the day before
  assert.deepEqual(istToLocal('10:00', -480), {Hour: 20, Minute: 30}); // US Pacific
});

test('plist: label, calendar, PATH, logs; nothing launchd must open inside the repo', async () => {
  const xml = plist({
    label: labels('alpha').poster,
    args: ['/usr/local/bin/node', '/repo/apps/shorts/src/cli.mjs', 'insta-post'],
    calendar: posterTimes('19:30').map((t) => istToLocal(t, 330)),
    logFile: '/Users/x/Library/Logs/a & b.log',
    pathDirs: ['/usr/local/bin', '/opt/homebrew/bin'],
  });
  assert.match(xml, /<string>com\.motionhaus\.alpha\.poster<\/string>/);
  assert.doesNotMatch(xml, /WorkingDirectory/);
  assert.equal((xml.match(/<key>Hour<\/key>/g) ?? []).length, 18);
  assert.match(xml, /<key>Hour<\/key>\s*<integer>19<\/integer>\s*<key>Minute<\/key>\s*<integer>30<\/integer>/);
  assert.match(xml, /<key>PATH<\/key>\s*<string>\/usr\/local\/bin:\/opt\/homebrew\/bin:\/usr\/bin:\/bin<\/string>/);
  assert.match(xml, /<key>StandardErrorPath<\/key>\s*<string>\/Users\/x\/Library\/Logs\/a &amp; b\.log<\/string>/);
  assert.doesNotMatch(xml, /RunAtLoad/);
  if (process.platform === 'darwin') {
    const f = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'plist-')), 'a.plist');
    await fs.writeFile(f, xml);
    assert.match(execFileSync('plutil', ['-lint', f], {encoding: 'utf8'}), /OK/);
  }
});

const day = (/** @type {number} */ d) => ({n: String(d), dir: 'd', file: 'f', date: `2026-11-${d}`, time: '19:30'});

test('shouldMake: not while 3 or more days are queued ahead', () => {
  assert.equal(shouldMake([day(14), day(15), day(16)], '2026-11-13').make, false);
  assert.match(shouldMake([day(14), day(15), day(16)], '2026-11-13').reason, /3 days/);
  assert.equal(shouldMake([day(14), day(15)], '2026-11-13').make, true);
  assert.equal(shouldMake([], '2026-11-13').make, true);
});

test('makerArgs: headless Claude with the generated settings, and not as a plugin', () => {
  const a = makerArgs({prompt: 'make it', settingsFile: '/home/.config/motionhaus/maker-settings.json'});
  assert.deepEqual(a.slice(0, 2), ['-p', 'make it']);
  assert.equal(a[a.indexOf('--settings') + 1], '/home/.config/motionhaus/maker-settings.json');
  assert.equal(a[a.indexOf('--permission-mode') + 1], 'dontAsk');
  assert.equal(a.includes('--dangerously-skip-permissions'), false);
  // --plugin-dir <repo> makes Claude Code deny every write inside the repo, workspace included
  assert.equal(a.includes('--plugin-dir'), false);
});

test('maker settings: Bash rules never allow posting, publishing or pushing', async () => {
  const s = JSON.parse(await fs.readFile(new URL('../autopilot/maker-settings.json', import.meta.url), 'utf8'));
  const deny = s.permissions.deny.join('\n');
  const CLI = 'node apps/shorts/src/cli.mjs';
  for (const rule of ['insta-post*', 'insta-auth*', 'publish*', 'auth*', 'autopilot*', 'channel*', '--channel*']) assert.ok(s.permissions.deny.includes(`Bash(${CLI} ${rule})`), rule);
  assert.match(deny, /git push/);
  const allow = s.permissions.allow;
  for (const bad of ['Bash', 'Bash(*)', 'Bash(node *)', 'Bash(npm run *)', 'Bash(cat *)', 'Bash(find *)', 'Bash(cp *)', 'Bash(grep *)', 'Edit', 'Write']) assert.equal(allow.includes(bad), false, bad);
  assert.ok(allow.includes('Bash(node apps/shorts/studio/scripts/capture.mjs *)')); // the copy that has playwright installed
});

test('labels: one pair of timers per channel, never the old shared pair', () => {
  assert.deepEqual(labels('alpha'), {poster: 'com.motionhaus.alpha.poster', maker: 'com.motionhaus.alpha.maker'});
  assert.notDeepEqual(labels('alpha'), labels('beta'));
  assert.deepEqual(OLD_LABELS, {poster: 'work.suryansh.motionhaus.poster', maker: 'work.suryansh.motionhaus.maker'});
});

test('makerSettings: edits only inside its own channel; never the queue, ledger, channel settings or any login', () => {
  const s = makerSettings({base: {permissions: {allow: ['Read'], deny: ['Bash(git push*)']}}, repoDir: '/repo', channelDir: '/data/channels/alpha', configHome: '/home/u/.config/motionhaus'});
  assert.deepEqual(s.permissions.allow, ['Read', 'Edit(//data/channels/alpha/**)']);
  for (const d of [
    'Bash(git push*)',
    'Edit(//data/channels/alpha/ledger.json)',
    'Edit(//data/channels/alpha/autopilot-state.json)',
    'Edit(//data/channels/alpha/channel.json)',
    'Edit(//data/channels/alpha/review/instagram-reels/schedule.json)',
    'Read(//home/u/.config/motionhaus/**)',
    'Edit(//home/u/.config/motionhaus/**)',
    'Read(//repo/.env)',
    'Edit(//repo/.env)',
  ])
    assert.ok(s.permissions.deny.includes(d), d);
  // nothing lets it into a sibling channel
  assert.equal(s.permissions.allow.some((r) => r.includes('/data/channels/**') || r.includes('/data/**')), false);
  // Claude Code ignores "./relative" and Write(path) file rules: none may be generated
  for (const r of [...s.permissions.allow, ...s.permissions.deny]) assert.doesNotMatch(r, /^(Edit|Read)\(\.\/|^Write\(/, r);
});

test('makerPrompt: filled in for one channel, no placeholder left', async () => {
  const template = await fs.readFile(new URL('../autopilot/maker-prompt.md', import.meta.url), 'utf8');
  const p = makerPrompt(template, {name: 'Alpha Daily', slug: 'alpha', dir: '/data/channels/alpha'});
  assert.match(p, /\*\*Alpha Daily\*\* \(`alpha`\)/);
  assert.match(p, /\/data\/channels\/alpha\/episodes\//);
  assert.doesNotMatch(p, /\{\{|Launch Radar|workspace\/shorts|launch's own page/);
  assert.throws(() => makerPrompt('hello {{nope}}', {name: 'a', slug: 'b', dir: 'c'}), /unknown placeholder \{\{nope\}\}/);
});

test('the maker prompt states the green rule and forbids posting', async () => {
  const p = await fs.readFile(new URL('../autopilot/maker-prompt.md', import.meta.url), 'utf8');
  for (const must of ['shorts make', '--render', 'instagram:', 'retention:', 'gate', 'shorts kit', 'insta-post', 'skills/short-styles/SKILL.md', 'in the foreground', 'Never start a command in the background', 'brief.md', 'shorts story claim', 'Reopen every link', 'shorts story release --key', "the product's own page"]) assert.ok(p.includes(must), must);
});

test('review I2: commands that post, publish, sign in or change timers refuse inside the maker run', () => {
  const cli = new URL('../src/cli.mjs', import.meta.url).pathname;
  for (const cmd of ['insta-post', 'insta-auth', 'publish', 'auth', 'autopilot', 'channel']) {
    let out = '';
    let code = 0;
    try {
      out = execFileSync(process.execPath, [cli, cmd, '--dry-run'], {encoding: 'utf8', env: {...process.env, MOTIONHAUS_MAKER: '1'}, stdio: ['ignore', 'pipe', 'pipe']});
    } catch (e) {
      code = /** @type {any} */ (e).status;
      out = String(/** @type {any} */ (e).stderr);
    }
    assert.equal(code, 1, cmd);
    assert.match(out, /not available to the unattended maker/, cmd);
  }
});

// --- review C2: a channel with no Instagram account ---

test('cli: autopilot status and install for a channel with no Instagram account', async () => {
  // install() starts from series.json, which has an Instagram handle: an empty one is "no account"
  const i = await install({yt: {name: 'YouTube Only', handle: '@ytonly', instagram: {handle: ''}}});
  const st = cli(i, ['--channel', 'yt', 'autopilot', 'status']);
  assert.equal(st.code, 0, st.out);
  assert.match(st.out, /instagram: no account/);
  assert.doesNotMatch(st.out, /signed in:|autoPostAfter/);
  if (process.platform === 'darwin') {
    const inst = cli(i, ['--channel', 'yt', 'autopilot', 'install']);
    assert.equal(inst.code, 1);
    assert.match(inst.out, /this channel has no Instagram account, so there is nothing to post: use --maker to install only the daily maker/);
  }
});

test('newlyMade: an episode counts as made when the ledger gained a made entry', () => {
  const e = (/** @type {number} */ episode, /** @type {any} */ status, key = `k${episode}`) => /** @type {any} */ ({episode, status, key, url: 'https://x.dev', title: 't'});
  assert.deepEqual(newlyMade([e(1, 'made'), e(2, 'claimed')], [e(1, 'made'), e(2, 'made')]).map((x) => x.episode), [2]);
  assert.deepEqual(newlyMade([e(1, 'made')], [e(1, 'made'), e(2, 'claimed')]), []);
  assert.deepEqual(newlyMade([], [e(1, 'published')]), []);
  assert.deepEqual(newlyMade([], [e(3, 'made')]).map((x) => x.episode), [3]);
});

test('newClaims: the live claims a run left that were not there before it', () => {
  const now = new Date('2026-11-14T10:00:00Z');
  const c = (/** @type {string} */ key, at = now.toISOString()) => /** @type {any} */ ({episode: 1, status: 'claimed', key, claimedAt: at, url: 'https://x.dev', title: 't'});
  assert.deepEqual(newClaims([c('old')], [c('old'), c('fresh'), /** @type {any} */ ({episode: 2, status: 'made', key: 'made-one'})], now), ['fresh']);
  assert.deepEqual(newClaims([], [c('stale', '2026-11-12T00:00:00Z')], now), []);
});

test('maker deny rules match the commands, not words in a story title, key or link', async () => {
  const s = JSON.parse(await fs.readFile(new URL('../autopilot/maker-settings.json', import.meta.url), 'utf8'));
  // Claude Code's Bash rule: "*" is any run of characters
  const glob = (/** @type {string} */ p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 's');
  const rules = s.permissions.deny.map((/** @type {string} */ r) => /^Bash\((.*)\)$/.exec(r)?.[1]).filter(Boolean).map(glob);
  const denied = (/** @type {string} */ cmd) => rules.some((/** @type {RegExp} */ r) => r.test(cmd));
  assert.equal(denied('node apps/shorts/src/cli.mjs story claim --title "Anthropic publishes its safety report" --url https://www.environment.gov.au/x --key tesla-autopilot-recall'), false);
  for (const cmd of ['publish dir', 'insta-post', 'autopilot make', '--channel b kit x']) assert.ok(denied(`node apps/shorts/src/cli.mjs ${cmd}`), cmd);
});
