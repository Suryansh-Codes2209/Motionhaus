// Frame math for the long-form (16:9) layers: chapter starts, end card and
// total length. Pure functions so they can be unit-tested with plain
// `node --test`, and imported by the shorts CLI for chapter timestamps.
import type {Chapter, ShortProps} from '../shorts/types';
import {OUTRO_OVERLAP} from '../shorts/timing.ts';

type TimelineLike = {items: {index: number; from: number; enter: number}[]; total: number};

// YouTube end-screen elements need 5–20s; the end card holds at least this long.
export const END_SCREEN_SEC = 8;

// How long a chapter lower-third stays up.
export const CHAPTER_CARD_SEC = 3;

/** Each chapter starts when its first scene's content starts animating. Chapter 0 always starts at 0. */
export const chapterStarts = (tl: TimelineLike, chapters: Chapter[] = []) =>
  chapters
    .map((c) => {
      const it = tl.items.find((i) => i.index === c.scene);
      if (!it) throw new Error(`chapter "${c.title}" points at scene ${c.scene}, which does not exist`);
      return {title: c.title, scene: c.scene, from: c.scene === 0 ? 0 : it.from + it.enter};
    })
    .sort((a, b) => a.from - b.from);

export const endCardFrames = (p: Pick<ShortProps, 'outro'>, fps: number) =>
  Math.max(Math.round(fps * END_SCREEN_SEC), p.outro.voice ? Math.ceil((p.outro.voice.durationSec + 1) * fps) : 0);

export const endCardStart = (tlTotal: number) => tlTotal - OUTRO_OVERLAP;

export const longDuration = (tlTotal: number, p: Pick<ShortProps, 'outro'>, fps: number) =>
  endCardStart(tlTotal) + endCardFrames(p, fps);

/** "1:05", "12:00" — YouTube chapter timestamp for a frame. */
export const timestamp = (frame: number, fps: number) => {
  const s = Math.floor(frame / fps);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
