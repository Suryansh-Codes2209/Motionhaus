// End to end on clips generated with ffmpeg (no fixtures in the repo).
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {after, test} from 'node:test';
import {breakdown} from '../src/breakdown.mjs';
import {measure} from '../src/gate.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'film-qa-'));
after(() => fs.rmSync(dir, {recursive: true, force: true}));
const ff = (/** @type {string[]} */ args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);

test('a moving test pattern passes the animation gate; a black hole mid-film is red', async () => {
  const moving = path.join(dir, 'moving.mp4');
  // bars sweeping fast across the frame: lots of fast frames, never blank
  const sweep = ['-f', 'lavfi', '-i', 'nullsrc=size=320x180:rate=24:duration=22', '-vf'];
  const geq = "geq=lum='128+100*sin((X+T*600)/9)':cb=128:cr=128";
  ff([...sweep, geq, '-pix_fmt', 'yuv420p', moving]);
  const ok = await measure(moving, {profile: 'animation'});
  assert.equal(ok.lights.blank_run_s, 'green');
  assert.equal(ok.verdict, 'green', JSON.stringify(ok.lights));

  const holed = path.join(dir, 'holed.mp4');
  ff([...sweep, `${geq},drawbox=enable='between(t,8,9.5)':color=black:t=fill`, '-pix_fmt', 'yuv420p', holed]);
  const bad = await measure(holed, {profile: 'animation'});
  assert.equal(bad.verdict, 'red');
  assert.equal(bad.lights.blank_run_s, 'red');
  assert.ok(bad.blank_run_s >= 1, `blank ${bad.blank_run_s}`);
});

test('breakdown finds hard cuts between colour cards', async () => {
  const cards = path.join(dir, 'cards.mp4');
  ff([
    '-f', 'lavfi', '-i', 'color=red:size=192x108:rate=30:duration=1',
    '-f', 'lavfi', '-i', 'color=blue:size=192x108:rate=30:duration=1',
    '-f', 'lavfi', '-i', 'color=green:size=192x108:rate=30:duration=1',
    '-filter_complex', '[0][1][2]concat=n=3:v=1:a=0', '-pix_fmt', 'yuv420p', cards,
  ]);
  const res = await breakdown(cards, path.join(dir, 'bd'));
  assert.equal(res.cuts_frames.length, 2);
  assert.ok(Math.abs(res.cuts_sec[0] - 1) < 0.05 && Math.abs(res.cuts_sec[1] - 2) < 0.05, String(res.cuts_sec));
  assert.ok(fs.existsSync(path.join(dir, 'bd', 'ref', 'shot03.png')));
});
