// Steps 5–8 for one episode folder: voice → props → music/SFX → render.
//
// episodes/<id>/
//   script.json          EpisodeScript (from the script step)
//   public/site/         captures (capture step)
//   public/vo/           voice clips          ← written here
//   public/audio/        music bed + SFX      ← written here (SFX: the shared real-recording
//                                              kit, workspace/shorts/cache/sfx-kit; synthesized fallback)
//   sfx-credits.txt      CC-BY sound credits  ← written when the kit uses any
//   public/brand/        series mark          ← copied here
//   props.json           studio input props   ← written here
//   props.instagram.json the Instagram cut's props (shorts only): no episode badge,
//                        share-prompt end card + its own outro VO (public/vo/outro-ig.wav)
//   out/                 stills + short.mp4 (or long.mp4) + .en.srt ← written here
//                        shorts also: short.instagram.mp4 + instagram-cover.png
//                        long-form also: thumb-N.png, description.txt
//
// The script's `format` picks the composition: "Short" (9:16, burned-in
// captions) or "Long" (16:9 deep dive, chapters, thumbnails, .srt only).
import {allScripts, designWarnings, inventory} from '../designs.mjs';
import {spawn} from 'node:child_process';
import {ensureKit, installKit, ROLES} from '@motionhaus/audio-lib/sfxkit.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {align} from '../captions/align.mjs';
import {buildCues, formatSrt, subtitleWords} from '../captions/srt.mjs';
import {BPM_RANGE} from '../beats.mjs';
import {buildProps, dropBeat, filmSeconds} from '../props.mjs';
import {igConfig, instaScript, instaWarnings} from '../instagram.mjs';
import {motionWarnings, pacingWarnings} from '../motion.mjs';
import {assertScenesFit, retentionWarnings} from '../retention.mjs';
import {hasInstagram, publishOf, rulesOf} from '../channel-settings.mjs';
import {faceVoices} from './face.mjs';

/** @param {{config: {format: string}}} props */
export const isLong = (props) => props.config.format === '16:9';
/** Composition id and output base name for an episode's props. @param {{config: {format: string}}} props */
export const output = (props) => (isLong(props) ? {comp: 'Long', name: 'long'} : {comp: 'Short', name: 'short'});

/** @param {string} dir @returns {Promise<any>} */
const readJson = async (dir) => JSON.parse(await fs.readFile(dir, 'utf8'));

/**
 * The studio's frame math (timeline, VO clips, chapters), imported straight
 * from its TypeScript so subtitles and chapter stamps match the render
 * exactly. Node strips the types; its "typeless package" warning is muted.
 * @param {string} studioDir
 */
async function studioMath(studioDir) {
  const listeners = process.listeners('warning');
  process.removeAllListeners('warning');
  process.on('warning', (w) => {
    if (/** @type {any} */ (w).code !== 'MODULE_TYPELESS_PACKAGE_JSON') listeners.forEach((l) => l(w));
  });
  const load = (/** @type {string} */ f) => import(pathToFileURL(path.join(studioDir, 'src', f)).href);
  const [timeline, shorts, long] = await Promise.all([load('timeline.ts'), load('shorts/timing.ts'), load('longform/timing.ts')]);
  return {getTimeline: timeline.getTimeline, voiceClips: shorts.voiceClips, outroStart: shorts.outroStart, chapterStarts: long.chapterStarts, timestamp: long.timestamp};
}

/** @typedef {import('../props.mjs').EpisodeScript} EpisodeScript */
/** @typedef {import('../props.mjs').Voice} Voice */
/** @typedef {(text: string, outWav: string, ctx?: {pronounce?: Record<string, string>}) => Promise<{durationSec: number}>} Synth */
/** @typedef {(wav: string) => Promise<{text: string, startMs: number, endMs: number}[]>} Transcribe */

/** @param {string} cmd @param {string[]} args @param {{cwd?: string}} [o] */
function sh(cmd, args, o = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {cwd: o.cwd, stdio: ['ignore', 'inherit', 'inherit']});
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve(undefined) : reject(new Error(`${cmd} ${args.slice(0, 3).join(' ')} … exited ${code}`))));
  });
}

/**
 * The script of the episode numbered one before this one (among the sibling
 * episode folders), so two shorts in a row never share a hook, shape or length.
 * @param {string} dir @param {number} episode @returns {Promise<Record<string, any> | null>}
 */
async function previousScript(dir, episode) {
  const root = path.dirname(path.resolve(dir));
  for (const name of await fs.readdir(root).catch(() => [])) {
    const s = await readJson(path.join(root, name, 'script.json')).catch(() => null);
    if (s?.episode === episode - 1 && s.format !== 'long' && Array.isArray(s.scenes)) return s;
  }
  return null;
}

/**
 * A headshot short needs someone on screen: a filmed `face` take, or the
 * channel's mascot. A channel without mascot art cannot fall back to another
 * channel's.
 * @param {{style?: string, face?: unknown}} script @param {{mascot?: boolean}} series
 */
export function assertHost(script, series) {
  if (script.style === 'headshot' && !script.face && series.mascot !== true)
    throw new Error('this channel has no mascot: a headshot short needs a filmed `face` take in script.json (or pick another style)');
}

/**
 * @param {string} dir episode folder
 * @param {{synth: Synth, transcribe?: Transcribe, series: any, studioDir: string, brandDir: string, dataDir: string, motionBlur?: boolean}} o  dataDir: the channel folder (its earlier scripts feed the design warnings)
 *   transcribe: word timings for captions; without it they are spread evenly
 */
export async function prepare(dir, {synth, transcribe, series, studioDir, brandDir, dataDir, motionBlur = true}) {
  const script = /** @type {EpisodeScript} */ (JSON.parse(await fs.readFile(path.join(dir, 'script.json'), 'utf8')));
  const metaJson = await readJson(path.join(dir, 'metadata.json')).catch(() => null);
  const rules = rulesOf(series);
  for (const w of retentionWarnings(/** @type {any} */ (script), {meta: metaJson, anchors: series.anchors ?? [], rules, badge: publishOf(series).badge})) console.warn(`retention: ${w}`);
  for (const w of instaWarnings(script, {rules, instagram: hasInstagram(series)})) console.warn(`instagram: ${w}`);
  const prev = await previousScript(dir, script.episode);
  const previousHook = prev?.scenes[0]?.type === 'hook' ? (prev.scenes[0].variant ?? 'rise') : null;
  for (const w of motionWarnings(/** @type {any} */ (script), {previousHook})) console.warn(`motion: ${w}`);
  for (const w of designWarnings(/** @type {any} */ (script), await allScripts(dataDir), await inventory())) console.warn(`design: ${w}`);
  for (const w of pacingWarnings(/** @type {any} */ (script), {previous: /** @type {any} */ (prev)})) console.warn(`pacing: ${w}`);
  const pub = path.join(dir, 'public');
  await fs.mkdir(path.join(pub, 'brand'), {recursive: true});
  await fs.copyFile(path.join(brandDir, 'mark.svg'), path.join(pub, 'brand', 'mark.svg'));
  const clips = await linkArtEngine(script, pub, studioDir);

  /** @param {string | undefined} text @param {string} name @returns {Promise<Voice | null>} */
  const say = async (text, name) => {
    if (!text?.trim()) return null;
    const rel = `vo/${name}.wav`;
    const wav = path.join(pub, rel);
    const {durationSec} = await synth(text, wav, {pronounce: script.pronounce});
    const tokens = transcribe ? await transcribe(wav) : [];
    return {src: rel, durationSec, words: align(text, tokens, durationSec * 1000)};
  };
  /** @type {(Voice | null)[]} */
  let scenes = [];
  /** @type {Voice | null} */
  let outro;
  /** @type {{src: string, focusY?: number} | null} */
  // Without a filmed take, a headshot short is hosted by the channel's mascot.
  assertHost(script, series);
  assertScenesFit(/** @type {any} */ (script));
  let face = null;
  if (script.face) {
    // headshot with a recorded take: the take is the VO (steps/face.mjs).
    if (!transcribe) throw new Error('script.face needs whisper to time the take (set up the whisper model)');
    const lines = [...script.scenes.map((s) => s.vo ?? null), script.outro.vo ?? null];
    const names = [...script.scenes.map((_, i) => `s${i}`), 'outro'];
    const take = await faceVoices({dir, pub, face: script.face, lines, names, transcribe});
    scenes = take.voices.slice(0, -1);
    outro = take.voices[take.voices.length - 1];
    face = take.face;
  } else {
    for (const [i, s] of script.scenes.entries()) scenes.push(await say(s.vo, `s${i}`));
    outro = await say(script.outro.vo, 'outro');
  }

  let props = buildProps(script, {scenes, outro}, series, {motionBlur, face});
  await writeClipSpecs(clips, pub, props.series.colors);
  const bpm = props.config.bpm;
  const seconds = filmSeconds(props.config.scenes, bpm) + (isLong(props) ? 10 : 3); // + outro / end card and tail
  await sh('bash', [
    path.join(studioDir, 'scripts', 'make-audio.sh'),
    '--bpm', String(bpm),
    '--duration', seconds.toFixed(1),
    '--drop-beat', String(dropBeat(props.config.scenes)),
    '--out', path.join(pub, 'audio'),
  ]);
  const sfxKit = await realSfx(dir, path.join(pub, 'audio', 'sfx'));
  // config.sfxKit: the studio's Sfx reads variant counts + peak offsets from it (motion-kit audio/sfxKit.ts)
  const config = sfxKit ? Object.assign({...props.config}, {sfxKit}) : props.config;
  props = {...props, config, music: {src: 'audio/music.mp3', volume: 0.55, duck: 0.28}};
  await fs.writeFile(path.join(dir, 'props.json'), JSON.stringify(props, null, 2) + '\n');
  if (!isLong(props) && hasInstagram(series)) {
    const {outro: o} = instaScript(script, metaJson, publishOf(series));
    // A recorded take has no Instagram outro line: keep its own.
    const voice = script.face ? outro : await say(o.vo, 'outro-ig');
    const ig = {...props, platform: 'instagram', series: {...props.series, handle: igConfig(series).handle}, outro: {text: o.text, sub: o.sub ?? null, voice}};
    await fs.writeFile(path.join(dir, 'props.instagram.json'), JSON.stringify(ig, null, 2) + '\n');
  }
  return props;
}

/**
 * Real recordings over the synthesized SFX make-audio.sh just wrote: the
 * cached kit (built on first use), copied into public/audio/sfx. Returns the
 * kit's variants/peak offsets for config.sfxKit, or null (synth stays) when
 * it can't be built. SFX_KIT=off skips it.
 * @param {string} dir @param {string} sfxDir
 */
export async function realSfx(dir, sfxDir) {
  await synthStandIns(sfxDir);
  if (process.env.SFX_KIT === 'off') return null;
  try {
    const {kit, kitDir} = await ensureKit();
    const {config, credits, real, synth} = await installKit(kit, kitDir, sfxDir, dir);
    console.log(`sfx → kit ${kitDir} (${real} real, ${synth} synthesized)${credits ? `; credits → ${credits}` : ''}`);
    return config;
  } catch (err) {
    console.warn(`sfx: real kit unavailable, keeping synthesized SFX (${/** @type {Error} */ (err).message})`);
    return null;
  }
}

/**
 * Event sounds (glitch, shutter, stamp…) only exist in the real kit; give
 * each a synthesized stand-in first, so a render never asks for a missing file.
 * @param {string} sfxDir
 */
async function synthStandIns(sfxDir) {
  for (const [role, spec] of Object.entries(ROLES)) {
    const to = path.join(sfxDir, `${role}.wav`);
    if (await fs.stat(to).then(() => true, () => false)) continue;
    await fs.copyFile(path.join(sfxDir, `${spec.synth[0]}.wav`), to).catch(() => {});
  }
}

/**
 * huashu art engine scenes (`art`, `clip`): links packages/art-engine/engine
 * into public/huashu, and turns each clip's inline spec into a file path plus
 * a minimum length (its duration). Mutates the script's scenes.
 * @param {EpisodeScript} script @param {string} pub @param {string} studioDir
 * @returns {Promise<{index: number, spec: Record<string, any>}[]>} inline specs still to write
 */
async function linkArtEngine(script, pub, studioDir) {
  const uses = script.scenes.filter((s) => s.type === 'art' || s.type === 'clip');
  if (!uses.length) return [];
  const engine = path.resolve(studioDir, '..', '..', '..', 'packages', 'art-engine', 'engine');
  const link = path.join(pub, 'huashu');
  await fs.rm(link, {force: true, recursive: false}).catch(() => {});
  await fs.symlink(engine, link);
  const bpm = BPM_RANGE[1]; // the fastest tempo buildProps may pick: the floor holds at all of them
  /** @type {{index: number, spec: Record<string, any>}[]} */
  const inline = [];
  script.scenes.forEach((s, index) => {
    if (s.type !== 'clip') return;
    const spec = typeof s.spec === 'object' ? {fps: 30, width: 1920, height: 1080, ...s.spec} : null;
    if (spec) {
      inline.push({index, spec});
      s.spec = `clips/s${index}.json`;
    }
    const dur = Number(spec?.duration ?? s.duration ?? 0);
    if (dur > 0) s.minBeats = Math.ceil(((dur + 0.6) * bpm) / 60) + 1;
  });
  return inline;
}

/**
 * The engine's theme from the episode palette, so clips match the edit style.
 * @param {{bg: string, fg: string, muted: string, accent: string, accent2: string}} c
 */
export function clipTheme(c) {
  const rgb = (/** @type {string} */ h) => [1, 3, 5].map((i) => parseInt(h.replace('#', '').padEnd(6, '0').slice(i - 1, i + 1), 16));
  const [r, g, b] = rgb(c.bg);
  const light = 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
  const mix = (/** @type {string} */ a, /** @type {string} */ z, /** @type {number} */ t) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(z)[i] - v) * t).toString(16).padStart(2, '0')).join('');
  return {bg: c.bg, surface: light ? '#ffffff' : mix(c.bg, c.fg, 0.08), ink: c.fg, sub: c.muted, accent: c.accent, accent2: c.accent2};
}

/** @param {{index: number, spec: Record<string, any>}[]} clips @param {string} pub @param {any} colors */
async function writeClipSpecs(clips, pub, colors) {
  if (!clips.length) return;
  await fs.mkdir(path.join(pub, 'clips'), {recursive: true});
  for (const {index, spec} of clips)
    await fs.writeFile(path.join(pub, 'clips', `s${index}.json`), JSON.stringify({theme: clipTheme(colors), ...spec}, null, 2) + '\n');
}

/** @param {string} dir @param {{studioDir: string, frames?: number[]}} o */
export async function stills(dir, {studioDir, frames = []}) {
  dir = path.resolve(dir); // remotion runs with cwd = studioDir
  const out = path.join(dir, 'out');
  await fs.mkdir(out, {recursive: true});
  const {comp} = output(await readJson(path.join(dir, 'props.json')));
  for (const f of frames)
    await sh('npx', ['remotion', 'still', comp, path.join(out, `still-${f}.png`), `--frame=${f}`, '--scale=0.5', `--props=${path.join(dir, 'props.json')}`, `--public-dir=${path.join(dir, 'public')}`, '--log=error'], {cwd: studioDir});
}

/**
 * Render, then normalise the mix to −14 LUFS (video stream copied).
 * variant "instagram" renders props.instagram.json → out/short.instagram.mp4.
 * @param {string} dir @param {{studioDir: string, variant?: 'instagram', brightFrame0?: boolean}} o
 */
export async function render(dir, {studioDir, variant, brightFrame0 = true}) {
  dir = path.resolve(dir);
  const propsFile = path.join(dir, variant ? `props.${variant}.json` : 'props.json');
  const {comp, name: base} = output(await readJson(propsFile));
  const name = variant ? `${base}.${variant}` : base;
  const file = path.join(dir, 'out', `${name}.mp4`);
  const raw = path.join(dir, 'out', `${name}.raw.mp4`);
  await fs.mkdir(path.dirname(file), {recursive: true});
  await sh('npx', ['remotion', 'render', comp, raw, '--codec=h264', '--crf=18', `--props=${propsFile}`, `--public-dir=${path.join(dir, 'public')}`, '--log=error'], {cwd: studioDir});
  await sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1:LRA=9', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', file]);
  await fs.rm(raw);
  const luma = await frameLuma(file).catch(() => null);
  if (brightFrame0 && luma != null && luma < MIN_FIRST_FRAME_LUMA)
    console.warn(`retention: frame 0 is dark (mean luma ${luma.toFixed(0)}/255, want ≥ ${MIN_FIRST_FRAME_LUMA}): it reads near-black in the Shorts list and search. Use a brighter opening image.`);
  return file;
}

// Frame 0 is the Shorts list / search thumbnail; under ~70/255 mean luma it
// reads as near-black there.
export const MIN_FIRST_FRAME_LUMA = 70;

/** Mean luma (0–255) of a video's first frame, via ffmpeg signalstats. @param {string} file */
export async function frameLuma(file) {
  const {spawn} = await import('node:child_process');
  const err = await new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-i', file, '-frames:v', '1', '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-f', 'null', '-']);
    let e = '';
    p.stderr.on('data', (d) => (e += d));
    p.on('error', reject);
    p.on('close', () => resolve(e));
  });
  const m = /YAVG=([\d.]+)/.exec(/** @type {string} */ (err));
  if (!m) throw new Error('no YAVG');
  return Number(m[1]);
}

/**
 * out/<name>.en.srt from the props' word timings, placed exactly where the
 * studio plays each VO clip; punctuation comes back from script.json.
 * @param {string} dir @param {{studioDir: string}} o
 */
export async function subtitles(dir, {studioDir}) {
  dir = path.resolve(dir);
  const props = await readJson(path.join(dir, 'props.json'));
  const script = /** @type {EpisodeScript} */ (await readJson(path.join(dir, 'script.json')));
  const m = await studioMath(studioDir);
  const fps = props.config.fps;
  const tl = m.getTimeline(props.config);
  const ms = (/** @type {number} */ f) => (f / fps) * 1000;
  /** @type {{fromMs: number, words: any[], text?: string}[]} */
  const clips = m.voiceClips(tl, props.voice, fps).map((/** @type {any} */ c) => ({fromMs: ms(c.from), words: c.words, text: script.scenes[c.scene]?.vo}));
  // Both compositions start the outro line 6 frames into the outro / end card.
  if (props.outro.voice) clips.push({fromMs: ms(m.outroStart(tl.total) + 6), words: props.outro.voice.words, text: script.outro.vo});
  const file = path.join(dir, 'out', `${output(props).name}.en.srt`);
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, formatSrt(buildCues(subtitleWords(clips))));
  return file;
}

/**
 * YouTube chapter lines ("0:00 The hook") for a long-form episode. YouTube
 * only shows chapters when there are ≥ 3, the first at 0:00, each ≥ 10s;
 * problems come back as warnings.
 * @param {string} dir @param {{studioDir: string}} o
 */
export async function chapterLines(dir, {studioDir}) {
  const props = await readJson(path.join(path.resolve(dir), 'props.json'));
  const m = await studioMath(studioDir);
  const fps = props.config.fps;
  /** @type {{title: string, from: number}[]} */
  const ch = m.chapterStarts(m.getTimeline(props.config), props.chapters ?? []);
  /** @type {string[]} */
  const warnings = [];
  if (ch.length < 3) warnings.push(`${ch.length} chapters: YouTube needs at least 3`);
  if (ch.length && ch[0].from !== 0) warnings.push('the first chapter must start at scene 0');
  ch.forEach((c, i) => {
    const next = ch[i + 1]?.from;
    if (next !== undefined && next - c.from < 10 * fps) warnings.push(`chapter "${c.title}" is under 10s`);
  });
  return {lines: ch.map((c) => `${m.timestamp(c.from, fps)} ${c.title}`), warnings};
}

/**
 * The Instagram cover → out/instagram-cover.png: a full-size frame of the
 * hook once its lines are in (product + big words, as the audit asks). The
 * grid crops it to the middle 3:4, which the hook's lines sit inside.
 * @param {string} dir @param {{studioDir: string, frame?: number}} o
 */
export async function instaCover(dir, {studioDir, frame = 36}) {
  dir = path.resolve(dir);
  const file = path.join(dir, 'out', 'instagram-cover.png');
  const props = path.join(dir, 'out', '.cover.props.json');
  await fs.writeFile(props, JSON.stringify({...(await readJson(path.join(dir, 'props.instagram.json'))), cover: true}));
  await sh('npx', ['remotion', 'still', 'Short', file, `--frame=${frame}`, `--props=${props}`, `--public-dir=${path.join(dir, 'public')}`, '--log=error'], {cwd: studioDir});
  await fs.rm(props);
  return file;
}

/**
 * One 1280×720 PNG per thumbnail variant → out/thumb-N.png.
 * @param {string} dir @param {{studioDir: string}} o
 */
export async function thumbnails(dir, {studioDir}) {
  dir = path.resolve(dir);
  const props = await readJson(path.join(dir, 'props.json'));
  const n = Math.max(1, props.thumbnail?.variants?.length ?? 0);
  const files = [];
  for (let i = 1; i <= n; i++) {
    const file = path.join(dir, 'out', `thumb-${i}.png`);
    await sh('npx', ['remotion', 'still', `Thumbnail-${i}`, file, `--props=${path.join(dir, 'props.json')}`, `--public-dir=${path.join(dir, 'public')}`, '--log=error'], {cwd: studioDir});
    files.push(file);
  }
  return files;
}

/**
 * metadata.json's description with the chapter list put in place of a
 * `{{chapters}}` line (or appended after the first paragraph).
 * @param {string} description @param {string[]} lines
 */
export function withChapters(description, lines) {
  if (!lines.length) return description.replace(/\n?\{\{chapters\}\}\n?/, '\n');
  const block = lines.join('\n');
  if (description.includes('{{chapters}}')) return description.replace('{{chapters}}', block);
  const [first, ...rest] = description.split('\n\n');
  return [first, block, ...rest].join('\n\n');
}
