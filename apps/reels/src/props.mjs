// edit.json (written by Claude, times in SOURCE seconds) + analysis.json
// (from `reels prep`) → props.json for the reels studio (times in frames on
// the edited timeline).
import {keptSeconds, linePages, mapTime, pageCaptions, planKeeps, speechWindows, timeLines, zoomSteps} from './edl.mjs';

/** @typedef {import('./edl.mjs').Word} Word */

/**
 * @typedef {{
 *   source?: string,
 *   handle?: string,
 *   theme?: string,
 *   trim?: {start?: number, end?: number},
 *   cuts?: false | {minGap?: number, pad?: number},
 *   words?: Word[],
 *   script?: (string | {from: number, to: number, text: string})[],
 *   captions?: boolean,
 *   captionY?: number,
 *   captionStyle?: 'pop' | 'lines',
 *   person?: false | {src?: string, outline?: {from: number, to: number}[]},
 *   emphasis?: string[],
 *   focus?: {x: number, y: number},
 *   punch?: number,
 *   zooms?: {at: number, scale: number}[],
 *   overlays?: any[],
 *   outro?: false | {seconds?: number, title?: string, cta?: string},
 *   music?: false | {bpm?: number, volume?: number},
 *   sfx?: boolean,
 * }} Edit
 * @typedef {{duration: number, silences: {start: number, end: number}[], words: Word[]}} Analysis
 */

/** Caption + overlay skins. `pop` is the default talking-head look. */
export const THEMES = {
  pop: {font: 'Montserrat', accent: '#FFE14D', accent2: '#FF3B5C', ink: '#0B0B0F', paper: '#FFFFFF'},
  clean: {font: 'Inter', accent: '#7CF7C8', accent2: '#5B8CFF', ink: '#0B0B0F', paper: '#FFFFFF'},
  bold: {font: 'Anton', accent: '#B8FF3B', accent2: '#FF5C1F', ink: '#000000', paper: '#FFFFFF'},
  // for footage under pink/purple light, where yellow fights the grade
  lilac: {font: 'Montserrat', accent: '#FFD6F5', accent2: '#FF6FD8', ink: '#1A0826', paper: '#FFFFFF'},
  // for warm red/orange room light
  ember: {font: 'Montserrat', accent: '#FFE1D6', accent2: '#FF5A4E', ink: '#1C0A08', paper: '#FFFFFF'},
};

const SLOT_GAP = 0; // stickers stack top-down by arrival order

/**
 * @param {Edit} edit @param {Analysis} analysis
 * @param {{fps?: number}} [o]
 */
export function buildProps(edit, analysis, {fps = 30} = {}) {
  const f = (/** @type {number} */ s) => Math.round(s * fps);
  const start = edit.trim?.start ?? 0;
  const end = Math.min(edit.trim?.end ?? analysis.duration, analysis.duration);
  const keeps = edit.cuts === false ? [{start, end, from: 0}] : planKeeps(analysis.silences, {start, end, ...(edit.cuts ?? {})});
  const body = keptSeconds(keeps);
  const at = (/** @type {number} */ t) => mapTime(t, keeps) ?? body;

  const emph = new Set((edit.emphasis ?? []).map(norm));
  // A corrected script (one line per speech window) beats raw whisper timings.
  const source = edit.captions === false ? [] : edit.script ? timeLines(edit.script, speechWindows(analysis.silences, analysis.duration)) : (edit.words ?? analysis.words);
  const words = source
    .filter((w) => w.start >= start && w.start < end)
    .map((w) => ({line: w.line, text: w.text, start: at(w.start), end: Math.max(at(w.start) + 0.05, at(Math.min(w.end, end))), emphasis: w.emphasis ?? emph.has(norm(w.text))}));

  const outro = edit.outro === false ? null : {from: f(body), dur: f(edit.outro?.seconds ?? 1.6), title: edit.outro?.title ?? 'Follow for more', cta: edit.outro?.cta ?? 'FOLLOW'};
  const total = f(body) + (outro?.dur ?? 0);

  // An overlay without `to` stays up to the very end, through the outro.
  const overlays = (edit.overlays ?? []).map((o, i) => {
    const from = f(at(o.from ?? o.at));
    const to = o.to != null ? f(at(o.to)) : total;
    const out = {...o, from, to};
    delete out.at;
    if (o.strikeAt != null) out.strikeAt = f(at(o.strikeAt));
    // lyric words: source seconds → frames from the block start
    if (o.words) out.words = o.words.map((/** @type {any} */ w) => ({...w, at: Math.max(0, f(at(w.at ?? o.from ?? o.at)) - from)}));
    if (o.type === 'flash') out.to = from + 9;
    out.id = i;
    return out;
  });
  // Stickers in one group stack into slots by arrival order.
  /** @type {Record<string, number>} */
  const slots = {};
  for (const o of overlays) if (o.type === 'sticker') o.slot = (slots[o.group ?? 'default'] = (slots[o.group ?? 'default'] ?? -1) + 1 + SLOT_GAP);

  const hide = overlays.filter((o) => o.type === 'slam' || o.hideCaptions).map((o) => ({from: o.from, to: o.to}));
  const captions = (edit.captionStyle === 'lines' ? linePages(words) : pageCaptions(words)).map((p) => ({
    from: f(p.start),
    to: f(p.end),
    words: p.words.map((w) => ({text: w.text, from: f(w.start), emphasis: !!w.emphasis})),
  }));

  return {
    fps,
    durationInFrames: total,
    video: edit.source ?? 'source.mp4',
    handle: edit.handle ?? '',
    theme: THEMES[/** @type {keyof typeof THEMES} */ (edit.theme ?? 'pop')] ?? THEMES.pop,
    focus: edit.focus ?? {x: 0.5, y: 0.38},
    segments: keeps.map((k) => ({srcStart: k.start, from: f(k.from), dur: f(k.from + k.end - k.start) - f(k.from)})),
    zooms: zoomSteps(keeps, (edit.zooms ?? []).map((z) => ({at: at(z.at), scale: z.scale})), {punch: edit.punch ?? 1.14}).map((z) => ({frame: f(z.at), scale: z.scale})),
    captions,
    captionY: edit.captionY ?? 1340,
    captionStyle: edit.captionStyle ?? 'pop',
    // outline pulses land on the punch-ins
    person: edit.person
      ? {
          src: edit.person.src ?? 'person.webm',
          outline: (edit.person.outline ?? []).map((s) => ({from: f(at(s.from)), to: f(at(s.to))})),
          pulses: (edit.zooms ?? []).map((z) => f(at(z.at))),
        }
      : undefined,
    hideCaptions: hide,
    overlays,
    outro,
    music: edit.music === false ? null : {src: 'audio/music.mp3', volume: edit.music?.volume ?? 0.1},
    sfx: edit.sfx === false ? [] : sfxFor(overlays, outro),
  };
}

/**
 * Sound design follows the graphics: one hit per overlay entrance. `frame` is
 * the EVENT frame (the cut / entrance / strike): the CLI's placeCues
 * (audio-lib/sfxkit.mjs) picks a real take per cue, rotating variants, and
 * moves its start so the measured peak lands there (whoosh peaks just after).
 */
function sfxFor(/** @type {any[]} */ overlays, /** @type {{from: number} | null} */ outro) {
  /** @type {{name: string, frame: number, volume: number}[]} */
  const out = [];
  for (const o of overlays) {
    if (o.type === 'sticker') out.push({name: 'pop', frame: o.from, volume: 0.7});
    if (o.type === 'slam') out.push({name: 'whoosh-1', frame: o.from, volume: 0.6}, {name: 'impact', frame: o.from, volume: 0.55});
    if (o.type === 'hook') out.push({name: 'whoosh-2', frame: o.from, volume: 0.35});
    if (o.type === 'hook' && o.strikeAt != null) out.push({name: 'tick', frame: o.strikeAt, volume: 0.8});
    if (o.type === 'warning') out.push({name: 'impact', frame: o.from, volume: 0.5});
    if (o.type === 'flash') out.push({name: 'whoosh-2', frame: o.from, volume: 0.45});
    if (o.type === 'behind') out.push({name: 'whoosh-1', frame: o.from, volume: 0.5}, {name: 'impact', frame: o.from, volume: 0.45});
    if (o.type === 'insert') out.push({name: o.mode === 'pip' ? 'pop' : 'whoosh-2', frame: o.from, volume: 0.5});
  }
  if (outro) out.push({name: 'whoosh-3', frame: outro.from, volume: 0.45});
  return out.sort((a, b) => a.frame - b.frame);
}

const norm = (/** @type {string} */ s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/**
 * whisper.cpp word tokens often come out zero-length or stacked on one
 * timestamp. Spread those evenly between their good neighbours instead of
 * dropping the words.
 * @param {Word[]} words
 * @returns {Word[]}
 */
export function repairTimings(words) {
  const out = words.map((w) => ({...w}));
  const bad = (/** @type {number} */ i) => !(out[i].end - out[i].start >= 0.04) || (i > 0 && out[i].start < out[i - 1].start);
  let i = 0;
  while (i < out.length) {
    if (!bad(i)) {
      i++;
      continue;
    }
    let j = i;
    while (j < out.length && bad(j)) j++;
    const lo = i > 0 ? out[i - 1].end : out[i].start;
    const hi = j < out.length ? out[j].start : Math.max(lo + 0.25 * (j - i), out[j - 1].end);
    // squeeze the previous word if there is no room
    const room = hi - lo;
    const need = 0.12 * (j - i);
    const a = room >= need ? lo : Math.max(i > 0 ? out[i - 1].start + 0.08 : lo, hi - need);
    if (i > 0 && a < out[i - 1].end) out[i - 1].end = a;
    const step = (hi - a) / (j - i);
    for (let k = i; k < j; k++) {
      out[k].start = a + step * (k - i);
      out[k].end = a + step * (k - i + 1);
    }
    i = j;
  }
  return out;
}

/**
 * Longest stretch (seconds) of the body with no edit event: a cut, a zoom
 * step or an overlay entrance. Exact, unlike pixel-based cut detection.
 * @param {{fps: number, durationInFrames: number, segments: {from: number}[], zooms: {frame: number}[], overlays: {from: number}[], outro: {from: number} | null}} p
 */
export function editGap(p) {
  const end = p.outro?.from ?? p.durationInFrames;
  const ev = [0, ...p.segments.map((s) => s.from), ...p.zooms.map((z) => z.frame), ...p.overlays.map((o) => o.from), end].filter((f) => f <= end).sort((a, b) => a - b);
  let gap = 0, at = 0;
  for (let i = 1; i < ev.length; i++) if (ev[i] - ev[i - 1] > gap) [gap, at] = [ev[i] - ev[i - 1], ev[i - 1]];
  return {max_edit_gap_s: Math.round((gap / p.fps) * 100) / 100, max_edit_gap_at_s: Math.round((at / p.fps) * 100) / 100};
}
