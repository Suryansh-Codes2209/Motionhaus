// Word-level timestamps from whisper.cpp (`brew install whisper-cpp`), with
// DTW token alignment. Only the timings are used; the words shown on screen
// come from the script (see align.mjs).
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';

const run = promisify(execFile);

/** @typedef {{text: string, startMs: number, endMs: number}} TimedToken */

/**
 * whisper-cli --output-json-full with -ml 1 -sow: one segment per word.
 * Zero-length tokens are degenerate timings: drop them so align() interpolates.
 * @param {any} json @returns {TimedToken[]}
 */
export function parseWhisperJson(json) {
  return (json.transcription ?? [])
    .map((/** @type {any} */ s) => ({text: String(s.text ?? '').trim(), startMs: Number(s.offsets?.from), endMs: Number(s.offsets?.to)}))
    .filter((/** @type {TimedToken} */ t) => t.text && !/^\[.*\]$/.test(t.text) && Number.isFinite(t.startMs) && t.endMs > t.startMs);
}

/**
 * @param {{model: string, bin?: string}} o model = path to ggml-small.en.bin
 * @returns {(wav: string) => Promise<TimedToken[]>}
 */
export function createWhisper({model, bin = 'whisper-cli'}) {
  return async (wav) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'shorts-whisper-'));
    try {
      const in16 = path.join(dir, 'in.wav');
      await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-ar', '16000', '-ac', '1', in16]);
      const base = path.join(dir, 'out');
      await run(bin, ['-m', model, '-f', in16, '-ml', '1', '-sow', '-ojf', '-of', base, '-np', '--dtw', 'small.en'], {maxBuffer: 1 << 24});
      return parseWhisperJson(JSON.parse(await fs.readFile(`${base}.json`, 'utf8')));
    } finally {
      await fs.rm(dir, {recursive: true, force: true});
    }
  };
}
