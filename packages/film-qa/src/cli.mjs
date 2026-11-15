#!/usr/bin/env node
// film-qa gate <video.mp4> [--profile animation|reel] [--json]   exit 2 on red
// film-qa breakdown <video.mp4> --out <dir> [--thresh 5] [--debounce 12]
// film-qa critique <video.mp4> [--fast]   earshot sound scorecard (when earshot is installed)
import {breakdown} from './breakdown.mjs';
import {critique, formatCritique} from './earshot.mjs';
import {measure, PROFILES, report} from './gate.mjs';

const [cmd, file, ...rest] = process.argv.slice(2);
const flag = (/** @type {string} */ name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};

if (cmd === 'gate' && file) {
  const profile = /** @type {keyof typeof PROFILES} */ (flag('profile') ?? 'animation');
  if (!PROFILES[profile]) throw new Error(`unknown profile ${profile} (${Object.keys(PROFILES).join(', ')})`);
  const res = await measure(file, {profile});
  console.log(rest.includes('--json') ? JSON.stringify(res, null, 1) : report(res));
  process.exitCode = res.verdict === 'red' ? 2 : 0;
} else if (cmd === 'breakdown' && file && flag('out')) {
  const res = await breakdown(file, /** @type {string} */ (flag('out')), {thresh: Number(flag('thresh') ?? 5), debounce: Number(flag('debounce') ?? 12)});
  console.log(`cuts (s): ${res.cuts_sec.join(', ') || 'none'}`);
  console.log(`grid: ${res.grid ? `step ${res.grid.step_frames}f → ${res.grid.bpm_if_step_is_quarter} BPM (quarter) / ${res.grid.bpm_if_step_is_eighth} (eighth)` : 'none'}`);
  console.log(`→ ${flag('out')}/cuts.json, sheet_*.jpg, ref/`);
} else if (cmd === 'critique' && file) {
  const res = await critique(file, {fast: rest.includes('--fast')});
  console.log(formatCritique(res));
  if (!res.ok && !res.missing) process.exitCode = 1;
} else {
  console.error('usage:\n  film-qa critique <video> [--fast]\n  film-qa gate <video> [--profile animation|reel] [--json]\n  film-qa breakdown <video> --out <dir> [--thresh 5] [--debounce 12]');
  process.exitCode = 1;
}
