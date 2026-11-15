import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const run = promisify(execFile);
const BIG = 1 << 30;

/** @param {string} file */
export async function probe(file) {
  const {stdout} = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', file]);
  const j = JSON.parse(stdout);
  const v = j.streams.find((/** @type {any} */ s) => s.codec_type === 'video');
  if (!v) throw new Error(`${file}: no video stream`);
  const [n, d] = String(v.r_frame_rate).split('/').map(Number);
  return {width: v.width, height: v.height, fps: n / (d || 1), duration: Number(j.format.duration ?? 0), hasAudio: j.streams.some((/** @type {any} */ s) => s.codec_type === 'audio')};
}

/**
 * Decode to raw frames at `fps`, `width` wide (height keeps aspect, even).
 * `cropBottom` drops that fraction of rows (the subtitle band).
 * @param {string} file
 * @param {{fps: number, width: number, gray?: boolean, cropBottom?: number}} o
 */
export async function decode(file, {fps, width, gray = true, cropBottom = 0}) {
  const {width: W, height: H} = await probe(file);
  const h0 = Math.max(2, Math.round((H * width) / W / 2) * 2);
  const h = Math.max(2, Math.round(h0 * (1 - cropBottom)));
  const ch = gray ? 1 : 3;
  const {stdout} = await run(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-vf', `fps=${fps},scale=${width}:${h0}:flags=area,crop=${width}:${h}:0:0`, '-pix_fmt', gray ? 'gray' : 'rgb24', '-f', 'rawvideo', '-'],
    {encoding: 'buffer', maxBuffer: BIG},
  );
  const size = width * h * ch;
  const frames = [];
  for (let o = 0; o + size <= stdout.length; o += size) frames.push(new Uint8Array(stdout.buffer, stdout.byteOffset + o, size));
  return {frames, w: width, h, W, H};
}

/** Integrated loudness / true peak (ffmpeg ebur128). */
export async function loudnessLog(/** @type {string} */ file) {
  const {stderr} = await run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], {maxBuffer: BIG});
  return stderr;
}

/** ffmpeg silencedetect log. */
export async function silenceLog(/** @type {string} */ file, noiseDb = -38, minSec = 0.7) {
  const {stderr} = await run('ffmpeg', ['-hide_banner', '-i', file, '-af', `silencedetect=n=${noiseDb}dB:d=${minSec}`, '-f', 'null', '-'], {maxBuffer: BIG});
  return stderr;
}
