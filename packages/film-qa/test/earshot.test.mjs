// earshot is optional and not installed in CI: a fake executable stands in.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {after, test} from 'node:test';
import {critique, findEarshot, formatCritique, INSTALL_HINT, summarize} from '../src/earshot.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'film-qa-earshot-'));
after(() => fs.rmSync(dir, {recursive: true, force: true}));

const RESULT = {
  verdict: 'close',
  score: 0.81,
  in_range: 19,
  scored: 23,
  actions: [{weight: 'major', action: 'cut at 0:03.20 has no sound'}, {weight: 'minor', action: 'whoosh peak lands 90 ms early at 0:07.10'}],
  tips: ['add a riser into the logo'],
  text: 'VERDICT: close',
};

test('summarize reads verdict, score and fixes; tolerates junk', () => {
  const s = summarize(RESULT);
  assert.equal(s.verdict, 'close');
  assert.equal(s.score, 0.81);
  assert.deepEqual(s.fixes, ['[major] cut at 0:03.20 has no sound', '[minor] whoosh peak lands 90 ms early at 0:07.10']);
  assert.deepEqual(summarize(null), {verdict: 'n.a.', score: null, inRange: null, scored: null, fixes: [], tips: []});
});

test('missing earshot: one clear install line, not an error', async () => {
  // MOTIONHAUS_DATA points the repo-install lookup at an empty dir too
  assert.equal(await findEarshot({PATH: dir, MOTIONHAUS_DATA: dir}), null);
  const r = await critique(path.join(dir, 'x.mp4'), {env: {PATH: dir, MOTIONHAUS_DATA: dir}});
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.missing, true);
  assert.equal(formatCritique(r), INSTALL_HINT);
  assert.match(INSTALL_HINT, /github\.com\/Leonxlnx\/earshot/);
});

test('runs `earshot critique <mp4> --json --out`, saves next to the film', async () => {
  const bin = path.join(dir, 'earshot');
  const argsLog = path.join(dir, 'args.txt');
  fs.writeFileSync(
    bin,
    `#!/bin/sh\necho "$@" > ${JSON.stringify(argsLog)}\nwhile [ $# -gt 0 ]; do [ "$1" = "--out" ] && out="$2"; shift; done\necho '${JSON.stringify(RESULT)}' > "$out"\necho '${JSON.stringify(RESULT)}'\n`,
  );
  fs.chmodSync(bin, 0o755);
  const mp4 = path.join(dir, 'short.mp4');
  fs.writeFileSync(mp4, '');
  assert.equal(await findEarshot({PATH: `/nonexistent${path.delimiter}${dir}`}), bin);
  const r = await critique(mp4, {env: {EARSHOT_BIN: bin}});
  assert.equal(r.ok, true);
  assert.equal(fs.readFileSync(argsLog, 'utf8').trim(), `critique ${mp4} --json --out ${path.join(dir, 'short.earshot.json')}`);
  assert.ok(fs.existsSync(path.join(dir, 'short.earshot.json')));
  const text = formatCritique(r);
  assert.match(text, /earshot: close \(score 0\.81, 19\/23 metrics in range\)/);
  assert.match(text, /1\. \[major\] cut at 0:03\.20/);
  const gone = await critique(path.join(dir, 'nope.mp4'), {bin});
  assert.equal(gone.ok, false);
});
