// ffmpeg / whisper.cpp wrappers for `reels prep`.
import {execFile, spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import {parseSilences} from './edl.mjs';
import {repairTimings} from './props.mjs';

const run = promisify(execFile);

/** @param {string} cmd @param {string[]} args @param {{cwd?: string}} [o] */
export function sh(cmd, args, o = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {cwd: o.cwd, stdio: ['ignore', 'inherit', 'inherit']});
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve(undefined) : reject(new Error(`${cmd} ${args.slice(0, 3).join(' ')} … exited ${code}`))));
  });
}

/** @param {string} file */
export async function probe(file) {
  const {stdout} = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', file]);
  const j = JSON.parse(stdout);
  const v = j.streams.find((/** @type {any} */ s) => s.codec_type === 'video');
  if (!v) throw new Error(`${file}: no video stream`);
  const [n, d] = String(v.r_frame_rate).split('/').map(Number);
  return {width: v.width, height: v.height, fps: n / (d || 1), duration: Number(j.format.duration), hasAudio: j.streams.some((/** @type {any} */ s) => s.codec_type === 'audio')};
}

/**
 * Conform any phone clip to the studio's canvas: 1080x1920 cover-crop,
 * constant 30 fps (OffthreadVideo seeks are only frame-exact on CFR), a light
 * sharpen for upscaled WhatsApp/IG downloads, AAC 48k audio.
 * @param {string} src @param {string} dest
 */
export async function conform(src, dest) {
  await sh('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', src,
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,unsharp=5:5:0.6:5:5:0,fps=30,format=yuv420p',
    '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-g', '15',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart', dest,
  ]);
}

/** @param {string} file @param {number} duration @param {{noiseDb?: number, minSec?: number}} [o] */
export async function detectSilences(file, duration, {noiseDb = -30, minSec = 0.12} = {}) {
  const {stderr} = await run('ffmpeg', ['-hide_banner', '-i', file, '-af', `silencedetect=n=${noiseDb}dB:d=${minSec}`, '-f', 'null', '-'], {maxBuffer: 1 << 24});
  return parseSilences(stderr, duration);
}

// A romanised prompt makes whisper write Hindi/Hinglish in Latin script,
// which is how Indian creators caption.
const PROMPTS = /** @type {Record<string, string>} */ ({
  hi: 'Haan toh dekho, main tumhe bata rahi hoon ki yeh kaise kaam karta hai. Bhai, sach mein.',
});

/**
 * Word-level transcript with whisper.cpp. Bad token timings are repaired, not dropped.
 * @param {string} file any media file
 * @param {{model: string, lang?: string, prompt?: string, bin?: string}} o
 */
export async function transcribe(file, {model, lang = 'auto', prompt, bin = 'whisper-cli'}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'reels-whisper-'));
  try {
    const wav = path.join(dir, 'in.wav');
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-ar', '16000', '-ac', '1', wav]);
    const base = path.join(dir, 'out');
    const p = prompt ?? PROMPTS[lang];
    // -et: stricter entropy fallback threshold so a stuck decoder re-samples instead of looping
    await run(bin, ['-m', model, '-f', wav, '-l', lang, '-ml', '1', '-sow', '-ojf', '-of', base, '-np', '-et', '2.2', ...(p ? ['--prompt', p] : [])], {maxBuffer: 1 << 26});
    const json = JSON.parse(await fs.readFile(`${base}.json`, 'utf8'));
    const words = (json.transcription ?? [])
      .map((/** @type {any} */ s) => ({text: String(s.text ?? '').trim(), start: Number(s.offsets?.from) / 1000, end: Number(s.offsets?.to) / 1000}))
      .filter((/** @type {any} */ w) => w.text && !/^\[.*\]$|^\(.*\)$/.test(w.text) && Number.isFinite(w.start));
    return repairTimings(words);
  } finally {
    await fs.rm(dir, {recursive: true, force: true});
  }
}

/** Contact sheet: one frame per second, 7 columns, for Claude to look at. */
export async function contactSheet(/** @type {string} */ file, /** @type {string} */ dest, /** @type {number} */ duration) {
  const rows = Math.ceil(Math.ceil(duration) / 7);
  await sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-vf', `fps=1,scale=180:-1,tile=7x${rows}`, '-frames:v', '1', dest]);
}
