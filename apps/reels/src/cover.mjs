// Reel cover / thumbnail with Satori (JSX-shaped layout → SVG) + resvg (→ PNG).
// Background is a frame grabbed from the reel; the title sits in IG's 3:4
// grid-crop safe zone so it survives the profile-grid thumbnail.
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {Resvg} from '@resvg/resvg-js';
import satori from 'satori';

const run = promisify(execFile);
const FONTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../packages/art-engine/engine/lib/fonts');

/** Tiny hyperscript so the layout reads like JSX without a build step. */
const h = (/** @type {string} */ type, /** @type {Record<string, any>} */ style, /** @type {any[]} */ ...children) => ({
  type,
  props: {style: {display: 'flex', ...style}, children: children.length === 1 ? children[0] : children},
});

/**
 * Split a title into words; `*word*` is painted in the accent colour.
 * @param {string} title
 */
export function titleWords(title) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({text: w.replace(/\*/g, ''), accent: /^\*.+\*$/.test(w)}));
}

/**
 * @param {{title: string, kicker?: string, handle?: string, background: string, accent?: string, size?: [number, number]}} o
 *   background: path to a JPEG/PNG frame
 * @returns {Promise<Buffer>} PNG
 */
export async function renderCover({title, kicker, handle, background, accent = '#FFE14D', size = [1080, 1920]}) {
  const [W, H] = size;
  const bg = `data:image/jpeg;base64,${(await fs.readFile(background)).toString('base64')}`;
  const fonts = [
    {name: 'Anton', data: await fs.readFile(path.join(FONTS, 'Anton-400.woff')), weight: /** @type {const} */ (400), style: /** @type {const} */ ('normal')},
    {name: 'Poppins', data: await fs.readFile(path.join(FONTS, 'Poppins-800.woff')), weight: /** @type {const} */ (800), style: /** @type {const} */ ('normal')},
  ];
  const words = titleWords(title);
  const longest = Math.max(...words.map((w) => w.text.length));
  const fontSize = Math.max(110, Math.min(200, Math.round(1500 / Math.max(5, longest))));

  const tree = h(
    'div',
    {width: W, height: H, position: 'relative', backgroundColor: '#000'},
    {type: 'img', props: {src: bg, width: W, height: H, style: {position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover'}}},
    h('div', {position: 'absolute', top: 0, left: 0, width: W, height: H, backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.85) 100%)'}),
    h(
      'div',
      // 3:4 grid crop keeps the middle 1440px of 1920; stay inside it
      {position: 'absolute', left: 70, right: 70, bottom: 300, flexDirection: 'column', alignItems: 'flex-start'},
      ...(kicker ? [h('div', {fontFamily: 'Poppins', fontSize: 40, color: '#0B0B0F', backgroundColor: accent, padding: '8px 22px', borderRadius: 12, marginBottom: 26}, kicker.toUpperCase())] : []),
      h(
        'div',
        {flexWrap: 'wrap', fontFamily: 'Anton', fontSize, lineHeight: 1, textTransform: 'uppercase'},
        ...words.map((w) => h('span', {color: w.accent ? accent : '#FFFFFF', marginRight: fontSize * 0.22, textShadow: '0 8px 30px rgba(0,0,0,0.6)'}, w.text)),
      ),
      ...(handle ? [h('div', {marginTop: 30, fontFamily: 'Poppins', fontSize: 42, color: '#FFFFFF', opacity: 0.9}, handle)] : []),
    ),
  );
  const svg = await satori(/** @type {any} */ (tree), {width: W, height: H, fonts});
  return Buffer.from(new Resvg(svg, {fitTo: {mode: 'width', value: W}}).render().asPng());
}

/** Grab one frame of a video as JPEG. */
export async function grabFrame(/** @type {string} */ video, /** @type {number} */ at, /** @type {string} */ dest) {
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(at), '-i', video, '-frames:v', '1', '-q:v', '2', dest]);
  return dest;
}
