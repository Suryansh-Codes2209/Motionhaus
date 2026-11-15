// Builds the studio's input props (ShortProps, studio/src/shorts/types.ts)
// from a scripted episode plus its synthesized voice.
import {fill, publishOf} from './channel-settings.mjs';
import {bestBpm, fitBeats} from './beats.mjs';
import {paletteFor} from './palettes.mjs';
import {isStyle, STYLE_NAMES, STYLES} from './styles.mjs';

/**
 * A scripted episode, as written by the script step (spec §6.4). Scenes are
 * LaunchReel scenes plus a `vo` line; beats are computed here.
 * @typedef {object} EpisodeScript
 * @property {number} episode
 * @property {string} [sourceLabel]  where the story was found ("Show HN", "Reuters"); shown in the badge when the channel's badge has {source}
 * @property {string} [key]          the story's short stable name, from `shorts story claim`
 * @property {Record<string, string>} [sources]  what each claim rests on: {"<claim>": "<where, with link and date>"}
 * @property {Record<string, any>} brand          LaunchConfig.brand
 * @property {(Record<string, any> & {type: string, vo?: string})[]} scenes
 * @property {{text: string, vo?: string}} outro
 * @property {Record<string, string>} [pronounce]  respellings for TTS only, e.g. {"Oratora": "Ora-TOR-ah"}
 * @property {string} [palette]   colour theme (palettes.mjs); default rotates by episode
 * @property {boolean} [productColors]  keep brand.colors (launch films); default: the palette colours everything
 * @property {string} [kicker]    small chip above the hook, e.g. "FOLLOW-UP · GITHUB · OCT 21"
 * @property {import('./styles.mjs').StyleName} [style]  edit style (skills/short-styles); default 'radar'
 * @property {'style' | 'slam' | 'bigKey' | 'pill' | 'sweep' | 'underline'} [captions]  caption preset (studio/src/shorts/Captions.tsx); default 'style', the edit style's own skin
 * @property {'steady' | 'staccato' | 'slowBurn' | 'countdown' | 'coldOpen'} [pacing]  rhythm shape (motion.mjs → PACINGS); consecutive episodes must differ
 * @property {'short' | 'long'} [format]  'long': a 16:9 deep dive (skills/long-form); default 'short'
 * @property {{title: string, scene: number, backdrop?: string, plate?: string}[]} [chapters]  long-form: chapter titles by first scene index; backdrop picks the chapter's background set
 * @property {string | {src: string, focusY?: number}} [face]  headshot: a video of the speaker reading every `vo` then the outro, in order (path from the episode folder); its audio replaces TTS. Absent: the channel's mascot hosts
 * @property {{variants: {headline: string, sub?: string, layout?: 'product' | 'photo' | 'versus', focus?: 'screenshot' | 'logo', image?: string, image2?: string, inset?: string, labels?: [string, string], side?: 'left' | 'right', accent?: 'arrow' | 'circle' | 'none'}[]}} [thumbnail]  long-form thumbnails (layouts: studio/src/shorts/types.ts ThumbVariant)
 */

/** @typedef {{text: string, startMs: number, endMs: number, emphasis?: boolean}} Word */
/** @typedef {{src: string, durationSec: number, words: Word[], face?: {startSec: number}}} Voice */

/**
 * Long-form props add chapters and thumbnail variants and drop burned-in
 * captions (an .srt is uploaded instead).
 * @param {EpisodeScript} ep
 * @param {{scenes: (Voice | null)[], outro: Voice | null}} voice
 * @param {{name: string, handle: string, colors: Record<string, string>, captions: {wordsPerPage: number}, mascot?: boolean}} series
 * @param {{bpm?: number, fps?: number, music?: {src: string, volume: number, duck: number} | null, motionBlur?: boolean, face?: {src: string, focusY?: number} | null}} [o]
 */
export function buildProps(ep, voice, series, o = {}) {
  const fps = o.fps ?? 30;
  const bare = ep.scenes.map(({vo: _vo, ...s}) => s);
  const voiceSec = voice.scenes.map((v) => v?.durationSec ?? null);
  // the music is generated at the episode's tempo: pick the one the lines fit best
  const bpm = o.bpm ?? bestBpm(bare, voiceSec);
  const scenes = fitBeats(bare, voiceSec, bpm);
  const style = ep.style ?? 'radar';
  if (!isStyle(style)) throw new Error(`unknown style "${style}" (have: ${STYLE_NAMES.join(', ')})`);
  // A non-radar style brings its own palette unless the script picks one.
  const {name: _n, ...palette} = paletteFor(ep.episode, ep.palette ?? (style === 'radar' ? undefined : STYLES[style].palette));
  const long = ep.format === 'long';
  return {
    episode: ep.episode,
    sourceLabel: ep.sourceLabel ?? '',
    kicker: ep.kicker ?? null,
    series: {name: series.name, handle: series.handle, colors: palette, mascot: series.mascot === true, badge: fill(publishOf(series).badge, {n: String(ep.episode).padStart(3, '0'), source: ep.sourceLabel, name: series.name})},
    config: {
      style,
      // A subject need not be a product: no page and no font of its own is fine.
      brand: /** @type {any} */ (ep.productColors ? {url: '', font: 'Inter', ...ep.brand} : {url: '', font: 'Inter', ...ep.brand, colors: palette}),
      format: long ? '16:9' : '9:16',
      fps,
      bpm,
      musicVolume: 0,
      sfx: true,
      sfxVolume: 0.5, // quieter than launch films: the voice leads
      look: {grain: 0.06, vignette: 0.4, lightLeaks: true, cameraDrift: true, motionBlur: o.motionBlur ?? true, particles: true, ...(long ? {sceneCamera: true, backdrop: false} : {})},
      scenes,
    },
    voice: voice.scenes,
    music: o.music ?? null,
    outro: {text: ep.outro.text, voice: voice.outro},
    captions: long ? null : {wordsPerPage: series.captions.wordsPerPage, ...(ep.captions ? {preset: ep.captions} : {})},
    ...(o.face ? {face: o.face} : {}),
    ...(long ? {chapters: ep.chapters ?? [], thumbnail: ep.thumbnail ?? {variants: []}} : {}),
  };
}

/**
 * Seconds of the film part (before the outro), mirroring the studio timeline:
 * scenes overlap by one beat. Used to size the music bed.
 * @param {{beats: number}[]} scenes @param {number} bpm
 */
export const filmSeconds = (scenes, bpm) => ((scenes.reduce((n, s) => n + s.beats, 0) - (scenes.length - 1)) * 60) / bpm;

/**
 * Beat on which the logo lands (for make-audio.sh --drop-beat), or 0.
 * @param {{type: string, beats: number}[]} scenes
 */
export function dropBeat(scenes) {
  const i = scenes.findIndex((s) => s.type === 'logo');
  if (i < 0) return 0;
  return scenes.slice(0, i).reduce((n, s) => n + s.beats, 0) - i + 1;
}
