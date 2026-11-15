// headshot with a recorded take: one video of the speaker reading the whole
// script (every scene's `vo`, then the outro's) becomes the voiceover. Whisper
// times the take, the script is aligned to it, and each line gets its own
// stretch of audio (public/vo/<name>.wav) plus where that stretch starts in
// the footage, so the face plays in sync with its scene.
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {align, scriptWords} from '../captions/align.mjs';

/** @typedef {import('../captions/align.mjs').Word} Word */

/**
 * Splits the take's aligned words into one segment per line. A segment
 * starts a little before its first word and ends a little after its last,
 * never reaching into the neighbouring line's pause by more than half.
 * Word times come back relative to the segment start.
 * @param {(string | null)[]} lines  vo per scene (null: silent), outro last
 * @param {Word[]} words  aligned words of all lines joined, in order
 * @param {number} totalMs
 * @param {{lead?: number, tail?: number}} [o]
 * @returns {({startMs: number, endMs: number, words: Word[]} | null)[]}
 */
export function takeSegments(lines, words, totalMs, {lead = 150, tail = 250} = {}) {
  const counts = lines.map((l) => (l?.trim() ? scriptWords(l).length : 0));
  /** @type {{first: number, last: number}[]} */
  const spans = [];
  let at = 0;
  for (const n of counts) {
    spans.push({first: at, last: at + n - 1});
    at += n;
  }
  return spans.map((s, k) => {
    if (counts[k] === 0) return null;
    const first = words[s.first];
    const last = words[s.last];
    const prevEnd = s.first > 0 ? words[s.first - 1].endMs : 0;
    const nextStart = s.last + 1 < words.length ? words[s.last + 1].startMs : totalMs;
    const startMs = Math.round(Math.max(0, first.startMs - Math.min(lead, (first.startMs - prevEnd) / 2)));
    const endMs = Math.round(Math.min(totalMs, last.endMs + Math.min(tail, (nextStart - last.endMs) / 2)));
    return {
      startMs,
      endMs,
      words: words.slice(s.first, s.last + 1).map((w) => ({...w, startMs: w.startMs - startMs, endMs: w.endMs - startMs})),
    };
  });
}

/** @param {string} cmd @param {string[]} args */
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    let err = '';
    const p = spawn(cmd, args, {stdio: ['ignore', 'pipe', 'pipe']});
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}: ${err.slice(-400)}`))));
  });
}

/**
 * Prepares the take and returns a Voice per line (null for silent lines).
 * @param {{dir: string, pub: string, face: string | {src: string, focusY?: number}, lines: (string | null)[], names: string[],
 *   transcribe: (wav: string) => Promise<{text: string, startMs: number, endMs: number}[]>}} o
 * @returns {Promise<{voices: (import('../props.mjs').Voice | null)[], face: {src: string, focusY?: number}}>}
 */
export async function faceVoices({dir, pub, face, lines, names, transcribe}) {
  const spec = typeof face === 'string' ? {src: face} : face;
  const input = path.resolve(dir, spec.src);
  await fs.mkdir(path.join(pub, 'vo'), {recursive: true});
  // Constant 30 fps H.264 so OffthreadVideo seeks frame-exactly; audio goes to its own wav.
  const video = path.join(pub, 'face.mp4');
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-an', '-vf', 'scale=1080:-2,fps=30', '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', video]);
  const wav = path.join(pub, 'vo', 'take.wav');
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-vn', '-ac', '1', '-ar', '48000', wav]);
  const totalMs = Math.round(Number(await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav])) * 1000);

  const tokens = await transcribe(wav);
  const text = lines.filter((l) => l?.trim()).join(' ');
  const segs = takeSegments(lines, align(text, tokens, totalMs), totalMs);

  const voices = await Promise.all(
    segs.map(async (s, k) => {
      if (!s) return null;
      const rel = `vo/${names[k]}.wav`;
      await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-ss', (s.startMs / 1000).toFixed(3), '-to', (s.endMs / 1000).toFixed(3), '-af', 'afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse', path.join(pub, rel)]);
      return {src: rel, durationSec: (s.endMs - s.startMs) / 1000, words: s.words, face: {startSec: s.startMs / 1000}};
    }),
  );
  return {voices, face: {src: 'face.mp4', ...(spec.focusY != null ? {focusY: spec.focusY} : {})}};
}
