// Kokoro-82M (Apache-2.0) via kokoro-js, run locally on the CPU. The model is
// downloaded once into workspace/shorts/cache/models. Every clip goes through the same
// voice chain so loudness and tone match across scenes and episodes.
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {probeSeconds} from './say.mjs';

const run = promisify(execFile);
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';

// Trim leading/trailing silence, cut rumble, gentle compression, broadcast-ish
// loudness, then a short tail so words don't end on a hard cut.
export const VOICE_CHAIN = [
  'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03',
  'areverse',
  'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08',
  'areverse',
  'highpass=f=70',
  'acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2',
  'loudnorm=I=-16:TP=-1.5:LRA=7',
  'apad=pad_dur=0.08',
].join(',');

/** @type {Promise<any> | null} */
let modelPromise = null;

/** @param {string} cacheDir */
async function model(cacheDir) {
  modelPromise ??= (async () => {
    const {env} = await import('@huggingface/transformers');
    env.cacheDir = cacheDir;
    const {KokoroTTS} = await import('kokoro-js');
    return KokoroTTS.from_pretrained(MODEL, {dtype: 'fp32', device: 'cpu'});
  })();
  return modelPromise;
}

/**
 * Applies `pronounce` respellings (whole words, case-insensitive) to the text
 * that is spoken. Captions keep the original spelling.
 * @param {string} text @param {Record<string, string>} [pronounce]
 */
export function spokenText(text, pronounce = {}) {
  let t = text.replace(/\*/g, '');
  for (const [word, say] of Object.entries(pronounce)) {
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`(?<![\\w])${esc}(?![\\w])`, 'gi'), say);
  }
  return t;
}

/**
 * @param {{cacheDir: string, voice: string, speed?: number, pronounce?: Record<string, string>}} o
 * @returns {import('../steps/make.mjs').Synth}
 */
export function createKokoro({cacheDir, voice, speed = 1.05, pronounce}) {
  return async (text, outWav, ctx = {}) => {
    const tts = await model(cacheDir);
    const audio = await tts.generate(spokenText(text, {...pronounce, ...ctx.pronounce}), {voice, speed});
    await fs.mkdir(path.dirname(outWav), {recursive: true});
    const raw = outWav.replace(/\.wav$/, '.raw.wav');
    await audio.save(raw);
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-af', VOICE_CHAIN, '-ar', '48000', '-ac', '1', outWav]);
    await fs.rm(raw);
    return {durationSec: await probeSeconds(outWav)};
  };
}
