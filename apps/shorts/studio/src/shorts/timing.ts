// Frame math for the Shorts layers: where each VO clip sits on the template
// timeline, caption pages, music ducking and total length. Pure functions so
// they can be unit-tested with plain `node --test`.
import type {ShortProps, Word} from './types';

// Structural subset of template/src/timeline.ts's Timeline.
type TimelineLike = {items: {index: number; from: number; enter: number}[]; total: number};

// Frames the outro card cross-fades over the end of the last scene.
export const OUTRO_OVERLAP = 8;

export type VoiceClip = {scene: number; from: number; frames: number; words: Word[]};

/**
 * Each scene's VO starts as its transition begins (a J-cut: the voice leads
 * the picture, so lines follow each other without dead air); the first waits
 * for the hook's first frames (from + enter). shorts/src/beats.mjs sizes the
 * scenes to this.
 */
export const voiceClips = (tl: TimelineLike, voice: ShortProps['voice'], fps: number): VoiceClip[] =>
  tl.items.flatMap((it) => {
    const v = voice[it.index];
    return v ? [{scene: it.index, from: it.index === 0 ? it.from + it.enter : it.from, frames: Math.ceil(v.durationSec * fps), words: v.words}] : [];
  });

export const outroFrames = (p: Pick<ShortProps, 'outro'>, fps: number) =>
  Math.max(Math.round(fps * 1.6), p.outro.voice ? Math.ceil((p.outro.voice.durationSec + 0.6) * fps) : 0);

export const outroStart = (tlTotal: number) => tlTotal - OUTRO_OVERLAP;

export const shortDuration = (tlTotal: number, p: Pick<ShortProps, 'outro'>, fps: number) =>
  outroStart(tlTotal) + outroFrames(p, fps);

export type TimedWord = {text: string; from: number; to: number; emphasis: boolean; br: boolean};
export type CaptionPage = {from: number; to: number; words: TimedWord[]};

const ENDS_PHRASE = /[.,!?;:…—]$/;

/**
 * Groups spoken words into on-screen pages of ≤ maxWords and ≤ maxChars (so a
 * page never wraps to a second line). A page also breaks at the end of a
 * phrase or on a pause, so captions follow the phrasing. A page stays up
 * until the next one starts, or `holdSec` after its last word.
 */
export function captionPages(clips: {from: number; words: Word[]}[], fps: number, maxWords = 3, holdSec = 0.3, maxChars = 16): CaptionPage[] {
  const words: TimedWord[] = clips.flatMap((c) =>
    c.words.map((w, i) => ({
      text: w.text,
      from: c.from + Math.round((w.startMs / 1000) * fps),
      to: c.from + Math.round((w.endMs / 1000) * fps),
      emphasis: Boolean(w.emphasis),
      br: Boolean(w.br) || i === c.words.length - 1,
    })),
  );
  const pages: TimedWord[][] = [];
  let cur: TimedWord[] = [];
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const pause = prev && w.from - prev.to > 0.35 * fps;
    const chars = cur.reduce((n, x) => n + x.text.length, 0) + w.text.length;
    if (cur.length && (cur.length >= maxWords || chars > maxChars || pause || prev.br || ENDS_PHRASE.test(prev.text))) {
      pages.push(cur);
      cur = [];
    }
    cur.push(w);
  });
  if (cur.length) pages.push(cur);
  return pages.map((ws, i) => {
    const last = ws[ws.length - 1];
    const next = pages[i + 1]?.[0].from ?? Infinity;
    return {from: ws[0].from, to: Math.min(next, last.to + Math.round(holdSec * fps)), words: ws};
  });
}

/** Music gain multiplier at frame f: `duck` while any VO plays, linear ramps of `ramp` frames. */
export function duckGain(f: number, clips: {from: number; frames: number}[], duck: number, ramp: number): number {
  let g = 1;
  for (const c of clips) {
    const end = c.from + c.frames;
    let k: number;
    if (f < c.from - ramp || f > end + ramp) continue;
    if (f < c.from) k = (c.from - f) / ramp;
    else if (f > end) k = (f - end) / ramp;
    else k = 0;
    g = Math.min(g, duck + (1 - duck) * k);
  }
  return g;
}

/** Frame windows for each clip's footage: from its VO start to the next clip's (the first one from 0). */
export function faceWindows(clips: {from: number; frames: number}[], until: number) {
  return clips.map((c, i) => {
    const from = i === 0 ? 0 : c.from;
    const to = clips[i + 1]?.from ?? until;
    return {from, len: Math.max(1, to - from), lead: c.from - from, play: c.frames};
  });
}
