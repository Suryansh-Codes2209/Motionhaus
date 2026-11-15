// Dev-only TTS: macOS `say`. Lets the render pipeline be built and checked
// without the Kokoro model (TTS_PROVIDER=say). Caption timings still come
// from whisper when it's available.
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';

const run = promisify(execFile);

/** @param {string} file */
export async function probeSeconds(file) {
  const {stdout} = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(stdout.trim());
}

/**
 * @param {string} text @param {string} outWav absolute path
 * @param {{voice?: string, rate?: number}} [o]
 */
export async function synth(text, outWav, {voice = 'Samantha', rate = 190} = {}) {
  await fs.mkdir(path.dirname(outWav), {recursive: true});
  const aiff = outWav.replace(/\.wav$/, '.aiff');
  await run('say', ['-v', voice, '-r', String(rate), '-o', aiff, text.replace(/\*/g, '')]);
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', aiff, '-ar', '48000', '-ac', '1', '-af', 'loudnorm=I=-16:TP=-1.5', outWav]);
  await fs.rm(aiff);
  return {durationSec: await probeSeconds(outWav)};
}
