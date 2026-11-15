#!/usr/bin/env node
// Motionhaus reels: edit real footage into an Instagram Reel.
//
//   reels prep <video> [--name slug] [--lang hi|en|auto] [--prompt "…"]
//       → workspace/reels/<slug>/ with public/source.mp4 (1080x1920 CFR),
//         analysis.json (duration, pauses, word timings), contact.jpg and an
//         edit.json skeleton for Claude to fill in (see skills/insta-reels).
//   reels render <dir> [--stills]     edit.json → props.json → audio → MP4 → QA
//   reels cover <dir> [--title "…"] [--kicker …] [--at sec]   Satori cover → out/cover.png
//   reels qa <mp4>                    film-qa gate, reel profile
//   reels critique <dir|mp4>          earshot sound scorecard of out/reel.mp4 (needs earshot on PATH)
//   reels sfx-kit [--rebuild] [--offline]   build/show the shared real-recording SFX kit
//   reels grade <dir> [--filter "…"] colour-correct public/source.mp4 in place (original kept as
//       source-raw.mp4); default tames red/magenta LED casts, keeping some of the mood. Run before mask.
//   reels mask <dir>                  Apple Vision person matte → public/person.webm
//       (alpha cutout for text-behind-the-speaker and the sticker outline;
//       edit.json "person": {"outline": [{from, to}]}). macOS only.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ensureKit, describeKit, installKit, placeCues} from '../../../packages/audio-lib/src/sfxkit.mjs';
import {critique as earshot, formatCritique} from '../../../packages/film-qa/src/earshot.mjs';
import {grade, measure, report} from '../../../packages/film-qa/src/gate.mjs';
import {grabFrame, renderCover} from './cover.mjs';
import {findLoops} from './edl.mjs';
import {contactSheet, conform, detectSilences, probe, sh, transcribe} from './media.mjs';
import {buildProps, editGap} from './props.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const WORKSPACE = path.resolve(process.env.MOTIONHAUS_DATA || path.join(REPO, 'workspace'));
const STUDIO = path.resolve(HERE, '../studio');
const MAKE_AUDIO = path.join(REPO, 'packages/motion-kit/scripts/make-audio.sh');
const MODELS = path.join(WORKSPACE, 'shorts/cache/models');

const [cmd, target, ...rest] = process.argv.slice(2);
const flag = (/** @type {string} */ name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};
const slugify = (/** @type {string} */ s) =>
  s.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'reel';

async function pickModel(/** @type {string} */ lang) {
  // English-only models can't hear Hindi; prefer a multilingual one unless lang=en.
  const order = lang === 'en' ? ['ggml-small.en.bin', 'ggml-medium.bin', 'ggml-small.bin'] : ['ggml-medium.bin', 'ggml-small.bin', 'ggml-large-v3.bin'];
  for (const m of order) {
    const p = path.join(MODELS, m);
    if (await fs.stat(p).catch(() => null)) return p;
  }
  throw new Error(
    `no whisper model for lang=${lang} in ${MODELS}. Download one:\n  curl -L -o ${path.join(MODELS, 'ggml-medium.bin')} https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin`,
  );
}

async function prep(/** @type {string} */ video) {
  const src = path.resolve(video);
  const info = await probe(src);
  if (!info.hasAudio) throw new Error(`${src} has no audio track: reels are cut on speech`);
  const dir = path.join(WORKSPACE, 'reels', flag('name') ?? slugify(path.basename(src)));
  await fs.mkdir(path.join(dir, 'public'), {recursive: true});
  const source = path.join(dir, 'public', 'source.mp4');
  console.log(`conforming ${info.width}x${info.height} @ ${info.fps.toFixed(2)} fps → 1080x1920 @ 30`);
  await conform(src, source);
  const duration = (await probe(source)).duration;

  const lang = flag('lang') ?? 'auto';
  console.log(`transcribing (lang=${lang})…`);
  const words = await transcribe(source, {model: await pickModel(lang), lang, prompt: flag('prompt')});
  const silences = await detectSilences(source, duration);
  await fs.writeFile(path.join(dir, 'analysis.json'), JSON.stringify({source: src, duration, size: [info.width, info.height], silences, words}, null, 1));
  await contactSheet(source, path.join(dir, 'contact.jpg'), duration);

  const editPath = path.join(dir, 'edit.json');
  if (!(await fs.stat(editPath).catch(() => null))) {
    const edit = {
      source: 'source.mp4',
      handle: '',
      theme: 'pop',
      trim: {start: 0, end: Number(duration.toFixed(2))},
      cuts: {minGap: 0.35, pad: 0.08},
      focus: {x: 0.5, y: 0.38},
      emphasis: [],
      zooms: [],
      overlays: [],
      outro: {seconds: 1.6, title: 'Follow for more', cta: 'FOLLOW'},
      music: {bpm: 100, volume: 0.1},
      words,
    };
    await fs.writeFile(editPath, JSON.stringify(edit, null, 1));
  }
  for (const l of findLoops(words))
    console.warn(`⚠ transcript loop at word ${l.at}: "${l.phrase}" ×${l.times}. Whisper hallucinated; fix edit.json words by hand or re-run with --prompt.`);
  console.log(`\n${dir}\n  analysis.json  ${words.length} words, ${silences.length} pauses\n  contact.jpg    1 frame/s\n  edit.json      fill in (skills/insta-reels), then: reels render ${path.relative(process.cwd(), dir)}`);
}

async function render(/** @type {string} */ target) {
  const dir = path.resolve(target);
  const edit = JSON.parse(await fs.readFile(path.join(dir, 'edit.json'), 'utf8'));
  const analysis = JSON.parse(await fs.readFile(path.join(dir, 'analysis.json'), 'utf8'));
  const props = buildProps(edit, analysis);
  const propsPath = path.join(dir, 'props.json');
  const seconds = props.durationInFrames / props.fps;
  console.log(`edit: ${props.segments.length} segments, ${seconds.toFixed(1)}s, ${props.captions.length} caption pages, ${props.overlays.length} overlays`);

  // engines read their assets from the reel's public dir: link them in
  for (const [name, target] of [['huashu', path.join(REPO, 'packages/art-engine/engine')], ['rive', path.join(STUDIO, 'public/rive')]]) {
    const link = path.join(dir, 'public', name);
    if (!(await fs.lstat(link).catch(() => null))) await fs.symlink(target, link);
  }

  const audio = path.join(dir, 'public', 'audio');
  await sh('bash', [MAKE_AUDIO, '--bpm', String(edit.music?.bpm ?? 100), '--duration', (seconds + 1).toFixed(1), '--out', audio, ...(props.music ? [] : ['--no-music'])]);
  // real recordings over the synthesized SFX; each cue's peak lands on its event frame
  if (props.sfx.length && process.env.SFX_KIT !== 'off') {
    try {
      const {kit, kitDir} = await ensureKit();
      const {config, credits, real} = await installKit(kit, kitDir, path.join(audio, 'sfx'), dir);
      props.sfx = placeCues(props.sfx, config, props.fps);
      console.log(`sfx: ${real} real takes from ${kitDir}${credits ? `; credits → ${credits} (put them in the caption)` : ''}`);
    } catch (err) {
      console.warn(`sfx: real kit unavailable, keeping synthesized SFX (${/** @type {Error} */ (err).message})`);
      props.sfx = placeCues(props.sfx, undefined, props.fps);
    }
  } else props.sfx = placeCues(props.sfx, undefined, props.fps);
  await fs.writeFile(propsPath, JSON.stringify(props, null, 1));

  const out = path.join(dir, 'out');
  await fs.mkdir(out, {recursive: true});
  const common = [`--props=${propsPath}`, `--public-dir=${path.join(dir, 'public')}`, '--log=error'];
  if (rest.includes('--stills')) {
    const at = [...new Set([2, ...props.overlays.map((/** @type {any} */ o) => o.from + 8), props.outro ? props.outro.from + Math.round(props.outro.dur * 0.7) : props.durationInFrames - 2])];
    for (const f of at) await sh('npx', ['remotion', 'still', 'Reel', path.join(out, `still-${f}.png`), `--frame=${f}`, '--scale=0.5', ...common], {cwd: STUDIO});
    console.log(`stills → ${out}`);
    return;
  }
  const raw = path.join(out, 'reel.raw.mp4');
  await sh('npx', ['remotion', 'render', 'Reel', raw, '--codec=h264', '--crf=17', ...common], {cwd: STUDIO});
  // Loudness to Instagram's ~-14 LUFS with a -1 dBTP ceiling; video untouched.
  const final = path.join(out, 'reel.mp4');
  await sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final]);
  await fs.rm(raw);
  await qa(final);
}

async function cover(/** @type {string} */ target) {
  const dir = path.resolve(target);
  const edit = JSON.parse(await fs.readFile(path.join(dir, 'edit.json'), 'utf8'));
  const c = edit.cover ?? {};
  const title = flag('title') ?? c.title;
  if (!title) throw new Error('cover needs a title: --title "…" or edit.json cover.title (mark *accent* words)');
  // clean source footage (source seconds), not the edit: no captions/stickers under the title
  const at = Number(flag('at') ?? c.at ?? 1);
  await fs.mkdir(path.join(dir, 'out'), {recursive: true});
  const bg = await grabFrame(path.join(dir, 'public', 'source.mp4'), at, path.join(dir, 'out', 'cover-bg.jpg'));
  const png = await renderCover({title, kicker: flag('kicker') ?? c.kicker, handle: edit.handle, background: bg});
  const out = path.join(dir, 'out', 'cover.png');
  await fs.writeFile(out, png);
  console.log(`cover → ${out}`);
}

async function qa(/** @type {string} */ file) {
  let res = await measure(file, {profile: 'reel'});
  // out/reel.mp4 → ../props.json: add the exact edit-gap check
  const props = await fs.readFile(path.join(path.dirname(file), '..', 'props.json'), 'utf8').catch(() => null);
  if (props) res = grade(Object.assign(res, editGap(JSON.parse(props))));
  console.log('\n' + report(res));
  await fs.writeFile(file.replace(/\.mp4$/, '.qa.json'), JSON.stringify(res, null, 1));
  process.exitCode = res.verdict === 'red' ? 2 : 0;
}

// Red/magenta LED light leaves almost nothing in green: borrow some G and B
// from R (where the detail is) to bring skin back, but keep the red mood and
// the contrast — a full neutral grade looks washed out. Light denoise after.
const RED_ROOM = 'colorchannelmixer=rr=0.9:gr=0.35:gg=0.7:br=0.18:bb=0.82,eq=contrast=1.1:saturation=1.12:gamma=0.98,hqdn3d=1.5:1.5:4:4';

async function gradeSource(/** @type {string} */ target) {
  const pub = path.join(path.resolve(target), 'public');
  const raw = path.join(pub, 'source-raw.mp4');
  if (!(await fs.stat(raw).catch(() => null))) await fs.rename(path.join(pub, 'source.mp4'), raw);
  await sh('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-vf', flag('filter') ?? RED_ROOM, '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'copy', path.join(pub, 'source.mp4')]);
  console.log(`graded → ${path.join(pub, 'source.mp4')} (original: source-raw.mp4)`);
}

async function mask(/** @type {string} */ target) {
  const dir = path.resolve(target);
  const src = path.join(dir, 'public', 'source.mp4');
  const bin = path.join(WORKSPACE, 'reels', '.bin', 'segment');
  await fs.mkdir(path.dirname(bin), {recursive: true});
  if (!(await fs.stat(bin).catch(() => null))) await sh('swiftc', ['-O', '-suppress-warnings', path.join(HERE, 'segment.swift'), '-o', bin]);
  const matte = path.join(dir, 'out', 'matte.mp4');
  await fs.mkdir(path.dirname(matte), {recursive: true});
  // matte at half size, 3-frame average against flicker, upscaled
  const q = (/** @type {string} */ s) => `'${s.replace(/'/g, "'\\''")}'`;
  await sh('bash', ['-o', 'pipefail', '-c', `${q(bin)} ${q(src)} 540 960 | ffmpeg -v error -y -f rawvideo -pix_fmt gray -s 540x960 -r 30 -i - -vf "tmix=frames=3,scale=1080:1920:flags=bicubic" -c:v libx264 -crf 12 -pix_fmt yuv420p ${q(matte)}`]);
  // harden the soft matte edge so the outline reads as a clean stroke
  const out = path.join(dir, 'public', 'person.webm');
  await sh('ffmpeg', ['-v', 'error', '-y', '-i', src, '-i', matte, '-filter_complex', "[1:v]format=gray,lut=y='clip((val-90)*3,0,255)',gblur=sigma=1.2[m];[0:v][m]alphamerge,format=yuva420p",
    '-c:v', 'libvpx-vp9', '-b:v', '6M', '-deadline', 'realtime', '-cpu-used', '8', '-row-mt', '1', '-auto-alt-ref', '0', '-an', out]);
  console.log(`person → ${out}`);
}

if (cmd === 'prep' && target) await prep(target);
else if (cmd === 'render' && target) await render(target);
else if (cmd === 'cover' && target) await cover(target);
else if (cmd === 'qa' && target) await qa(path.resolve(target));
else if (cmd === 'mask' && target) await mask(target);
else if (cmd === 'critique' && target) {
  const t = path.resolve(target);
  const res = await earshot(t.endsWith('.mp4') ? t : path.join(t, 'out', 'reel.mp4'));
  console.log(formatCritique(res));
  if (!res.ok && !res.missing) process.exitCode = 1;
} else if (cmd === 'sfx-kit') {
  const {kit, kitDir} = await ensureKit({rebuild: rest.includes('--rebuild') || target === '--rebuild', offline: rest.includes('--offline') || target === '--offline'});
  console.log(`${kitDir}/kit.json (built ${kit.builtAt})`);
  for (const l of describeKit(kit)) console.log(`  ${l}`);
}
else if (cmd === 'grade' && target) await gradeSource(target);
else {
  console.error('usage:\n  reels prep <video> [--name slug] [--lang hi|en|auto] [--prompt "…"]\n  reels render <dir> [--stills]\n  reels cover <dir> [--title \"…\"] [--kicker …] [--at sec]\n  reels qa <mp4>\n  reels grade <dir> [--filter "…"]\n  reels mask <dir>\n  reels critique <dir|mp4>\n  reels sfx-kit [--rebuild] [--offline]');
  process.exitCode = 1;
}
