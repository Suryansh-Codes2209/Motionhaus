// Real SFX kit for Shorts and Reels: one cached set of real recordings per
// role (whoosh, impact, riser, pop, tick), trimmed around their peak,
// level-matched to the synthesized kit they replace, 48 kHz stereo WAV, with
// measured onset/peak offsets so the studios can land each peak on its frame.
//
//   kit dir (built once, reused by every episode):
//     whoosh-1..3.wav  impact-1..3.wav  riser-1..2.wav  pop-1..3.wav  tick-1..3.wav
//     impact.wav riser.wav pop.wav tick.wav   (base names = variant 1, so old cues still resolve)
//     kit.json         roles → files, per-file source/license/onsetMs/peakMs
//     _raw/            the downloads + ATTRIBUTION.md   _synth/  the ffmpeg fallback
//
// Choice is deterministic for a given set of search results, and the built kit
// is cached, so every episode gets the same sounds until `--rebuild`.
// A role with no usable real recording (offline, nothing licensed) falls back
// to the synthesized sounds from make-audio.sh, measured the same way.
import {spawn} from 'node:child_process';
import {accessSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {loadDotEnv} from './env.mjs';
import {createAudioLibrary, ROOT_DIR} from './library.mjs';

export const KIT_VERSION = 2; // 2: event roles (glitch, shutter, stamp, unlock, fire, static, typing, drop, alarm, error)
/** Shared by Shorts and Reels; MOTIONHAUS_DATA moves the workspace like the apps do. */
export const DEFAULT_KIT_DIR = path.join(path.resolve(process.env.MOTIONHAUS_DATA || path.join(ROOT_DIR, 'workspace')), 'shorts', 'cache', 'sfx-kit');
export const MAKE_AUDIO = path.join(ROOT_DIR, 'packages', 'motion-kit', 'scripts', 'make-audio.sh');
/** Whoosh peaks land this many frames after the cut (earshot `launch`: taps lead, whoosh peaks trail). */
export const WHOOSH_LAG_FRAMES = 2;
/** Licenses safe for monetized channels without share-alike strings attached. */
export const KIT_LICENSES = /** @type {const} */ (['CC0', 'PD', 'CC-BY']);
/** Providers whose license metadata we trust (archive.org uploads often mislabel PD). */
const KIT_PROVIDERS = new Set(['openverse', 'freesound', 'local', 'localpacks']);
const SR = 48000;

/**
 * @typedef {object} RoleSpec
 * @property {number} count            variants to collect
 * @property {string | null} alias     base file name copied from variant 1 (null: variants are the names)
 * @property {string[]} queries
 * @property {string[]} prefer         title words that mark the best match (ranked first)
 * @property {string[]} words          title words that mark a good match
 * @property {string[]} avoid          title words that mark a bad one (packs, loops, voices)
 * @property {number} minSec
 * @property {number} maxSec
 * @property {number} idealSec
 * @property {number} preSec           keep this much before the peak
 * @property {number} postSec          and this much after it
 * @property {number} smoothMs         envelope smoothing for the peak search
 * @property {string[]} synth          make-audio.sh files that stand in for this role (level target, last resort)
 * @property {string[]} [earshot]      earshot bank sounds (MIT, rendered offline) that fill the role when
 *                                     fewer real recordings were found, before the ffmpeg synth
 */

const AVOID = ['pack', 'compilation', 'collection', 'loop', 'music', 'song', 'voice', 'speech', 'ambience', 'ambient', 'field', 'various', 'set', 'medley'];

/** @type {Record<'whoosh' | 'impact' | 'riser' | 'pop' | 'tick' | 'glitch' | 'shutter' | 'stamp' | 'unlock' | 'fire' | 'static' | 'typing' | 'drop' | 'alarm' | 'error', RoleSpec>} */
export const ROLES = {
  whoosh: {count: 3, alias: null, queries: ['whoosh', 'swoosh', 'fast whoosh', 'swish'], prefer: ['fast', 'quick', 'short', 'swoosh'], words: ['whoosh', 'swoosh', 'swish', 'woosh', 'swipe'], avoid: [...AVOID, 'wind', 'sword'], minSec: 0.25, maxSec: 4, idealSec: 0.9, preSec: 0.8, postSec: 0.45, smoothMs: 40, synth: ['whoosh-1', 'whoosh-2', 'whoosh-3'], earshot: ['whoosh_fast/whip', 'pro_whoosh_big/gritty', 'whoosh_fast/tight']},
  impact: {count: 3, alias: 'impact', queries: ['cinematic impact', 'boom impact', 'trailer hit', 'bass hit'], prefer: ['cinematic', 'boom', 'deep', 'bass', 'sub', 'trailer'], words: ['impact', 'hit', 'thud', 'slam'], avoid: [...AVOID, 'reverse', 'paper', 'glass', 'shatter', 'door', 'boxing', 'ice', 'jungle', 'orch'], minSec: 0.2, maxSec: 6, idealSec: 2, preSec: 0.02, postSec: 1.6, smoothMs: 5, synth: ['impact'], earshot: ['pro_impact/deep', 'pro_impact/short', 'cut_hit/punch']},
  riser: {count: 2, alias: 'riser', queries: ['riser', 'tension riser', 'uplifter', 'sweep up'], prefer: ['riser', 'uplifter'], words: ['rise', 'rising', 'sweep', 'build', 'swell'], avoid: AVOID, minSec: 1.2, maxSec: 12, idealSec: 3, preSec: 2.6, postSec: 0.25, smoothMs: 40, synth: ['riser'], earshot: ['pro_riser/roll', 'riser/tension']},
  pop: {count: 3, alias: 'pop', queries: ['mouth pop', 'bubble pop', 'pop', 'ui pop'], prefer: ['mouth', 'bubble', 'ui', 'plop', 'blip'], words: ['pop', 'plock'], avoid: [...AVOID, 'balloon', 'cracker', 'cannon', 'confetti', 'gun', 'cork', 'champagne', 'corn'], minSec: 0.03, maxSec: 2, idealSec: 0.3, preSec: 0.015, postSec: 0.35, smoothMs: 3, synth: ['pop'], earshot: ['pro_pop/bloop', 'pro_pop/thup', 'pro_pop/chirp']},
  // Event roles: one sound per kind of on-screen event (a glitch hit, a photo
  // change, a stamp…). `synth` here only sets the level target and the
  // fallback when nothing real is found.
  glitch: {count: 3, alias: 'glitch', queries: ['glitch', 'digital glitch', 'data glitch', 'glitch hit', 'distortion glitch'], prefer: ['glitch', 'digital', 'data'], words: ['glitch', 'digital', 'corrupt', 'error', 'distort', 'bitcrush', 'stutter'], avoid: [...AVOID, 'guitar'], minSec: 0.08, maxSec: 3, idealSec: 0.5, preSec: 0.02, postSec: 0.5, smoothMs: 4, synth: ['impact'], earshot: ['pro_glitch/standard', 'pro_glitch/data', 'pro_glitch/framelock']},
  shutter: {count: 3, alias: 'shutter', queries: ['camera shutter', 'shutter click', 'slr shutter', 'photo camera click'], prefer: ['shutter', 'slr', 'dslr'], words: ['shutter', 'camera', 'photo', 'snap'], avoid: [...AVOID, 'gun', 'door', 'window'], minSec: 0.05, maxSec: 2.5, idealSec: 0.35, preSec: 0.01, postSec: 0.35, smoothMs: 3, synth: ['tick'], earshot: ['shutter/dslr', 'shutter/mirror', 'shutter/quick']},
  stamp: {count: 2, alias: 'stamp', queries: ['rubber stamp', 'stamp', 'stamp on paper', 'stamp hit'], prefer: ['rubber', 'stamp'], words: ['stamp', 'stamping'], avoid: [...AVOID, 'foot', 'feet', 'walk'], minSec: 0.05, maxSec: 2, idealSec: 0.4, preSec: 0.01, postSec: 0.4, smoothMs: 3, synth: ['impact'], earshot: ['cut_hit/punch', 'knock/desk']},
  unlock: {count: 2, alias: 'unlock', queries: ['unlock', 'padlock unlock', 'lock click', 'lock open'], prefer: ['unlock', 'padlock'], words: ['unlock', 'lock', 'padlock', 'latch', 'key'], avoid: [...AVOID, 'door slam', 'car'], minSec: 0.05, maxSec: 2.5, idealSec: 0.5, preSec: 0.01, postSec: 0.5, smoothMs: 3, synth: ['tick'], earshot: ['toggle/latch', 'toggle/rocker']},
  fire: {count: 2, alias: 'fire', queries: ['fire whoosh', 'fire burst', 'fireball', 'flame ignite'], prefer: ['whoosh', 'burst', 'ignite', 'fireball'], words: ['fire', 'flame', 'burn', 'ignite', 'fireball', 'blaze'], avoid: [...AVOID, 'gun', 'fireworks', 'alarm', 'truck', 'crackling', 'campfire'], minSec: 0.4, maxSec: 6, idealSec: 2, preSec: 0.4, postSec: 1.5, smoothMs: 30, synth: ['riser'], earshot: ['whoosh_big/jet', 'whoosh_big/gust']},
  static: {count: 2, alias: 'static', queries: ['tv static', 'static noise burst', 'radio static', 'white noise burst'], prefer: ['tv', 'burst', 'short'], words: ['static', 'noise', 'interference', 'hiss'], avoid: [...AVOID, 'electricity'], minSec: 0.2, maxSec: 5, idealSec: 0.8, preSec: 0.02, postSec: 0.8, smoothMs: 10, synth: ['whoosh-1'], earshot: ['glitch/dropout', 'glitch/crush']},
  typing: {count: 2, alias: 'typing', queries: ['keyboard typing', 'typing', 'keystrokes', 'mechanical keyboard'], prefer: ['keyboard', 'mechanical'], words: ['typing', 'keyboard', 'keystroke', 'keys', 'type'], avoid: [...AVOID, 'typewriter bell'], minSec: 0.4, maxSec: 8, idealSec: 2, preSec: 0.02, postSec: 2, smoothMs: 20, synth: ['tick'], earshot: ['pro_typing_run/standard', 'pro_typing_run/soft']},
  drop: {count: 2, alias: 'drop', queries: ['bass drop', 'sub drop', 'braam', 'cinematic boom'], prefer: ['sub', 'braam', 'boom', 'cinematic'], words: ['drop', 'sub', 'braam', 'boom', 'bass'], avoid: [...AVOID, 'water', 'drip', 'item'], minSec: 0.5, maxSec: 8, idealSec: 2.5, preSec: 0.05, postSec: 2.2, smoothMs: 20, synth: ['impact'], earshot: ['pro_sub_drop/low', 'sub_drop/808']},
  alarm: {count: 2, alias: 'alarm', queries: ['alarm beep', 'warning alarm', 'alert', 'warning'], prefer: ['warning', 'alarm', 'alert'], words: ['alarm', 'alert', 'warning', 'siren', 'beep'], avoid: [...AVOID, 'clock', 'car alarm'], minSec: 0.2, maxSec: 4, idealSec: 1.2, preSec: 0.02, postSec: 1.2, smoothMs: 10, synth: ['riser'], earshot: ['pro_notify/ding_2296', 'notify/m3']},
  error: {count: 2, alias: 'error', queries: ['error', 'ui error', 'denied', 'blocked'], prefer: ['error', 'denied', 'blocked'], words: ['error', 'denied', 'blocked', 'invalid', 'wrong'], avoid: AVOID, minSec: 0.05, maxSec: 2, idealSec: 0.4, preSec: 0.01, postSec: 0.4, smoothMs: 3, synth: ['pop'], earshot: ['pro_zip/down', 'toggle/off']},
  tick: {count: 3, alias: 'tick', queries: ['ui click', 'click', 'tick', 'mouse click'], prefer: ['ui', 'button', 'mouse'], words: ['click', 'tick', 'tap', 'clack'], avoid: [...AVOID, 'clock', 'metronome', 'gun', 'tongue'], minSec: 0.01, maxSec: 2, idealSec: 0.2, preSec: 0.008, postSec: 0.16, smoothMs: 2, synth: ['tick'], earshot: ['pro_click/mouse', 'pro_click/snap', 'pro_click/soft']},
};
/** @typedef {keyof typeof ROLES} Role */

/** whoosh-2 → whoosh, pop-3 → pop, impact → impact. @param {string} name */
export const roleOf = (name) => name.replace(/-\d+$/, '');

/** @param {string} s */
const words = (s) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Rank and pick `spec.count` search results for a role. Pure and deterministic:
 * licence (CC0/PD before CC-BY), title fit, length fit, then id. Distinct
 * creators first, so the variants don't sound like one take three times.
 * @param {import('./types.mjs').AudioResult[]} results
 * @param {RoleSpec} spec
 * @param {number} [count]
 */
export function chooseCandidates(results, spec, count = spec.count) {
  const seen = new Set();
  const ok = results.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    if (!KIT_PROVIDERS.has(r.provider) || !r.downloadUrl || !r.allowsCommercialUse) return false;
    if (!(/** @type {readonly string[]} */ (KIT_LICENSES).includes(r.license))) return false;
    if (r.durationSec !== null && (r.durationSec < spec.minSec || r.durationSec > spec.maxSec)) return false;
    const w = words(r.title);
    if (spec.avoid.some((a) => w.includes(a))) return false;
    // local packs match loosely (any file in a pack whose name fits): only take
    // a file whose own name, without the "(pack)" suffix, names the role
    if (r.provider === 'local') {
      const own = words(r.title.replace(/\(.*?\)/g, ''));
      return [...spec.prefer, ...spec.words].some((k) => own.some((x) => x.startsWith(k)));
    }
    return true;
  });
  /** @param {import('./types.mjs').AudioResult} r */
  const score = (r) => {
    const w = words(r.title);
    const lic = r.license === 'CC-BY' ? 1 : 0;
    const has = (/** @type {string[]} */ ks) => ks.some((k) => w.some((x) => x.startsWith(k)));
    const fit = has(spec.prefer) ? 0 : has(spec.words) ? 1 : 2;
    const len = r.durationSec === null ? 1 : Math.abs(Math.log(r.durationSec / spec.idealSec));
    return {lic, fit, len};
  };
  const ranked = ok
    .map((r) => ({r, s: score(r)}))
    .sort((a, b) => a.s.fit - b.s.fit || a.s.lic - b.s.lic || a.s.len - b.s.len || (a.r.id < b.r.id ? -1 : a.r.id > b.r.id ? 1 : 0))
    .map((x) => x.r);
  /** @type {typeof ranked} */
  const out = [];
  const creators = new Set();
  for (const r of ranked) {
    if (out.length >= count) break;
    if (creators.has(r.creator)) continue;
    creators.add(r.creator);
    out.push(r);
  }
  for (const r of ranked) {
    if (out.length >= count) break;
    if (!out.includes(r)) out.push(r);
  }
  return out;
}

/**
 * Envelope stats of a mono signal. Times in ms from the first sample.
 *   peakMs   centre of the loudest smoothed window (where the hit/swell is)
 *   onsetMs  first moment within 20 dB of that peak (start of the sound)
 *   endMs    last moment within 45 dB of it (end of the tail)
 *   peakDb   sample peak, rmsDb  RMS over onset..end, hotDb  loudest 50 ms RMS (dBFS):
 *            the level that reads as "how loud is this hit", tail length aside
 * @param {Float32Array | number[]} x @param {number} sr @param {{smoothMs?: number}} [o]
 */
export function analyze(x, sr, {smoothMs = 5} = {}) {
  const hop = Math.max(1, Math.round(sr / 1000)); // 1 ms frames
  const n = Math.floor(x.length / hop);
  const ms = new Float64Array(n); // mean square per ms
  let samplePeak = 0;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * hop; j < (i + 1) * hop; j++) {
      const v = x[j];
      s += v * v;
      if (Math.abs(v) > samplePeak) samplePeak = Math.abs(v);
    }
    ms[i] = s / hop;
  }
  if (!n || samplePeak === 0) return {durationMs: n, onsetMs: 0, peakMs: 0, endMs: n, peakDb: -Infinity, rmsDb: -Infinity, hotDb: -Infinity};
  // centred moving average of the mean square
  const half = Math.max(0, Math.floor(smoothMs / 2));
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + ms[i];
  let peakMs = 0;
  let best = -1;
  const sm = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - half);
    const b = Math.min(n, i + half + 1);
    sm[i] = (pre[b] - pre[a]) / (b - a);
    if (sm[i] > best) (best = sm[i]), (peakMs = i);
  }
  const onTh = best * 1e-2; // -20 dB (power)
  const endTh = best * 10 ** -4.5; // -45 dB
  let onsetMs = 0;
  while (onsetMs < peakMs && sm[onsetMs] < onTh) onsetMs++;
  let endMs = n - 1;
  while (endMs > peakMs && sm[endMs] < endTh) endMs--;
  const act = (pre[endMs + 1] - pre[onsetMs]) / (endMs + 1 - onsetMs);
  const hw = Math.min(n, 50);
  let hot = 0;
  for (let i = 0; i + hw <= n; i++) hot = Math.max(hot, (pre[i + hw] - pre[i]) / hw);
  const db = (/** @type {number} */ p) => 10 * Math.log10(p);
  return {durationMs: n, onsetMs, peakMs, endMs, peakDb: 20 * Math.log10(samplePeak), rmsDb: db(act), hotDb: db(hot)};
}

/**
 * Where to cut a source so the kept part frames its peak. Seconds.
 * @param {{onsetMs: number, peakMs: number, endMs: number, durationMs: number}} a @param {RoleSpec} spec
 */
export function trimWindow(a, spec) {
  const peak = a.peakMs / 1000;
  const start = Math.max(0, Math.max(a.onsetMs / 1000 - 0.008, peak - spec.preSec));
  const end = Math.min(a.durationMs / 1000, Math.min(a.endMs / 1000 + 0.03, peak + spec.postSec));
  const len = Math.max(0.02, end - start);
  // fade in short when we start on silence, longer when we cut into the sound
  const fadeIn = start > a.onsetMs / 1000 + 0.001 ? Math.min(0.03, (peak - start) / 2) : 0.002;
  const fadeOut = Math.min(0.12, len * 0.25);
  return {start, len, fadeIn, fadeOut};
}

/** Gain (dB) to bring the loudest 50 ms (`hotDb`) to `targetDb`, never pushing the sample peak above -1 dBFS. */
export const levelGain = (/** @type {{hotDb: number, peakDb: number}} */ a, /** @type {number} */ targetDb) =>
  Math.min(targetDb - a.hotDb, -1 - a.peakDb);

/**
 * Studio-facing view of a kit: how many variants each role has, and each
 * file's peak offset (ms from file start), base aliases included.
 * @param {Kit} kit
 * @returns {KitConfig}
 */
export function kitConfig(kit) {
  /** @type {KitConfig} */
  const out = {variants: {}, peakMs: {}};
  for (const [role, r] of Object.entries(kit.roles)) {
    out.variants[role] = r.files.length;
    for (const f of r.files) out.peakMs[f] = kit.files[f].peakMs;
    for (const [a, f] of Object.entries(r.aliases)) out.peakMs[a] = kit.files[f].peakMs;
  }
  return out;
}

/**
 * The file for the `i`-th hit of a cue (any rotation index), never 404ing:
 * no kit or a single variant → the name as written.
 * @param {string} name @param {number | undefined} i @param {KitConfig | undefined} kit
 */
export function variantFile(name, i, kit) {
  if (!kit || i === undefined) return name;
  const n = kit.variants[roleOf(name)] ?? 0;
  if (n < 2) return name;
  return `${roleOf(name)}-${(((i % n) + n) % n) + 1}`;
}

/** Start frame that puts `file`'s peak on `eventFrame`. @param {number} eventFrame @param {string} file @param {KitConfig | undefined} kit @param {number} fps */
export const peakStart = (eventFrame, file, kit, fps) => Math.round(eventFrame - ((kit?.peakMs[file] ?? 0) * fps) / 1000);

/**
 * Reels: resolve cues ({name, frame = the event frame}) to files and start
 * frames. Each role rotates its variants by occurrence, so back-to-back hits
 * of a role never repeat a file; whoosh peaks land WHOOSH_LAG_FRAMES after
 * their cut, transients on the frame.
 * @template {{name: string, frame: number}} C
 * @param {C[]} cues @param {KitConfig | undefined} kit @param {number} fps
 * @returns {C[]}
 */
export function placeCues(cues, kit, fps) {
  // no kit (synthesized SFX, unmeasured): the old fixed whoosh lead-in
  if (!kit) return cues.map((c) => (roleOf(c.name) === 'whoosh' ? {...c, frame: Math.max(0, c.frame - Math.round(fps * 0.2))} : c));
  /** @type {Record<string, number>} */
  const seen = {};
  return cues.map((c) => {
    const role = roleOf(c.name);
    const i = (seen[role] = (seen[role] ?? -1) + 1);
    const file = variantFile(c.name, i, kit);
    const event = c.frame + (role === 'whoosh' ? WHOOSH_LAG_FRAMES : 0);
    return {...c, name: file, frame: Math.max(0, peakStart(event, file, kit, fps))};
  });
}

/**
 * @typedef {object} KitFile
 * @property {Role} role
 * @property {'real' | 'earshot' | 'synth'} kind
 * @property {string} [id]  @property {string} [title]  @property {string} [creator]
 * @property {string} [license]  @property {string | null} [licenseUrl]  @property {string | null} [sourceUrl]
 * @property {string} [attribution]  @property {boolean} [requiresAttribution]
 * @property {number} durationMs  @property {number} onsetMs  @property {number} peakMs
 * @property {number} hotDb  @property {number} peakDb
 */
/** @typedef {{version: number, builtAt: string, roles: Record<string, KitRole>, files: Record<string, KitFile>}} Kit */
/** files: the distinct takes (variants); aliases: extra names → the take they copy (base names, missing whoosh numbers) */
/** @typedef {{files: string[], aliases: Record<string, string>}} KitRole */
/** @typedef {{variants: Record<string, number>, peakMs: Record<string, number>}} KitConfig */

// --- building (ffmpeg + network) ---------------------------------------------

/** @param {string} cmd @param {string[]} args @returns {Promise<Buffer>} */
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {stdio: ['ignore', 'pipe', 'pipe']});
    /** @type {Buffer[]} */
    const out = [];
    let err = '';
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`${cmd} exited ${code}: ${err.trim().split('\n').pop()}`))));
  });
}

/** Decode any audio file to mono float samples at 48 kHz. @param {string} file */
async function decode(file) {
  const buf = await run('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-']);
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
}

/** @param {string} file @param {RoleSpec} spec */
export async function measureFile(file, spec) {
  return analyze(await decode(file), SR, {smoothMs: spec.smoothMs});
}

/** Window + gain for a source: level is measured on the part that is kept. @param {string} file @param {RoleSpec} spec @param {number} targetDb */
async function planTake(file, spec, targetDb) {
  const x = await decode(file);
  const a = analyze(x, SR, {smoothMs: spec.smoothMs});
  if (!(a.peakDb > -45)) throw new Error('silent');
  const w = trimWindow(a, spec);
  const kept = analyze(x.subarray(Math.floor(w.start * SR), Math.ceil((w.start + w.len) * SR)), SR, {smoothMs: spec.smoothMs});
  return {w, gainDb: levelGain(kept, targetDb)};
}

/** @param {string} src @param {string} out @param {ReturnType<typeof trimWindow>} w @param {number} gainDb */
async function renderTake(src, out, w, gainDb) {
  const af = [
    `atrim=start=${w.start.toFixed(4)}:duration=${w.len.toFixed(4)}`,
    'asetpts=PTS-STARTPTS',
    `aresample=${SR}`,
    'aformat=channel_layouts=stereo',
    `volume=${gainDb.toFixed(2)}dB`,
    `afade=t=in:st=0:d=${w.fadeIn.toFixed(4)}`,
    `afade=t=out:st=${Math.max(0, w.len - w.fadeOut).toFixed(4)}:d=${w.fadeOut.toFixed(4)}`,
  ].join(',');
  await run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-af', af, '-ar', String(SR), '-ac', '2', '-c:a', 'pcm_s16le', out]);
}

/**
 * How to run earshot: EARSHOT_BIN, `earshot` on PATH, or the repo's venv
 * install (workspace/shorts/cache/earshot). null when none is installed.
 * @returns {string[] | null}
 */
export function earshotCommand() {
  if (process.env.EARSHOT_BIN) return [process.env.EARSHOT_BIN];
  const venv = path.join(path.dirname(DEFAULT_KIT_DIR), 'earshot', '.venv', 'bin', 'python');
  try {
    accessSync(venv);
    return [venv, '-m', 'earshot'];
  } catch {
    return null;
  }
}

const exists = (/** @type {string} */ f) => fs.access(f).then(() => true, () => false);

/** @param {string} kitDir @returns {Promise<Kit | null>} */
export async function readKit(kitDir) {
  try {
    const kit = /** @type {Kit} */ (JSON.parse(await fs.readFile(path.join(kitDir, 'kit.json'), 'utf8')));
    if (kit.version !== KIT_VERSION) return null;
    for (const r of Object.values(kit.roles)) for (const f of allNames(r)) if (!(await exists(path.join(kitDir, `${f}.wav`)))) return null;
    return kit;
  } catch {
    return null;
  }
}

/**
 * Build (or reuse) the kit in `kitDir`.
 * @param {object} o
 * @param {string} o.kitDir
 * @param {string} o.makeAudio          path to make-audio.sh (the synthesized fallback)
 * @param {{searchDetailed: Function, download: Function} | null} [o.lib]  audio library; null = offline, synth only
 * @param {boolean} [o.rebuild]
 * @param {string[] | null} [o.earshot]  how to run earshot for the bank tier (default: earshotCommand(); null = skip)
 * @param {(m: string) => void} [o.log]
 * @returns {Promise<Kit>}
 */
export async function buildKit({kitDir, makeAudio, lib, rebuild = false, earshot = earshotCommand(), log = (m) => process.stderr.write(`[sfx-kit] ${m}\n`)}) {
  if (!rebuild) {
    const cached = await readKit(kitDir);
    if (cached) return cached;
  }
  await fs.mkdir(kitDir, {recursive: true});
  const synthDir = path.join(kitDir, '_synth');
  const rawDir = path.join(kitDir, '_raw');
  await run('bash', [makeAudio, '--no-music', '--out', synthDir]);

  /** @type {Kit} */
  const kit = {version: KIT_VERSION, builtAt: new Date().toISOString(), roles: {}, files: {}};
  for (const [role, spec] of /** @type {[Role, RoleSpec][]} */ (Object.entries(ROLES))) {
    // level target: what the synthesized sound this replaces measures, so scene volumes keep their balance
    const synthStats = await Promise.all(spec.synth.map((s) => measureFile(path.join(synthDir, 'sfx', `${s}.wav`), spec)));
    const target = synthStats.reduce((a, s) => a + s.hotDb, 0) / synthStats.length;
    const names = Array.from({length: spec.count}, (_, i) => `${role}-${i + 1}`);
    /** @type {string[]} */
    const made = [];
    if (lib) {
      for (const r of await candidates(lib, spec, log)) {
        if (made.length >= spec.count) break;
        const name = names[made.length];
        try {
          const src = await lib.download(r, rawDir);
          const {w, gainDb} = await planTake(src, spec, target);
          const out = path.join(kitDir, `${name}.wav`);
          await renderTake(src, out, w, gainDb);
          const m = await measureFile(out, spec);
          kit.files[name] = {role, kind: 'real', id: r.id, title: r.title, creator: r.creator, license: r.license, licenseUrl: r.licenseUrl, sourceUrl: r.sourceUrl, attribution: r.attributionText, requiresAttribution: r.requiresAttribution, ...stats(m)};
          made.push(name);
          log(`${name} ← ${r.license} "${r.title}" by ${r.creator} (peak ${m.peakMs} ms)`);
        } catch (err) {
          log(`${role}: skipped ${r.id}: ${/** @type {Error} */ (err).message}`);
        }
      }
    }
    // second tier: the earshot bank (designed sounds tuned against pro launch films)
    for (const id of earshot ? spec.earshot ?? [] : []) {
      if (made.length >= spec.count) break;
      const name = names[made.length];
      try {
        const src = path.join(kitDir, '_earshot', `${id.replace(/\//g, '__')}.wav`);
        await fs.mkdir(path.dirname(src), {recursive: true});
        await run(/** @type {string[]} */ (earshot)[0], [.../** @type {string[]} */ (earshot).slice(1), 'sfx', 'render', id, '-o', src, '--sr', String(SR)]);
        const {w, gainDb} = await planTake(src, spec, target);
        const out = path.join(kitDir, `${name}.wav`);
        await renderTake(src, out, w, gainDb);
        const m = await measureFile(out, spec);
        kit.files[name] = {role, kind: 'earshot', id: `earshot:${id}`, title: id, creator: 'earshot bank', license: 'MIT', sourceUrl: 'https://github.com/Leonxlnx/earshot', requiresAttribution: false, ...stats(m)};
        made.push(name);
        log(`${name} ← earshot ${id} (peak ${m.peakMs} ms)`);
      } catch (err) {
        log(`${role}: earshot ${id} failed: ${/** @type {Error} */ (err).message}`);
      }
    }
    if (!made.length) {
      // fallback: the synthesized takes, measured like real ones
      log(`${role}: no real recording found, using the synthesized ${spec.synth.join(', ')}`);
      for (const [i, s] of spec.synth.entries()) {
        const name = names[i] ?? `${role}-${i + 1}`;
        const out = path.join(kitDir, `${name}.wav`);
        await fs.copyFile(path.join(synthDir, 'sfx', `${s}.wav`), out);
        kit.files[name] = {role, kind: 'synth', ...stats(await measureFile(out, spec))};
        made.push(name);
      }
    }
    const aliases = roleAliases(role, spec, made);
    for (const [a, f] of Object.entries(aliases)) await fs.copyFile(path.join(kitDir, `${f}.wav`), path.join(kitDir, `${a}.wav`));
    kit.roles[role] = {files: made, aliases};
  }
  await fs.writeFile(path.join(kitDir, 'kit.json'), JSON.stringify(kit, null, 1) + '\n');
  return kit;
}

/**
 * Names every cue may ask for must exist: the base name (pop → pop-1) and,
 * when fewer takes were found, the missing numbered names cycle the found ones.
 * @param {string} role @param {RoleSpec} spec @param {string[]} made
 * @returns {Record<string, string>}
 */
export function roleAliases(role, spec, made) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!made.length) return out;
  if (spec.alias) out[spec.alias] = made[0];
  for (let i = made.length; i < spec.count; i++) out[`${role}-${i + 1}`] = made[i % made.length];
  return out;
}

/** @param {KitRole} r */
const allNames = (r) => [...r.files, ...Object.keys(r.aliases)];

/**
 * The kit with repo defaults: cached in DEFAULT_KIT_DIR, real sounds from the
 * audio library (Openverse needs no key; FREESOUND_API_KEY in .env adds Freesound).
 * @param {{kitDir?: string, makeAudio?: string, rebuild?: boolean, offline?: boolean, log?: (m: string) => void}} [o]
 */
export async function ensureKit(o = {}) {
  const log = o.log ?? ((m) => process.stderr.write(`[sfx-kit] ${m}\n`));
  const kitDir = o.kitDir ?? DEFAULT_KIT_DIR;
  if (!o.rebuild) {
    const cached = await readKit(kitDir);
    if (cached) return {kit: cached, kitDir};
  }
  loadDotEnv(path.join(ROOT_DIR, '.env'));
  const offline = o.offline || process.env.AUDIO_OFFLINE === '1';
  const lib = offline ? null : createAudioLibrary({log: (m) => (/disabled/.test(m) ? undefined : log(m))});
  return {kit: await buildKit({kitDir, makeAudio: o.makeAudio ?? MAKE_AUDIO, lib, rebuild: o.rebuild, log}), kitDir};
}

/** @param {ReturnType<typeof analyze>} m */
const stats = (m) => ({durationMs: m.durationMs, onsetMs: m.onsetMs, peakMs: m.peakMs, hotDb: round1(m.hotDb), peakDb: round1(m.peakDb)});
const round1 = (/** @type {number} */ v) => Math.round(v * 10) / 10;

/** @param {{searchDetailed: Function}} lib @param {RoleSpec} spec @param {(m: string) => void} log */
async function candidates(lib, spec, log) {
  /** @type {import('./types.mjs').AudioResult[]} */
  const all = [];
  for (const q of spec.queries) {
    try {
      const {results} = await lib.searchDetailed(q, {type: 'sfx', licenses: [...KIT_LICENSES], commercialUseOnly: true, minDurationSec: spec.minSec, maxDurationSec: spec.maxSec, limit: 20});
      all.push(...results);
    } catch (err) {
      log(`search "${q}" failed: ${/** @type {Error} */ (err).message}`);
    }
    if (chooseCandidates(all, spec, spec.count * 3).length >= spec.count * 3) break;
  }
  return chooseCandidates(all, spec, spec.count * 3);
}

/**
 * Copy the kit into an episode's public/audio/sfx and write credits for any
 * CC-BY sound into `creditsDir/sfx-credits.txt` (removed when none are needed).
 * @param {Kit} kit @param {string} kitDir @param {string} sfxDir @param {string} creditsDir
 * @returns {Promise<{config: KitConfig, credits: string | null, real: number, synth: number}>}
 */
export async function installKit(kit, kitDir, sfxDir, creditsDir) {
  await fs.mkdir(sfxDir, {recursive: true});
  for (const r of Object.values(kit.roles)) for (const f of allNames(r)) await fs.copyFile(path.join(kitDir, `${f}.wav`), path.join(sfxDir, `${f}.wav`));
  const files = Object.values(kit.files);
  const lines = creditLines(kit);
  const credits = path.join(creditsDir, 'sfx-credits.txt');
  if (lines.length) await fs.writeFile(credits, ['Sound effects:', ...lines, ''].join('\n'));
  else await fs.rm(credits, {force: true});
  return {config: kitConfig(kit), credits: lines.length ? credits : null, real: files.filter((f) => f.kind === 'real').length, synth: files.filter((f) => f.kind === 'synth').length};
}

/** Attribution lines for the kit's CC-BY sounds (CC0/PD need none). @param {Kit} kit */
export const creditLines = (kit) => [...new Set(Object.values(kit.files).filter((f) => f.requiresAttribution && f.attribution).map((f) => `- ${f.attribution}`))];

/** One-line summary per file, for logs. @param {Kit} kit */
export const describeKit = (kit) =>
  Object.entries(kit.files).map(([n, f]) => `${n.padEnd(9)} ${f.kind.padEnd(5)} onset ${String(f.onsetMs).padStart(4)} ms  peak ${String(f.peakMs).padStart(4)} ms  len ${String(f.durationMs).padStart(4)} ms  ${f.hotDb} dB  ${f.kind === 'real' ? `${f.license} ${f.title} (${f.creator})` : ''}`);
