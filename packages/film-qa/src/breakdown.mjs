// Turn a reference video into a map you can rebuild: cut points, whether the
// cuts sit on a beat grid (and the BPM that implies), a 4 fps contact sheet,
// and one reference frame per shot. Port of huashu-art-motion's
// scripts/analyze/breakdown.py (MIT), minus the motion heat maps.
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {decode, probe} from './frames.mjs';
import {fitGrid, frameDiffs, round} from './metrics.mjs';

const run = promisify(execFile);

/**
 * Transition starts: diff crosses `thresh` upward, at least `debounce`
 * frames after the previous start. Still shots sit < 2, transitions 10–40.
 * @param {Float64Array} d @param {{thresh?: number, debounce?: number}} [o]
 */
export function transitionStarts(d, {thresh = 5, debounce = 12} = {}) {
  /** @type {number[]} */
  const starts = [];
  for (let i = 1; i < d.length; i++) {
    if (d[i] > thresh && d[i - 1] <= thresh && (!starts.length || i - starts[starts.length - 1] > debounce)) starts.push(i);
  }
  return starts;
}

/**
 * @param {string} file @param {string} out
 * @param {{thresh?: number, debounce?: number}} [o]
 */
export async function breakdown(file, out, o = {}) {
  await fs.mkdir(path.join(out, 'ref'), {recursive: true});
  const info = await probe(file);
  const {frames} = await decode(file, {fps: info.fps, width: 192});
  const d = frameDiffs(frames);
  const starts = transitionStarts(d, o);
  const grid = fitGrid(starts, info.fps);
  const result = {
    fps: info.fps,
    size: [info.width, info.height],
    duration_s: round(info.duration, 2),
    cuts_frames: starts,
    cuts_sec: starts.map((s) => round(s / info.fps, 3)),
    shot_lengths_s: [0, ...starts, frames.length].slice(1).map((b, i, arr) => round((b - (i ? arr[i - 1] : 0)) / info.fps, 2)),
    grid,
  };
  await fs.writeFile(path.join(out, 'cuts.json'), JSON.stringify(result, null, 1));

  // contact sheet: 4 fps, 6 columns, 30 frames per sheet
  const tall = info.height > info.width;
  const cw = tall ? 240 : 480;
  const rows = 5;
  await run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vf', `fps=4,scale=${cw}:-2,tile=6x${rows}`, '-q:v', '4', path.join(out, 'sheet_%02d.jpg')]);

  // one reference frame per shot (3 frames before the next cut)
  const bounds = [0, ...starts, frames.length];
  for (let i = 0; i < bounds.length - 1; i++) {
    const f = Math.max(bounds[i], bounds[i + 1] - 3);
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', String(f / info.fps), '-i', file, '-frames:v', '1', path.join(out, 'ref', `shot${String(i + 1).padStart(2, '0')}.png`)]);
  }
  return result;
}
